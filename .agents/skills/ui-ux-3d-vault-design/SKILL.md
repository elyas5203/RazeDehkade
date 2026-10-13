---
name: ui-ux-3d-vault-design
description: UI/UX Pro Max skill for full-bleed photorealistic 3D Real Physical Commercial/Bank Steel Vaults (گاوصندوق واقعی اسناد محرمانه), full-viewport (100vw x 100vh) zoomed-in steel vault door with centered 3-spoke handle in its right circular hub, 3-turn unlock choreography + right-side 5 steel bolts retraction + zoom-out shrink, and studio-grade photorealistic Manila/Kraft classified pocket envelope with internal paper emergence.
---

# UI/UX Pro Max: Full-Screen Steel Vault Door (3-Turn Handle + Retracting Right Bolts + Zoom-Out Shrink) & Photorealistic Kraft Pocket Envelope (V9.0)

## 1. Full-Viewport Steel Vault Door (`#vault-password-dialog`)
- **Full-Screen Slab (`100vw × 100vh`)**: Uses `real-vault-door-body.jpg` (`1016 × 836`, where the 5 right bolts have been cleanly separated from the channel).
- **Exact 3-Spoke Chrome Handle Placement**:
  - In `real-vault-door-body.jpg`, the circular brushed-steel handle hub is centered at **`left: 65.5%; top: 50.2%`**.
  - `#fullscreen-vault-handle` (`real-chrome-handle.png`) MUST be positioned at `left: 65.5%; top: 50.2%; transform: translate(-50%, -50%)` so it sits dead-center inside its circular hub on the right side of the door.
- **Left-Mounted Keypad Escutcheon**:
  - `.vault-mounted-escutcheon` is positioned at `left: 33.5%; top: 50.2%; transform: translate(-50%, -50%)` over the left lock-plate area of the door.
- **Strict 4-Digit Maximum Input**:
  - `#vault-code-input` enforces `maxlength="4"` in HTML and blocks any 5th character in both `appendVaultKeypadChar()` and keyboard `input` listeners.
- **Right-Side 5 Steel Locking Bolts Retraction (`#fullscreen-vault-bolts-strip` & `.vault-card-bolts-strip`)**:
  - Placed inside an `overflow: hidden` channel container at **`left: 90.35%; top: 25.36%; width: 5.71%; height: 49.40%`**.
  - When unlocking, `real-vault-bolts-strip.png` physically slides left (`transform: translateX(-105%)`) into the door body, revealing the empty recessed steel channel underneath.
- **3-Turn + Retract + Zoom-Out Choreography**:
  1. On valid 4-digit code (`1405`, `6062`, `1001`, `2002`), `#vault-password-dialog` stays open and gets `.is-unlocking-fullscreen`.
  2. `#fullscreen-vault-handle` rotates **3 full turns (`rotate(1080deg)`)** over `3.4s` while `#fullscreen-vault-bolts-strip` retracts inward (`translateX(-105%)`).
  3. At `3.45s`, `#vault-password-dialog` gets `.is-shrinking-to-slot` (`scale(1) -> scale(0.22)`, `opacity: 0` over `0.65s`), zooming back into the Slot 4 vault card.
  4. At `4.1s`, `#vault-password-dialog` closes and the Slot 4 3D vault door swings open out of its frame (`rotateY(-118deg)`), followed by the Kraft envelope modal.

## 2. Studio-Grade Photorealistic Manila/Kraft Pocket Envelope (`#vault-reward-dialog`)
- **Photorealistic Assets (`692 × 1012`)**:
  - `real-kraft-back-inside.png` (`z-index: 10`): Deep interior mouth of the envelope at the top.
  - `real-kraft-flap.png` (`z-index: 40` when closed, `z-index: 10` when open): Top flap that hinges open (`transform-origin: top center; transform: rotateX(178deg)`).
  - `real-kraft-pocket-front.png` (`z-index: 30`): Opaque front pocket wall with curved thumb-notch lip at `top: 5.2%`, stitched borders, lower cardboard button, red twine, and distressed crimson **`خیلی محرمانه`** rubber stamp.
  - `real-kraft-closed-top.png` (`z-index: 41` when closed, `opacity: 0` when open): Seamless closed top flap + full figure-8 red twine closure.
- **Paper Emerging From INSIDE the Pocket (`z-index: 20`)**:
  - `.kraft-paper-slot` sits at **`z-index: 20`** — strictly in front of `.kraft-back-inside` and the opened `.kraft-top-flap` (`z-index: 10`), and strictly behind `.kraft-front-pocket` (`z-index: 30`).
  - The invitation paper (`#vault-reward-main-img`) slides upward from `translateY(76%)` to `translateY(-18%)`, so its bottom edge remains tucked inside the front pocket while its upper 82% emerges out of the pocket mouth in front of the open flap.
- **Zero Extra Buttons**:
  - No `.kraft-floating-actions` or thumbnail pills at the bottom of the envelope modal; only the corner `×` close button (`#vault-reward-close`).
