'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Helper to write a 16-bit PCM Stereo WAV file
 */
function createWavBuffer({ numChannels = 2, sampleRate = 44100, samplesL, samplesR }) {
  const totalFrames = samplesL.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalFrames * blockAlign;
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
  for (let i = 0; i < totalFrames; i++) {
    // Left channel
    let sl = Math.max(-1, Math.min(1, samplesL[i]));
    let valL = sl < 0 ? Math.floor(sl * 0x8000) : Math.floor(sl * 0x7FFF);
    buffer.writeInt16LE(valL, offset);
    offset += 2;

    // Right channel
    let sr = Math.max(-1, Math.min(1, samplesR ? samplesR[i] : samplesL[i]));
    let valR = sr < 0 ? Math.floor(sr * 0x8000) : Math.floor(sr * 0x7FFF);
    buffer.writeInt16LE(valR, offset);
    offset += 2;
  }

  return buffer;
}

const outDir = path.join(__dirname, '..', 'public', 'assets', 'sounds');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// =========================================================================
// 1. tactical-alarm.wav: Hollywood Blockbuster Cinematic Sub-Bass Braam Impact
// Pure cinematic power: Deep explosive sub-drop (120Hz -> 36Hz) +
// Hans Zimmer style Inception brass/reese bass roar +
// Heavy electrical grid power surge. Zero toy beeps, zero cheesy sirens.
// Duration: 4.8 seconds
// =========================================================================
{
  const sampleRate = 44100;
  const duration = 4.8;
  const totalFrames = Math.floor(sampleRate * duration);
  const samplesL = new Float32Array(totalFrames);
  const samplesR = new Float32Array(totalFrames);

  // Pink noise state
  let b0 = 0, b1 = 0, b2 = 0;

  // Filter state for Braam low-pass sweep
  let lpL = 0, lpR = 0;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / sampleRate;

    // ---- Layer A: Transient Hit / Shockwave Punch (0 - 0.35s) ----
    // Initial punch that smacks the speakers like a cinematic movie trailer intro
    let punchL = 0, punchR = 0;
    if (t < 0.35) {
      const punchEnv = Math.exp(-t * 22);
      // Pitch drop from 140Hz down to 42Hz rapidly
      const punchFreq = 42 + 98 * Math.exp(-t * 35);
      const punchWave = Math.sin(2 * Math.PI * punchFreq * t);
      punchL = punchWave * punchEnv * 0.85;
      punchR = punchWave * punchEnv * 0.85;
    }

    // ---- Layer B: Massive Sub-Drop Boom (0 - 3.8s) ----
    // Continuous chest-rattling sub-bass (44Hz gliding down to 32Hz)
    const subFreq = 34 + 14 * Math.exp(-t * 1.8);
    const subEnv = Math.exp(-t * 1.05);
    const subSine = Math.sin(2 * Math.PI * subFreq * t);
    // Subtle second harmonic for rich body
    const subHarm = 0.22 * Math.sin(2 * Math.PI * subFreq * 2 * t);
    const subLayer = (subSine + subHarm) * subEnv * 0.95;

    // ---- Layer C: The Hans Zimmer Cinematic "BRAAM" (0 - 4.5s) ----
    // Detuned sawtooth / reese brass horns with low-pass sweep
    // Base pitch around 43.65 Hz (low F)
    const baseF = 43.65;
    const saw1 = (2 * ((t * baseF) % 1) - 1);
    const saw2 = (2 * ((t * (baseF * 1.007)) % 1) - 1);
    const saw3 = (2 * ((t * (baseF * 0.993)) % 1) - 1);
    const fifth = (2 * ((t * (baseF * 1.5)) % 1) - 1) * 0.45;
    const braamRawL = (saw1 * 0.5 + saw2 * 0.35 + fifth * 0.25);
    const braamRawR = (saw1 * 0.5 + saw3 * 0.35 + fifth * 0.25);

    // Dynamic Filter cutoff: starts wide at 520Hz, swells slightly at 0.15s, then sweeps down to 95Hz
    const cutoff = Math.max(90, 520 * Math.exp(-t * 1.4) + 85);
    const dt = 1 / sampleRate;
    const rc = 1 / (2 * Math.PI * cutoff);
    const alpha = dt / (rc + dt);

    lpL += alpha * (braamRawL - lpL);
    lpR += alpha * (braamRawR - lpR);

    // Braam envelope: fast 12ms attack, sustained body, smooth release
    let braamEnv = 1;
    if (t < 0.015) {
      braamEnv = t / 0.015;
    } else {
      braamEnv = Math.exp(-t * 0.85);
    }
    const braamOutL = lpL * braamEnv * 0.9;
    const braamOutR = lpR * braamEnv * 0.9;

    // ---- Layer D: Electrical Surge & Deep Industrial Reverb Tail ----
    const white = (Math.random() * 2 - 1) * 0.12;
    b0 = 0.99765 * b0 + white * 0.0990460;
    b1 = 0.96300 * b1 + white * 0.1444200;
    b2 = 0.57000 * b2 + white * 0.4342000;
    const pinkNoise = (b0 + b1 + b2);
    // Surge envelope: quick attack at 0.02s, decays over 2.5s
    const surgeEnv = t < 0.02 ? (t / 0.02) : Math.exp(-t * 1.6);
    const surgeL = pinkNoise * surgeEnv * 0.4;
    const surgeR = pinkNoise * surgeEnv * 0.38;

    // ---- Master Sum & Analog Warmth Saturation ----
    let sumL = punchL + subLayer + braamOutL + surgeL;
    let sumR = punchR + subLayer + braamOutR + surgeR;

    // Smooth overall tail fadeout from 4.0s to 4.8s
    if (t > 4.0) {
      const fade = Math.max(0, (4.8 - t) / 0.8);
      sumL *= fade;
      sumR *= fade;
    }

    // Warm analog saturation (tanh) - prevents clipping, adds punchy harmonic warmth
    samplesL[i] = Math.tanh(sumL * 1.25) * 0.94;
    samplesR[i] = Math.tanh(sumR * 1.25) * 0.94;
  }

  const wav = createWavBuffer({ numChannels: 2, sampleRate, samplesL, samplesR });
  fs.writeFileSync(path.join(outDir, 'tactical-alarm.wav'), wav);
  console.log('✅ Generated Hollywood Blockbuster Braam Impact -> tactical-alarm.wav (4.8s)');
}

