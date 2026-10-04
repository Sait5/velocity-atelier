import {rolldown} from 'rolldown'
import {Group,Object3D,PerspectiveCamera,Vector3} from 'three'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
await fs.mkdir('tools/generated',{recursive:true})
const build=await rolldown({input:'app/three/showroomIntro.ts',external:['three']})
await build.write({file:'tools/generated/showroomIntro.mjs',format:'esm'});await build.close()
const {createShowroomIntro}=await import('./generated/showroomIntro.mjs')
const root=new Group();root.position.y=.012
const wheels=Array.from({length:4},()=>new Object3D());wheels.forEach((wheel,i)=>wheel.rotation.z=i*.3)
const original=root.position.clone(),rotations=wheels.map(w=>w.rotation.z),camera=new PerspectiveCamera(),target=new Vector3(),states=[]
const intro=createShowroomIntro({root,wheels},camera,target,active=>states.push(active))
intro.play();assert(root.position.x>7);assert.equal(states.at(-1),true)
intro.stop();assert(root.position.equals(original));assert.deepEqual(wheels.map(w=>w.rotation.z),rotations);assert.equal(states.at(-1),false)
intro.play();intro.stop();assert(root.position.equals(original));assert(target.equals(new Vector3(0,.65,0)))
console.log('Intro can be interrupted and replayed without leaving body or wheels displaced.')
process.exit(0)
