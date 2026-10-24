// Capture fallback audio off the UI thread in bounded 40 ms frames.
class LiveAudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.rate = options.processorOptions?.sampleRate === 8000 ? 8000 : 16000;
    this.phase = 0;
    this.sum = 0;
    this.count = 0;
    this.offset = 0;
    this.frame = new Int16Array(this.rate / 25);
    this.port.onmessage = event => {
      const rate = event.data?.sampleRate;
      if (rate !== 8000 && rate !== 16000) return;
      this.rate = rate;
      this.phase = 0;
      this.sum = 0;
      this.count = 0;
      this.offset = 0;
      this.frame = new Int16Array(rate / 25);
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    for (const output of outputs[0] || []) output.fill(0);
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      this.sum += input[i];
      this.count++;
      this.phase += this.rate / sampleRate;
      if (this.phase < 1) continue;
      const value = Math.max(-1, Math.min(1, this.sum / this.count));
      this.frame[this.offset++] = Math.round(value * 32767);
      this.phase -= 1;
      this.sum = 0;
      this.count = 0;
      if (this.offset === this.frame.length) {
        this.port.postMessage({ samples: this.frame, sampleRate: this.rate }, [this.frame.buffer]);
        this.frame = new Int16Array(this.rate / 25);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('live-audio-capture', LiveAudioCaptureProcessor);
