import fs from 'node:fs/promises';
const path='public/models/revuelto-two-arm-mechanism.glb',bytes=await fs.readFile(path),len=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+len)),binary=bytes.subarray(28+len),chunks=[binary];let size=binary.length;
function read(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],dim={SCALAR:1,VEC3:3,VEC4:4}[a.type];return Array.from({length:a.count*dim},(_,i)=>binary.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*4))}
function append(values,type){const b=Buffer.from(new Float32Array(values).buffer),view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:size,byteLength:b.length});chunks.push(b);size+=b.length;const dim={SCALAR:1,VEC3:3,VEC4:4}[type],index=doc.accessors.length,a={bufferView:view,componentType:5126,count:values.length/dim,type};if(type==='SCALAR'){a.min=[Math.min(...values)];a.max=[Math.max(...values)]}doc.accessors.push(a);return index}
const source=doc.animations.flatMap(a=>a.channels.map(c=>({channel:c,sampler:a.samplers[c.sampler]})));doc.animations=[];
for(const reverse of [false,true]){
 const samplers=[],channels=[];
 for(const {channel,sampler} of source){
  const times=read(sampler.input),values=read(sampler.output),type=doc.accessors[sampler.output].type,dim={VEC3:3,VEC4:4}[type];
  if(values.every((v,i)=>Math.abs(v-values[i%dim])<1e-6))continue;
  const out=reverse?Array.from({length:times.length},(_,i)=>values.slice((times.length-1-i)*dim,(times.length-i)*dim)).flat():values;
  channels.push({...channel,sampler:samplers.length});samplers.push({input:append(times.map(t=>(t-times[0])/(times.at(-1)-times[0])*1.2),'SCALAR'),output:append(out,type),interpolation:'LINEAR'});
 }
 doc.animations.push({name:reverse?'Door_Close':'Door_Open',samplers,channels});
}
if(doc.animations[0].channels.length<4)throw Error('Two-arm drivers were not exported');
const bin=Buffer.concat(chunks);doc.buffers=[{byteLength:bin.length}];const raw=Buffer.from(JSON.stringify(doc)),json=Buffer.concat([raw,Buffer.alloc((4-raw.length%4)%4,32)]),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+json.length+bin.length,8);h.writeUInt32LE(json.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);await fs.writeFile(path,Buffer.concat([h,json,bh,bin]));console.log('Existing two-arm animation',doc.animations[0].channels.length,'channels');
