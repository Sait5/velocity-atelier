import sharp from 'sharp'
import fs from 'node:fs/promises'
await fs.mkdir('public/models/mountain-road',{recursive:true})
await fs.mkdir('public/models/winter-road',{recursive:true})
// Retain the author's erosion/albedo pattern; replace snow cover with neutral mineral tones.
const {data,info}=await sharp('tools/source-assets/mountain/textures/Diffuse.png').resize(2048,2048).removeAlpha().raw().toBuffer({resolveWithObject:true})
for(let i=0;i<data.length;i+=info.channels){const v=(data[i]+data[i+1]+data[i+2])/765;data[i]=Math.round(81+v*65);data[i+1]=Math.round(83+v*58);data[i+2]=Math.round(78+v*50)}
await sharp(data,{raw:info}).jpeg({quality:96}).toFile('public/models/mountain-road/terrain-colour.jpg')
await sharp('tools/source-assets/mountain/textures/Normal Map.png').jpeg({quality:96}).toFile('public/models/mountain-road/terrain-normal.jpg')
// Keep photographic geology; turn low-altitude green forest into subdued snow cover.
const w=await sharp('tools/source-assets/winter/Texture.png').resize(8192).removeAlpha().raw().toBuffer({resolveWithObject:true})
for(let i=0;i<w.data.length;i+=w.info.channels){let r=w.data[i],g=w.data[i+1],b=w.data[i+2];if(g>r*1.035&&g>b*1.09){let v=(r+g+b)/3;w.data[i]=180+v*.2;w.data[i+1]=187+v*.2;w.data[i+2]=191+v*.2}else{w.data[i]=r*.88+21;w.data[i+1]=g*.90+23;w.data[i+2]=b*.91+25}}
await sharp(w.data,{raw:w.info}).jpeg({quality:95}).toFile('public/models/winter-road/terrain-colour.jpg')
console.log('Original terrain maps adapted; winter albedo retained at 8192px.')
