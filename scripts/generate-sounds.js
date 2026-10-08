const fs = require('fs');
const path = require('path');

function createWavBuffer({ numChannels = 1, sampleRate = 44100, samples }) {
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    let intVal = s < 0 ? Math.floor(s * 0x8000) : Math.floor(s * 0x7FFF);
    buffer.writeInt16LE(intVal, offset);
    offset += 2;
  }

  return buffer;
}

const outDir = path.join(__dirname, '..', 'public', 'assets', 'sounds');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// =========================================================================
// 1. clock-tick.wav: Very subtle, soft organic mechanical escapement (no high-pitched beeps)
// =========================================================================
{
  const sampleRate = 44100;
  const duration = 0.08; // 80ms short
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Deep wooden escapement knock around 120Hz - 240Hz, decaying rapidly
    const knock = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 120);
    const sub = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 90);
    samples[i] = (knock * 0.6 + sub * 0.4) * 0.5;
  }

  const wav = createWavBuffer({ numChannels: 1, sampleRate, samples });
  fs.writeFileSync(path.join(outDir, 'clock-tick.wav'), wav);
  console.log('✅ Generated organic clock-tick.wav');
}

// =========================================================================
// 2. cyber-intro.wav: 15s Cinematic Dark Sub-Bass Atmospheric Thriller Drone
// Absolutely NO high-pitched synth beeps, NO toy sawtooth sirens, NO arcade chirps.
// Only deep, heavy, Hollywood-style cinematic sub-rumble, dark tension drone, and sub-drop impact.
// =========================================================================
{
  const sampleRate = 44100;
  const duration = 15.0; // 15 seconds
  const totalFrames = Math.floor(sampleRate * duration);
  const numChannels = 2; // stereo
  const samples = new Float32Array(totalFrames * numChannels);

  // Biquad Low-Pass Filter state for Left and Right channels
  // Cutoff at 220Hz, Q = 0.707 (Butterworth) to physically prevent any high-frequency buzz or beeps
  const cutoff = 220;
  const w0 = 2 * Math.PI * cutoff / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * 0.707);

  const b0_coeff = (1 - cosw0) / 2;
  const b1_coeff = 1 - cosw0;
  const b2_coeff = (1 - cosw0) / 2;
  const a0_coeff = 1 + alpha;
  const a1_coeff = -2 * cosw0;
  const a2_coeff = 1 - alpha;

  let x1_L = 0, x2_L = 0, y1_L = 0, y2_L = 0;
  let x1_R = 0, x2_R = 0, y1_R = 0, y2_R = 0;

  function filterL(input) {
    const output = (b0_coeff * input + b1_coeff * x1_L + b2_coeff * x2_L - a1_coeff * y1_L - a2_coeff * y2_L) / a0_coeff;
    x2_L = x1_L; x1_L = input;
    y2_L = y1_L; y1_L = output;
    return output;
  }

  function filterR(input) {
    const output = (b0_coeff * input + b1_coeff * x1_R + b2_coeff * x2_R - a1_coeff * y1_R - a2_coeff * y2_R) / a0_coeff;
    x2_R = x1_R; x1_R = input;
    y2_R = y1_R; y1_R = output;
    return output;
  }

  // Pink noise state for deep organic rumbling
  let pink_b0 = 0, pink_b1 = 0, pink_b2 = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / sampleRate;

    // --- 1. Master Fade-In & Climax Envelope ---
    // Smooth, gradual swell over the 15 seconds
    const masterEnv = t < 2.0 ? (t / 2.0) : Math.min(1.0, 0.7 + (t / 15.0) * 0.3);

    // --- 2. Deep Sub-Bass Drone (38Hz - 42Hz) ---
    // Two slightly detuned oscillators for natural slow binaural throbbing
    const f1 = 40.0;
    const f2 = 40.4;
    const subL = Math.sin(2 * Math.PI * f1 * t) * 0.5 + Math.sin(2 * Math.PI * (f1 * 2) * t) * 0.15;
    const subR = Math.sin(2 * Math.PI * f2 * t) * 0.5 + Math.sin(2 * Math.PI * (f2 * 2) * t) * 0.15;

    // --- 3. Dark Atmospheric Warmth & Tension Pulse (0.2Hz LFO) ---
    const lfo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.22 * t);
    const harmonicL = Math.sin(2 * Math.PI * 80.0 * t + 0.2) * 0.25 * lfo;
    const harmonicR = Math.sin(2 * Math.PI * 80.8 * t + 0.8) * 0.25 * lfo;

    // --- 4. Deep Ambient Air / Low-Frequency Room Rumble ---
    const white = (Math.random() * 2 - 1) * 0.15;
    pink_b0 = 0.99765 * pink_b0 + white * 0.0990460;
    pink_b1 = 0.96300 * pink_b1 + white * 0.1444200;
    pink_b2 = 0.57000 * pink_b2 + white * 0.4342000;
    const airRumble = (pink_b0 + pink_b1 + pink_b2) * 0.35;

    // --- 5. Climax Sub-Drop (at t = 12.8s to 15.0s) ---
    // Massive, cinematic sub-bass impact (dropping pitch from 65Hz to 28Hz)
    let impactL = 0;
    let impactR = 0;
    if (t >= 12.8) {
      const dropT = t - 12.8;
      const dropFreq = 65 * Math.exp(-dropT * 1.5) + 26;
      const dropEnv = Math.exp(-dropT * 1.8);
      const dropWave = Math.sin(2 * Math.PI * dropFreq * dropT) * dropEnv * 0.85;
      impactL = dropWave;
      impactR = dropWave;
    }

    // Combine layers
    let rawL = (subL + harmonicL + airRumble + impactL) * masterEnv;
    let rawR = (subR + harmonicR + airRumble + impactR) * masterEnv;

    // Apply strict 220Hz Low-Pass Filter (eliminates any buzz/beeps completely)
    let filteredL = filterL(rawL);
    let filteredR = filterR(rawR);

    // Warm analog saturation (tanh)
    let outL = Math.tanh(filteredL * 1.1);
    let outR = Math.tanh(filteredR * 1.1);

    samples[frame * 2] = outL;
    samples[frame * 2 + 1] = outR;
  }

  const wav = createWavBuffer({ numChannels: 2, sampleRate, samples });
  fs.writeFileSync(path.join(outDir, 'cyber-intro.wav'), wav);
  console.log('✅ Generated 15s cinematic sub-bass dark thriller cyber-intro.wav');
}
