/* Independent 8 kHz IMA ADPCM packets for the Socket.IO fallback.
   Each packet resets its predictor, so lost packets do not corrupt later audio. */
(function (root) {
  'use strict';
  const steps = [7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
  const changes = [-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8];
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function encode(samples) {
    if (!(samples instanceof Int16Array) || samples.length < 2 || samples.length > 4096) return null;
    const out = new Uint8Array(4 + Math.ceil((samples.length - 1) / 2));
    let predictor = samples[0], index = 0;
    out[0] = predictor & 255;
    out[1] = (predictor >> 8) & 255;
    out[2] = index;
    out[3] = (samples.length - 1) & 1;
    for (let i = 1; i < samples.length; i++) {
      const step = steps[index];
      let delta = samples[i] - predictor;
      let code = 0;
      if (delta < 0) { code = 8; delta = -delta; }
      let diff = step >> 3;
      if (delta >= step) { code |= 4; delta -= step; diff += step; }
      if (delta >= (step >> 1)) { code |= 2; delta -= step >> 1; diff += step >> 1; }
      if (delta >= (step >> 2)) { code |= 1; diff += step >> 2; }
      predictor = clamp(predictor + (code & 8 ? -diff : diff), -32768, 32767);
      index = clamp(index + changes[code], 0, 88);
      const offset = 4 + ((i - 1) >> 1);
      if ((i & 1) === 1) out[offset] = code; else out[offset] |= code << 4;
    }
    return out.buffer;
  }

  function decode(packet) {
    const bytes = packet instanceof Uint8Array ? packet : new Uint8Array(packet);
    if (bytes.length < 5 || bytes.length > 2052 || bytes[2] > 88 || bytes[3] > 1) return null;
    const count = 1 + (bytes.length - 4) * 2 - bytes[3];
    const samples = new Int16Array(count);
    let predictor = (bytes[0] | bytes[1] << 8) << 16 >> 16;
    let index = bytes[2];
    samples[0] = predictor;
    for (let i = 1; i < count; i++) {
      const packed = bytes[4 + ((i - 1) >> 1)];
      const code = (i & 1) === 1 ? packed & 15 : packed >> 4;
      const step = steps[index];
      let diff = step >> 3;
      if (code & 4) diff += step;
      if (code & 2) diff += step >> 1;
      if (code & 1) diff += step >> 2;
      predictor = clamp(predictor + (code & 8 ? -diff : diff), -32768, 32767);
      index = clamp(index + changes[code], 0, 88);
      samples[i] = predictor;
    }
    return samples;
  }

  const api = { encode, decode, sampleRate: 8000 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LiveAudioCodec = api;
})(typeof window !== 'undefined' ? window : globalThis);
