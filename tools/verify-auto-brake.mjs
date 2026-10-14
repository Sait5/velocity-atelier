import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
const scene=fs.readFileSync('app/components/VehicleScene.client.vue','utf8')
const handler=scene.slice(scene.indexOf('function pressDriveKey('),scene.indexOf('function keyboard('))
const keys=new Set(),events=[]
const context={props:{drive:true},keys,emit:event=>events.push(event)}
vm.createContext(context);vm.runInContext(ts.transpile(handler),context)
for(const brake of ['s','arrowdown',' ']){
 keys.clear();keys.add('w');keys.add('arrowup');keys.add('d')
 context.pressDriveKey(brake)
 assert(!keys.has('w')&&!keys.has('arrowup'))
 assert(keys.has(brake)&&keys.has('d'))
 assert.equal(events.at(-1),'brake')
 keys.delete(brake);assert(!keys.has('w'),'releasing brake must not restore auto throttle')
}
const page=fs.readFileSync('app/pages/drive/[car].vue','utf8')
assert(page.includes('@brake="cancelAuto"'))
const cruise={value:true},calls=[]
context.cruise=cruise;context.scene={value:{setKey:(...args)=>calls.push(args)}}
const cancel=page.slice(page.indexOf('function cancelAuto('),page.indexOf('function resetDrive('))
vm.runInContext(ts.transpile(cancel),context);context.cancelAuto()
assert.equal(cruise.value,false);assert.equal(calls[0][0],'w');assert.equal(calls[0][1],false)
console.log('PASS: S, down arrow and space cancel auto acceleration and its button state; brake release cannot restart it')
