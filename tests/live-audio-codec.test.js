const test = require('node:test');
const assert = require('node:assert/strict');
const codec = require('../public/assets/js/live-audio-codec');

test('ADPCM packets are small and independently decodable after loss', () => {
  const input = Int16Array.from({ length: 1024 }, (_, i) => Math.round(Math.sin(i * 0.02) * 12000));
  const packet = codec.encode(input);
  assert.equal(packet.byteLength, 516);
  const decoded = codec.decode(packet);
  assert.equal(decoded.length, input.length);
  let meanError = 0;
  for (let i = 0; i < input.length; i++) meanError += Math.abs(decoded[i] - input[i]);
  assert.ok(meanError / input.length < 1200);
  assert.deepEqual(codec.decode(packet), decoded, 'packet does not rely on prior packets');
  assert.equal(codec.decode(new Uint8Array([0, 0, 89, 0, 0])), null);
});
