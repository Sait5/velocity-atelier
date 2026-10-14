import * as T from 'three'
import {createRoadAssets} from './roadAssets'

export const coastalLength=3000
export const coastalCentre=(d:number)=>18*Math.sin(d/290)+7*Math.sin(d/113)
export const coastalTangent=(d:number)=>18/290*Math.cos(d/290)+7/113*Math.cos(d/113)
const roadAltitude=24
const fract=(v:number)=>v-Math.floor(v)
const random=(n:number)=>fract(Math.sin(n*127.1+41.7)*43758.5453)
const noise=(x:number,z:number)=>Math.sin(x*.043+z*.12)*1.1+Math.sin(x*.117-z*.31)*.45+Math.sin(x*.31+z*.71)*.2
/** Metres above sea level, relative to the road's centre line. */
export function coastalHeight(d:number,s:number){
 if(Math.abs(s)<=6)return roadAltitude
 if(s<0){const f=-s-6,foot=Math.min(f,12)*.12,run=Math.max(0,f-12),base=105*(1-Math.exp(-run/90)),ridge=14*Math.sin(d*.011)+10*Math.sin(d*.025+f*.032)+6*Math.sin(d*.061+f*.17)+3*Math.sin(d*.12-f*.31);return roadAltitude+foot+base+(ridge+noise(d,s)*2)*Math.min(1,run/24)}
 const edge=8.5+Math.sin(d*.021)+Math.sin(d*.047)*.6,drop=Math.max(0,s-edge)
 return roadAltitude-Math.min(34,drop*1.45)+(noise(d,s)*2.8+Math.sin(d*.013)*2)*Math.min(1,drop/8)
}

