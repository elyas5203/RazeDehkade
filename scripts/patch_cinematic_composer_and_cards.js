const fs = require('fs');
const path = require('path');

// 1. Patch cyber-breach-engine.css
const engineCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'cyber-breach-engine.css');
let engineCss = fs.readFileSync(engineCssPath, 'utf8');

// Normalize CRLF to LF temporarily for robust regex matching, then we can write back cleanly
const hasCrlf = engineCss.includes('\r\n');
engineCss = engineCss.replace(/\r\n/g, '\n');

// 1.1 Card blackout filter removal
const cardBlackoutPattern = /\.evidence-card\.card-blackout\s*\{[^}]+\}/;
const newCardBlackout = `.evidence-card.card-blackout {
  border: 1.5px solid rgba(255, 0, 60, 0.85) !important;
  box-shadow: 0 0 18px rgba(255, 0, 60, 0.55), inset 0 0 15px rgba(255, 0, 60, 0.3) !important;
  pointer-events: none;
  transition: all 0.4s ease;
  background: #110508 !important;
  position: relative !important;
  overflow: hidden !important;
}

.evidence-card.card-blackout .evidence-photo-box img {
  opacity: 1 !important;
  filter: none !important;
}

.evidence-card.card-blackout .card-glitch-overlay {
  display: none !important;
}`;

if (!cardBlackoutPattern.test(engineCss)) {
  console.error('cardBlackoutPattern NOT found in cyber-breach-engine.css');
} else {
  engineCss = engineCss.replace(cardBlackoutPattern, newCardBlackout);
  console.log('Successfully patched .evidence-card.card-blackout');
}

// 1.2 Evidence glitch cover styling (z-index 100, full clarity)
const glitchCoverPattern = /\.evidence-card \.evidence-mazdak-glitch-cover\s*\{[^}]+\}/;
const newGlitchCover = `.evidence-card .evidence-mazdak-glitch-cover {
  position: absolute !important;
  inset: 0 !important;
  z-index: 100 !important;
  background: #0d0205 !important;
  border-radius: inherit !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1.5px solid rgba(255, 0, 60, 0.85) !important;
  box-shadow: 0 0 18px rgba(255, 0, 60, 0.6) !important;
  pointer-events: none !important;
}`;

if (!glitchCoverPattern.test(engineCss)) {
  console.error('glitchCoverPattern NOT found in cyber-breach-engine.css');
} else {
  engineCss = engineCss.replace(glitchCoverPattern, newGlitchCover);
  console.log('Successfully patched .evidence-card .evidence-mazdak-glitch-cover');
}

// 1.3 Glitch cover img
const glitchCoverImgPattern = /\.evidence-card \.evidence-mazdak-glitch-cover img\s*\{[^}]+\}/;
const newGlitchCoverImg = `.evidence-card .evidence-mazdak-glitch-cover img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  filter: contrast(1.15) brightness(1.05) !important;
  opacity: 1 !important;
  display: block !important;
}`;
if (!glitchCoverImgPattern.test(engineCss)) {
  console.error('glitchCoverImgPattern NOT found');
} else {
  engineCss = engineCss.replace(glitchCoverImgPattern, newGlitchCoverImg);
  console.log('Successfully patched .evidence-card .evidence-mazdak-glitch-cover img');
}

// 1.4 Ghost typing composer auto-expansion
const ghostTypingPattern = /\.composer-input\.ghost-typing-active,\s*#msg-input\.ghost-typing-active,\s*#msg-input:disabled\.ghost-typing-active,\s*#msg-input\[readonly\]\.ghost-typing-active\s*\{[^}]+\}/;
const newGhostTyping = `.composer-input.ghost-typing-active,
#msg-input.ghost-typing-active,
#msg-input:disabled.ghost-typing-active,
#msg-input[readonly].ghost-typing-active {
  background: #050b12 !important;
  color: #00ffcc !important;
  -webkit-text-fill-color: #00ffcc !important;
  opacity: 1 !important;
  border: 2px solid #00ffcc !important;
  box-shadow: 0 0 25px rgba(0, 255, 204, 0.7), inset 0 0 15px rgba(0, 255, 204, 0.35) !important;
  font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, monospace !important;
  font-size: 15.5px !important;
  font-weight: 800 !important;
  text-shadow: 0 0 10px rgba(0, 255, 204, 0.9) !important;
  caret-color: #00ffcc !important;
  letter-spacing: 0.5px !important;
  animation: ghostInputPulse 1.2s infinite alternate ease-in-out !important;
  min-height: 68px !important;
  max-height: 220px !important;
  line-height: 1.6 !important;
  overflow-y: hidden !important;
  padding: 10px 12px !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
  box-sizing: border-box !important;
}`;
if (!ghostTypingPattern.test(engineCss)) {
  console.error('ghostTypingPattern NOT found');
} else {
  engineCss = engineCss.replace(ghostTypingPattern, newGhostTyping);
  console.log('Successfully patched ghost typing input style');
}

// 1.5 Body cyber breach active composer input override
const bodyGhostInputPattern = /body\.cyber-breach-active #msg-input\.ghost-typing-active\s*\{[^}]+\}/;
const newBodyGhostInput = `body.cyber-breach-active #msg-input.ghost-typing-active {
  background: #102024 !important; color: #dbffed !important;
  -webkit-text-fill-color: #dbffed !important;
  border: 2px solid #8bdbc4 !important;
  box-shadow: 0 0 0 3px #8bdbc444, 0 0 28px #9bffd544 !important;
  text-shadow: none !important; font-size: 16px !important;
  min-height: 68px !important;
  line-height: 1.6 !important;
  white-space: pre-wrap !important;
  overflow-y: hidden !important;
}`;
if (!bodyGhostInputPattern.test(engineCss)) {
  console.error('bodyGhostInputPattern NOT found');
} else {
  engineCss = engineCss.replace(bodyGhostInputPattern, newBodyGhostInput);
  console.log('Successfully patched body cyber-breach-active ghost-typing-active');
}

// Convert back to CRLF
if (hasCrlf) {
  engineCss = engineCss.replace(/\n/g, '\r\n');
}
fs.writeFileSync(engineCssPath, engineCss, 'utf8');

// 2. Patch akbari-breach-master.css
const akbariCssPath = path.join(__dirname, '..', 'public', 'assets', 'css', 'akbari-breach-master.css');
let akbariCss = fs.readFileSync(akbariCssPath, 'utf8');
const akbariHasCrlf = akbariCss.includes('\r\n');
akbariCss = akbariCss.replace(/\r\n/g, '\n');

akbariCss = akbariCss.replace(
  /\.evidence-card\.card-blackout \.evidence-photo-box img\s*\{[^}]+\}/,
  `.evidence-card.card-blackout .evidence-photo-box img {
  filter: none !important;
  opacity: 1 !important;
}`
);

akbariCss = akbariCss.replace(
  /\.evidence-card\.card-blackout \.card-glitch-overlay\s*\{\s*display:\s*flex\s*!important;/,
  `.evidence-card.card-blackout .card-glitch-overlay {
  display: none !important;`
);

if (akbariHasCrlf) {
  akbariCss = akbariCss.replace(/\n/g, '\r\n');
}
fs.writeFileSync(akbariCssPath, akbariCss, 'utf8');

console.log('All CSS patches applied successfully.');
