const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const Message = require('../models/Message');
const Session = require('../models/Session');
const MediaRegistry = require('../models/MediaRegistry');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const libraryRoot = path.resolve(__dirname, '..', '..', 'public', 'media-library');
const extensionTypes = {
  '.mp4': 'video', '.webm': 'video', '.mov': 'video',
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image',
  '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.m4a': 'audio',
};

router.use(requireAdmin);

function normalizeLibraryName(value) {
  const raw = String(value || '').trim().replace(/\\/g, '/');
  if (!raw || raw.includes('\0') || raw.startsWith('/') || raw.split('/').includes('..')) return null;
  const normalized = path.posix.normalize(raw).replace(/^\.\//, '');
  if (!normalized || normalized === '.' || normalized.startsWith('../')) return null;
  return normalized;
}

function resolveLibraryFile(name) {
  const normalized = normalizeLibraryName(name);
  if (!normalized) return null;
  const absolute = path.resolve(libraryRoot, ...normalized.split('/'));
  if (absolute !== libraryRoot && !absolute.startsWith(`${libraryRoot}${path.sep}`)) return null;
  return { normalized, absolute };
}

function mediaType(name) {
  const extension = path.extname(name).toLowerCase();
  if (extension === '.webm' && String(name).replace(/\\/g, '/').startsWith('audio/')) return 'audio';
  return extensionTypes[extension] || 'file';
}

router.get('/', async (req, res) => {
  try {
    const files = await MediaRegistry.findAll();
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error listing media library:', error);
    res.status(500).json({ success: false, message: 'خواندن پوشه مدیا انجام نشد.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, title } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: 'نام و نوع فایل اجباری است.' });
    const record = await MediaRegistry.create({ name, type, title });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Error saving media:', error);
    res.status(500).json({ success: false, message: 'ثبت فایل مدیا انجام نشد.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await MediaRegistry.delete(req.params.id);
    res.json({ success: true, message: 'فایل مدیا حذف شد.' });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ success: false, message: 'حذف فایل مدیا انجام نشد.' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const sessionId = Number.parseInt(req.body.sessionId, 10);
    const resolved = resolveLibraryFile(req.body.name);
    if (!sessionId || !resolved) return res.status(400).json({ success: false, message: 'نام فایل معتبر نیست.' });

    const [session, stat] = await Promise.all([
      Session.findById(sessionId),
      fs.stat(resolved.absolute).catch(() => null),
    ]);
    if (!session) return res.status(404).json({ success: false, message: 'جلسه پیدا نشد.' });
    if (!stat || !stat.isFile()) return res.status(404).json({ success: false, message: 'این فایل در پوشه مدیا نیست' });

    const title = String(req.body.title || '').trim().slice(0, 500);
    const type = mediaType(resolved.normalized);
    const messageType = type === 'audio' ? 'voice' : type;
    const url = `/media-library/${resolved.normalized.split('/').map(encodeURIComponent).join('/')}`;

    const message = await Message.create({
      session_id: sessionId,
      sender_type: 'admin',
      sender_id: req.user.id,
      content: title,
      message_type: messageType,
      file_url: url,
      file_name: path.posix.basename(resolved.normalized),
    });

    const io = req.app.get('io');
    io.to(`session_${sessionId}`).emit('new_message', message);
    io.to('admins').emit('session_updated', { sessionId, lastMessage: message });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error sending library media:', error);
    res.status(500).json({ success: false, message: 'ارسال مدیا انجام نشد.' });
  }
});

module.exports = router;
module.exports.normalizeLibraryName = normalizeLibraryName;
module.exports.mediaType = mediaType;
