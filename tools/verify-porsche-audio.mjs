import fs from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const sources=[],contexts=[]
class Param{value=0;setTargetAtTime(v){this.value=v}}
class Node{connect(n){this.target=n}disconnect(){}}
class Gain extends Node{gain=new Param()}
class Source extends Node{playbackRate=new Param();start(){}stop(){this.stopped=true}}
class Context{currentTime=0;destination={};constructor(){contexts.push(this)}createGain(){return new Gain()}createBiquadFilter(){const n=new Node();n.frequency=new Param();n.Q=new Param();return n}createBufferSource(){const n=new Source();sources.push(n);return n}async decodeAudioData(b){return b}async resume(){}async close(){this.closed=true}}
const manifest=JSON.parse(fs.readFileSync('tools/porsche-audio-manifest.json','utf8'))
const sandbox={AudioContext:Context,AbortController,console,fetch:async name=>({ok:true,arrayBuffer:async()=>({name,duration:name.includes('coast-idle')?5.6:name.includes('coast')?11:24})})};vm.createContext(sandbox)
vm.runInContext(ts.transpile(fs.readFileSync('app/three/porscheEngineAudio.ts','utf8').replace('export function','function'))+'\nthis.create=createPorscheEngineAudio;',sandbox)
const e=sandbox.create();await e.preload();e.start();e.update(900,false,.8,true);assert.equal(sources.length,6)
const source=name=>sources.find(s=>s.buffer.name.includes('porsche-'+name+'.wav'))
const loadLow=source('load-low'),loadHigh=source('load-high'),overrunHigh=source('overrun-high'),idle=source('idle')
e.update(2600,true,.8,true,15);const lowRate=loadLow.playbackRate.value
assert.ok(loadLow.target.gain.value>loadHigh.target.gain.value)
e.update(7500,true,.8,true,50);assert.ok(loadHigh.target.gain.value>loadLow.target.gain.value);assert.ok(loadHigh.playbackRate.value>1)
assert.ok(loadLow.playbackRate.value>lowRate)
const count=sources.length;for(let i=0;i<6000;i++){contexts[0].currentTime+=.016;e.update(1500+i%6500,i%100<60,.8,true,40)}assert.equal(sources.length,count)
e.update(6000,true,.8,true,40);const loadedGain=loadHigh.target.gain.value
e.update(6000,false,.8,true,40);assert.ok(loadHigh.target.gain.value<loadedGain);assert.ok(overrunHigh.target.gain.value>.4)
e.update(6000,true,.8,true,40,false,false,true);assert.ok(overrunHigh.target.gain.value>.4);assert.ok(!sources.some(s=>s.buffer.name.includes('car-braking')))
const fastRate=overrunHigh.playbackRate.value;e.update(1800,false,.8,true,5);assert.ok(overrunHigh.playbackRate.value<fastRate)
e.update(900,false,.8,true,0);assert.equal(idle.target.gain.value,.65)
for(const s of [loadLow,loadHigh,source('overrun-low'),overrunHigh])assert.equal(s.target.gain.value,0)
e.update(900,false,.8,true,0,false,true);assert.equal(idle.target.target.target.gain.value,.4)
e.update(900,false,.8,false);assert.ok(sources.at(-1).buffer.name.includes('porsche-stop'));const stopCount=sources.length;e.update(900,false,.8,false);assert.equal(sources.length,stopCount)
e.dispose();assert.equal(contexts[0].closed,true);assert.ok(sources.every(s=>s.stopped));console.log('PASS Porsche: RPM pitch response; load and lift crossfade; braking priority; continuous idle; no generic brake effect; no source churn; shutdown and cleanup.')
