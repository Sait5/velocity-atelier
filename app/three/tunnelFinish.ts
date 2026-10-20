import * as T from 'three'
import {roadWearGlsl} from './roadWear'
import type {RoadAssets} from './roadAssets'

/** Finishes for the source road tunnel (judefelix): the lining becomes cladding panels on the walls under a sprayed-concrete
 * vault with exhaust soot towards the crown, metals get believable roughness, the curbs get metric UVs instead of one
 * texture stretched over 190 m, and the asphalt gets a scanned normal/roughness so the luminaires catch it. Shader work
 * only: no extra geometry or draw calls. Call before the source scene is cloned (clones share these materials). */
export function refineTunnel(source:T.Object3D,assets:RoadAssets,sectionLength:number){
 const owned:(T.Material|T.BufferGeometry)[]=[]
 const meshes:T.Mesh[]=[];source.updateMatrixWorld(true);source.traverse(o=>{if(o instanceof T.Mesh)meshes.push(o)})
 const inside=(o:T.Object3D,name:string)=>{for(let p:T.Object3D|null=o;p;p=p.parent)if(p.name.startsWith(name))return true;return false}
 const materials=new Map<string,T.MeshStandardMaterial>();for(const mesh of meshes)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.set(m.name,m as T.MeshStandardMaterial)

 // Metals were exported as perfect mirrors (roughness 0) and read as black voids against the dark tunnel.
 for(const [name,roughness] of [['Material.015',.42],['Material.017',.38],['Material.006',.34],['Material.014',.5],['Material.016',.55],['Material.012',.5],['Material.010',.6]] as const){const m=materials.get(name);if(m)m.roughness=roughness}
 // LED luminaires instead of sodium amber.
 const lamp=materials.get('Material.018');if(lamp)lamp.emissive.setRGB(1,.94,.86)

 // Curbs: they share the lining's concrete but their UVs span the whole 190 m section; give them their own copy with
 // box-projected UVs in metres (0.5 m texture tile).
 const lining=materials.get('Material.004')
 if(lining){
  const curb=lining.clone();curb.name='Tunnel curb concrete';curb.color.setRGB(.62,.62,.6);owned.push(curb)
  const p=new T.Vector3(),n=new T.Vector3(),normalMatrix=new T.Matrix3()
  for(const mesh of meshes){
   if(mesh.material!==lining||!inside(mesh,'Sidewalk'))continue
   const g=mesh.geometry.clone(),pos=g.getAttribute('position'),nor=g.getAttribute('normal'),uv=new Float32Array(pos.count*2);normalMatrix.getNormalMatrix(mesh.matrixWorld)
   for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);n.fromBufferAttribute(nor,i).applyMatrix3(normalMatrix).normalize()
    const [a,b]=Math.abs(n.y)>.6?[p.x,p.z]:Math.abs(n.x)>Math.abs(n.z)?[p.z,p.y]:[p.x,p.y];uv[i*2]=a*2;uv[i*2+1]=b*2}
   g.setAttribute('uv',new T.BufferAttribute(uv,2));mesh.geometry=g;mesh.material=curb;owned.push(g)
  }
 }

 // Lining: the UVs are arc metres / 3 around the profile (|u| = 0 at the crown, 3.26 at the curb) and metres / 3.014
 // along it (64 units per 192.9 m section, so 0.8 units = one 2.41 m panel; joints repeat exactly with the section).
 if(lining){
  lining.metalness=0;lining.roughness=1;lining.color.set('#ffffff');lining.normalScale.set(.8,.8)
  lining.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec2 vLining;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvLining=uv;')
   shader.fragmentShader='varying vec2 vLining;\nfloat tunnelHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+shader.fragmentShader
    .replace('#include <map_fragment>',`
     float arc=abs(vLining.x)*3.0;
     // panels from the curb (arc 9.78 m) up to 3.3 m wall height (arc 6.62 m), three rows; a painted trim band above them
     float panel=step(6.62,arc)*step(arc,9.9),trim=step(6.47,arc)*step(arc,6.62);
     float row=floor((arc-6.62)/1.053),column=floor(vLining.y/.8);
     float rowEdge=min(fract((arc-6.62)/1.053),1.-fract((arc-6.62)/1.053))*1.053,columnEdge=min(fract(vLining.y/.8),1.-fract(vLining.y/.8))*2.411;
     float joint=panel*(1.-smoothstep(.004,.011,min(rowEdge,columnEdge)));
     float tint=tunnelHash(vec2(row,column+floor(vLining.x*.2)*97.));
     #include <map_fragment>
     float grain=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
     vec3 concrete=mix(vec3(.22,.22,.21),vec3(.44,.43,.41),clamp(grain*1.6,0.,1.));
     // exhaust soot collects towards the crown, broken up by the concrete's own mottling
     float soot=smoothstep(5.2,.4,arc)*(.55+.45*clamp(grain*2.,0.,1.));
     concrete*=1.-.3*soot;
     vec3 cladding=vec3(.43,.425,.405)*(.94+.1*tint)*(.97+.06*grain);
     float spray=smoothstep(8.7,9.85,arc);cladding=mix(cladding,vec3(.2,.19,.17),.55*spray*(.6+.4*grain));
     diffuseColor.rgb=mix(concrete,cladding,panel);
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.045,.047,.05),trim);
     diffuseColor.rgb*=1.-.85*joint;`)
    .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(mix(.88,.97,roughnessFactor),mix(.34,.48,tint),panel);roughnessFactor=mix(roughnessFactor,.55,trim);roughnessFactor=mix(roughnessFactor,.95,joint);')
    .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=0.;')
    // spill from the luminaire rows onto the vault above them (the LED spots themselves point down at the road)
    .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.93,.84)*.038*exp(-pow(arc-4.7,2.)/2.6)*(1.-panel-trim);')
    .replace('mapN.xy *= normalScale;','mapN.xy *= normalScale*mix(1.,.12,panel+trim);')
  }
  lining.customProgramCacheKey=()=> 'tunnel-lining-v1';lining.needsUpdate=true
 }

 // Asphalt: the road texture carries the lane markings and stays; Poly Haven Asphalt 01 (CC0) adds the surface relief
 // and a worn sheen on a second, metric UV set (~2 m tile, a whole number of tiles per section so copies join seamlessly).
 const sectionTiles=100
 const road=materials.get('Material.008')
 const relief=assets.texture('/textures/asphalt_01_nor_gl_2k.webp'),wear=assets.texture('/textures/asphalt_01_rough_2k.webp')
 if(road){
  const p=new T.Vector3()
  for(const mesh of meshes){
   if(mesh.material!==road)continue
   const g=mesh.geometry,pos=g.getAttribute('position'),uv=new Float32Array(pos.count*2)
   for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);uv[i*2]=p.x*.5;uv[i*2+1]=p.z*sectionTiles/sectionLength}
   g.setAttribute('uv1',new T.BufferAttribute(uv,2))
  }
  relief.map.channel=1;wear.map.channel=1
  road.normalMap=relief.map;road.normalScale.set(.55,.55);road.roughnessMap=wear.map;road.roughness=.92;road.metalness=0
  // natural wear on the tunnel asphalt too (wheel tracks, sealed cracks, repair patches): road metres from the metric UVs
  const metresPerTile=(sectionLength/sectionTiles).toFixed(4)
  road.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+roadWearGlsl).replace('#include <map_fragment>',`#include <map_fragment>
  vec2 wear=roadWear(vec2(vNormalMapUv.y*${metresPerTile},vNormalMapUv.x*2.));diffuseColor.rgb*=wear.x;`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n  roughnessFactor=clamp(roughnessFactor+wear.y,.04,1.);')}
  road.customProgramCacheKey=()=>'tunnel-asphalt-wear-v1';road.needsUpdate=true
 }
 return {ready:Promise.all([relief.ready,wear.ready]),dispose(){owned.forEach(m=>m.dispose())}}
}
