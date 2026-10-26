# System State

## Latest review — 2026-10-26
- **Active task:** `ai-kit/tasks/TASK-010-HACKED-CLASS-DIRECT-EMERGENCY-ROUTING.md`; master: `docs/ai/masters/MASTER_25_HACKED_CLASS_DIRECT_EMERGENCY_ROUTING_AND_PHONE_AUTH.md`.
- **Code:**
  - Updated `src/routes/auth.js`: In `/api/auth/teacher/check`, detects `session.is_hacked` and generates a valid JWT token, returning `isHacked: true` and `redirectUrl: '/emergency-auth.html'`. In `/api/auth/user/join`, attaches valid JWT `token` in the 403 response data for emergency access.
  - Updated `public/index.html`: `handleCustomerLogin` checks `data.isHacked`, stores `userToken`, `userSession`, `teacherPhone`, and `emergency_user_phone`, displays cyber breach alert, and immediately redirects straight to `/emergency-auth.html` without going through `order-status.html`.
  - Updated `public/assets/js/gateway.js`: Captures `result.data.token` and `session` upon cyber breach redirection.
  - Updated `src/routes/emergencyAuth.js`: `/api/emergency-auth/verify-phone` uses `optionalToken` to accept requests both with existing tokens and without tokens (direct phone lookup against `sessions.teacher_phone` and `teachers.phone`), issuing/refreshing JWT tokens and preventing any 401/403 lockouts.
  - Updated `public/assets/js/emergency-auth.js`: Pre-fills phone input from `sessionStorage`, removes premature client throw, and saves newly issued `userToken` and `userSession` from verification response for question answers and video upload.
  - Updated `src/models/Session.js`: Enhanced `findByTeacherPhone` to support phone numbers both with and without leading zero.
  - Added test suite `tests/hacked-class-direct-emergency-routing.test.js`.
- **Verification:** 27/27 test suites pass 100% green.
- **Production:** Ready for deployment to VPS (`razedehkade.ir`).

## Current Status
- **Active Task:** [TASK-010-HACKED-CLASS-DIRECT-EMERGENCY-ROUTING.md](../tasks/TASK-010-HACKED-CLASS-DIRECT-EMERGENCY-ROUTING.md) — Completed ✅
- **Active Master:** `docs/ai/masters/MASTER_25_HACKED_CLASS_DIRECT_EMERGENCY_ROUTING_AND_PHONE_AUTH.md`
- **All 27 Test Suites:** 100% Passed (All Green)
- **Deployment Status:** Ready for deployment to VPS (`razedehkade.ir`).
