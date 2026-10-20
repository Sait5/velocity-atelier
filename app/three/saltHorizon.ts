import * as T from 'three'
import type {AtmosphereUniforms} from './atmosphere'

/** Distant mountain ranges around the salt flat and an unbroken dry plain on the left. */
export function installSaltHorizon(root:T.Group,level:number,atmo:AtmosphereUniforms){
 const geometry:T.BufferGeometry[]=[],materials:T.Material[]=[]
 const plainGeo=new T.PlaneGeometry(14000,14000);plainGeo.rotateX(-Math.PI/2)
 // same warm crust tone and sheen as the near sections, so the ground beyond them carries on without a band
 const plainMat=new T.MeshStandardMaterial({color:new T.Color().setRGB(.69,.666,.624),roughness:.88,metalness:0})
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
 diffuseColor.rgb*=1.-crack*.08*distanceFade;
 }`)
 }
 plainMat.customProgramCacheKey=()=>'continuous-distant-salt-narrow-v3'
 const plain=new T.Mesh(plainGeo,plainMat);plain.name='Continuous salt ground beyond visible tiles';plain.position.set(0,level-.60,0);root.add(plain);geometry.push(plainGeo);materials.push(plainMat)
 const leftGeo=new T.PlaneGeometry(14000,7000);leftGeo.rotateX(-Math.PI/2)
 const left=new T.Mesh(leftGeo,plainMat);left.name='Level left salt continuation';left.position.set(0,level-.012,3620);root.add(left);geometry.push(leftGeo)
 // Distant ranges around the salt (the photographed panorama's own mountains are cut from the sky, saltSkyHdr.ts): two
 // long, low layers on the left and one beyond the brine lake on the right; the view ahead down the road stays open. Each is a strip
 // of real relief (ridged peaks, a stratovolcano on the far left one, gullies down the slopes), lit by the sky, the sun
 // and the bright salt in front of it, and seen through kilometres of air that dissolves its foot into the horizon haze.
 const ridgeHash=(n:number)=>{const s=Math.sin(n*127.1)*43758.5453;return s-Math.floor(s)}
 const ridgeNoise=(x:number)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return ridgeHash(i)*(1-u)+ridgeHash(i+1)*u}
 const ridged=(x:number,octaves:number)=>{let value=0,amplitude=1,frequency=1,sum=0;for(let k=0;k<octaves;k++){const r=1-Math.abs(ridgeNoise(x*frequency+k*7.7)*2-1);value+=amplitude*r*r;sum+=amplitude;amplitude*=.48;frequency*=2.13}return value/sum}
 type Range={name:string,centre:[number,number],along:[number,number],length:number,depth:number,height:number,seed:number,air:number,snow:boolean,volcano?:number}
 const ranges:Range[]=[
  {name:'left near',centre:[-1700,2200],along:[1,0],length:5600,depth:240,height:72,seed:0,air:.3,snow:false},
  {name:'left far',centre:[-1500,2850],along:[1,0],length:6200,depth:300,height:92,seed:1,air:.46,snow:true,volcano:-480},
  {name:'right',centre:[-1600,-3100],along:[1,0],length:6400,depth:300,height:70,seed:3,air:.5,snow:false}
 ]
 for(const r of ranges){
  const positions:number[]=[],indices:number[]=[],segments=Math.round(r.length/1.9),rows=28
  const [ax,az]=r.along,cross:[number,number]=[az,-ax]
  // which way the range faces: toward the road at the origin
  const toward=new T.Vector3(-r.centre[0],0,-r.centre[1]).normalize()
  let top=0
  for(let i=0;i<=segments;i++){
   const u=(i/segments-.5)*r.length
   const massif=.55+.45*ridgeNoise(u/520+r.seed*3.1)
   let height=14+r.height*massif*ridged(u/300+r.seed*5.3,6)
   // a stratovolcano: a cone with a blunt summit, its flanks cut by the same ridged gullies
   if(r.volcano!==undefined){const cone=Math.max(0,1-Math.abs(u-r.volcano)/360);height+=95*Math.min(cone*1.25,1)**1.35*(.9+.1*ridged(u/40,3))}
   height*=Math.sin(Math.PI*i/segments)**.35
   for(let row=0;row<=rows;row++){
    const t=row/rows,profile=Math.sin(Math.PI*t)**.7
    const flank=Math.sin(Math.PI*t)*(1-profile*.3),gully=ridged(u/55+row*.13+r.seed*13,4)-.45
    const y=height*profile*(1+.32*gully*flank)
    top=Math.max(top,y)
    const offset=(t-.5)*r.depth+16*Math.sin(i*.07+row*.37)
    positions.push(r.centre[0]+ax*u+cross[0]*offset,level+y,r.centre[1]+az*u+cross[1]*offset)
   }
   if(i<segments){const k=i*(rows+1);for(let row=0;row<rows;row++)indices.push(k+row,k+row+1,k+row+rows+1,k+row+1,k+row+rows+2,k+row+rows+1)}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals()
  const mat=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide,fog:false})
  mat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{sunDirection:atmo.sun,atmoLight:atmo.light,atmoTint:atmo.tint,atmoHaze:atmo.haze,facing:{value:toward}})
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ridgePoint;varying vec3 ridgeNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nridgePoint=position;ridgeNormal=mat3(modelMatrix)*normal;')
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 ridgePoint;varying vec3 ridgeNormal;uniform vec3 sunDirection,atmoTint,atmoHaze,facing;uniform float atmoLight;').replace('#include <color_fragment>',`#include <color_fragment>
    vec3 n=normalize(ridgeNormal);if(!gl_FrontFacing)n=-n;
    float h=clamp((ridgePoint.y-${level.toFixed(3)})/${top.toFixed(1)},0.,1.);
    float along=ridgePoint.x+ridgePoint.z;
    float sun=max(dot(n,sunDirection),0.),sky=.5+.5*n.y;
    // the faces toward the road also take light from the bright salt plain in front of them
    float bounce=max(dot(n,normalize(facing-vec3(0.,.25,0.))),0.);
    float strata=.5+.5*sin(ridgePoint.y*.11+sin(along*.021)*2.);
    vec3 rock=mix(vec3(.25,.19,.16),vec3(.46,.35,.28),strata)*(.38*sky+.95*sun+.5*bounce+.08);
    // slopes turned away from the plain fall into shadow
    rock*=.62+.38*smoothstep(-.2,.6,dot(n,facing));
    ${r.snow?`float snow=smoothstep(.8,.88,h+.06*sin(along*.05+ridgePoint.y*.03)+.04*n.y);rock=mix(rock,vec3(.95,.96,.98)*(.5*sky+.7*sun+.3*bounce),snow*smoothstep(.3,.7,n.y));`:''}
    // air over kilometres turns the ranges blue-grey (as in the Uyuni photographs); their feet dissolve into the haze
    vec3 air=vec3(.47,.55,.67)*atmoLight*atmoTint,haze=atmoHaze;
    vec3 seen=mix(rock*atmoLight*atmoTint,air,${r.air.toFixed(2)});
    diffuseColor.rgb=mix(seen,haze,(1.-smoothstep(.0,.3,h))*.8);`)
    .replace('#include <fog_fragment>','')
  }
  mat.customProgramCacheKey=()=>'distant-salt-range-v8-'+r.name
  const ridge=new T.Mesh(geo,mat);ridge.name='Distant salt-flat range, '+r.name;ridge.frustumCulled=false;root.add(ridge);geometry.push(geo);materials.push(mat)
 }
 return {dispose(){geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}}
}
