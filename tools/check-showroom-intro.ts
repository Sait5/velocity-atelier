import assert from 'node:assert/strict'
import * as T from 'three'
import gsap from 'gsap'
import {createShowroomIntro} from '../app/three/showroomIntro'

const root=new T.Group(),wheels=Array.from({length:4},()=>new T.Group())
wheels.forEach((w,i)=>{w.rotation.z=.17*(i+1);root.add(w)})
const camera=new T.PerspectiveCamera(),target=new T.Vector3()
let active=false,lights=[0,0]
const intro=createShowroomIntro({root,wheels},camera,target,v=>active=v,()=>{},(front,rear)=>lights=[front,rear])
function timeline(){const t=gsap.globalTimeline.getChildren(false,false,true).at(-1) as gsap.core.Timeline;assert.ok(t);t.pause();return t}
intro.play();const first=timeline();assert.equal(active,true)
first.time(3.4,false);const parked=wheels.map(w=>w.rotation.z)
first.time(4.2,false);assert.deepEqual(lights,[0,0])
first.time(5.0,false);assert.ok(lights[0]!>0&&lights[0]!<1);assert.equal(lights[1],0)
first.time(6.0,false);assert.deepEqual(lights,[1,0])
first.time(7.8,false);assert.deepEqual(lights,[0,0])
first.time(11.3,false);assert.deepEqual(lights,[0,0])
first.time(12.0,false);assert.equal(lights[0],0);assert.ok(lights[1]!>0&&lights[1]!<1)
first.time(first.duration(),false);assert.equal(active,false);assert.deepEqual(wheels.map(w=>w.rotation.z),parked)
intro.play();const second=timeline();second.time(0,false);assert.deepEqual(wheels.map(w=>w.rotation.z),parked)
second.time(1.4,false);const partial=wheels.map(w=>w.rotation.z);intro.stop();assert.deepEqual(wheels.map(w=>w.rotation.z),partial)
assert.deepEqual(lights,[0,0]);assert.equal(active,false)
gsap.ticker.sleep()
console.log('PASS: front/rear light cues; parked wheel phase preserved at completion; repeated tour and skip preserve wheel rotation.')
