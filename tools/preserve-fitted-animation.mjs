import fs from 'node:fs/promises';
// Keep the exact browser animation samples; Blender rounds glTF times to frames.
function unpack(b){const n=b.readUInt32LE(12);return {doc:JSON.parse(b.subarray(20,20+n)),bin:b.subarray(28+n)}}
for(const car of ['porsche','ferrari','revuelto'].filter(car=>!process.argv[2]||car===process.argv[2])){
 const path=`public/models/fitted-hinges/${car}-complete.glb`;
 const full=unpack(await fs.readFile(path)),rig=unpack(await fs.readFile(`public/models/fitted-hinges/${car}-hinges.glb`));
 const views=full.doc.bufferViews.length,accessors=full.doc.accessors.length,offset=full.bin.length;
 full.doc.bufferViews.push(...rig.doc.bufferViews.map(v=>({...v,buffer:0,byteOffset:(v.byteOffset||0)+offset})));
 full.doc.accessors.push(...rig.doc.accessors.map(a=>({...a,bufferView:a.bufferView+views})));
 full.doc.animations=rig.doc.animations.map(a=>({...a,
  samplers:a.samplers.map(s=>({...s,input:s.input+accessors,output:s.output+accessors})),
  channels:a.channels.map(c=>{const name=rig.doc.nodes[c.target.node].name,node=full.doc.nodes.findIndex(n=>n.name===name);if(node<0)throw Error(`Missing animated node ${name}`);return {...c,target:{...c.target,node}}})
 }));
 const bin=Buffer.concat([full.bin,rig.bin]);full.doc.buffers=[{byteLength:bin.length}];
 const raw=Buffer.from(JSON.stringify(full.doc)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),h=Buffer.alloc(20),bh=Buffer.alloc(8);
 h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 await fs.writeFile(path,Buffer.concat([h,json,bh,bin]));console.log(car,'exact animation samples preserved');
}
