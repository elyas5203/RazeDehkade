---
name: ui-ux-3d-vault-design
description: >-
  Specialized UI/UX design and front-end engineering skill for full-bleed photorealistic 3D
  interactive bank vaults, SVG metallic shaders (feTurbulence & feSpecularLighting), exposed
  counter-rotating brass gears, retracting steel locking pistons, zero-spoiler mystery hooks,
  and cinematic multi-stage unlock choreography.
---

# UI/UX Pro Max: Full-Bleed Photorealistic 3D Bank Vault & Mechanical Lock Engineering

## 1. Full-Bleed Architectural Presence (100% Container Coverage)
- **Never Shrink a Hero Mechanical Object into a Tiny Icon**: When a 3D safe or vault occupies a dashboard slot (such as Slot 4 `.quad-vault-card`), **the entire slot from edge to edge (`width: 100%; height: 100%; padding: 0;`) MUST BE the 3D Vault itself**.
- **Zero Clutter / Zero Text Overlay on the Vault Card**: Do not place header bars, titles, explanatory paragraphs, or buttons beside or above the safe door. The physical 3D safe door, its heavy steel frame, hinges, locking pistons, and central rotary wheel must fill 100% of the slot.

## 2. Photorealistic Metallic Shaders & Mechanical Detailing (SVG + CSS 3D Hybrid)
Flat CSS circles look toy-like. To achieve AAA game / cinematic film prop realism:
1. **Anisotropic Brushed Metal & Specular Lighting**:
   - Combine multi-stop `linear-gradient` and `conic-gradient` metal shaders with high-precision inline SVG mechanical layers (`<radialGradient>`, `<linearGradient>`, metallic drop shadows, and machined bevel rings).
2. **Multi-Layered Mechanical Anatomy of the Vault Door**:
   - **Outer Reinforced Steel Frame**: Beveled dark gunmetal armor frame with 4 corner reinforcement gussets and 8 machined hex bolts.
   - **Exposed Heavy Industrial Hinges (Left Axis)**: Multi-knuckle cylindrical steel hinges anchored to the left frame (`transform-origin: 0% 50%`).
   - **4-Way Retracting Chromed Steel Pistons (`.vault-piston`)**: Heavy horizontal and vertical steel locking bars extending into the frame that physically slide inward (`translateX` / `translateY`) during the wheel-turning phase before the door swings open.
   - **360° Precision-Engraved Combination Bezel**: Outer stationary ring with fine 100-tick degree graduations, cardinal markers, and an LED status ring (amber/red when locked, cyan/gold when turning, emerald when unlocked).
   - **Counter-Rotating Exposed Brass Gear Ring (`#vault-inner-gear`)**: Visible machined brass gear teeth underneath the main wheel that rotate in the **opposite direction** (`rotate(-360deg)`) while the main wheel turns clockwise, creating authentic mechanical depth.
   - **Massive 6-Spoke 3D Rotary Wheel Handle (`#vault-3d-handle`)**: Fills the center of the vault door (`~132px–148px` diameter), featuring 6 heavy tapered steel spokes, cylindrical knurled brass handle grips at the outer tips, and a deep glass-and-brass central hub housing the glowing `?` Mystery Emblem.

## 3. Strict Zero-Spoiler Policy (Psychological Mystery Hook)
- **Complete Secrecy (`یک سرّ کامل`)**: Users must discover the purpose of the vault organically.
- **Forbidden Text**: Never display hints like "رمز را از کارآگاه بگیرید" (Get the code from the detective), "در جلسه آخر باز می‌شود" (Opens in the final session), or "پایان پرونده" on the vault or inside the password modal.
- **Minimalist Security Modal**: The password popup (`#vault-password-dialog`) must look like a classified mechanical/digital keypad lock with zero narrative spoilers.

## 4. Stateless Refresh Rule (Always Lock on Page Refresh)
- **Reset on Refresh (`F5`)**: The vault must **never** stay open across page reloads. Do not persist unlock state in `localStorage`. Every page load must initialize the vault in its tightly locked state so the full mechanical unlock animation can be experienced every time.

## 5. Multi-Stage Unlock Choreography (Strict 4-Stage Sequence)
1. **Stage 1 — Password / Flag Modal Validation**:
   - **Wrong Code**: Horizontal recoil shake (`@keyframes vault-error-shake`), crimson LED pulse (`#ef4444`), mechanical lock-jammed audio buzz, and concise error message (`⛔ رمز واردشده نادرست است!`).
   - **Correct Code**: Brief emerald confirmation (`✅ رمز تایید شد!`), then **immediately close `#vault-password-dialog`** so the user watches the full-slot 3D vault door.
2. **Stage 2 — Slow, Heavy Wheel Rotation + Counter-Gear + Piston Retraction (`~3.5s`)**:
   - Spotlight `.quad-vault-card.is-unlocking-wheel`.
   - Rotate `#vault-3d-handle` **slowly and visibly** (`rotate(540deg)` over `3.5s` with `cubic-bezier(0.22, 0.61, 0.36, 1)`), counter-rotate `#vault-inner-gear` (`rotate(-360deg)`), and retract the 4 steel locking pistons inward while playing synchronized Web Audio mechanical ratchet clicks.
3. **Stage 3 — Full-Slot 3D Vault Door Swing & Interior Golden Light Spill (`~1.4s`)**:
   - Swing `#vault-3d-door` open (`rotateY(-108deg)`), revealing the illuminated armored interior chamber (`#vault-interior-chamber`) with volumetric golden light beams and the sealed mystery envelope inside.
4. **Stage 4 — Grand Reveal Modal (Single or Multi-Photo Carousel)**:
   - Open `#vault-reward-dialog` displaying the unlocked image or multi-image gallery (`موزه اسرارآمیز`) with slide navigation, fullscreen zoom, and download controls.
