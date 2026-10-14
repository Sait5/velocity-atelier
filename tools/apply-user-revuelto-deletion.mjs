import fs from 'node:fs/promises'
const source='public/models/lamborghini-revuelto.glb'
const output='public/models/lamborghini-revuelto-user-edited.glb'
const buffer=await fs.readFile(source)
const jsonLength=buffer.readUInt32LE(12)
const doc=JSON.parse(buffer.subarray(20,20+jsonLength).toString())
const removed=[]
const names=new Set(['DoorJambLF_PaintedMetal'])
for(let i=0;i<doc.nodes.length;i++)if(names.has(doc.nodes[i].name))removed.push(i)
if(removed.length!==names.size)throw new Error('User-deleted Revuelto part not found')
for(const node of doc.nodes)if(node.children)node.children=node.children.filter(i=>!removed.includes(i))
for(const scene of doc.scenes)scene.nodes=scene.nodes.filter(i=>!removed.includes(i))
// All other meshes, transforms, materials, textures and the binary payload stay intact.
const json=Buffer.from(JSON.stringify(doc)),padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)])
const rest=buffer.subarray(20+jsonLength),header=Buffer.alloc(20)
header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+rest.length,8)
header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16)
await fs.writeFile(output,Buffer.concat([header,padded,rest]))
console.log({output,removed:removed.map(i=>doc.nodes[i].name),binaryUnchanged:true})
