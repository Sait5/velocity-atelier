// Run Python in the user's open Blender through the Blender Lab "MCP" add-on bridge (localhost:9876).
// node tools/blender-live.mjs <script.py | -e "python code">   — the code sets `result = {...}`, which is printed as JSON.
import net from 'node:net'
import fs from 'node:fs'

const [arg, inline] = process.argv.slice(2)
const code = arg === '-e' ? inline : fs.readFileSync(arg, 'utf8')
const socket = net.createConnection({ host: process.env.BLENDER_HOST ?? 'localhost', port: Number(process.env.BLENDER_PORT ?? 9876) })
const chunks = []
socket.on('connect', () => socket.write(JSON.stringify({ type: 'execute', code, strict_json: false }) + '\0'))
socket.on('data', d => {
  chunks.push(d)
  const all = Buffer.concat(chunks), end = all.indexOf(0)
  if (end < 0) return
  const response = JSON.parse(all.subarray(0, end).toString('utf8'))
  console.log(JSON.stringify(response, null, 1))
  socket.end()
  process.exitCode = response.status === 'ok' ? 0 : 1
})
socket.on('error', e => { console.error('Blender bridge unavailable:', e.message); process.exitCode = 2 })
socket.setTimeout(600000, () => { console.error('timeout'); socket.destroy() })
