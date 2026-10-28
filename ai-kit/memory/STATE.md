# System State

## Latest review — 2026-10-27
- **Active task:** `ai-kit/tasks/TASK-011-CINEMATIC-BREACH-CHOREOGRAPHY-AND-STORYLINE.md`; master: `docs/ai/masters/MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md`.
- **Code:**
  - Updated `public/assets/js/cyber-breach-engine.js`:
    - Added `v3_cinematic_story` with all 24 exact scripted dialogue turns and choreography sequences requested by the user.
    - Initial start maintains student chat active and unlocked (`unlockChatInput()`) while Detective initiates communication.
    - Added security terminal red warming transition (`#security-terminal.breach-warming-up`) at T=20s.
    - Added evidence board images flickering and glitching (`.evidence-flickering`) at T=42s.
    - Signal lost blackout curtain with pulsating heartbeat LED red dot triggers immediately after infiltrator discovery (T=60s).
    - Upon blackout conclusion (T=67s), watermark background (`.mazdak-bg`) is applied to messages box and evidence board, all evidence cards get corrupted Mazdak covers, and chat input locks (`lockChatInput()`).
    - Implemented `simulateGhostTypingWithErase` for ghost typing boast text, pausing for human reading, backspacing/erasing, and typing/sending the spoofed message.
    - Implemented `triggerBreachScreenJump()` with violent screen shake (`breach-jump-shake`), loud audio impact, and glitch sound upon Mazdak unmasking.
    - Implemented Detective lockdown countdown (5, 4, Mazdak interruption, 3, 2, 1).
    - At countdown 1 (T=262s), opens emergency evacuation modal "کانال امن را ترک کنید" with 10-second countdown; upon expiration, automatically redirects to `/emergency-auth.html`.
    - Maintained full reversibility: passing `?scenario=v2` or `window.CYBER_SCENARIO_VERSION = 'v2'` runs previous psychological scenario.
  - Updated `public/assets/css/cyber-breach-engine.css`: Added styles for `.breach-warming-up`, `.evidence-flickering`, `.evidence-board.mazdak-bg`, `.breach-jump-shake`, `.ejection-countdown-box`, and `.mazdak-chat-watermark` (with 0.40 opacity and contrast).
  - Replaced breach siren with user's uploaded realistic studio siren track (`public/assets/sounds/cyber-alarm.mp3`, 1.6MB, 50s):
    - Refactored `BreachSirenSynthesizer` to drive this high-fidelity audio track with loop management, smooth fade-in/fade-out, dynamic ducking (to 0.12 during Detective dialogues and ghost typing), and swelling (to 0.65 on threat climax).
    - Preserved Web Audio Context (`this.ctx`) for pneumatic buildup, whoosh and mechanical SFX.
    - Preserved old track in `public/assets/sounds/cyber-alarm.old.mp3` for backup.
  - Removed intrusive HUD act card popups ("شروع هک", "افشای چهره نفوذگر") per user request.
  - Replaced all evidence card images with `/mazdak.jpg` upon breach.
  - Fixed scenario hang after message "ااااااااااه..." by extending `this.duration` to 280 seconds in `v3_cinematic_story`.
  - Updated `public/chat.html`: Bumped cache-busters to `v=20261027_0600`.
  - Added test suite `tests/cinematic-breach-choreography.test.js` (10/10 passed).
- **Verification:** All 29 test suites pass 100% green.
- **Production:** Successfully deployed to VPS (`razedehkade.ir`).

## Current Status
- **Active Task:** [TASK-011-CINEMATIC-BREACH-CHOREOGRAPHY-AND-STORYLINE.md](../tasks/TASK-011-CINEMATIC-BREACH-CHOREOGRAPHY-AND-STORYLINE.md) — Completed ✅
- **Active Master:** `docs/ai/masters/MASTER_28_CINEMATIC_BREACH_CHOREOGRAPHY_AND_STORYLINE.md`
- **All 29 Test Suites:** 100% Passed (All Green)
- **Deployment Status:** Ready for deployment to VPS (`razedehkade.ir`).

## Latest review — 2026-10-27 (Strict Sequential Choreography & Zero Auto-Redirect)
- **Active task:** TASK-011 / MASTER-28.
- **Code:**
  - In `public/assets/js/cyber-breach-engine.js`:
    - Replaced independent time-based message triggers with strictly sequenced asynchronous execution (`runPostBlackoutSequence`):
      Every ghost typing, pause for reading, backspacing, typing of spoofed message, and sending into chat MUST fully complete before the subsequent message triggers.
      Detective messages now strictly await the arrival of the spoofed student messages, eliminating any race conditions or out-of-order dialogue delivery.
    - Completely disabled automatic redirection (`executeEjectionRedirect()`) upon the expiration of the 10-second countdown in the eviction modal. Students stay locked on the site URL copy screen.
    - Subsequent visits or page refreshes are handled by existing server hack checks in `user-chat.js` which direct them to `/emergency-auth.html`.
    - Bumped cache-busting version in `public/chat.html` to `v=20261027_0840`.
- **Verification:** All 29 test suites passing 100% green locally and remotely.
- **Production:** Successfully deployed to VPS (`razedehkade.ir`) and restarted PM2.

## Pacing Extension & Text Cleanup Update — 2026-10-27
- **Code:**
  - Extended all message intervals and ghost typing hold times in `public/assets/js/cyber-breach-engine.js`:
    - Composer reading hold increased to 8–8.5 seconds so students can read full Persian paragraphs before erasing.
    - Detective response pauses increased to 9–12 seconds, creating realistic suspense and conversation tempo.
    - Confrontation and unmasking dialogue intervals increased to 6–7 seconds each.
  - Completely removed the phrase "منتظر پیام مرکز فرماندهی بمانید" from the final eviction notice.
  - Maintained zero automatic redirect policy upon timer expiration.
  - Bumped cache-buster to `v=20261027_0900`.
- **Verification:** All 29 test suites passing 100% green.
- **Production:** Successfully deployed to VPS (`razedehkade.ir`) and restarted PM2.
