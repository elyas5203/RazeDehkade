'use strict';
const clockStarted = Date.now();
const clockInterval = setInterval(() => {
  const clockEl = document.getElementById('session-clock');
  if (!clockEl) return;
  const seconds = Math.floor((Date.now() - clockStarted) / 1000);
  clockEl.textContent = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
}, 1000);
window.addEventListener('pagehide', () => { clearInterval(clockInterval); hackEngine.stop(); });

// Presentation-only controls; messages, sessions and transports remain unchanged.
const caseNames = { village: ['راز دهکده', '02'], syndrome: ['سندروم فراموشی', '01'], court: ['دادگاه عدالت', '03'] };
const currentCase = caseNames[sessionData.active_case] || caseNames.village;
const activeCaseTitleEl = document.getElementById('active-case-title');
if (activeCaseTitleEl) activeCaseTitleEl.textContent = currentCase[0];
const activeCaseCodeEl = document.getElementById('active-case-code');
if (activeCaseCodeEl) activeCaseCodeEl.textContent = `CASE / ${currentCase[1]}`;
document.title = `اتاق تحقیقات | ${currentCase[0]}`;
const briefingImage = { village: 'mill', syndrome: 'stranger', court: 'document' }[sessionData.active_case] || 'mill';
const briefingImgEl = document.querySelector('.briefing-photo img');
if (briefingImgEl) briefingImgEl.src = `/assets/scene/${briefingImage}.jpg`;
const briefingSpanEl = document.querySelector('.briefing-photo span');
if (briefingSpanEl) briefingSpanEl.textContent = `فضای پرونده / ${currentCase[0]}`;
if (sessionStorage.getItem('caseEntrance')) {
  document.body.classList.add('room-arrival');
  sessionStorage.removeItem('caseEntrance');
}
let evidenceFilter = 'all';
function applyEvidenceFilter() {
  const cards = [...document.querySelectorAll('.evidence-card')];
  cards.forEach(card => {
    card.hidden = false;
  });
  const filterEmpty = document.querySelector('.filter-empty');
  if (filterEmpty) filterEmpty.hidden = true;
  requestAnimationFrame(updateEvidenceThreads);
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  evidenceFilter = 'all';
  applyEvidenceFilter();
}));
const boardResizeObserver = new ResizeObserver(() => requestAnimationFrame(updateEvidenceThreads));
boardResizeObserver.observe(document.getElementById('evidence-grid'));
document.getElementById('evidence-grid').addEventListener('load', () => requestAnimationFrame(updateEvidenceThreads), true);
document.fonts.ready.then(() => requestAnimationFrame(updateEvidenceThreads));
document.getElementById('evidence-dialog').addEventListener('close', () => {
  document.querySelectorAll('#evidence-dialog audio, #evidence-dialog video').forEach(media => media.pause());
});
window.addEventListener('pagehide', () => boardResizeObserver.disconnect());
