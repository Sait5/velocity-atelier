import fs from 'node:fs/promises';
import path from 'node:path';
const base='../assets-research/italian-environment';await fs.mkdir(base,{recursive:true});
async function download(url,file){try{await fs.access(file);return}catch{}const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0'}});if(!r.ok)throw new Error(r.status+' '+url);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,new Uint8Array(await r.arrayBuffer()));console.log(path.basename(file));}
for(const [key,name] of [['facade','modular_urban_apartments_facade'],['island_tree_01','island_tree_01']]){
 const response=await fetch('https://api.polyhaven.com/files/'+name,{headers:{'User-Agent':'Mozilla/5.0'}});if(!response.ok)throw new Error('Metadata '+response.status);const data=await response.json();await fs.writeFile('../assets-research/'+key+'-files.json',JSON.stringify(data));const r=data.gltf['2k'].gltf,dir=path.join(base,name);
 await download(r.url,path.join(dir,name+'.gltf'));
 const entries=Object.entries(r.include);
 for(let i=0;i<entries.length;i+=4)await Promise.all(entries.slice(i,i+4).map(([name,value])=>download(value.url,path.join(dir,name))));
}
const hdrResponse=await fetch('https://api.polyhaven.com/files/vatican_road',{headers:{'User-Agent':'Mozilla/5.0'}});if(!hdrResponse.ok)throw new Error('Panorama metadata '+hdrResponse.status);const hdr=await hdrResponse.json();
await download(hdr.tonemapped.url,'public/textures/vatican-road-8k.jpg');
await download(hdr.hdri['1k'].hdr.url,'public/textures/vatican-road-lighting.hdr');

const pavingResponse=await fetch('https://api.polyhaven.com/files/pavement_03',{headers:{'User-Agent':'Mozilla/5.0'}});if(!pavingResponse.ok)throw new Error('Pavement metadata '+pavingResponse.status);const paving=await pavingResponse.json(),{default:sharp}=await import('sharp');
for(const [key,name] of [['Diffuse','diff'],['nor_gl','normal'],['Rough','rough']]){const image=await fetch(paving[key]['2k'].jpg.url);if(!image.ok)throw new Error('Pavement '+image.status);await sharp(Buffer.from(await image.arrayBuffer())).webp({quality:88}).toFile('public/textures/italian-pavement-'+name+'.webp')}

const paving4k=await fetch(paving.Diffuse['4k'].jpg.url);if(!paving4k.ok)throw new Error('Pavement 4K '+paving4k.status);await sharp(Buffer.from(await paving4k.arrayBuffer())).webp({quality:94}).toFile('public/textures/italian-pavement-diff-4k.webp');
