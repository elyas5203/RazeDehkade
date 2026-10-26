# System State

## Latest review — 2026-10-26
- **Active task:** `ai-kit/tasks/TASK-009-STREAMABLE-MP4-AND-SUBMISSION-ANSWERS.md`; master: `docs/ai/masters/MASTER_24_STREAMABLE_MP4_AND_SUBMISSION_ANSWERS_DISPATCH.md`.
- **Code:**
  - Implemented `src/utils/videoTranscoder.js`: Mapping of all 12 questions (`QUESTION_LABELS`), formatting full student answers with class name and phone into Persian report (`formatAnswersReport`), faststart FFmpeg transcoding (`transcodeToStreamableMp4`), and streamable wrapper (`ensureStreamableVideo`).
  - Updated `src/services/emergencyVideoQueue.js`: Retrieves `answers_json` from `emergency_auth_submissions` by `reference_code`, embeds full report into caption (with fallback follow-up reply message if length > 1000 bytes), transcodes WebM to faststart MP4, and sends via `sendVideo` with `supports_streaming: true` to enable inline play in Telegram.
  - Updated `public/assets/js/emergency-auth.js`: Prioritizes MP4 container (`video/mp4;codecs=avc1...`) in `MediaRecorder` to bypass server transcoding for compatible browsers (iOS Safari, modern Chrome).
  - Updated `MohtavaTelBot/bot.js`: Implemented `handleEmergencyVideosMenu`, `handleResendLatestVideos`, and `getEmergencyVideosKeyboard` with `/videos` and `/resend_videos`.
  - Added test suite `tests/streamable-mp4-and-submission-answers.test.js`.
- **Verification:** 26/26 test suites pass 100% green.
- **Production:** Installed static FFmpeg 7.0.2 in `/home/user615/RazeDehkade/bin/ffmpeg` on VPS.

## Current Status
- **Active Task:** [TASK-009-STREAMABLE-MP4-AND-SUBMISSION-ANSWERS.md](../tasks/TASK-009-STREAMABLE-MP4-AND-SUBMISSION-ANSWERS.md) — Completed ✅
- **Active Master:** `docs/ai/masters/MASTER_24_STREAMABLE_MP4_AND_SUBMISSION_ANSWERS_DISPATCH.md`
- **All 26 Test Suites:** 100% Passed (All Green)
- **Deployment Status:** Ready for deployment to VPS (`razedehkade.ir`).
