// Pack the engine loops of the "Aston Martin Valhalla" BeamNG.drive mod (S7471C; its art/sound/engine folder holds
// rpm-stepped loops named M840T: engine and exhaust, on load ("Accel") and on overrun ("Deccel"), one loop every
// ~400 rpm from 1100 to 8200, plus 13 s idles) into the site's banks:
//   tools/source-assets/audio/valhalla-{exhaust,engine}-{load,overrun}.wav  the loops of a bank one after another
//   tools/source-assets/audio/valhalla-idle.wav                             exhaust idle + engine idle (equal lengths)
// and print the bank table app/three/valhallaEngineAudio.ts holds (rpm, first sample, length). Samples are copied as
// they are (48 kHz mono 16-bit); only the idle is a mix. tools/compress-engine-audio.py then makes the lossless FLACs.
// Usage: node tools/pack-valhalla-audio.cjs <mod>/art/sound/engine
const fs = require('fs'), path = require('path')
const dir = process.argv[2], out = path.join(__dirname, 'source-assets', 'audio')
function read(file) {
  const b = fs.readFileSync(file); let o = 12, rate, channels, bits, data, offset
  while (o < b.length - 8) {
    const id = b.toString('ascii', o, o + 4), size = b.readUInt32LE(o + 4)
    if (id === 'fmt ') { channels = b.readUInt16LE(o + 10); rate = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22) }
    if (id === 'data') { offset = o + 8; data = size }
    o += 8 + size + (size & 1)
  }
  if (rate !== 48000 || channels !== 1 || bits !== 16) throw Error(`${file}: expected 48 kHz mono 16-bit`)
  return b.subarray(offset, offset + data)
}
function write(file, pcm) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22); h.writeUInt32LE(48000, 24); h.writeUInt32LE(96000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40); fs.writeFileSync(file, Buffer.concat([h, pcm]))
}
const table = {}
for (const [sub, part] of [['M840T_exhaust', 'exhaust'], ['M840T_engine', 'engine']]) {
  for (const [kind, bank] of [['Accel', 'load'], ['Deccel', 'overrun']]) {
    const loops = fs.readdirSync(path.join(dir, sub)).filter(f => f.includes(`_${kind}_`) && /_\d+\.wav$/.test(f))
      .map(f => ({ rpm: +f.match(/_(\d+)\.wav$/)[1], pcm: read(path.join(dir, sub, f)) })).sort((a, b) => a.rpm - b.rpm)
    let start = 0; const rows = []
    for (const l of loops) { rows.push([l.rpm, start, l.pcm.length / 2]); start += l.pcm.length / 2 }
    write(path.join(out, `valhalla-${part}-${bank}.wav`), Buffer.concat(loops.map(l => l.pcm)))
    table[`${part}-${bank}`] = rows
  }
}
// idle: the exhaust and engine idles are the same length, so their mix still loops seamlessly
const exhaust = read(path.join(dir, 'M840T_exhaust', 'M840T_exhaust_EXH.wav')), engine = read(path.join(dir, 'M840T_engine', 'M840T_Idle_ENG.wav'))
if (exhaust.length !== engine.length) throw Error('idle lengths differ')
const idle = Buffer.alloc(exhaust.length)
for (let i = 0; i < idle.length; i += 2) idle.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(exhaust.readInt16LE(i) * .8 + engine.readInt16LE(i) * .45))), i)
write(path.join(out, 'valhalla-idle.wav'), idle)
console.log(JSON.stringify(table))
