/* Local image inspection lens shared by evidence and assistant lightboxes. */
(() => {
  'use strict';

  const MIN_ZOOM = 1.5;
  const MAX_ZOOM = 6;
  const DEFAULT_ZOOM = 2.2;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  window.createImageMagnifier = function createImageMagnifier({ stage, image, badge, zoomIn, zoomOut, reset }) {
    if (!stage || !image) return null;

    const lens = document.createElement('div');
    lens.className = 'image-magnifier-lens';
    lens.setAttribute('aria-hidden', 'true');
    lens.hidden = true;
    const handle = document.createElement('span');
    handle.className = 'image-magnifier-handle';
    const grip = document.createElement('span');
    grip.className = 'image-magnifier-grip';
    handle.appendChild(grip);
    lens.appendChild(handle);
    const lensView = document.createElement('div');
    lensView.className = 'image-magnifier-lens-view';
    const lensImage = document.createElement('img');
    lensImage.alt = '';
    lensImage.draggable = false;
    lensView.appendChild(lensImage);
    lens.appendChild(lensView);
    stage.appendChild(lens);

    let zoom = DEFAULT_ZOOM;
    let point = null;
    let touchActive = false;

    function imageRect() {
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) return null;
      const box = image.getBoundingClientRect();
      const fit = getComputedStyle(image).objectFit;
      if (fit !== 'contain') return box;
      const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
    }

    function draw() {
      if (badge) badge.textContent = `${Math.round(zoom * 100).toLocaleString('fa-IR')}٪`;
      const rect = imageRect();
      if (!point || !rect || !rect.width || !rect.height) {
        lens.hidden = true;
        return;
      }
      const x = clamp(point.x, 0, rect.width);
      const y = clamp(point.y, 0, rect.height);
      const stageRect = stage.getBoundingClientRect();
      // Reveal before measuring: a hidden lens has zero width on its first frame.
      lens.hidden = false;
      const radius = lensView.offsetWidth / 2;
      lens.style.left = `${rect.left - stageRect.left + x}px`;
      lens.style.top = `${rect.top - stageRect.top + y}px`;
      lensImage.style.width = `${rect.width * zoom}px`;
      lensImage.style.height = `${rect.height * zoom}px`;
      lensImage.style.left = `${radius - x * zoom}px`;
      lensImage.style.top = `${radius - y * zoom}px`;
      const source = image.currentSrc || image.src;
      if (lensImage.src !== source) lensImage.src = source;
      lens.hidden = false;
    }

    function setPoint(clientX, clientY) {
      const rect = imageRect();
      if (!rect || clientX < rect.left || clientX > rect.left + rect.width || clientY < rect.top || clientY > rect.top + rect.height) {
        point = null;
      } else {
        point = { x: clientX - rect.left, y: clientY - rect.top };
      }
      draw();
    }

    function changeZoom(delta) {
      zoom = clamp(Math.round((zoom + delta) * 10) / 10, MIN_ZOOM, MAX_ZOOM);
      draw();
    }

    function onPointerMove(event) {
      if (event.pointerType === 'touch' && !touchActive) return;
      setPoint(event.clientX, event.clientY);
    }
    function onPointerDown(event) {
      if (event.pointerType !== 'touch') return;
      touchActive = true;
      stage.setPointerCapture(event.pointerId);
      setPoint(event.clientX, event.clientY);
    }
    function onPointerUp() { touchActive = false; }
    function onPointerLeave(event) {
      if (event.pointerType === 'touch') return;
      point = null;
      draw();
    }
    function onWheel(event) {
      const rect = imageRect();
      if (!rect || event.clientX < rect.left || event.clientX > rect.left + rect.width || event.clientY < rect.top || event.clientY > rect.top + rect.height) return;
      if (event.cancelable) event.preventDefault();
      setPoint(event.clientX, event.clientY);
      changeZoom(event.deltaY < 0 ? 0.2 : -0.2);
    }
    function onKeyDown(event) {
      const rect = imageRect();
      if (!rect) return;
      if (event.key === 'Escape') {
        if (lens.hidden) return;
        point = null;
        draw();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key === '+' || event.key === '=') changeZoom(0.2);
      else if (event.key === '-') changeZoom(-0.2);
      else if (event.key.startsWith('Arrow')) {
        if (!point) point = { x: rect.width / 2, y: rect.height / 2 };
        const step = event.shiftKey ? 40 : 20;
        if (event.key === 'ArrowLeft') point.x -= step;
        else if (event.key === 'ArrowRight') point.x += step;
        else if (event.key === 'ArrowUp') point.y -= step;
        else if (event.key === 'ArrowDown') point.y += step;
        else return;
        point.x = clamp(point.x, 0, rect.width);
        point.y = clamp(point.y, 0, rect.height);
        draw();
      } else return;
      event.preventDefault();
      event.stopPropagation();
    }
    function onFocus() {
      const rect = imageRect();
      if (rect) point = { x: rect.width / 2, y: rect.height / 2 };
      draw();
    }
    function hide() { point = null; draw(); }
    function onZoomIn() { changeZoom(0.2); }
    function onZoomOut() { changeZoom(-0.2); }
    function onReset() { zoom = DEFAULT_ZOOM; draw(); }

    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('pointerleave', onPointerLeave);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('keydown', onKeyDown);
    stage.addEventListener('focus', onFocus);
    stage.addEventListener('blur', hide);
    image.addEventListener('load', draw);
    zoomIn?.addEventListener('click', onZoomIn);
    zoomOut?.addEventListener('click', onZoomOut);
    reset?.addEventListener('click', onReset);
    draw();

    return {
      hide,
      reset: onReset,
      destroy() {
        stage.removeEventListener('pointermove', onPointerMove);
        stage.removeEventListener('pointerdown', onPointerDown);
        stage.removeEventListener('pointerup', onPointerUp);
        stage.removeEventListener('pointercancel', onPointerUp);
        stage.removeEventListener('pointerleave', onPointerLeave);
        stage.removeEventListener('wheel', onWheel);
        stage.removeEventListener('keydown', onKeyDown);
        stage.removeEventListener('focus', onFocus);
        stage.removeEventListener('blur', hide);
        image.removeEventListener('load', draw);
        zoomIn?.removeEventListener('click', onZoomIn);
        zoomOut?.removeEventListener('click', onZoomOut);
        reset?.removeEventListener('click', onReset);
        lens.remove();
      }
    };
  };
})();
