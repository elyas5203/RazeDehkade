const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ensureMp4FastStartAsync } = require('../src/utils/mp4FastStart');

function atomHeader(size, type) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(size, 0);
  header.write(type, 4, 4, 'ascii');
  return header;
}

test('MP4 upload optimization moves moov without blocking other requests', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raze-faststart-'));
  const videoPath = path.join(dir, 'uploaded.mp4');
  try {
    const fd = fs.openSync(videoPath, 'w');
    try {
      const mediaSize = 8 * 1024 * 1024;
      fs.writeSync(fd, atomHeader(8, 'ftyp'));
      fs.writeSync(fd, atomHeader(mediaSize + 8, 'mdat'));
      fs.writeSync(fd, Buffer.alloc(mediaSize));
      const moov = Buffer.alloc(28);
      moov.writeUInt32BE(28, 0);
      moov.write('moov', 4, 4, 'ascii');
      moov.writeUInt32BE(20, 8);
      moov.write('stco', 12, 4, 'ascii');
      moov.writeUInt32BE(1, 20);
      moov.writeUInt32BE(16, 24);
      fs.writeSync(fd, moov);
    } finally {
      fs.closeSync(fd);
    }

    let eventLoopTicks = 0;
    const timer = setInterval(() => { eventLoopTicks++; }, 1);
    let result;
    try {
      result = await ensureMp4FastStartAsync(videoPath);
    } finally {
      clearInterval(timer);
    }

    assert.equal(result.optimized, true, result.reason);
    assert.ok(eventLoopTicks > 0, 'event loop must keep running during disk copy');
    const verifyFd = fs.openSync(videoPath, 'r');
    try {
      const header = Buffer.alloc(44);
      fs.readSync(verifyFd, header, 0, header.length, 0);
      assert.equal(header.toString('ascii', 12, 16), 'moov');
      assert.equal(header.toString('ascii', 40, 44), 'mdat');
      assert.equal(header.readUInt32BE(32), 44);
    } finally {
      fs.closeSync(verifyFd);
    }
  } finally {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    fs.rmdirSync(dir);
  }
});
