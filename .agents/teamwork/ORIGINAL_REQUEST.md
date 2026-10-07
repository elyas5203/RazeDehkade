# Original User Request

## 2026-10-03T12:03:29Z

# Teamwork Project Prompt — Implementation of Master Plan

> Status: Launched
> Goal: Execute MASTER_PLAN.md for RazeDehkade interactive detective game
> Requested team: full team

Implement all 10 phases detailed in `MASTER_PLAN.md` for the detective game platform at `c:\xampp\htdocs\RazeDehkade`.

Working directory: c:\xampp\htdocs\RazeDehkade
Integrity mode: development

## Requirements

### R1. Real-time Session Sorting (Admin Chat)
Sort session list in real time by `last_activity_at` / latest message in `admin-chat.js` and `src/models/Session.js`.

### R2. Database Seeding & Session CRUD
Create `src/db/seed-classes.js` to seed 22 specific student groups with appropriate active/locked/solved case statuses (`syndrome`, `village`, `court`). Ensure session names are private to admin only (users see "دستیاران کارآگاه"). Implement `PUT` (edit) and `DELETE` (delete) endpoints and UI dialogs for sessions in `src/routes/sessions.js` and `public/admin/dashboard.html`.

### R3. Visual Case Lock & Solved Stamp Icons
In `public/archive.html`, `public/assets/js/archive.js`, `public/assets/css/archive.css`: render a large prominent lock overlay for `locked` cases, and an authentic red/gold "مختومه / حل‌شده (SOLVED)" stamp for `solved` cases.

### R4. Login Page Color Theme Alignment
Align `public/enter-code.html` and `public/assets/css/gateway.css` color theme from icy blue to dark emerald noir/green (`#07100c`, `#85bcac`, `#d6b579`) matching the chat/investigation theme.

### R5. Mobile-First Responsive Admin Chat
Redesign `public/assets/css/admin.css` and `public/admin/chat.html` to be fully responsive on smartphones with tab/drawer navigation, touch-friendly controls, and un-hidden command actions.

### R6. Session Isolation & Hack Targeting
Enforce strict session isolation in Socket.io (`roomName = session_${id}`) and client handlers so hack sequence and media streams only target the active session.

### R7. Google Chrome Autoplay & Media Compliance
Add AudioContext pre-warming on first gesture in `user-chat.js`, fallback un-mute banner on blocked autoplay, and proper `playsinline` attributes on video/audio.

### R8. Decoupled Admin Files & README Documentation
Create a dedicated "فایل‌های ادمین" panel/modal in admin chat to select/send pre-uploaded server files in `public/media-library/`. Document exact directory paths in `README.md`.

### R9. Canned Responses Edit & Delete UI
Add Edit (✏️) and Delete (🗑️) UI controls to Canned Responses chips/modal in `admin-chat.js` connecting to existing backend routes.

### R10. Store Improvements (Quantity Stepper & Floating Cart Button)
In `public/golha/index.html`: replace single add-to-cart button with dynamic quantity stepper (`-` count `+`), stop auto-opening drawer on click, add a floating cart button at bottom-left, and remove out-of-character admin text from user view.

## Acceptance Criteria

### Verification & Testing
- [ ] `npm test` passes all tests cleanly.
- [ ] `npm run seed` populates 22 groups with valid 6-digit codes.
- [ ] Admin chat real-time sorting brings active sessions to top.
- [ ] Mobile view of admin chat displays full navigation and usable chat controls.
- [ ] Locked cases exhibit prominent lock badges and solved cases exhibit "SOLVED" stamps.
- [ ] User login page uses green emerald theme matching chat page.
- [ ] Product cards in store feature + / - quantity steppers and floating cart button opens drawer.
