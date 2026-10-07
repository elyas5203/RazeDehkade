# Mazdak — awaiting visual approval

Current scope: only the Mazdak sequence. Do not resume the storefront/terminal redesign or broader acceptance audit until the user approves this sequence.

Preview: http://localhost:3000/admin/mazdak-preview.html

The rejected face and photorealistic skull are not referenced or loaded. The warning uses the same Unicode skull-and-crossbones symbol as the reference project (`☠`, text presentation), not a photograph. Reference code/assets were inspected read-only; no audio or sequence code copied.

Duration: 53.5 seconds. Interference (0–4.5), danger (4.5–12.5), failed recovery (12.5–19.5), blackout (19.5–23), incoming signal (23–30.5), takeover (30.5–37.5), typed transmission (37.5–50.5), release (50.5–53.5).

Audio: opt-in Web Audio synthesis with layered alarm, low-frequency drones and filtered seeded noise. No external audio service. Moderate gain; participant/device volume remains operator-controlled. In-scene mute and skip controls; Escape also exits. Reduced-motion support. One absolute timeline, duplicate-trigger guard, focus/inert restoration, audio node cleanup.

Files: public/assets/js/hack-sequence.js, public/assets/css/breach.css, public/admin/mazdak-preview.html, tests/hack-sequence.test.js.

This is a review candidate, not a claim that the user has approved the look or that the entire application is production-ready.

Technical follow-up: 8 sequence-specific automated tests pass, including mock Web Audio graph creation/teardown, 53.5-second boundary, duplicate trigger, reduced motion, Escape/skip, prior inert restoration, and synchronized scene/terminal/preview sound controls. Real browser playback previously reached its automatic end with no remaining audio sources and restored input. These checks do not establish subjective horror quality; visual approval remains outstanding.
