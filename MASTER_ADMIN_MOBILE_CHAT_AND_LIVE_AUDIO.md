# Master: mobile admin chat and live listening

## Goal

- On a 393 × 852 phone, the admin chat message field must span the available width, remain visible above the bottom safe area, accept typing at 16 px, and keep a clear send action.
- An admin explicitly starts and stops real-time listening for one selected session. The student's microphone goes to that admin with minimal practical delay, including on constrained connections.
- Deploy only this project's changes; preserve other server files and the existing ports.

## Reference and diagnosis

- The supplied phone and Chrome screenshots show the old five-column composer. Its `64px` role control and other buttons squeeze the textarea to a narrow strip.
- The old audio path sends 16 kHz, 16-bit mono PCM, roughly 256 kbit/s before Socket.IO overhead. WebRTC signaling existed but the student never created an offer.
- [Opus specification](https://www.rfc-editor.org/info/rfc6716/) supports low-bitrate interactive speech and packet-loss handling. [WebRTC TURN guidance](https://webrtc.org/getting-started/turn-server) explains why direct peer connections can fail behind NAT. [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/) make queued audio unsuitable for live listening. [RTCRtpSender parameters](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/setParameters) allow an audio bitrate ceiling.

## Implemented design

1. The phone composer uses three rows: controls, full-width multiline message, full-width 44px send button. `100dvh` and safe-area padding keep it at the bottom. Viewport zoom is allowed.
2. WebRTC is the preferred transport. The student sends one mono microphone track with an Opus bitrate ceiling of 24 kbit/s. STUN uses existing browser networking; no new server port is opened.
3. A fallback starts immediately while WebRTC connects. It downsamples speech to 8 kHz and sends independent IMA ADPCM packets through the existing Socket.IO connection at about 32 kbit/s payload. Once WebRTC connects, fallback capture stops. If the peer fails, fallback resumes and the peer retries.
4. Socket fallback uses volatile packets. The server forwards only to an admin who requested listening to that session. Playback limits queued audio to 650 ms, dropping stale delay instead of playing old speech.
5. Admin reconnection requests the stream again. Stop, session switch, or disconnect closes the appropriate capture/peer state.

## Files

- `public/assets/css/admin-mobile-chat.css`, `public/admin/chat.html`: phone composer layout and assets.
- `public/assets/js/live-audio-codec.js`: independent ADPCM packet codec.
- `public/assets/js/user-chat.js`: microphone capture, WebRTC offer and fallback.
- `public/assets/js/admin-chat.js`: WebRTC receive, fallback decode and bounded playback.
- `src/socket/index.js`: authorized signaling and targeted fallback relay.
- `tests/live-audio-codec.test.js`, `tests/admin-mobile-chat.browser.cjs`: codec and phone layout checks.

## Verification and limits

- Check syntax and the codec test, then visually inspect the 393 × 852 phone screenshot and run the browser layout test.
- Check a real student microphone and admin speaker on separate devices under network throttling before claiming a measured latency or minimum bandwidth. A connection with no usable throughput cannot carry live audio.
- A dedicated TURN relay would improve WebRTC connectivity across restrictive networks, but it needs infrastructure and port approval; the existing Socket.IO fallback covers this release without changing ports.
