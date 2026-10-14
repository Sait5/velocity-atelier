import * as T from 'three'

/** Two low-poly distant ridges and an unbroken dry plain on the left. */
export function installSaltHorizon(root:T.Group,level:number){
 const geometry:T.BufferGeometry[]=[],materials:T.Material[]=[]
 const plainGeo=new T.PlaneGeometry(14000,14000);plainGeo.rotateX(-Math.PI/2)
 const plainMat=new T.MeshStandardMaterial({color:new T.Color().setRGB(.62,.609,.581),roughness:1,metalness:0})
 plainMat.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 plainPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nplainPoint=(modelMatrix*vec4(position,1.)).xyz;')
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 plainPoint;').replace('#include <color_fragment>',`#include <color_fragment>
 vec2 metres=vec2(plainPoint.x,-plainPoint.z);
 float mineralVariation=sin(plainPoint.x*.013)*sin(plainPoint.z*.019);diffuseColor.rgb*=.99+.012*mineralVariation;
 float distanceFade=1.-smoothstep(90.,260.,length(cameraPosition-plainPoint));
 if(distanceFade>.01){
 vec2 cp=metres/1.45+vec2(.075*sin(metres.y*1.3),.07*sin(metres.x*1.1));vec2 cell=floor(cp),within=fract(cp);float first=9.,second=9.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 neighbour=vec2(float(x),float(y)),seed=cell+neighbour;vec2 random=fract(sin(vec2(dot(seed,vec2(127.1,311.7)),dot(seed,vec2(269.5,183.3))))*43758.5453);vec2 d=neighbour+.18+.64*random-within;float dist=dot(d,d);if(dist<first){second=first;first=dist;}else second=min(second,dist);}
 float seam=sqrt(second)-sqrt(first),aa=max(.0015,fwidth(seam)*.5);float crack=(1.-smoothstep(.011-aa,.011+aa,seam))*clamp(.011/aa,.5,1.);
 diffuseColor.rgb*=1.-crack*.30*distanceFade;
 }`)
 }
 plainMat.customProgramCacheKey=()=>'continuous-distant-salt-narrow-v2'
 const plain=new T.Mesh(plainGeo,plainMat);plain.name='Continuous salt ground beyond visible tiles';plain.position.set(0,level-.60,0);root.add(plain);geometry.push(plainGeo);materials.push(plainMat)
 const leftGeo=new T.PlaneGeometry(14000,7000);leftGeo.rotateX(-Math.PI/2)
 const left=new T.Mesh(leftGeo,plainMat);left.name='Level left salt continuation';left.position.set(0,level-.012,3620);root.add(left);geometry.push(leftGeo)
 for(let layer=0;layer<2;layer++){
  const positions:number[]=[],indices:number[]=[],segments=320
  for(let i=0;i<=segments;i++){
   const x=(i/segments-.5)*2700
   let height=10
   for(let peak=0;peak<10;peak++){
    const centre=-1280+peak*285+Math.sin(peak*7.1+layer)*70,width=75+45*(.5+.5*Math.sin(peak*3.7))
    height+=(32+55*(.5+.5*Math.sin(peak*8.3+layer*2)))*Math.exp(-Math.pow((x-centre)/width,2))
   }
   height*=Math.sin(Math.PI*i/segments)**.35
   height*=.92+.065*Math.sin(x*.043)+.035*Math.sin(x*.103)+.025*Math.sin(x*.19)
   const z=layer===0?2200:2850
   // Three depth rows give real shaded slopes instead of a flat cutout.
   for(let row=0;row<3;row++)positions.push(x,level+(row===1?height*(layer===0?1:1.15):0),z+(row-1)*125+20*Math.sin(i*.31+row))
   if(i<segments){const k=i*3;for(let row=0;row<2;row++)indices.push(k+row,k+row+1,k+row+3,k+row+1,k+row+4,k+row+3)}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals()
  const mat=new T.MeshBasicMaterial({color:layer===0?'#788b99':'#95a8b5',side:T.DoubleSide,fog:false})
  mat.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ridgePoint;varying vec3 ridgeNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nridgePoint=position;ridgeNormal=mat3(modelMatrix)*normal;')
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 ridgePoint;varying vec3 ridgeNormal;').replace('#include <color_fragment>','#include <color_fragment>\nfloat strata=sin(ridgePoint.x*.031+ridgePoint.y*.12)*sin(ridgePoint.x*.083-ridgePoint.y*.07);float shade=.82+.12*dot(normalize(ridgeNormal),normalize(vec3(.6,.7,.4)));diffuseColor.rgb*=shade*(.96+.045*strata);')
    .replace('#include <fog_fragment>','gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.70,.76,.80),.25);')
  }
  mat.customProgramCacheKey=()=>'distant-salt-ridge'
  const ridge=new T.Mesh(geo,mat);ridge.name='Distant left salt-flat ridge '+layer;ridge.position.x=-1250;root.add(ridge);geometry.push(geo);materials.push(mat)
 }
 return {dispose(){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}}
}
