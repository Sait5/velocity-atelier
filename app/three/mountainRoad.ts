import * as T from 'three'
import {createRoadAssets} from './roadAssets'

/** Two Blender-derived landforms, with all chunks decoded and uploaded before driving. */
export function createMountainRoad(scene:T.Scene,winter=false){
 const assets=createRoadAssets(),root=new T.Group(),owned=new Set<T.Material|T.BufferGeometry|T.Texture>(),folder=winter?'winter-road':'mountain-road'
 root.name=winter?'Mount Rainier winter pass':'Kubocarte mountain valley';scene.add(root)
 let alive=true
 const roadTravel={value:0}
 const own=<V extends T.Material|T.BufferGeometry|T.Texture>(v:V)=>{owned.add(v);return v}
 // A 32-triangle horizon floor closes the background behind the finite terrain.
 // It sits below the valley and has no textures, shadows or per-frame streaming.
 const horizonMaterial=own(new T.MeshBasicMaterial({color:winter?'#25374e':'#f5ede7',fog:true,transparent:true,depthWrite:false}))
 horizonMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a*=1.-smoothstep(1400.,6000.,vFogDepth);\n#include <alphatest_fragment>')}
 horizonMaterial.customProgramCacheKey=()=> 'mountain-soft-horizon-v1'
 const horizonFloor=new T.Mesh(own(new T.CircleGeometry(30000,32)),horizonMaterial)
 horizonFloor.rotation.x=-Math.PI/2;horizonFloor.position.y=-145;horizonFloor.frustumCulled=false;root.add(horizonFloor)
 const colour=assets.texture(`/models/${folder}/terrain-colour.jpg`,true),rock=assets.texture(winter?'/textures/snow_02_diff_4k.jpg':'/textures/rock_face_03_diff_4k.jpg',true),rockRough=assets.texture(winter?'/textures/snow_02_rough_2k.jpg':'/textures/rock_face_03_rough_2k.jpg'),rockNormal=assets.texture(winter?'/textures/snow_02_nor_gl_2k.jpg':'/textures/rock_face_03_nor_gl_2k.jpg')
 colour.map.wrapS=colour.map.wrapT=T.ClampToEdgeWrapping
 const terrain=own(new T.MeshStandardMaterial({map:colour.map,roughness:.91,envMapIntensity:.42}))
 terrain.onBeforeCompile=shader=>{
  shader.uniforms.rockDetail={value:rock.map};shader.uniforms.rockRough={value:rockRough.map};shader.uniforms.rockNormal={value:rockNormal.map}
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 terrainPoint; varying vec3 terrainNormal; varying vec3 terrainWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPoint=position; terrainNormal=normal;terrainWorld=(modelMatrix*vec4(position,1.)).xyz;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 terrainPoint,terrainNormal,terrainWorld;uniform sampler2D rockDetail,rockRough,rockNormal;
   vec3 tri(sampler2D tex,vec3 p){vec3 w=pow(abs(normalize(terrainNormal)),vec3(4.));w/=max(.001,w.x+w.y+w.z);return texture2D(tex,p.yz).rgb*w.x+texture2D(tex,p.xz).rgb*w.y+texture2D(tex,p.xy).rgb*w.z;}
  `).replace('#include <map_fragment>',`#include <map_fragment>
   float closeDetail=1.-smoothstep(65.,320.,length(vViewPosition));vec3 grain=tri(rockDetail,terrainPoint*${winter?'.5':'.1875'});
   ${winter?'float sourceGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(sourceGrey)*vec3(.94,.98,1.04);diffuseColor.rgb=mix(diffuseColor.rgb,grain*vec3(.90,.95,1.0),closeDetail*.70);':'float sourceGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(sourceGrey)*vec3(1.02,1.0,.98),.82);diffuseColor.rgb=mix(diffuseColor.rgb,grain*vec3(.98,.98,.97),closeDetail*.76);'}
   // Source UVs stop at the scan border; the outer closure uses continuous
   // triplanar ground rather than stretching that last photographic pixel.
   float outerGround=smoothstep(200.,450.,abs(terrainPoint.z));
   diffuseColor.rgb=mix(diffuseColor.rgb,grain*${winter?'vec3(.90,.95,1.)':'vec3(.94,.94,.92)'},outerGround);
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+tri(rockRough,terrainPoint*${winter?'.5':'.1875'}).r*.12-.06,.72,.99);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float detailHeight=dot(tri(rockNormal,terrainPoint*${winter?'.5':'.1875'}).rg,vec2(.5));
   vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);
   float det=dot(dpdx,r1);normal=normalize(abs(det)*normal-sign(det)*(dFdx(detailHeight)*r1+dFdy(detailHeight)*r2)*.018);
  `)
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`
   #ifdef USE_FOG
   float corridorFog=smoothstep(220.,520.,abs(terrainWorld.x));
   float valleyFog=${winter?'smoothstep(300.,620.,length(vViewPosition))':'max(smoothstep(300.,620.,length(vViewPosition)),smoothstep(75.,300.,max(0.,-terrainWorld.z)))'};
   gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,max(corridorFog,valleyFog));
   #endif
  `)
 }
 terrain.customProgramCacheKey=()=>`mountain-pbr-hidden-boundary-v3-${winter}`
 const asphalt=assets.texture('/textures/asphalt_01_diff_4k.jpg',true),normal=assets.texture('/textures/asphalt_01_nor_gl_2k.jpg'),rough=assets.texture('/textures/asphalt_01_rough_2k.jpg')
 for(const t of [asphalt.map,normal.map,rough.map])t.repeat.set(128,3.8)
 const roadMat=own(new T.MeshStandardMaterial({map:asphalt.map,normalMap:normal.map,normalScale:new T.Vector2(.25,.25),roughnessMap:rough.map,roughness:.95,color:'#ffffff',envMapIntensity:.42}))
 roadMat.onBeforeCompile=s=>{s.uniforms.roadTravel=roadTravel;s.uniforms.snowColour={value:rock.map};s.uniforms.snowNormal={value:rockNormal.map};s.uniforms.snowRough={value:rockRough.map};s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 roadPoint;uniform float roadTravel;').replace('#include <begin_vertex>','#include <begin_vertex>\nroadPoint=position;roadPoint.x=(modelMatrix*vec4(position,1.)).x-roadTravel;');s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 roadPoint;uniform sampler2D snowColour,snowNormal,snowRough;
 float snowHash(vec2 p){p.x=mod(p.x,128.);return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float snowNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(snowHash(i),snowHash(i+vec2(1.,0.)),f.x),mix(snowHash(i+vec2(0.,1.)),snowHash(i+vec2(1.,1.)),f.x),f.y);}
 float snowMask(vec2 p){vec2 q=vec2(p.x/32.,p.y*.65);float broad=snowNoise(q+vec2(19.,7.));float fine=snowNoise(q*4.+vec2(43.,13.));float bank=smoothstep(1.55+broad*1.35,3.7,abs(p.y));float field=broad*.64+fine*.36;float drift=smoothstep(.48,.71,field)*(.55+.38*snowNoise(q*.25+vec2(31.,4.)));return clamp(bank*(.55+.4*fine)+drift,0.,.96);}
 `).replace('#include <map_fragment>',`#include <map_fragment>
 float asphaltGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(asphaltGrey*.96,asphaltGrey,asphaltGrey*1.02)*.82+vec3(.032,.034,.036);
 ${winter?'float snowCover=snowMask(roadPoint.xy);vec3 roadSnow=texture2D(snowColour,roadPoint.xy*.5).rgb;diffuseColor.rgb=mix(diffuseColor.rgb,roadSnow*vec3(.89,.94,1.),snowCover);':''}
 `);if(winter){s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=mix(roughnessFactor,max(.8,texture2D(snowRough,roadPoint.xy*.5).r),snowMask(roadPoint.xy));
 `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 snowN=texture2D(snowNormal,roadPoint.xy*.5).xyz*2.-1.;vec3 snowT=normalize(dFdx(-vViewPosition));vec3 snowB=normalize(cross(normal,snowT));normal=normalize(normal+(snowT*snowN.x+snowB*snowN.y)*snowMask(roadPoint.xy)*.18);
 `)}s.fragmentShader=s.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(220.,520.,length(vViewPosition)));
 #endif`)};roadMat.customProgramCacheKey=()=> `mountain-road-world-snow-v4-${winter}`
 const roadGeo=own(new T.PlaneGeometry(256,7.6)),placeholder=own(new T.BufferGeometry()),paintMat=own(new T.MeshStandardMaterial({color:'#d0cec1',roughness:.87,envMapIntensity:.2})),lineGeo=own(new T.PlaneGeometry(4,.13)),edgeGeo=own(new T.PlaneGeometry(256,.12))
 const steel=own(new T.MeshStandardMaterial({color:'#a4afb6',metalness:.82,roughness:.43})),postGeo=own(new T.BoxGeometry(.11,.82,.08))
 for(const material of [paintMat,steel]){material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(220.,520.,length(vViewPosition)));
 #endif`)};material.customProgramCacheKey=()=> 'mountain-distance-fog-v1'}
 // A closed pressed W-beam profile, rather than a flat texture pretending to be metal.
 const profile=[[-.08,.48],[-.025,.52],[.01,.59],[-.04,.64],[.01,.69],[-.025,.76],[-.08,.80]],points:number[]=[],indices:number[]=[]
 for(const x of [-128,128])for(const [z,y] of [...profile,...[...profile].reverse().map(([z,y])=>[z!-.009,y])])points.push(x,y!,z!)
 const n=profile.length*2;for(let i=0;i<n;i++){let j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i)}
 const railGeo=own(new T.BufferGeometry());railGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));railGeo.setIndex(indices);railGeo.computeVertexNormals()
 const slots=Array.from({length:9},()=>{const group=new T.Group();root.add(group);const road=new T.Mesh(roadGeo,roadMat);road.rotation.x=-Math.PI/2;road.position.y=.007;road.receiveShadow=true;group.add(road)
  const markers=new T.InstancedMesh(lineGeo,paintMat,16),dummy=new T.Object3D();for(let i=0;i<16;i++){dummy.position.set(-120+i*16,.011,0);dummy.rotation.x=-Math.PI/2;dummy.updateMatrix();markers.setMatrixAt(i,dummy.matrix)}group.add(markers)
  for(const z of [-3.45,3.45]){const edge=new T.Mesh(edgeGeo,paintMat);edge.rotation.x=-Math.PI/2;edge.position.set(0,.012,z);group.add(edge)}
  // The valley-side barrier is deliberately absent from the mountain side.
  for(const z of winter?[-4.05,4.05]:[-4.05]){const rail=new T.Mesh(railGeo,steel);rail.position.z=z;group.add(rail);const posts=new T.InstancedMesh(postGeo,steel,64);for(let i=0;i<64;i++){dummy.position.set(-126+i*4,.35,z-.045);dummy.rotation.set(0,0,0);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix)}group.add(posts)}
  return {group,mesh:new T.Mesh(placeholder,terrain),plants:[] as T.InstancedMesh[],variant:-1,lod:''}
 })
 const geometries:T.BufferGeometry[][]=[]
 let scatter:number[][][]=[],plantBase=new T.Matrix4()
 const ready=(async()=>{
  await Promise.all([colour.ready,rock.ready,rockRough.ready,rockNormal.ready,asphalt.ready,normal.ready,rough.ready])
  // Bounded decoding keeps the loader responsive and all source chunks resident.
  for(let i=0;i<16;i++){const a=await assets.model(`/models/${folder}/terrain-${i}-near.glb`);let result:T.BufferGeometry|undefined;a.scene.traverse(o=>{if(o instanceof T.Mesh)result=o.geometry});if(!result)throw new Error('Terrain mesh missing');geometries[i]=[result]}
  if(!alive)return
  if(!winter){
   const [metadata,shrub]=await Promise.all([fetch(`/models/${folder}/scene.json`).then(r=>{if(!r.ok)throw new Error('Mountain metadata missing');return r.json()}),assets.model('/models/mountain-road/shrub-optimized.glb')]);scatter=metadata.scatter
   shrub.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(shrub.scene),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3()),scale=1.35/Math.max(.01,size.y);plantBase.makeScale(scale,scale,scale);plantBase.setPosition(-centre.x*scale,-bounds.min.y*scale,-centre.z*scale)
   shrub.scene.traverse(o=>{if(o instanceof T.Mesh){const geo=own(o.geometry.clone());
    // Quantized POSITION must be decoded before a world transform; Int16 would overflow.
    for(const key of ['position','normal']){const a=geo.getAttribute(key);if(a?.normalized){const values=[];for(let i=0;i<a.count;i++)values.push(a.getX(i),a.getY(i),a.getZ(i));geo.setAttribute(key,new T.Float32BufferAttribute(values,3))}}
    geo.applyMatrix4(o.matrixWorld);geo.applyMatrix4(plantBase);const materials=(Array.isArray(o.material)?o.material:[o.material]).map(original=>{const m=own(original.clone());if(m instanceof T.MeshStandardMaterial){m.side=T.DoubleSide;m.alphaTest=.4;m.roughness=1;m.envMapIntensity=.7;m.color.multiplyScalar(1.12);m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(220.,520.,length(vViewPosition)));
 #endif`)};m.customProgramCacheKey=()=> 'mountain-foliage-distance-fog-v1'}return m});
    slots.forEach(slot=>{const plants=new T.InstancedMesh(geo,materials.length===1?materials[0]:materials,7);plants.castShadow=false;plants.receiveShadow=false;slot.group.add(plants);slot.plants.push(plants)})
   }})
  }
  slots.forEach(s=>{s.group.add(s.mesh);s.mesh.receiveShadow=true});update(0,0,0)
 })()
 function update(distance:number,_speed:number,_time:number){const base=Math.floor(distance/256),offset=T.MathUtils.euclideanModulo(distance,256);roadTravel.value=T.MathUtils.euclideanModulo(distance,16384)
  // Every visible section keeps the same geometry/material. Recycle only beyond
  // the opaque end of atmospheric fog; no whole-section LOD or foliage popping.
  for(let i=0;i<slots.length;i++){const s=slots[T.MathUtils.euclideanModulo(i-base,slots.length)]!;const chunk=i-4-base,variant=T.MathUtils.euclideanModulo(chunk,16),x=offset+(i-4)*256;const lod=0;s.group.position.x=x;s.group.visible=Math.abs(x)-128<650;s.mesh.castShadow=false;s.plants.forEach(p=>{p.visible=Math.abs(x)<896})
   if(geometries[variant]&&(s.variant!==variant||s.lod!==String(lod))){s.mesh.geometry=geometries[variant]![lod]!;const dummy=new T.Object3D();s.plants.forEach(plants=>{scatter[variant]?.forEach((p,j)=>{dummy.position.set(p[0]!,p[1]!-.12,p[2]!);dummy.rotation.y=j*2.39+variant;dummy.scale.setScalar(p[3]!);dummy.updateMatrix();plants.setMatrixAt(j,dummy.matrix)});plants.instanceMatrix.needsUpdate=true;plants.computeBoundingSphere();plants.visible=Math.abs(x)<896});s.variant=variant;s.lod=String(lod)}
  }
 }
 function prepare(renderer:T.WebGLRenderer,camera:T.Camera){const stage=new T.Group();for(const pair of geometries)for(const geo of pair){const m=new T.Mesh(geo,terrain);m.frustumCulled=false;stage.add(m)}root.add(stage);const groupVisibility=slots.map(s=>s.group.visible);slots.forEach(s=>{s.group.visible=true});const plants=slots.flatMap(s=>s.plants),saved=plants.map(p=>[p.visible,p.frustumCulled]);plants.forEach(p=>{p.visible=true;p.frustumCulled=false});for(const t of [colour.map,rock.map,rockRough.map,rockNormal.map,asphalt.map,normal.map,rough.map])renderer.initTexture(t);const old=renderer.getRenderTarget(),target=new T.WebGLRenderTarget(2,2);try{renderer.setRenderTarget(target);renderer.render(scene,camera)}finally{renderer.setRenderTarget(old);root.remove(stage);slots.forEach((s,i)=>{s.group.visible=groupVisibility[i]!});plants.forEach((p,i)=>{p.visible=saved[i]![0]!;p.frustumCulled=saved[i]![1]!});target.dispose()}}
 // Orbit stays in the carved corridor; no camera can enter the nearby mountain face.
 function adjustCamera(camera:T.PerspectiveCamera,position:T.Vector3){if(camera.position.z>4.8||(winter&&camera.position.z< -4.8)){camera.position.z=T.MathUtils.clamp(camera.position.z,winter?-4.8:-100,4.8);camera.lookAt(position.x,position.y+.65,position.z)}}
 return {ready,prepare,adjustCamera,heightAt:()=>.007,setContacts:(_p:T.Vector3[])=>{},update,setVisible:(visible:boolean)=>{root.visible=visible},dispose(){alive=false;scene.remove(root);root.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose()});assets.dispose();owned.forEach(o=>o.dispose())}}
}


