import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {createRoadAssets} from './roadAssets'

/** Blender-authored geometry, photographic PBR maps and shared LOD tiles; no additional scene reflection pass. */
export function createBlenderSaltFlatRoad(scene:T.Scene){
 const assets=createRoadAssets(),root=new T.Group(),tiles=new T.Group(),geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],pending:Promise<void>[]=[]
 root.name='Blender salt flats';root.add(tiles);scene.add(root)
 let disposed=false,water:T.Mesh|undefined
 const level=8.287,time={value:0},travel={value:0}
 function tex(url:string,color=false){const entry=assets.texture(url,color);pending.push(entry.ready);return entry.map}
 function pbr(prefix:string,color='#ffffff',normalStrength=.35){const m=new T.MeshStandardMaterial({map:tex('/textures/'+prefix+'_diff_4k.jpg',true),normalMap:tex('/textures/'+prefix+'_nor_gl_2k.jpg'),roughnessMap:tex('/textures/'+prefix+'_rough_2k.jpg'),color,normalScale:new T.Vector2(normalStrength,normalStrength),roughness:.9});materials.push(m);return m}
 const asphalt=pbr('asphalt_01','#e0d8ca',.55)
 asphalt.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float aggregate=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(aggregate),.65);diffuseColor.rgb*=1.22*mix(.90,1.08,texture2D(map,vMapUv.yx*2.+vec2(.31,.57)).r);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.155,.145),.32);`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 if(length(vViewPosition)<45.){vec3 fineGrain=texture2D(normalMap,vNormalMapUv*4.).xyz*2.-1.;float fade=1.-smoothstep(12.,45.,length(vViewPosition));mapN.xy+=fineGrain.xy*.16*fade;normal=normalize(tbn*mapN);}`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor,.66,.97);')
 };asphalt.customProgramCacheKey=()=>'near-photographic-asphalt-detail'
 const salt=new T.MeshStandardMaterial({map:tex('/textures/salt-crust-albedo-4k.webp',true),normalMap:tex('/textures/salt-crust-normal-2k.jpg'),roughnessMap:tex('/textures/salt-crust-rough-2k.jpg'),color:'#fffdf5',normalScale:new T.Vector2(.18,.18),roughness:.95})
 const gravel=salt.clone();gravel.color.copy(salt.color);gravel.normalScale.set(.18,.18);materials.push(gravel)
 const paint=new T.MeshStandardMaterial({color:'#ece7d6',roughness:.9,map:asphalt.map});materials.push(salt,paint)
 paint.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`float wear=dot(texture2D(map,vMapUv*3.).rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=.87+.13*wear;`)};paint.customProgramCacheKey=()=>'mineral-painted-markings'
 const saltBasinGLSL=`float island(vec2 p,vec4 q){vec2 d=vec2(mod(p.x-q.x+80.,160.)-80.,p.y-q.y)/q.zw;float a=atan(d.y,d.x);float r=length(d+vec2(.13*sin(d.y*3.),.09*sin(d.x*4.)))/(1.+.16*sin(a*3.+.4)+.09*sin(a*5.));return smoothstep(.64,1.12,r);}
 float basin(vec2 p){float y=-p.y;if(y<0.)return 0.;float phase=p.x/160.*6.2831853;float inner=max(4.4,6.2+1.8*sin(phase+.3)+1.2*sin(phase*3.+1.1)+.5*sin(phase*7.));float outer=64.+10.*sin(phase*2.+1.)+6.*sin(phase*3.)+2.*sin(phase*7.+.7);return (.15+.03*sin(phase*2.+y*.13))*smoothstep(inner,inner+2.8,y)*(1.-smoothstep(outer-9.,outer,y))*island(vec2(p.x,y),vec4(-48.,27.,27.,13.))*island(vec2(p.x,y),vec4(22.,48.,30.,16.))*island(vec2(p.x,y),vec4(68.,19.,20.,10.))*smoothstep(.0,.24,.5+.5*sin(phase+.8+.3*sin(y*.14)));}`
 // Reuse photographic maps: centimetre relief comes from Blender, broad colour/depth variation from world coordinates.
 for(const [m,wet] of [[salt,0]] as const){m.onBeforeCompile=shader=>{
 shader.uniforms.roadAlbedo={value:asphalt.map};
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 mineralPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nmineralPoint=position;')
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 mineralPoint;\nuniform sampler2D roadAlbedo;\n'+saltBasinGLSL).replace('#include <map_fragment>',`#include <map_fragment>
 float phase=mineralPoint.x/160.*6.2831853;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.74,.75,.71),.28);float detailFade=smoothstep(18.,85.,length(vViewPosition));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.69,.65),detailFade);
 ${true?`float side=sign(-mineralPoint.z);float edge=3.7+.018*sin(phase*11.+side)+.009*sin(phase*23.+side*.7);float feather=smoothstep(0.,.14,abs(mineralPoint.z)-edge);vec3 road=texture2D(roadAlbedo,vec2(mineralPoint.x,-mineralPoint.z)/1.25).rgb*vec3(.74,.69,.59);float gray=dot(road,vec3(.2126,.7152,.0722));road=mix(road,vec3(gray),.65);road*=1.22*mix(.90,1.08,texture2D(roadAlbedo,vec2(-mineralPoint.z,mineralPoint.x)/1.25*2.+vec2(.31,.57)).r);road=mix(road,vec3(.16,.155,.145),.32);diffuseColor.rgb=mix(road,diffuseColor.rgb,feather);`:''}
 float variation=sin(phase+sin(mineralPoint.z*.9))*sin(phase*2.-mineralPoint.z*.4);float wetness=smoothstep(.004,.075,basin(vec2(mineralPoint.x,mineralPoint.z)));diffuseColor.rgb*=mix(.94+.08*variation,.72,wetness);`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(mix(clamp(roughnessFactor,.88,1.),.46,smoothstep(.004,.075,basin(vec2(mineralPoint.x,mineralPoint.z)))),.95,smoothstep(35.,65.,abs(mineralPoint.z)));');shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nmapN.xy*=1.-smoothstep(18.,65.,length(vViewPosition));normal=normalize(tbn*mapN);');};m.customProgramCacheKey=()=>'photographic-mineral-wet-v4-'+wet}

 const contactGeometry=new T.PlaneGeometry(5.8,3.1),contactMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;void main(){float r=dot(p,p);gl_FragColor=vec4(0.,0.,0.,.36*exp(-r*2.8)*(1.-smoothstep(.65,1.,r)));}'}),contact=new T.Mesh(contactGeometry,contactMaterial);contact.rotation.x=-Math.PI/2;contact.position.y=level+.006;root.add(contact);geometries.push(contactGeometry);materials.push(contactMaterial)
 const waveNormal=tex('/textures/salt-lake-water-normal.jpg')
 const skyGeo=new T.SphereGeometry(4500,48,24),skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#1267af')},horizon:{value:new T.Color('#c9dce9')}},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 dir;uniform vec3 zenith,horizon;void main(){float h=pow(clamp(normalize(dir).y/.65,0.,1.),.65);vec3 colour=mix(horizon,zenith,h);if(normalize(dir).y<0.)colour=mix(horizon,vec3(.75,.76,.72),smoothstep(0.,.055,-normalize(dir).y));gl_FragColor=vec4(colour,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'})
 geometries.push(skyGeo);materials.push(skyMat);root.add(new T.Mesh(skyGeo,skyMat))
 function merge(source:T.Object3D,prefix:string){const pieces:T.BufferGeometry[]=[];source.updateMatrixWorld(true);source.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith(prefix)){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);pieces.push(g)}});const result=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());geometries.push(result);return result}
 const ready=(async()=>{
  const [near,far]=await Promise.all([assets.model('/models/saltflat/road-banks-near.glb'),assets.model('/models/saltflat/road-banks-far.glb')]);await Promise.all(pending);if(disposed)return
  const categories:[string,T.Material][]=[['Road_',asphalt],['Salt_',salt],['Edge_line_',paint],['Centre_lines_',paint]]
  const levels=[near,far].map(asset=>categories.map(([name,mat])=>({geometry:merge(asset.scene,name),material:mat})))
  for(let i=-10;i<=10;i++){const lod=new T.LOD();lod.position.x=i*160;levels.forEach((parts,index)=>{const g=new T.Group();parts.forEach(p=>{const m=new T.Mesh(p.geometry,p.material);m.receiveShadow=index===0;g.add(m)});lod.addLevel(g,index===0?0:150)});tiles.add(lod)}
  const outerGeo=merge(far.scene,'OuterTerrain_'),outerMat=salt.clone();outerMat.map=null;outerMat.normalMap=null;outerMat.roughnessMap=null;outerMat.color.setRGB(.68,.69,.65);outerMat.normalScale.set(0,0);outerMat.transparent=true;outerMat.depthWrite=false;
  outerMat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 farPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nfarPoint=position;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 farPoint;').replace('#include <map_fragment>',`#include <map_fragment>
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.69,.65),.7);diffuseColor.a*=1.-smoothstep(130.,215.,abs(farPoint.z));`)};outerMat.customProgramCacheKey=()=>'compact-mineral-horizon-v1';materials.push(outerMat)
  for(let i=-10;i<=10;i++){const land=new T.Mesh(outerGeo,outerMat);land.position.x=i*160;tiles.add(land)}
  const base=merge(far.scene,'Water_'),pieces:T.BufferGeometry[]=[]
  for(let i=-10;i<=10;i++)pieces.push(base.clone().translate(i*160,0,0))
  const waterGeo=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());geometries.push(waterGeo)
  // No offscreen reflection render: animated normal waves reflect the same sky gradient used by the scene.
  const waterMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{saltColour:{value:salt.map},waveNormal:{value:waveNormal},lakeTime:time,lakeTravel:travel,zenith:{value:new T.Color('#1267af')},horizon:{value:new T.Color('#c9dce9')}},vertexShader:`varying vec3 worldPosition;void main(){worldPosition=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D waveNormal,saltColour;uniform float lakeTime,lakeTravel;uniform vec3 zenith,horizon;varying vec3 worldPosition;
 ${saltBasinGLSL}
 void main(){vec2 p=vec2(worldPosition.x-lakeTravel,worldPosition.z);p.x=mod(p.x+80.,160.)-80.;float distanceToEye=length(cameraPosition-worldPosition);vec3 a=texture2D(waveNormal,p*.11+vec2(lakeTime*.006,lakeTime*.004)).rgb*2.-1.;vec3 b=texture2D(waveNormal,p*.37+vec2(-lakeTime*.004,lakeTime*.008)).rgb*2.-1.;float fine=1.-smoothstep(18.,80.,distanceToEye);vec3 n=normalize(vec3((a.x+b.x*.3*fine)*.055,1.,(a.y+b.y*.3*fine)*.055));vec3 eye=normalize(cameraPosition-worldPosition);float fresnel=.025+.975*pow(1.-max(dot(n,eye),0.),5.);vec3 reflected=reflect(-eye,n);float skyHeight=pow(clamp(reflected.y/.65,0.,1.),.65);vec3 sky=mix(horizon,zenith,skyHeight);float depth=max(0.,basin(p)-.04-.003*sin(p.x/160.*6.2831853*3.)*sin(-p.y*.6));vec3 bottom=texture2D(saltColour,vec2(p.x,-p.y)/.8+n.xz*.035).rgb;float deep=smoothstep(0.,.1,depth);vec3 body=mix(bottom*vec3(.84,.96,.96),vec3(.045,.37,.49),deep*.76);vec3 sun=normalize(vec3(-.82,.34,.44));float glint=pow(max(dot(n,normalize(sun+eye)),0.),mix(95.,175.,deep));vec3 colour=mix(body,sky,.05+fresnel*.45)+glint*vec3(1.,.94,.83)*.18;float haze=smoothstep(850.,1450.,distanceToEye);colour=mix(colour,horizon,haze);gl_FragColor=vec4(colour,smoothstep(.001,.025,depth));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});materials.push(waterMaterial)
  water=new T.Mesh(waterGeo,waterMaterial);water.name='Right-side shallows and salt islands';root.add(water)

 })()
 // The car stays near the origin; the seamless salt plain and shallow water scroll together.
 return {ready,heightAt:(_x:number,_z:number,_distance?:number)=>level,setContacts:(points:T.Vector3[])=>{if(points.length){contact.position.set(0,0,0);points.forEach(p=>contact.position.add(p));contact.position.multiplyScalar(1/points.length);contact.position.y=level+.006}},setVisible:(v:boolean)=>{root.visible=v},update(distance:number,_speed:number,elapsed:number){tiles.position.x=T.MathUtils.euclideanModulo(distance+80,160)-80;if(water)water.position.x=tiles.position.x;time.value=elapsed;travel.value=distance},dispose(){disposed=true;scene.remove(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());assets.dispose()}}
}
