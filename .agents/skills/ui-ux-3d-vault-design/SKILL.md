---
name: ui-ux-3d-vault-design
description: >-
  Specialized UI/UX design and front-end engineering skill for 3D interactive vaults, safes,
  tactile mechanical locks, detective-noir glassmorphism, and cinematic multi-stage unlock
  choreography in web applications.
---

# UI/UX Pro Max: 3D Interactive Vault & Detective-Noir Mechanical Lock Design

## 1. Core Design Philosophy (Psychological Hook & Tactile Realism)
- **The Mystery Hook (`?`)**: When a locked element is visible from Session 1 but only unlocked at the finale (or via per-session flags), it must act as a **visual magnet**. Combine a deep brushed-steel & antique-brass 3D safe door with a floating, breathing holographic `?` emblem (`#f59e0b` gold + `#38bdf8` cyan aura) so users constantly wonder what is hidden inside.
- **Tactile Materiality**: Avoid flat 2D icons. Use layered CSS 3D transforms (`perspective: 900px`, `transform-style: preserve-3d`), `conic-gradient` brushed metal surfaces, specular highlights, recessed bevels (`inset` box-shadows), heavy hinges, locking bolts, and a 3D spoked rotary handle (`دستگیره چرخشی گاوصندوق`).

## 2. Multi-Stage Unlock Choreography (Strict Sequence)
Never jump straight from password submit to the reward image. Follow a deliberate, suspense-building 4-stage choreography:
1. **Stage 1 — Password / Flag Modal Validation**:
   - **Wrong Code**: Trigger a horizontal recoil shake (`@keyframes vault-error-shake`), crimson LED pulse (`#ef4444`), tactile error audio buzz, and clear Persian feedback (`رمز واردشده نادرست است — قفل گاوصندوق باز نشد`).
   - **Correct Code (Session/Stage Flag)**: Show brief emerald confirmation (`رمز تایید شد!`), then **immediately close the password popup** (`#vault-password-dialog.close()`) so the user's full attention returns to the 3D Vault in Slot 4.
2. **Stage 2 — Slow, Deliberate Handle Rotation (`~3.4s`)**:
   - Spotlight the Slot 4 card (`.is-unlocking-wheel`).
   - Rotate the 3D spoked vault wheel **slowly and visibly** (`transform: rotate(540deg)` over `3.2s–3.6s` with `cubic-bezier(0.25, 0.1, 0.25, 1)`), accompanied by synchronized mechanical ratchet clicks via Web Audio API.
   - Retract the side locking bolts (`translateX`) as the wheel finishes turning.
3. **Stage 3 — Heavy 3D Vault Door Swing & Light Spill (`~1.4s`)**:
   - Swing the 3D door open on its hinge axis (`transform-origin: left center; transform: rotateY(-112deg)`), revealing the glowing interior chamber of the safe and a miniature preview of the secret invitation/envelope inside.
4. **Stage 4 — Grand Reveal Modal (Single or Multi-Photo Carousel)**:
   - Open the dedicated **Mystery Museum / Secret Reward Modal** (`#vault-reward-dialog`) displaying the unlocked image or multi-image gallery (`موزه اسرارآمیز`) with smooth slide navigation, zoom, and download/view controls.
