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
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to -1.0 to 1.0
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

// ==========================================
// 1. generate clock-tick.wav
// ==========================================
{
  const sampleRate = 44100;
  const duration = 0.12; // 120 ms
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Sharp mechanical click
    const click = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 220);
    // Wooden clock body resonance
    const wood = Math.sin(2 * Math.PI * 650 * t) * Math.exp(-t * 85);
    // Sub mechanical escapement thump
    const sub = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 50);

    const val = (click * 0.5 + wood * 0.4 + sub * 0.3);
    samples[i] = val;
  }

  const wav = createWavBuffer({ numChannels: 1, sampleRate, samples });
  fs.writeFileSync(path.join(outDir, 'clock-tick.wav'), wav);
  console.log('✅ Generated clock-tick.wav');
}

// ==========================================
// 2. generate cyber-intro.wav (15 seconds stereo)
// ==========================================
{
  const sampleRate = 44100;
  const duration = 15.0; // 15 seconds
  const totalFrames = Math.floor(sampleRate * duration);
  const numChannels = 2; // stereo
  const samples = new Float32Array(totalFrames * numChannels);

  // Noise generator state
  let b0 = 0, b1 = 0, b2 = 0;

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / sampleRate;

    // --- Phase 1: 0 - 3s Transformer Power Grid Sub-bass Hum ---
    let humL = 0;
    let humR = 0;
    if (t < 4.0) {
      const env = t < 0.5 ? (t / 0.5) : Math.max(0, 1 - (t - 3.0) / 1.0);
      const f0 = 48 + Math.sin(t * 12) * 2;
      const sub = Math.sin(2 * Math.PI * f0 * t) * 0.5 +
                  Math.sin(2 * Math.PI * f0 * 2 * t) * 0.2 +
                  Math.sin(2 * Math.PI * f0 * 3 * t) * 0.1;
      humL += sub * env;
      humR += sub * env;

      // Glitch zaps at t = 1.0 and t = 2.4
      if (Math.abs(t - 1.0) < 0.1) {
        const zapEnv = Math.exp(-Math.abs(t - 1.0) * 80);
        const zap = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 2400 * t);
        humL += zap * zapEnv * 0.35;
        humR += zap * zapEnv * 0.2;
      }
      if (Math.abs(t - 2.4) < 0.12) {
        const zapEnv = Math.exp(-Math.abs(t - 2.4) * 60);
        const zap = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 1600 * t);
        humL += zap * zapEnv * 0.2;
        humR += zap * zapEnv * 0.4;
      }
    }

    // --- Phase 2: 3 - 9s Dark Sci-Fi Atmospheric Drone ---
    let droneL = 0;
    let droneR = 0;
    if (t >= 2.0 && t < 10.0) {
      const env = (t < 4.0 ? (t - 2.0) / 2.0 : (t > 8.0 ? (10.0 - t) / 2.0 : 1.0));
      const freq = 65 + Math.sin(t * 0.8) * 8;
      const d1 = Math.sin(2 * Math.PI * freq * t);
      const d2 = Math.sin(2 * Math.PI * (freq * 1.505) * t);
      const d3 = Math.sin(2 * Math.PI * (freq * 2.01) * t) * 0.5;

      droneL += (d1 * 0.4 + d2 * 0.3 + d3 * 0.2) * env;
      droneR += (d1 * 0.3 + d2 * 0.4 + d3 * 0.2) * env;
    }

    // --- Phase 3: 8 - 12.5s Cinematic Tension Riser ---
    let riserL = 0;
    let riserR = 0;
    if (t >= 7.5 && t < 12.8) {
      const riserProgress = (t - 7.5) / 5.3;
      const riserEnv = Math.pow(riserProgress, 1.8);
      const riserFreq = 70 * Math.pow(18, riserProgress); // Exponential ramp up to ~1260Hz

      const sawL = ((t * riserFreq) % 1) * 2 - 1;
      const sawR = (((t + 0.003) * riserFreq) % 1) * 2 - 1;

      // Filtered with resonance
      riserL += sawL * 0.45 * riserEnv;
      riserR += sawR * 0.45 * riserEnv;
    }

    // --- Phase 4: 12.5 - 15s Sonic Boom & Hyperspace Blast ---
    let boomL = 0;
    let boomR = 0;
    if (t >= 12.5) {
      const boomT = t - 12.5;
      const boomEnv = Math.exp(-boomT * 1.6);
      const boomFreq = 160 * Math.exp(-boomT * 4.0) + 32;

      // Deep sub-bass punch
      const subPunch = Math.sin(2 * Math.PI * boomFreq * boomT) * boomEnv;

      // Pinkish noise explosion
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.1444200;
      b2 = 0.57000 * b2 + white * 0.4342000;
      const pink = (b0 + b1 + b2) * 0.12 * Math.exp(-boomT * 2.5);

      boomL += (subPunch * 0.7 + pink * 0.45);
      boomR += (subPunch * 0.7 + pink * 0.45);
    }

    // Combined audio
    let mixL = humL + droneL + riserL + boomL;
    let mixR = humR + droneR + riserR + boomR;

    // Master soft limiter / saturation to avoid distortion
    mixL = Math.tanh(mixL * 0.95);
    mixR = Math.tanh(mixR * 0.95);

    samples[frame * 2] = mixL;
    samples[frame * 2 + 1] = mixR;
  }

  const wav = createWavBuffer({ numChannels: 2, sampleRate, samples });
  fs.writeFileSync(path.join(outDir, 'cyber-intro.wav'), wav);
  console.log('✅ Generated cyber-intro.wav');
}