// =========================================================================
// 2. cyber-intro.wav: 16-Second Dark Espionage Cyber Atmospheric Score
// Sub-bass tension drone, organic mechanical heartbeat, and forensic suspense.
// Zero cheesy synth chirps or cartoon beeps. Pure high-budget espionage thriller.
// =========================================================================
{
  const sampleRate = 44100;
  const duration = 16.0;
  const totalFrames = Math.floor(sampleRate * duration);
  const samplesL = new Float32Array(totalFrames);
  const samplesR = new Float32Array(totalFrames);

  let p0 = 0, p1 = 0, p2 = 0;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / sampleRate;

    // Master envelope: gentle fade-in over 1.2s, smooth sustained tension, fade-out at end
    let masterEnv = 1.0;
    if (t < 1.2) {
      masterEnv = t / 1.2;
    } else if (t > 14.5) {
      masterEnv = Math.max(0, (16.0 - t) / 1.5);
    }

    // 1. Deep Binaural Sub-Bass Drone (38.0 Hz left, 38.35 Hz right)
    const subL = Math.sin(2 * Math.PI * 38.0 * t) * 0.48;
    const subR = Math.sin(2 * Math.PI * 38.35 * t) * 0.48;

    // 2. Ominous Tension LFO pulse (0.3 Hz dark rhythmic breath)
    const lfo = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.3 * t);
    const midDroneL = Math.sin(2 * Math.PI * 76.0 * t) * 0.22 * lfo;
    const midDroneR = Math.sin(2 * Math.PI * 76.7 * t) * 0.22 * lfo;

    // 3. Cyber Sub-Pulse "Heartbeat" every 1.5s (forensic suspense)
    const pulseCycle = t % 1.5;
    let heartL = 0, heartR = 0;
    if (pulseCycle < 0.25) {
      const hEnv = Math.exp(-pulseCycle * 18);
      const hFreq = 48 * Math.exp(-pulseCycle * 6);
      const hWave = Math.sin(2 * Math.PI * hFreq * pulseCycle) * hEnv * 0.35;
      heartL = hWave;
      heartR = hWave * 0.95;
    }

    // 4. Low-Frequency Air / Cinematic Room Ambience
    const white = (Math.random() * 2 - 1) * 0.08;
    p0 = 0.99765 * p0 + white * 0.0990460;
    p1 = 0.96300 * p1 + white * 0.1444200;
    p2 = 0.57000 * p2 + white * 0.4342000;
    const roomL = (p0 + p1 + p2) * 0.3;
    const roomR = (p0 + p1 + p2) * 0.28;

    let outL = (subL + midDroneL + heartL + roomL) * masterEnv;
    let outR = (subR + midDroneR + heartR + roomR) * masterEnv;

    samplesL[i] = Math.tanh(outL * 1.15) * 0.88;
    samplesR[i] = Math.tanh(outR * 1.15) * 0.88;
  }

  const wav = createWavBuffer({ numChannels: 2, sampleRate, samplesL, samplesR });
  fs.writeFileSync(path.join(outDir, 'cyber-intro.wav'), wav);
  console.log('✅ Generated Dark Espionage Cinematic Score -> cyber-intro.wav (16s)');
}
