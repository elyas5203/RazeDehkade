# Investigation room and archive — desktop visual overrides

Scope: public/archive.html and public/chat.html only. Admin, authentication, transport and database behavior are outside this redesign. User explicitly requires desktop only; the two-column room and three-folder desk remain intact, with a 1000px minimum canvas.

## Art direction
Tactile detective archive, warm paper under a desk lamp, subdued forest-green communications console. Borrow the physical folders and scene assets from for_sample/first1, and the side-by-side evidence/communications composition from for_sample/sec. Preserve readable Persian typography and quieter metadata.

The existing global design-system terminal/monospace recommendations do not fit Persian narrative text. These page-specific overrides use locally hosted variable Vazirmatn, weight 400–850; monospace is limited to Latin case codes and decorative metadata. Font license is in public/assets/scene/Vazirmatn-OFL.txt.

UI UX Pro Max consulted: design-system query `detective game cinematic immersive` produced an off-target generic system; explicit style query `immersive gaming dark` returned 3D & Hyperrealism, Dark Mode (OLED), and Cyberpunk UI. Use physical depth/shadows from the first and restrained dark contrast from the second; do not use neon monospace as the Persian body style. Apply keyboard focus, reduced-motion and clear feedback rules from references/quick-reference.md.

Research: https://www.gamedeveloper.com/design/true-detective-meets-hearthstone-unlocking-the-metaphysical-mind-place-of-alan-wake-ii — presentation, mood and a case-board environment as part of the investigative experience. This is visual inspiration, not a recreation of its gameplay.

## Visual behavior
- Three paper folders with layered inner sheets, status, photographic cover and one active entry point.
- Active cover rotates around its spine; a location scene crossfades in before entering the room. Reduced motion skips this choreography.
- Pinned evidence cards form a staggered ordered board. Threads cover all visible evidence and update on resizing/loading/filtering. They are decorative, not assertions of inferred case relationships.
- Image/audio-video/document filters, clear empty states, keyboard-accessible evidence dialog.
- Compact attachment receipts keep dialogue prominent. Inputs, real message handlers, upload handlers and media permissions retain their existing logic.
- Empty-board photograph is explicitly labeled as the case atmosphere, not a received clue.

## Verification — 2026-10-02
Inspected in Codex in-app browser with fixture data on localhost:3011. This isolated preview neither authenticates to production nor writes real session data.
- Desktop layouts inspected at 1024×768, 1366×768, 1366×900 and 1440×1000.
- No body horizontal overflow at these desktop widths; send composer stays visible.
- Folder content fits its covers; active action remains above the fold at 1366×768.
- Enter opens active case and navigates to chat; reduced-motion reports 0s transitions and navigates without the long scene.
- Open image evidence, Escape close, document filtering, empty category message and simulated message submission verified through UI.
- Local font and all visible images loaded.
- Existing npm test suite: 19 passed, 0 failed. JS syntax checks passed.
- Preview upload is intentionally unsupported; an attempted upload to the fixture server is not a production regression.

Screenshots: artifacts/archive-redesign.jpg and artifacts/chat-redesign.jpg.
Preview runner: node artifacts/visual-preview.cjs. Preview fixtures are not included in production HTML.
