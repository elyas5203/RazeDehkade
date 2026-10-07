# Visual redesign — work in progress

## Current implementation

- Replaced user chat with full-height RTL SYSTEM terminal (terminal.css, terminal.js).
- Replaced hack engine with a 28.5 second six-phase narrative, SVG Mazdak mark, low-volume opt-in synthesized sound, reduced-motion treatment, input/focus restoration and repeat-trigger cleanup.
- Replaced gateway, normalized Persian/Arabic digits, short successful-entry transition.
- Replaced delivery with one persisted elapsed-time clock: 30 s countdown / 10 s pure blackout / 3.5 s delivery / 4 s portal.
- Root now opens florist instead of old duplicated gateway.
- Existing 9 integration tests passed after initial terminal changes. Three new hack lifecycle tests pass. Gateway/delivery syntax checked.
- Browser verified gateway and desktop terminal at 1440x900, real login and bidirectional message. Test session in real MySQL is id 1, name بررسی طراحی ترمینال. This is test-created data; preserve until testing completed then archive rather than delete.

## Required before completion

- Redesign florist catalog/cart/checkout with real, appropriate imagery; currently original emoji product placeholders and cheesy text remain.
- Remove remaining user-facing jargon/false claims and stale old unused scripts/styles where appropriate.
- Real browser test all hack phases and recovery; currently not visually verified. CUA browser id 2 tabs: 1 user terminal, 2 admin chat. Native confirm on admin trigger wedged CDP; getJsDialog returned undefined and subsequent focus/close timed out. Read browser-troubleshooting already. Do not assume the trigger fired.
- Replace native hack confirmation with a non-blocking in-page confirmation if needed; avoid false success alert.
- Check chat history/reconnect races: admin had no initial historical user message while subsequent own message appeared. User history currently fetched separately from connect; reconnect does not retrieve missed messages.
- Check admin switch draft/upload isolation and audio cleanup; initial code changes were incomplete despite previous turn's claim of completion.
- Current upload URLs allow arbitrary suffix after /uploads/; escape attribute URLs and validate media paths server-side. Broad socket broadcasts may still leak admin order metadata; audit.
- Full browser delivery timing including refresh/blackout, two sessions, wrong codes, messages/media, mobile, reduced motion, repeated hack. Assert rendered behavior, not only mocked unit tests.
- Fonts currently remote Google @import; consider self-hosting for ready-to-run reliability.
- Capture final screenshots and accurate README/verification notes. Goal remains active, do not claim complete.

## Runtime

`npm start` started at localhost:3000 against real MySQL, exec session 84273 (recheck live handle before starting anything else). Browser created with CUA. Temporary browser viewport 1440x900 must be reset when finished.

## Research and design

References reviewed: https://tympanus.net/codrops/hub/ and cyberpunk interface search results. Main agent read frontend-design skill completely. Palette cold blue #91e3ed, steel #728d9c, ink #050c13, line #263a46, controlled breach red #ef655f. Narrative motion rather than random code flood. User explicitly prioritizes dramatic high-quality terminal/hack and transition; keep refining instead of settling for this first pass.
