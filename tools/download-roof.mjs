import fs from 'node:fs/promises';import sharp from 'sharp';
const response=await fetch('https://api.polyhaven.com/files/roof_tiles');if(!response.ok)throw Error('Roof metadata '+response.status);const meta=await response.json();
for(const [key,suffix,color] of [['Diffuse','diff',true],['nor_gl','normal',false],['Rough','rough',false]]){
 const url=meta[key]['2k'].jpg.url;const response=await fetch(url);if(!response.ok)throw Error(response.status+' '+url);
 const buffer=Buffer.from(await response.arrayBuffer());await sharp(buffer).webp({quality:90}).toFile('public/textures/italian-roof-'+suffix+'.webp');console.log(suffix,url,buffer.length)
}
