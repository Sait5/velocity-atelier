import fs from 'node:fs/promises';
for(const model of ['revuelto-supplied-hinges','revuelto-supplied-complete']){
 const path=`public/models/fitted-hinges/${model}.glb`,bytes=await fs.readFile(path),len=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+len)),binary=bytes.subarray(28+len);
 const parents=new Map();doc.nodes.forEach((n,i)=>n.children?.forEach(c=>parents.set(c,i)));
 function side(node){while(node!==undefined){const name=doc.nodes[node].name||'';if(name.startsWith('Supplied_L_'))return 'L';if(name.startsWith('Supplied_R_'))return 'R';node=parents.get(node)}}
 const source=doc.animations.flatMap(a=>a.channels.map(c=>({channel:c,sampler:a.samplers[c.sampler]}))),chunks=[binary],duration=1.2;let size=binary.length;
 function read(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],count={SCALAR:1,VEC3:3,VEC4:4}[a.type];return Array.from({length:a.count*count},(_,i)=>binary.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*4))}
 function append(values,type){const b=Buffer.from(new Float32Array(values).buffer),view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:size,byteLength:b.length});chunks.push(b);size+=b.length;const dim={SCALAR:1,VEC3:3,VEC4:4}[type],index=doc.accessors.length,a={bufferView:view,componentType:5126,count:values.length/dim,type};if(type==='SCALAR'){a.min=[Math.min(...values)];a.max=[Math.max(...values)]}doc.accessors.push(a);return index}
 doc.animations=[];
 for(const s of ['L','R'])for(const reverse of [false,true]){
  const samplers=[],channels=[];
  for(const {channel,sampler} of source.filter(r=>side(r.channel.target.node)===s)){
   const input=read(sampler.input),out=read(sampler.output),dim={SCALAR:1,VEC3:3,VEC4:4}[doc.accessors[sampler.output].type],start=input[0],span=input.at(-1)-start;
   const times=input.map(t=>(t-start)/span*duration),values=reverse?Array.from({length:input.length},(_,i)=>out.slice((input.length-1-i)*dim,(input.length-i)*dim)).flat():out;
   channels.push({...channel,sampler:samplers.length});samplers.push({input:append(times,'SCALAR'),output:append(values,doc.accessors[sampler.output].type),interpolation:'LINEAR'});
  }
  if(!channels.length)throw Error(`No supplied animation for ${s}`);
  doc.animations.push({name:`Door_${s}_${reverse?'Close':'Open'}`,channels,samplers});
 }
 const bin=Buffer.concat(chunks);doc.buffers=[{byteLength:bin.length}];const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);await fs.writeFile(path,Buffer.concat([h,json,bh,bin]));console.log(model,doc.animations.map(a=>`${a.name}: ${a.channels.length} channels`));
}
