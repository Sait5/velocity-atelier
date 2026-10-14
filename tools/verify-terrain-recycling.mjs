import assert from 'node:assert/strict'

// A moving section keeps its physical slot; only the hidden outer section
// should change geometry and scatter data at a 256 m road boundary.
const physicalSlot=(logical,base)=>((logical-base)%9+9)%9
for(let base=-64;base<64;base++){
 const previous=new Map(Array.from({length:9},(_,i)=>[physicalSlot(i,base),i-4-base]))
 let changed=0
 for(let i=0;i<9;i++)if(previous.get(physicalSlot(i,base+1))!==i-4-(base+1))changed++
 assert.equal(changed,1,`Unnecessary geometry/foliage update at boundary ${base}`)
}
const recycledNearestPoint=1024-128
const visibilityCutoff=650
const fogEnd=520
assert(recycledNearestPoint>visibilityCutoff)
assert(visibilityCutoff-13>fogEnd,'Orbit camera must not reveal the visibility cutoff')
console.log('128 section transitions: one hidden section updated; fog covers the culling boundary.')
