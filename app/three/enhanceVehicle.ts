import * as T from 'three'
/** Refine the retained exterior; the cabin and wheels use authored donor assets. */
export function enhanceVehicle(root:T.Group,_wheels:T.Group[],_rim:T.MeshStandardMaterial,_leather:T.MeshStandardMaterial){
 const pixels=new Uint8Array(64*64*4)
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const value=(x%8<2||y%8<2)?150:30;pixels.set([value,value,value,255],(y*64+x)*4)}
 const texture=new T.DataTexture(pixels,64,64);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(12,12);texture.needsUpdate=true
 const grille=new T.MeshStandardMaterial({color:'#101714',roughness:.64,metalness:.32,bumpMap:texture,bumpScale:.0012})
 const tail=new T.MeshPhysicalMaterial({color:'#a51413',emissive:'#ef281d',emissiveIntensity:1.5,roughness:.3,metalness:.05,clearcoat:1})
 const replaced=new Set<T.Material>()
 root.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material))return
  if(o.material.name==='Taillight_Glass'){replaced.add(o.material);o.material=tail}
  else if(o.name==='grills'){replaced.add(o.material);o.material=grille}
 })
 const used=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>used.add(m))});replaced.forEach(m=>{if(!used.has(m))m.dispose()})
 const light=new T.PointLight('#d9dfbf',.16,1.6);light.position.set(-.45,.92,.32);root.add(light)
}
