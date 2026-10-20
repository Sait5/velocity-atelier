// Encode a folder of numbered PNG frames (from render_studio.py) into a VP9 WebM for the garage, with a WebP poster of
// frame 1. Headless Chrome does the work (WebCodecs VP9 in quality mode, no real-time limit); frames are served to it
// by a tiny local HTTP server and the WebM container is written here.
//   node tools/blender-studio/encode_film.mjs <framesDir> <out.webm> [fps=30] [bitrate=16000000]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

const [dir, out, fps = '30', bitrate = '16000000'] = process.argv.slice(2)
if (!dir || !out) { console.error('usage: encode_film.mjs <framesDir> <out.webm> [fps] [bitrate]'); process.exit(1) }
const frames = fs.readdirSync(dir).filter(f => /\.png$/i.test(f)).sort()
if (!frames.length) throw new Error('no PNG frames in ' + dir)
const { width, height } = await sharp(path.join(dir, frames[0])).metadata()

const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>encode</title>') }
  const file = path.join(dir, path.basename(decodeURIComponent(req.url)))
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': 'image/png' }); fs.createReadStream(file).pipe(res)
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}`

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe', port = 9700 + Math.floor(Math.random() * 200)
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'encode-film-'))
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required', base + '/'], { stdio: 'ignore' })
let targets; for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some(t => t.type === 'page')) break } catch {} await new Promise(r => setTimeout(r, 250)) }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
let id = 0; const pending = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
const evaluate = expression => new Promise((resolve, reject) => { const n = ++id; pending.set(n, d => d.result?.exceptionDetails ? reject(new Error(d.result.exceptionDetails.exception?.description || 'eval failed')) : resolve(d.result?.result?.value)); ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })) })

const mux = `function mux(chunks,w,h,fps){const te=new TextEncoder();
 const vint=n=>{const b=new Uint8Array(8);b[0]=1;for(let i=7;i>0;i--){b[i]=n%256;n=Math.floor(n/256)}return b};
 const idb=id=>{const a=[];while(id>0){a.unshift(id%256);id=Math.floor(id/256)}return new Uint8Array(a)};
 const cat=arrs=>{let n=0;for(const a of arrs)n+=a.length;const o=new Uint8Array(n);let p=0;for(const a of arrs){o.set(a,p);p+=a.length}return o};
 const el=(id,...data)=>{const body=cat(data);return cat([idb(id),vint(body.length),body])};
 const uint=(id,v)=>{const a=[];do{a.unshift(v%256);v=Math.floor(v/256)}while(v>0);return el(id,new Uint8Array(a))};
 const str=(id,s)=>el(id,te.encode(s));const flt=(id,v)=>{const b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,v);return el(id,b)};
 const header=el(0x1A45DFA3,uint(0x4286,1),uint(0x42F7,1),uint(0x42F2,4),uint(0x42F3,8),str(0x4282,'webm'),uint(0x4287,4),uint(0x4285,2));
 const info=el(0x1549A966,uint(0x2AD7B1,1000000),str(0x4D80,'velocity-atelier'),str(0x5741,'velocity-atelier'),flt(0x4489,chunks.length*1000/fps));
 const tracks=el(0x1654AE6B,el(0xAE,uint(0xD7,1),uint(0x73C5,1),uint(0x9C,0),str(0x86,'V_VP9'),uint(0x83,1),uint(0x23E383,Math.round(1e9/fps)),el(0xE0,uint(0xB0,w),uint(0xBA,h))));
 const clusters=[];let cur=null;for(const c of chunks){const ms=Math.round(c.t/1000);if(c.key||!cur){cur={ms,blocks:[]};clusters.push(cur)}
  const hd=new Uint8Array(4);hd[0]=0x81;new DataView(hd.buffer).setInt16(1,ms-cur.ms);hd[3]=c.key?0x80:0;cur.blocks.push(el(0xA3,hd,c.b))}
 const bytes=clusters.map(cl=>el(0x1F43B675,uint(0xE7,cl.ms),...cl.blocks));let pos=info.length+tracks.length;const points=[];
 bytes.forEach((b,i)=>{points.push(el(0xBB,uint(0xB3,clusters[i].ms),el(0xB7,uint(0xF7,1),uint(0xF1,pos))));pos+=b.length});
 return cat([header,el(0x18538067,info,tracks,...bytes,el(0x1C53BB6B,...points))])}`
try {
  const result = await evaluate(`(async()=>{${mux}
    const names=${JSON.stringify(frames)},w=${width},h=${height},fps=${Number(fps)},chunks=[];
    const cfg={codec:'vp09.00.41.08',width:w,height:h,bitrate:${Number(bitrate)},bitrateMode:'variable',framerate:fps,latencyMode:'quality'};
    if(!(await VideoEncoder.isConfigSupported(cfg)).supported)throw new Error('VP9 encoder unavailable');
    const enc=new VideoEncoder({output:c=>{const b=new Uint8Array(c.byteLength);c.copyTo(b);chunks.push({t:c.timestamp,key:c.type==='key',b})},error:e=>{throw e}});enc.configure(cfg);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
    for(let i=0;i<names.length;i++){const bmp=await createImageBitmap(await (await fetch('/'+names[i])).blob());ctx.drawImage(bmp,0,0);const f=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
      while(enc.encodeQueueSize>4)await new Promise(r=>setTimeout(r,5));enc.encode(f,{keyFrame:i%(fps*2)===0});f.close();bmp.close()}
    await enc.flush();enc.close();window.__webm=mux(chunks,w,h,fps);
    // check the result really plays: decode it in a video element for a second and a half
    const v=document.createElement('video');v.muted=true;v.src=URL.createObjectURL(new Blob([window.__webm],{type:'video/webm'}));document.body.appendChild(v);await v.play().catch(()=>{});await new Promise(r=>setTimeout(r,1500));
    if(v.error||v.currentTime<.5)throw new Error('encoded film does not play: '+(v.error?v.error.message:'stuck at '+v.currentTime));
    return {frames:names.length,bytes:window.__webm.length}})()`)
  const parts = []
  for (let off = 0; off < result.bytes; off += 3 << 20) parts.push(Buffer.from(await evaluate(`(()=>{const a=window.__webm.subarray(${off},${off + (3 << 20)});let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)})()`), 'base64'))
  fs.writeFileSync(out, Buffer.concat(parts))
  await sharp(path.join(dir, frames[0])).webp({ quality: 92, smartSubsample: true, effort: 6 }).toFile(out.replace(/\.webm$/i, '.webp'))
  console.log('encoded', result.frames, 'frames', width + 'x' + height, '->', out, (result.bytes / 1e6).toFixed(1), 'MB')
} finally { ws.close(); proc.kill(); server.close() }