/** A new continuous landscape, unrelated to the discarded coastal photogrammetry scan. */
export function createCoastalLandscape(scene:T.Scene){
 const assets=createRoadAssets(),group=new T.Group(),world=new T.Group(),owned=new Set<T.BufferGeometry|T.Material|T.InstancedMesh>(),tasks:Promise<unknown>[]=[]
 group.name='Velocity coastal landscape — new 3 km route';group.add(world);scene.add(group);let alive=true
 const texture=(url:string,color=false)=>{const asset=assets.texture(url,color);tasks.push(asset.ready);return asset.map}
 const asphalt=texture('/textures/asphalt_01_diff_4k.jpg',true),asphaltNormal=texture('/textures/asphalt_01_nor_gl_2k.jpg'),asphaltRough=texture('/textures/asphalt_01_rough_2k.jpg')
 const rockMap=texture('/textures/rock_face_03_diff_4k.jpg',true),rockNormal=texture('/textures/rock_face_03_nor_gl_2k.jpg'),rockRough=texture('/textures/rock_face_03_rough_2k.jpg'),moss=texture('/textures/rock_3_diff_4k.jpg',true)
 const meadow=texture('/textures/roman-meadow-diff.webp',true)
 const roadMaterial=new T.MeshStandardMaterial({map:asphalt,normalMap:asphaltNormal,normalScale:new T.Vector2(.45,.45),roughnessMap:asphaltRough,roughness:.82,color:'#aaa9a6'})
 const rockMaterial=new T.MeshStandardMaterial({map:rockMap,normalMap:rockNormal,normalScale:new T.Vector2(.25,.25),roughnessMap:rockRough,roughness:.95,vertexColors:true})
 // Project the rock texture from three axes, so steep slopes do not stretch it into streaks.
 rockMaterial.onBeforeCompile=shader=>{
  shader.uniforms.coastalMeadow={value:meadow}
  shader.vertexShader='varying vec3 coastalPosition;varying vec3 coastalNormal;\n'+shader.vertexShader
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncoastalPosition=position;coastalNormal=normal;\n#ifdef USE_INSTANCING\ncoastalPosition=(instanceMatrix*vec4(position,1.)).xyz;coastalNormal=mat3(instanceMatrix)*normal;\n#endif')
  shader.fragmentShader='uniform sampler2D coastalMeadow;varying vec3 coastalPosition;varying vec3 coastalNormal;\n'+shader.fragmentShader
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 projectionWeight=pow(abs(normalize(coastalNormal)),vec3(4.));projectionWeight/=max(.001,projectionWeight.x+projectionWeight.y+projectionWeight.z);vec4 stoneColor=texture2D(map,coastalPosition.yz*.16)*projectionWeight.x+texture2D(map,coastalPosition.xz*.16)*projectionWeight.y+texture2D(map,coastalPosition.xy*.16)*projectionWeight.z;stoneColor.rgb=mix(vec3(dot(stoneColor.rgb,vec3(.299,.587,.114))),stoneColor.rgb,.48)*vec3(.94,.98,1.);float cover=smoothstep(.65,.94,normalize(coastalNormal).y)*smoothstep(24.05,24.5,coastalPosition.y)*(1.-smoothstep(26.,32.,coastalPosition.y));vec4 meadowColor=texture2D(coastalMeadow,coastalPosition.xz*.35);stoneColor=mix(stoneColor,meadowColor*vec4(.7,.8,.63,1.),cover*.85);diffuseColor*=stoneColor;`)
 }
 rockMaterial.customProgramCacheKey=()=> 'coastal-triplanar-rock-v1'
 const mossMaterial=new T.MeshStandardMaterial({map:moss,normalMap:rockNormal,roughness:.96,color:'#b9b9a8'})
 const markingMaterial=new T.MeshStandardMaterial({color:'#d9d6c7',roughness:.92}),metal=new T.MeshStandardMaterial({color:'#a3a6a0',metalness:.55,roughness:.55})
 for(const material of [roadMaterial,rockMaterial,mossMaterial,markingMaterial,metal])owned.add(material)
 function mesh(geometry:T.BufferGeometry,material:T.Material){owned.add(geometry);const object=new T.Mesh(geometry,material);object.receiveShadow=true;world.add(object);return object}
 function ribbon(min:number,max:number,height:number,material:T.Material,step=3){
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];const count=Math.ceil((coastalLength+1000)/step)
  for(let i=0;i<=count;i++){const d=-850+i*step;for(const side of [min,max]){positions.push(-d,height,coastalCentre(d)+side);uv.push(d/9,side/9)}if(i<count){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,material)
 }
 ribbon(-4.6,4.6,roadAltitude+.014,roadMaterial)
 ribbon(-4.28,-4.15,roadAltitude+.023,markingMaterial);ribbon(4.15,4.28,roadAltitude+.023,markingMaterial)
 // One mesh for all dashed centre markings; no hundreds of individual draw calls.
 const dashPositions:number[]=[],dashIndices:number[]=[]
 for(let d=-850;d<coastalLength+150;d+=14){const k=dashPositions.length/3;for(const [x,s] of [[d,-.065],[d,.065],[d+6,-.065],[d+6,.065]])dashPositions.push(-x!,roadAltitude+.025,coastalCentre(x!)+s!);dashIndices.push(k,k+2,k+1,k+1,k+2,k+3)}
 const dashGeometry=new T.BufferGeometry();dashGeometry.setAttribute('position',new T.Float32BufferAttribute(dashPositions,3));dashGeometry.setIndex(dashIndices);dashGeometry.computeVertexNormals();mesh(dashGeometry,markingMaterial)
 // Irregular escarpments with close-spaced vertices near the road and coarser distant terrain.
 const sides=[[-6,-7,-9,-12,-16,-21,-28,-38,-52,-72,-100,-145,-210,-300,-460],[6,7,9,11,14,18,23,29,38,50,68,95,140,220]]
 for(const samples of sides){const positions:number[]=[],uv:number[]=[],colors:number[]=[],indices:number[]=[],rows=1050,n=samples.length
  for(let i=0;i<=rows;i++){const d=-850+i*(coastalLength+1000)/rows;for(const s of samples){const h=coastalHeight(d,s);positions.push(-d,h,coastalCentre(d)+s);uv.push(d/6,h/5);const wet=h<3?.42:1,green=s<0&&h>35&&Math.sin(d*.037+s*.081)>.6?.84:1;colors.push(.84*wet*green,.85*wet,.82*wet*green)}if(i<rows)for(let j=0;j<n-1;j++){const k=i*n+j;indices.push(k,k+n,k+1,k+1,k+n,k+n+1)}}
  // Side sampling orders differ; ensure normals face upwards on both halves.
  if(samples[0]!<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2]!,indices[i+1]!]
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();mesh(g,rockMaterial)
 }
 // Narrow natural verges make a clean join between pavement and rock, with no platforms or white seams.
 for(const [min,max] of [[-6,-4.6],[4.6,6]])ribbon(min!,max!,roadAltitude+.003,mossMaterial)
 ribbon(5.2,5.35,roadAltitude+.82,metal)
 const posts=new T.InstancedMesh(new T.BoxGeometry(.09,.83,.09),metal,Math.ceil(coastalLength/8));owned.add(posts.geometry);owned.add(posts);world.add(posts);const dummy=new T.Object3D()
 for(let i=0;i<posts.count;i++){const d=i*8;dummy.position.set(-d,roadAltitude+.41,coastalCentre(d)+5.25);dummy.rotation.y=-Math.atan(coastalTangent(d));dummy.scale.setScalar(1);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix)}posts.computeBoundingSphere()
 const boulderGeometry=new T.IcosahedronGeometry(1,4),p=boulderGeometry.attributes.position!
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),scale=1+.1*Math.sin(x*3+y*2)+.07*Math.sin(z*4-x*2);p.setXYZ(i,x*scale,y*scale,z*scale)}
 // Retain the sphere's shared smooth normals; recomputing on non-indexed faces creates visible facets.
 const boulderMaterial=rockMaterial.clone();boulderMaterial.vertexColors=false;boulderMaterial.color.set('#b0b5ae');boulderMaterial.onBeforeCompile=rockMaterial.onBeforeCompile;boulderMaterial.customProgramCacheKey=()=> 'coastal-triplanar-boulders-v2';owned.add(boulderMaterial);owned.add(boulderGeometry)
 const boulders=new T.InstancedMesh(boulderGeometry,boulderMaterial,600);owned.add(boulders);world.add(boulders)
 // Layered crags descend below the road to the waterline, rather than a smooth rock wall.
 for(let i=0;i<600;i++){const d=random(i+400)*coastalLength,s=i%5===0?-(20+random(i+41)*65):12+random(i+41)*28,size=1.4+random(i+98)*4.8;dummy.position.set(-d,coastalHeight(d,s)-size*.32,coastalCentre(d)+s);dummy.rotation.set(random(i)*.8,random(i+5)*6,random(i+8)*.6);dummy.scale.set(size*(.9+random(i+10)),size*(.65+random(i+13)*.65),size*(.7+random(i+21)));dummy.updateMatrix();boulders.setMatrixAt(i,dummy.matrix)}boulders.computeBoundingSphere()
 // Non-periodic multi-scale capillary waves: no parallel sine bands on the sea.
 const waterMaterial=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 worldPoint;varying vec3 localPoint;void main(){localPoint=position;worldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 uniform float time;varying vec3 worldPoint;varying vec3 localPoint;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
 float waves(vec2 p){float v=0.,a=.55;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){v+=a*noise2(p);p=r*p*2.12+vec2(13.7,7.1);a*=.48;}return v;}
 float height(vec2 p){return waves(p*.24+vec2(time*.025,-time*.018))*.48+waves(p*1.7-vec2(time*.04,time*.025))*.065;}
 void main(){vec2 q=localPoint.xy;float h=height(q);float dx=(height(q+vec2(.12,0.))-h)/.12,dz=(height(q+vec2(0.,.12))-h)/.12;float damping=1./(1.+length(cameraPosition-worldPoint)*.025);vec3 n=normalize(vec3(-dx*damping,1.,dz*damping));vec3 view=normalize(cameraPosition-worldPoint);float fresnel=.035+.965*pow(1.-max(0.,dot(view,n)),5.);vec3 reflected=reflect(-view,n);vec3 sky=mix(vec3(.55,.7,.76),vec3(.17,.39,.58),sqrt(max(0.,reflected.y)));float sun=pow(max(0.,dot(reflect(-normalize(vec3(-.3,.75,.4)),n),view)),240.);vec3 water=mix(vec3(.018,.14,.19),vec3(.045,.28,.29),clamp(h*1.8,0.,1.));water=mix(water,sky,fresnel);water+=vec3(1.,.93,.78)*sun*.8;gl_FragColor=vec4(water,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});owned.add(waterMaterial)
 const sea=mesh(new T.PlaneGeometry(coastalLength+4000,7000),waterMaterial);sea.rotation.x=-Math.PI/2;sea.position.set(-coastalLength/2,.2,1800);sea.receiveShadow=false
 const foamPositions:number[]=[],foamUV:number[]=[],foamIndices:number[]=[]
 for(let i=0;i<=800;i++){const d=-850+i*(coastalLength+1000)/800;let a=20,b=65;for(let j=0;j<12;j++){const s=(a+b)/2;if(coastalHeight(d,s)>.2)a=s;else b=s}for(const s of [b-.25,b+1.8]){foamPositions.push(-d,.23,coastalCentre(d)+s);foamUV.push(d,(s-b+.25)/2.05)}if(i<800){const k=i*2;foamIndices.push(k,k+2,k+1,k+1,k+2,k+3)}}
 const foamMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:waterMaterial.uniforms,vertexShader:'varying vec2 foamUV;void main(){foamUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float time;varying vec2 foamUV;void main(){float wave=.5+.5*sin(foamUV.x*.8-time*.8);float edge=sin(clamp(foamUV.y,0.,1.)*3.14159);gl_FragColor=vec4(.78,.88,.85,edge*wave*.3);}'})
 owned.add(foamMaterial);const foamGeometry=new T.BufferGeometry();foamGeometry.setAttribute('position',new T.Float32BufferAttribute(foamPositions,3));foamGeometry.setAttribute('uv',new T.Float32BufferAttribute(foamUV,2));foamGeometry.setIndex(foamIndices);mesh(foamGeometry,foamMaterial)
 const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p;void main(){float h=max(0.,normalize(p).y);vec3 color=mix(vec3(.70,.82,.85),vec3(.25,.48,.67),pow(h,.5));gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});owned.add(skyMaterial);const sky=new T.Mesh(new T.SphereGeometry(1700,24,12),skyMaterial);owned.add(sky.geometry);sky.frustumCulled=false;group.add(sky)
 // Only three source vegetation assets, instanced in sparse asymmetric clusters.
 const vegetation=[['/models/italian-roadside-tree.glb',60,7],['/models/italian-canopy-tree.glb',85,1.15]] as const
 for(const [url,count,height] of vegetation)tasks.push(assets.model(url).then(asset=>{
  if(!alive)return;asset.scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(asset.scene),baseScale=height/Math.max(.1,bounds.max.y-bounds.min.y),poses:T.Matrix4[]=[]
  for(let i=0;i<count;i++){const d=height>3&&i<6?40+i*32:random(i+count*2)*coastalLength,s=-(height>3?8+random(i+88)*8:7+random(i+66)*9),scale=baseScale*(.7+random(i+17)*.65);const step=(coastalLength+1000)/1050,d0=Math.floor((d+850)/step)*step-850,d1=d0+step,t=(d-d0)/step;const sides=[6,7,9,12,16,21,28,38,52,72,100,145,210,300,460],j=Math.max(0,sides.findIndex((v,k)=>k<sides.length-1&&-s>=v&&-s<=sides[k+1]!)),a=-sides[j]!,b=-sides[j+1]!,u=(s-a)/(b-a);const h00=coastalHeight(d0,a),h10=coastalHeight(d1,a),h01=coastalHeight(d0,b),h11=coastalHeight(d1,b),h=t+u<=1?h00+(h10-h00)*t+(h01-h00)*u:h11+(h01-h11)*(1-t)+(h10-h11)*(1-u);dummy.position.set(-d,h-.25-bounds.min.y*scale,coastalCentre(d)+s);dummy.rotation.set(0,random(i+320)*6.28,0);dummy.scale.setScalar(scale);dummy.updateMatrix();poses.push(dummy.matrix.clone())}
  asset.scene.traverse(o=>{if(o instanceof T.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m instanceof T.MeshStandardMaterial){m.transparent=false;if(m.alphaTest>0)m.alphaTest=Math.min(m.alphaTest,.38);m.side=T.DoubleSide;m.roughness=.94}for(const value of Object.values(m))if(value instanceof T.Texture)value.anisotropy=8}const instances=new T.InstancedMesh(o.geometry,o.material,count);instances.castShadow=false;instances.receiveShadow=false;poses.forEach((pose,i)=>instances.setMatrixAt(i,pose.clone().multiply(o.matrixWorld)));instances.computeBoundingSphere();owned.add(instances);world.add(instances)}})
 }))
 const ready=Promise.all(tasks)
 function update(distance:number,_speed:number,time:number){const d=T.MathUtils.clamp(distance,0,coastalLength-25),z=coastalCentre(d)-2;world.rotation.y=Math.atan2(coastalTangent(d),-1)-Math.PI;world.position.set(-d,roadAltitude,z).applyAxisAngle(T.Object3D.DEFAULT_UP,world.rotation.y).negate();world.position.y+=.007;world.updateMatrixWorld(true);waterMaterial.uniforms.time!.value=time}
 let extra=0;const local=new T.Vector3()
 function adjustCamera(camera:T.PerspectiveCamera,carPosition:T.Vector3){world.worldToLocal(local.copy(camera.position));const d=-local.x,s=local.z-coastalCentre(d),minimum=coastalHeight(d,s)+world.position.y+1.3;extra=T.MathUtils.lerp(extra,Math.max(0,minimum-camera.position.y),.12);camera.position.y+=extra;camera.lookAt(carPosition.x,carPosition.y+.65,carPosition.z)}
 update(0,0,0)
 return {length:coastalLength-25,ready,adjustCamera,heightAt:(_x:number,_z:number,_d:number)=>.007,setContacts:(_points:T.Vector3[])=>{},setVisible:(visible:boolean)=>{group.visible=visible},update,dispose(){alive=false;scene.remove(group);assets.dispose();owned.forEach(o=>o.dispose())}}
}
