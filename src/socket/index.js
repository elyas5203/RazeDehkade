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
const uploadRoutes = require('../routes/upload');

/**
 * راه‌اندازی و تعاریف Socket.io
 * @param {import('socket.io').Server} io
 */
function setupSocketIO(io) {
  const adminSenderTypes = new Set(['admin', 'system', 'hacker']);
  const messageTypes = new Set(['text', 'image', 'voice', 'video', 'file', 'user_voice']);
  const recentMessagesMap = new Map();
  // نگاشت بلادرنگ کاربران آنلاین بر اساس شناسه جلسه (sessionId -> Set of socket.ids)
  const sessionOnlineUsers = new Map();

  function trackUserOnline(sessionId, socketId) {
    const sId = Number(sessionId);
    if (!sId) return;
    if (!sessionOnlineUsers.has(sId)) {
      sessionOnlineUsers.set(sId, new Set());
    }
    const set = sessionOnlineUsers.get(sId);
    const wasOnline = set.size > 0;
    set.add(socketId);
    if (!wasOnline) {
      io.to('admins').emit('session_presence_changed', {
        sessionId: sId,
        isOnline: true,
        onlineCount: set.size,
      });
    }
  }

  function trackUserOffline(sessionId, socketId) {
    const sId = Number(sessionId);
    if (!sId || !sessionOnlineUsers.has(sId)) return;
    const set = sessionOnlineUsers.get(sId);
    set.delete(socketId);
    if (set.size === 0) {
      sessionOnlineUsers.delete(sId);
      io.to('admins').emit('session_presence_changed', {
        sessionId: sId,
        isOnline: false,
        onlineCount: 0,
      });
    }
  }

  function cleanOldRecentMessages() {
    const now = Date.now();
    for (const [key, val] of recentMessagesMap.entries()) {
      if (now - val.time > 5000) recentMessagesMap.delete(key);
    }
  }

  function authorizedSessionId(user, requested) {
    const sessionId = parseInt(requested || user.sessionId, 10);
    if (!sessionId) return null;
    if (user.role === 'user' && Number(user.sessionId) !== sessionId) return null;
    return sessionId;
  }

  function normalizeAndValidateFileUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let trimmed = rawUrl.trim().replace(/\\/g, '/');
    if (!trimmed || trimmed.includes('..') || trimmed.includes('\0') || /^(?:https?:|\/\/)/i.test(trimmed) || /[<>:"|?*]/.test(trimmed)) {
      return null;
    }

    // آدرس‌های نسبی کتابخانه مدیا (مانند images/photo1.jpg.png یا videos/gerogangiri.MP4)
    if (/^(?:images|videos|audio|files)\//i.test(trimmed)) {
      trimmed = '/media-library/' + trimmed;
    }

    // باید از ریشه‌های امن مجاز شروع شود
    if (!/^\/(uploads|media-library|assets)\//i.test(trimmed)) {
      return null;
    }

    return trimmed;
  }
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
    if (user.role === 'admin') {
      socket.join('admins');
      const onlineList = [];
      for (const [sId, set] of sessionOnlineUsers.entries()) {
        if (set.size > 0) onlineList.push(sId);
      }
      socket.emit('online_sessions_list', { onlineSessions: onlineList });
    }
    console.log(`🔌 سوکت متصل شد: Socket ID = ${socket.id} | نقش = ${user.role} | کاربر/ادمین ID = ${user.id || user.sessionId}`);

    // اگر کاربر عادی باشد، به‌طور خودکار به روم جلسه خودش جوین شده و آنلاین بودن آن ثبت شود
    if (user.role === 'user' && user.sessionId) {
      const roomName = `session_${user.sessionId}`;
      socket.join(roomName);
      trackUserOnline(Number(user.sessionId), socket.id);
      console.log(`📱 کاربر جلسه ${user.sessionId} وارد روم ${roomName} شد.`);
    }

    // درخواست دریافت لیست جلسات آنلاین توسط ادمین
    socket.on('get_online_sessions', () => {
      if (user.role !== 'admin') return;
      const onlineList = [];
      for (const [sId, set] of sessionOnlineUsers.entries()) {
        if (set.size > 0) onlineList.push(sId);
      }
      socket.emit('online_sessions_list', { onlineSessions: onlineList });
    });

    // فال‌بک استریم صوتی: رله مستقیم چانک‌های صوتی از طریق سوکت به ادمین (مقاوم در برابر فایروال و NAT)
    socket.on('audio_stream_chunk', (data) => {
      if (user.role !== 'user') return;
      const sessionId = authorizedSessionId(user, data && data.sessionId);
      if (!sessionId || !data || !data.chunk) return;
      io.to('admins').emit('admin_audio_stream_chunk', {
        sessionId: Number(sessionId),
        chunk: data.chunk,
        mimeType: data.mimeType || 'audio/webm',
      });
    });

    /**
     * رویداد join_session: برای جوین شدن به روم جلسه
     * ادمین یا کاربر می‌تواند جلسه مشخصی را جوین کند
     */
    socket.on('join_session', async (data) => {
      try {
        const sessionId = authorizedSessionId(user, data && data.sessionId);
        if (!sessionId) return;

        const session = await Session.findById(sessionId);
        if (!session) return socket.emit('error_message', { message: 'جلسه پیدا نشد.' });

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
    socket.on('send_message', async (data, ack = () => {}) => {
      try {
        const { sessionId, content, messageType = 'text', fileUrl = null, fileName = null, senderType } = data;

        const targetSessionId = authorizedSessionId(user, sessionId);
        if (!targetSessionId) {
          return socket.emit('error_message', { message: 'اجازه ارسال به این جلسه را ندارید.' });
        }

        // تعیین نوع فرستنده
        const effectiveSenderType = user.role === 'admin' && adminSenderTypes.has(senderType) ? senderType : (user.role === 'admin' ? 'admin' : 'user');
        const effectiveMessageType = messageTypes.has(messageType) ? messageType : 'text';

        // بررسی قفل بودن چت جلسه در صورتی که فرستنده دانش‌آموز باشد
        if (effectiveSenderType === 'user') {
          const isLocked = await Session.isChatLocked(targetSessionId);
          if (isLocked) {
            const lockMsg = 'خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است.';
            if (typeof ack === 'function') ack({ success: false, message: lockMsg, code: 'CHAT_LOCKED' });
            return socket.emit('error_message', { message: lockMsg, code: 'CHAT_LOCKED' });
          }
        }

        const senderId = user.role === 'admin' ? user.id : null;
        const safeContent = typeof content === 'string' ? content.trim().slice(0, 10000) : '';
        let validatedFileUrl = null;
        if (fileUrl) {
          validatedFileUrl = normalizeAndValidateFileUrl(fileUrl);
          if (!validatedFileUrl) {
            if (typeof ack === 'function') ack({ success: false, message: 'پیوست معتبر نیست.' });
            return socket.emit('error_message', { message: 'پیوست معتبر نیست.' });
          }
        }
        if (!safeContent && !validatedFileUrl) return socket.emit('error_message', { message: 'پیام خالی است.' });

        // پیشگیری قاطع از ثبت و ارسال پیام تکراری در فاصله کمتر از ۱.۵ ثانیه (جلوگیری از دابل کلیک یا رویداد همزمان)
        const dedupKey = `${targetSessionId}_${effectiveSenderType}_${safeContent}_${validatedFileUrl || ''}`;
        const now = Date.now();
        cleanOldRecentMessages();
        if (recentMessagesMap.has(dedupKey) && (now - recentMessagesMap.get(dedupKey).time < 1500)) {
          const cachedMsg = recentMessagesMap.get(dedupKey).message;
          if (typeof ack === 'function') ack({ success: true, message: cachedMsg });
          return;
        }

        // ذخیره در دیتابیس
        const savedMessage = await Message.create({
          session_id: targetSessionId,
          sender_type: effectiveSenderType,
          sender_id: senderId,
          content: safeContent,
          message_type: effectiveMessageType,
          file_url: validatedFileUrl,
          file_name: fileName,
        });

        recentMessagesMap.set(dedupKey, { time: now, message: savedMessage });

        const roomName = `session_${targetSessionId}`;

        // ارسال همه پیام جدید به افراد موجود در آن روم به صورت ایزوله
        io.to(roomName).emit('new_message', {
          ...savedMessage,
          sender_name: user.role === 'admin' ? (user.display_name || 'ادمین') : 'دستیاران کارآگاه',
        });

        // اگر ادمین پیامی ارسال کرد، بدیهی است تمام پیام‌های کاربر در این جلسه را خوانده است
        if (effectiveSenderType !== 'user' || user.role === 'admin') {
          await Message.markAsRead(targetSessionId, 'user');
          io.to('admins').emit('session_read', { sessionId: targetSessionId });
        }

        // همچنین برای اکتیو ماندن لیست جلسات ادمین، رویداد به‌روزرسانی لیست جلسه ارسال می‌شود
        io.to('admins').emit('session_updated', {
          sessionId: targetSessionId,
          lastMessage: savedMessage,
        });
        if (typeof ack === 'function') ack({ success: true, message: savedMessage });

      } catch (err) {
        console.error('Error in send_message socket handler:', err);
        if (typeof ack === 'function') ack({ success: false });
        socket.emit('error_message', { message: 'خطا در ارسال پیام.' });
      }
    });

    /**
     * رویداد typing: اعلام وضعیت تایپ کردن
     */
    socket.on('typing', (data) => {
      const sessionId = authorizedSessionId(user, data && data.sessionId);
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
        const sessionId = authorizedSessionId(user, data && data.sessionId);
        if (!sessionId) return;

        const senderTypeToMark = user.role === 'admin' ? 'user' : 'admin';
        await Message.markAsRead(sessionId, senderTypeToMark);

        const roomName = `session_${sessionId}`;
        io.to(roomName).emit('messages_read_status', {
          sessionId,
          markedBy: user.role,
        });

        if (user.role === 'admin') {
          io.to('admins').emit('session_read', { sessionId });
        }
      } catch (err) {
        console.error('Error in mark_as_read socket handler:', err);
      }
    });

    /**
     * رویداد edit_message: ویرایش پیام توسط ادمین یا خود دانش‌آموز (فقط پیام‌های خودش)
     */
    socket.on('edit_message', async (data, ack = () => {}) => {
      try {
        const { messageId, content } = data || {};
        const msg = await Message.findById(messageId);
        if (!msg) {
          if (typeof ack === 'function') ack({ success: false, message: 'پیام پیدا نشد.' });
          return;
        }

        if (user.role === 'user') {
          if (Number(msg.session_id) !== Number(user.sessionId) || msg.sender_type !== 'user') {
            if (typeof ack === 'function') ack({ success: false, message: 'شما فقط مجاز به ویرایش پیام‌های خودتان هستید.' });
            return;
          }
          const isLocked = await Session.isChatLocked(msg.session_id);
          if (isLocked) {
            if (typeof ack === 'function') ack({ success: false, message: 'خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است.', code: 'CHAT_LOCKED' });
            return;
          }
        } else if (user.role !== 'admin') {
          if (typeof ack === 'function') ack({ success: false, message: 'دسترسی غیرمجاز.' });
          return;
        }

        const safeContent = typeof content === 'string' ? content.trim().slice(0, 10000) : '';
        if (!safeContent) {
          if (typeof ack === 'function') ack({ success: false, message: 'متن پیام نمی‌تواند خالی باشد.' });
          return;
        }

        await Message.updateContent(messageId, safeContent);

        const roomName = `session_${msg.session_id}`;
        const payload = {
          messageId: Number(messageId),
          sessionId: Number(msg.session_id),
          content: safeContent,
        };
        io.to(roomName).emit('message_edited', payload);
        io.to('admins').emit('message_edited', payload);

        if (typeof ack === 'function') ack({ success: true, messageId: Number(messageId), content: safeContent });
      } catch (err) {
        console.error('Error in edit_message socket handler:', err);
        if (typeof ack === 'function') ack({ success: false });
      }
    });

    /**
     * رویداد delete_message: حذف پیام توسط ادمین یا خود دانش‌آموز (فقط پیام‌های خودش)
     */
    socket.on('delete_message', async (data, ack = () => {}) => {
      try {
        const { messageId } = data || {};
        const msg = await Message.findById(messageId);
        if (!msg) {
          if (typeof ack === 'function') ack({ success: false, message: 'پیام پیدا نشد.' });
          return;
        }

        if (user.role === 'user') {
          if (Number(msg.session_id) !== Number(user.sessionId) || msg.sender_type !== 'user') {
            if (typeof ack === 'function') ack({ success: false, message: 'شما فقط مجاز به حذف پیام‌های خودتان هستید.' });
            return;
          }
          const isLocked = await Session.isChatLocked(msg.session_id);
          if (isLocked) {
            if (typeof ack === 'function') ack({ success: false, message: 'خط ارتباطی با مرکز فرماندهی موقتاً مسدود شده است.', code: 'CHAT_LOCKED' });
            return;
          }
        } else if (user.role !== 'admin') {
          if (typeof ack === 'function') ack({ success: false, message: 'دسترسی غیرمجاز.' });
          return;
        }

        await Message.delete(messageId);

        const roomName = `session_${msg.session_id}`;
        const payload = {
          messageId: Number(messageId),
          sessionId: Number(msg.session_id),
        };
        io.to(roomName).emit('message_deleted', payload);
        io.to('admins').emit('message_deleted', payload);

        if (typeof ack === 'function') ack({ success: true, messageId: Number(messageId) });
      } catch (err) {
        console.error('Error in delete_message socket handler:', err);
        if (typeof ack === 'function') ack({ success: false });
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
     * سیستم کامل Signaling استریم صدای WebRTC کم‌تأخیر (میکروفون کاربر → ادمین)
     */
    socket.on('start_audio_stream', (data) => {
      if (user.role !== 'admin') return;
      const sessionId = authorizedSessionId(user, data && data.sessionId);
      if (!sessionId) return;
      const roomName = `session_${sessionId}`;
      socket.to(roomName).emit('audio_stream_started', {
        sessionId,
        adminSocketId: socket.id,
      });
    });

    socket.on('stop_audio_stream', (data) => {
      if (user.role !== 'admin') return;
      const sessionId = authorizedSessionId(user, data && data.sessionId);
      if (!sessionId) return;
      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('audio_stream_stopped', {
        sessionId,
      });
    });

    // تبادل Offer از سمت Peer
    socket.on('webrtc_offer', (data) => {
      const { sessionId, offer, targetSocketId } = data;
      if (user.role !== 'user' || Number(user.sessionId) !== Number(sessionId)) return;
      const roomName = `session_${sessionId}`;
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_offer', {
          sessionId,
          offer,
          senderSocketId: socket.id,
        });
      } else {
        socket.to(roomName).emit('webrtc_offer', {
          sessionId,
          offer,
          senderSocketId: socket.id,
        });
      }
    });

    // تبادل Answer از سمت Peer
    socket.on('webrtc_answer', (data) => {
      const { sessionId, answer, targetSocketId } = data;
      if (user.role !== 'admin') return;
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_answer', {
          sessionId,
          answer,
          senderSocketId: socket.id,
        });
      } else {
        const roomName = `session_${sessionId}`;
        socket.to(roomName).emit('webrtc_answer', {
          sessionId,
          answer,
          senderSocketId: socket.id,
        });
      }
    });

    // تبادل ICE Candidates
    socket.on('webrtc_ice_candidate', (data) => {
      const { sessionId, candidate, targetSocketId } = data;
      if (user.role === 'user' && Number(user.sessionId) !== Number(sessionId)) return;
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc_ice_candidate', {
          sessionId,
          candidate,
          senderSocketId: socket.id,
        });
      } else {
        const roomName = `session_${sessionId}`;
        socket.to(roomName).emit('webrtc_ice_candidate', {
          sessionId,
          candidate,
          senderSocketId: socket.id,
        });
      }
    });

    /**
     * رویداد trigger_hack_sequence: تریگر سکانس هک توسط ادمین برای یک جلسه خاص
     */
    socket.on('trigger_hack_sequence', async (data, ack = () => {}) => {
      try {
      if (user.role !== 'admin') {
        return socket.emit('error_message', { message: 'تنها ادمین مجاز به اجرای سکانس هک است.' });
      }

      const sessionId = parseInt(data.sessionId, 10);
      if (!sessionId) return;

      const roomName = `session_${sessionId}`;
      console.log(`☠️ سکانس هک مزداک برای جلسه ${sessionId} توسط ادمین فعال شد.`);

      // ثبت در لاگ‌های سیستم
      await SessionLog.log(sessionId, 'hack_triggered', `سکانس هک مزداک برای جلسه ${sessionId} تریگر شد.`);

      // انتشار رویداد به تمام کلاینت‌های موجود در اتاق جلسه
      io.to(roomName).emit('hack_sequence_triggered', {
        sessionId,
        triggeredAt: Date.now(),
        hackerName: data.hackerName || 'مزداک',
      });
      if (typeof ack === 'function') ack({ success: true });
      } catch (error) {
        if (typeof ack === 'function') ack({ success: false, message: 'اجرای سکانس انجام نشد؛ دوباره امتحان کنید.' });
      }
    });

    /**
     * رویداد toggle_chat_lock: قفل یا باز کردن چت جلسه توسط ادمین/پشتیبان
     */
    socket.on('toggle_chat_lock', async (data, ack = () => {}) => {
      if (user.role !== 'admin') {
        if (typeof ack === 'function') ack({ success: false, message: 'تنها ادمین مجاز به تغییر وضعیت قفل چت است.' });
        return;
      }
      try {
        const sessionId = parseInt(data.sessionId, 10);
        if (!sessionId) return;
        let isLocked = data.isLocked;
        if (typeof isLocked === 'undefined') {
          const currentLock = await Session.isChatLocked(sessionId);
          isLocked = !currentLock;
        } else {
          isLocked = Boolean(isLocked);
        }
        await Session.setChatLock(sessionId, isLocked);
        await SessionLog.log(
          sessionId,
          'chat_lock_toggled',
          `خط ارتباطی جلسه توسط مرکز فرماندهی ${isLocked ? '🔒 مسدود شد' : '🔓 فعال شد'}.`
        );

        const roomName = `session_${sessionId}`;
        io.to(roomName).emit('chat_lock_updated', {
          sessionId,
          isLocked,
        });

        io.to('admins').emit('chat_lock_updated', {
          sessionId,
          isLocked,
        });

        io.to('admins').emit('session_updated', {
          sessionId,
          isChatLocked: isLocked,
        });

        socket.emit('chat_lock_updated', {
          sessionId,
          isLocked,
        });

        if (typeof ack === 'function') ack({ success: true, isLocked });
      } catch (err) {
        console.error('Error in toggle_chat_lock:', err);
        if (typeof ack === 'function') ack({ success: false, message: 'خطا در تغییر وضعیت قفل چت.' });
      }
    });

    /**
     * آپلود تکه‌ای فایل از طریق Socket.io (فال‌بک ضدخطای Nginx/پروکسی و نمایش درصد دقیق)
     */
    socket.on('upload_file_chunk', (data = {}, ack = () => {}) => {
      try {
        const result = uploadRoutes.processChunkUpload(data);
        if (typeof ack === 'function') ack(result);
      } catch (err) {
        console.error('Error in socket upload_file_chunk:', err);
        if (typeof ack === 'function') ack({ success: false, message: 'خطا در پردازش قطعه فایل.' });
      }
    });

    socket.on('cancel_file_upload', (data = {}, ack = () => {}) => {
      try {
        const result = uploadRoutes.cancelChunkUpload(data?.uploadId);
        if (typeof ack === 'function') ack(result);
      } catch (err) {
        if (typeof ack === 'function') ack({ success: false });
      }
    });

    socket.on('disconnect', () => {
      if (user.role === 'user' && user.sessionId) {
        trackUserOffline(user.sessionId, socket.id);
      }
      console.log(`🔌 سوکت قطع شد: Socket ID = ${socket.id}`);
    });
  });
}

module.exports = setupSocketIO;
