import * as T from 'three'

/** The source atlas combines projector faces, dark housings and rear lamps. */
export function installPorscheLampEmission(material:T.MeshStandardMaterial,rearLens=false){
 const front={value:0},rear={value:0}
 material.emissive.set('#ffffff');material.emissiveIntensity=1
 material.onBeforeCompile=shader=>{
  shader.uniforms.porscheFront=front;shader.uniforms.porscheRear=rear
  shader.vertexShader='varying vec3 lampPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlampPoint=position;')
  shader.fragmentShader=`varying vec3 lampPoint;
uniform float porscheFront;
uniform float porscheRear;
float projector(vec2 p,vec2 centre){return 1.-smoothstep(.75,1.,length((p-centre)/vec2(.017,.022)));}
`+shader.fragmentShader.replace('#include <emissivemap_fragment>',`
vec3 p=vec3(lampPoint.xy,abs(lampPoint.z));
float frontSlab=step(-1.718,p.x)*(1.-step(-1.662,p.x));
float projectors=max(max(projector(p.yz,vec2(.7305,.6547)),projector(p.yz,vec2(.7335,.7362))),max(projector(p.yz,vec2(.6725,.648)),projector(p.yz,vec2(.6755,.742))));
float tailLens=step(.715,p.y)*(1.-step(.81,p.y));
totalEmissiveRadiance=${rearLens?'vec3(1.,.015,.005)*tailLens*porscheRear*1.2':'vec3(1.,.96,.88)*projectors*frontSlab*porscheFront*2.'};
`)
 }
 material.customProgramCacheKey=()=> rearLens?'porsche-tail-lens-emission-v2':'porsche-projector-emission-v2'
 return (frontLevel:number,rearLevel:number)=>{front.value=frontLevel;rear.value=rearLevel}
}
