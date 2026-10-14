import fs from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import assert from 'node:assert/strict'
const sources=[],contexts=[]
class Param {value=0;setTargetAtTime(v){this.value=v}setValueAtTime(v){this.value=v}cancelScheduledValues(){}}
class Node {connect(){}disconnect(){}}
class Gain extends Node {gain=new Param()}
class Source extends Node {playbackRate=new Param();start(){this.started=true}stop(){this.stopped=true}}
class Context {currentTime=0;destination={};gains=[];constructor(){contexts.push(this)}createGain(){const n=new Gain();this.gains.push(n);return n}createBiquadFilter(){const n=new Node();n.Q=new Param();n.frequency=new Param();this.filter=n;return n}createBufferSource(){const n=new Source();sources.push(n);return n}async decodeAudioData(bytes){return bytes}async resume(){}async close(){this.closed=true}}
const timing=JSON.parse(fs.readFileSync('public/audio/ferrari-user-driving-timing.json','utf8'))
const coastTiming=JSON.parse(fs.readFileSync('public/audio/ferrari-user-coast-timing.json','utf8'))
const sandbox={AudioContext:Context,AbortController,fetch:async url=>({ok:true,json:async()=>url.split('?')[0].includes('ferrari-user-coast')?coastTiming:timing,arrayBuffer:async()=>({name:url,duration:url.split('?')[0].includes('ferrari-user-coast')?coastTiming.loopEnd:timing.loopEnd})})};vm.createContext(sandbox)
vm.runInContext(ts.transpile(fs.readFileSync('app/three/ferrariEngineAudio.ts','utf8').replace('export function','function'))+'\nthis.create=createFerrariEngineAudio;',sandbox)
const engine=sandbox.create();await engine.preload();assert.equal(sources.length,0);assert.equal(contexts[0].gains[0].gain.value,0);engine.start()
engine.update(900,false,.8,true);const ignition=sources[0];assert.ok(ignition.buffer.name.includes('ferrari-start'));assert.equal(ignition.playbackRate.value,1)
engine.update(900,false,.8,true);assert.equal(sources.length,1)
engine.update(4500,true,.8,true,30);assert.equal(ignition.stopped,true)
const drive=sources[1];assert.ok(drive.buffer.name.includes('ferrari-user-driving'));assert.equal(drive.loop,true)
assert.equal(drive.loopStart,timing.loopStart);assert.equal(drive.loopEnd,timing.loopEnd)
engine.update(4500,true,.8,true,30,false,true);assert.ok(Math.abs(contexts[0].gains[0].gain.value-.36)<1e-10);assert.equal(contexts[0].filter.frequency.value,3200)
const count=sources.length
for(let i=0;i<6000;i++){
 contexts[0].currentTime+=.1;engine.update(900+i%8101,true,.8,true,370/3.6,i%30===0,i%20===0)
 assert.equal(drive.playbackRate.value,1);assert.equal(drive.stopped,undefined)
}
assert.equal(sources.length,count)
engine.update(3000,false,.8,true,25) // auto acceleration off, still rolling fast
assert.equal(contexts[0].gains[2].gain.value,0)
assert.equal(drive.stopped,undefined)
const coast=sources.at(-1)
assert.ok(coast.buffer.name.includes('ferrari-user-coast'))
assert.equal(coast.loop,true);assert.equal(coast.loopStart,coastTiming.loopStart);assert.equal(coast.loopEnd,coastTiming.loopEnd);assert.equal(coast.loopStart,4);assert.equal(coastTiming.repeat_seconds,2)
const edits=JSON.parse(fs.readFileSync('tools/ferrari-coast-manifest.json','utf8'));assert.deepEqual(edits.repeat_source_seconds,[21,23.25]);assert.equal(edits.tempo_change,false);assert.equal(edits.ending_duration,2)
assert.equal(coast.playbackRate.value,1)
const coastGain=contexts[0].gains.at(-1)
assert.ok(coastGain.gain.value>0)
const initialCoastGain=coastGain.gain.value
contexts[0].currentTime+=10;engine.update(2000,false,.8,true,25)
assert.ok(coastGain.gain.value<initialCoastGain,'coast fades with time even at unchanged speed')
assert.equal(coast.playbackRate.value,1)
for(let i=0;i<600;i++){contexts[0].currentTime+=.1;engine.update(2000,false,.8,true,15)}
assert.equal(sources.length,count+1);assert.equal(coast.stopped,undefined)
engine.update(3000,true,.8,true,20)
assert.equal(coast.stopped,true)
assert.equal(contexts[0].gains[2].gain.value,1)
engine.update(3000,false,.8,true,20,false,false,true)
assert.equal(contexts[0].gains[2].gain.value,0)
const brakingCoast=sources.at(-2);assert.ok(brakingCoast.buffer.name.includes('ferrari-user-coast'))
assert.ok(brakingCoast.buffer.name.includes('coast-end'));assert.equal(brakingCoast.loop,false)
const brake=sources.at(-1);assert.ok(brake.buffer.name.includes('car-braking'))
const brakingCount=sources.length
for(let i=0;i<20;i++)engine.update(3000,false,.8,true,20,false,false,true)
assert.equal(sources.length,brakingCount) // neither deceleration nor tires retrigger every frame
engine.update(2000,false,.8,true,10);assert.equal(brake.stopped,true)
assert.equal(contexts[0].gains[2].gain.value,0)
engine.update(1200,true,.8,true,1,false,false,true) // brake overrides throttle even at low speed
assert.equal(contexts[0].gains[2].gain.value,0)
assert.equal(sources.length,brakingCount+1)
const lowSpeedBrake=sources.at(-1)
engine.update(900,false,.8,true,0,false,false,true)
assert.equal(lowSpeedBrake.stopped,true);assert.equal(brakingCoast.stopped,true)
engine.update(900,false,.8,true,0);assert.equal(drive.stopped,undefined);assert.equal(contexts[0].gains[2].gain.value,0)
engine.update(4000,true,.8,true,15);assert.equal(sources.length,brakingCount+1);assert.equal(contexts[0].gains[2].gain.value,1)
engine.update(2000,false,.8,true,10)
const disabledCoast=sources.at(-1)
engine.update(900,false,.8,true,.7)
assert.equal(disabledCoast.stopped,true)
const ending=sources.at(-1);assert.ok(ending.buffer.name.includes('coast-end'));assert.equal(ending.loop,false)
const endingCount=sources.length;ending.onended()
for(let i=0;i<100;i++)engine.update(900,false,.8,true,.7)
assert.equal(sources.length,endingCount,'the final two-second take must not repeat')
engine.update(900,false,.8,false);assert.equal(drive.stopped,true);assert.equal(contexts[0].gains[0].gain.value,0)
assert.equal(disabledCoast.stopped,true)
engine.dispose();engine.start();assert.equal(contexts.length,1);assert.equal(contexts[0].closed,true)
console.log('PASS: initial four seconds once, first two seconds removed from repeats; two-second ending once near stop; original pitch and tempo, cabin and cleanup')


