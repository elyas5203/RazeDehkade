/**
 * src/socket/index.js
 * ماژول مدیریت ارتباطات Realtime با Socket.io
 * ایزوله‌سازی بر اساس روم‌های session_${sessionId}
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const Message = require('../models/Message');
const Session = require('../models/Session');
const SessionLog = require('../models/SessionLog');

/**
 * راه‌اندازی و تعاریف Socket.io
 * @param {import('socket.io').Server} io
 */
function setupSocketIO(io) {
  // میدلور احراز هویت سوکت‌ها با JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
      socket.user = decoded; // شامل role, id/sessionId و ...
      next();
    });
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 سوکت متصل شد: Socket ID = ${socket.id} | نقش = ${user.role} | کاربر/ادمین ID = ${user.id || user.sessionId}`);

    // اگر کاربر عادی باشد، به‌طور خودکار به روم جلسه خودش جوین شود
    if (user.role === 'user' && user.sessionId) {
      const roomName = `session_${user.sessionId}`;
      socket.join(roomName);
      console.log(`📱 کاربر جلسه ${user.sessionId} وارد روم ${roomName} شد.`);
    }

    /**
     * رویداد join_session: برای جوین شدن به روم جلسه
     * ادمین یا کاربر می‌تواند جلسه مشخصی را جوین کند
     */
    socket.on('join_session', async (data) => {
      try {
        const sessionId = parseInt(data.sessionId, 10);
        if (!sessionId) return;

        // اگر کاربر عادی باشد فقط می‌تواند به جلسه خودش جوین شود
        if (user.role === 'user' && user.sessionId !== sessionId) {
          return socket.emit('error_message', { message: 'شما اجازه ورود به این جلسه را ندارید.' });
        }

        const roomName = `session_${sessionId}`;
        socket.join(roomName);

        // ثبت لاگ یا اعلام به روم
        if (user.role === 'admin') {
          await Session.assignAdmin(sessionId, user.id);
          await SessionLog.log(sessionId, 'admin_joined', `ادمین ${user.display_name} به جلسه پیوست.`);
        }

        socket.emit('joined_session', {
          success: true,
          sessionId,
          room: roomName,
          message: `با موفقیت وارد روم ${roomName} شدید.`,
        });

        // اطلاع‌رسانی تایپ یا تغییرات در صورت نیاز
        io.to(roomName).emit('user_joined_room', {
          role: user.role,
          name: user.display_name || user.name || 'کاربر',
          sessionId,
        });

      } catch (err) {
        console.error('Error in join_session:', err);
        socket.emit('error_message', { message: 'خطا در ورود به جلسه.' });
      }
    });

    /**
     * رویداد leave_session: خروج از روم یک جلسه
     */
    socket.on('leave_session', (data) => {
      try {
        const sessionId = parseInt(data.sessionId, 10);
        if (!sessionId) return;

        const roomName = `session_${sessionId}`;
        socket.leave(roomName);

        socket.emit('left_session', {
          success: true,
          sessionId,
          message: `از روم ${roomName} خارج شدید.`,
        });
      } catch (err) {
        console.error('Error in leave_session:', err);
      }
    });

    /**
     * رویداد admin_switch_session: برای ادمین که بین جلسات همزمان سوئیچ می‌کند
     */
    socket.on('admin_switch_session', async (data) => {
      if (user.role !== 'admin') return;

      const { previousSessionId, nextSessionId } = data;
      if (previousSessionId) {
        socket.leave(`session_${previousSessionId}`);
      }

      if (nextSessionId) {
        const nextRoom = `session_${nextSessionId}`;
        socket.join(nextRoom);

        // مارک کردن پیام‌ها به عنوان خوانده شده
        await Message.markAsRead(nextSessionId, 'user');

        socket.emit('admin_session_switched', {
          success: true,
          activeSessionId: nextSessionId,
        });
      }
    });

    /**
     * رویداد send_message: ارسال پیام در جلسه (متن، عکس، ویس، فایل)
     */
    socket.on('send_message', async (data) => {
      try {
        const { sessionId, content, messageType = 'text', fileUrl = null, fileName = null, senderType } = data;

        const targetSessionId = parseInt(sessionId || user.sessionId, 10);
        if (!targetSessionId) {
          return socket.emit('error_message', { message: 'شناسه جلسه نامعتبر است.' });
        }

        // تعیین نوع فرستنده
        let effectiveSenderType = user.role === 'admin' ? (senderType || 'admin') : 'user';
        let senderId = user.role === 'admin' ? user.id : null;

        // ذخیره در دیتابیس
        const savedMessage = await Message.create({
          session_id: targetSessionId,
          sender_type: effectiveSenderType,
          sender_id: senderId,
          content: content || '',
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
        });

        const roomName = `session_${targetSessionId}`;

        // ارسال همه پیام جدید به افراد موجود در آن روم به صورت ایزوله
        io.to(roomName).emit('new_message', {
          ...savedMessage,
          sender_name: user.role === 'admin' ? (user.display_name || 'ادمین') : 'دستیاران کارآگاه',
        });

        // همچنین برای اکتیو ماندن لیست جلسات ادمین، رویداد به‌روزرسانی لیست جلسه ارسال می‌شود
        io.emit('session_updated', {
          sessionId: targetSessionId,
          lastMessage: savedMessage,
        });

      } catch (err) {
        console.error('Error in send_message socket handler:', err);
        socket.emit('error_message', { message: 'خطا در ارسال پیام.' });
      }
    });

    /**
     * رویداد typing: اعلام وضعیت تایپ کردن
     */
    socket.on('typing', (data) => {
      const sessionId = parseInt(data.sessionId || user.sessionId, 10);
      if (!sessionId) return;

      const roomName = `session_${sessionId}`;
      socket.to(roomName).emit('user_typing', {
        sessionId,
        isTyping: !!data.isTyping,
        senderType: user.role === 'admin' ? 'admin' : 'user',
        displayName: user.display_name || user.name || 'کاربر',
      });
    });

    /**
     * رویداد mark_as_read: خوانده شدن پیام‌ها
     */
    socket.on('mark_as_read', async (data) => {
      try {
        const sessionId = parseInt(data.sessionId || user.sessionId, 10);
        if (!sessionId) return;

        const senderTypeToMark = user.role === 'admin' ? 'user' : 'admin';
        await Message.markAsRead(sessionId, senderTypeToMark);

        const roomName = `session_${sessionId}`;
        io.to(roomName).emit('messages_read_status', {
          sessionId,
          markedBy: user.role,
        });
      } catch (err) {
        console.error('Error in mark_as_read socket handler:', err);
      }
    });

    /**
     * رویداد session_list: دریافت لیست تازه‌سازی شده جلسات برای ادمین
     */
    socket.on('session_list', async () => {
      if (user.role !== 'admin') return;
      try {
        const sessions = await Session.findAll();
        socket.emit('session_list_response', {
          success: true,
          sessions,
        });
      } catch (err) {
        console.error('Error in session_list:', err);
      }
    });

    /**
     * اسکلت استریم صدای میکروفون لپ‌تاپ جلسه به ادمین (Audio Streaming Skeleton)
     * جهت قابلیت بعدی استریم لایو ویس کارآگاهان به ادمین
     */
    socket.on('start_audio_stream', (data) => {
      const sessionId = parseInt(data.sessionId || user.sessionId, 10);
      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('audio_stream_started', {
        sessionId,
        startedBy: user.role,
      });
    });

    socket.on('audio_stream_chunk', (data) => {
      // data شامل { sessionId, audioChunk (ArrayBuffer / Base64) }
      const sessionId = parseInt(data.sessionId || user.sessionId, 10);
      const roomName = `session_${sessionId}`;
      // ارسال چنک صدا به بقیه کاربران حاضر در روم (مثل ادمین)
      socket.to(roomName).emit('audio_stream_chunk_received', {
        sessionId,
        chunk: data.chunk,
        timestamp: Date.now(),
      });
    });

    socket.on('stop_audio_stream', (data) => {
      const sessionId = parseInt(data.sessionId || user.sessionId, 10);
      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('audio_stream_stopped', {
        sessionId,
        stoppedBy: user.role,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 سوکت قطع شد: Socket ID = ${socket.id}`);
    });
  });
}

module.exports = setupSocketIO;
