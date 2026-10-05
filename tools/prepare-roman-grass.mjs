import fs from 'node:fs/promises';import sharp from 'sharp';
const meta=await fetch('https://api.polyhaven.com/files/withered_grass',{headers:{'User-Agent':'Mozilla/5.0'}}).then(r=>r.json());for(const [key,name] of [['Diffuse','diff'],['nor_gl','normal']]){const e=meta[key]['2k'].jpg,r=await fetch(e.url);if(!r.ok)throw Error(r.status);await sharp(Buffer.from(await r.arrayBuffer())).webp({quality:85}).toFile('public/textures/roman-grass-'+name+'.webp')}

