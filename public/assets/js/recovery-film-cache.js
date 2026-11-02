(() => {
  'use strict';
  async function prepare(manifest, onProgress = () => {}) {
    if (!navigator.storage?.getDirectory) throw new Error('ذخیره محلی فیلم در این مرورگر پشتیبانی نمی‌شود.');
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle('recovery-film', { create: true });
    const urls = [];
    try {
      for (let index = 0; index < manifest.segments.length; index++) {
        const segment = manifest.segments[index];
        const response = await fetch(segment.src, { cache: 'no-store' });
        if (!response.ok || !response.body) throw new Error(`دریافت بخش ${index + 1} فیلم کامل نشد.`);
        const expected = Number(response.headers.get('Content-Length'));
        const handle = await folder.getFileHandle(`clip-${index}.mp4`, { create: true });
        const writable = await handle.createWritable();
        let received = 0;
        try {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writable.write(value);
            received += value.byteLength;
            onProgress({ index, received, expected: Number.isFinite(expected) ? expected : 0 });
          }
          if (Number.isFinite(expected) && expected > 0 && received !== expected) throw new Error('فایل فیلم ناقص دریافت شد.');
          await writable.close();
        } catch (error) { await writable.abort().catch(() => {}); throw error; }
        const file = await handle.getFile();
        if (!file.size || file.size !== received) throw new Error('فایل فیلم در حافظه محلی کامل ثبت نشد.');
        urls.push(URL.createObjectURL(file));
      }
      return urls;
    } catch (error) {
      urls.forEach(url => URL.revokeObjectURL(url));
      throw error;
    }
  }
  window.recoveryFilmCache = { prepare };
})();
