import * as T from 'three'
import {createRoadAssets} from './roadAssets'
import {GRASS_BLOCK,GRASS_BLOCKS,grassMaterial,grassTuft,placeVerge,rockMaterial,rockShape,shoulderGeometry,shoulderMaterial,snowBankGeometry,snowBankMaterial,vergeGlsl,type VergePlacement} from './roadsideScatter'
import {atmosphereUniforms} from './atmosphere'
import {createRain} from './rain'
import {roadWearGlsl} from './roadWear'

const SEA_LEVEL=-40

/** Two Blender-derived landforms, with all chunks decoded and uploaded before driving. */
export function createMountainRoad(scene:T.Scene,winter=false){
 const assets=createRoadAssets(),root=new T.Group(),owned=new Set<T.Material|T.BufferGeometry|T.Texture>(),folder=winter?'winter-road':'mountain-road'
 root.name=winter?'Mount Rainier winter pass':'Kubocarte mountain valley';scene.add(root)
 let alive=true
 const roadTravel={value:0},atmo=atmosphereUniforms(scene)
 const own=<V extends T.Material|T.BufferGeometry|T.Texture>(v:V)=>{owned.add(v);return v}
 // A 32-triangle horizon floor closes the background behind the finite terrain.
 // It sits below the valley and has no textures, shadows or per-frame streaming.
 const horizonMaterial=own(new T.MeshBasicMaterial({color:winter?'#25374e':'#f5ede7',fog:true,transparent:true,depthWrite:false}))
 horizonMaterial.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a*=1.-smoothstep(1400.,6000.,vFogDepth);\n#include <alphatest_fragment>')}
 horizonMaterial.customProgramCacheKey=()=> 'mountain-soft-horizon-v1'
 const horizonFloor=new T.Mesh(own(new T.CircleGeometry(30000,32)),horizonMaterial)
 horizonFloor.rotation.x=-Math.PI/2;horizonFloor.position.y=-145;horizonFloor.frustumCulled=false;root.add(horizonFloor)
 // Summer valley side: a calm sea below the shore cliffs, with low mist banks drifting over it. Both fade into the scene
 // fog, so the water meets the sky in haze at the horizon. Three shader planes; the waves use the salt-lake water normal map.
 const mistTime={value:0},waves=winter?undefined:assets.texture('/textures/salt-lake-water-normal.jpg')
 if(waves){
  const noise=`varying vec3 seaWorld;uniform float seaTravel;
   float seaHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float seaNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(seaHash(i),seaHash(i+vec2(1.,0.)),f.x),mix(seaHash(i+vec2(0.,1.)),seaHash(i+vec2(1.,1.)),f.x),f.y);}`
  const vertexShader=`#include <fog_pars_vertex>
   varying vec3 seaWorld;void main(){vec4 world=modelMatrix*vec4(position,1.);seaWorld=world.xyz;vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
   #include <fog_vertex>
   }`
  const sea=new T.Mesh(own(new T.PlaneGeometry(9000,4200,96,48)),   // subdivided: world-position varyings across two 9 km triangles drew a seam
  own(new T.ShaderMaterial({fog:true,uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),seaTravel:roadTravel,mistTime,waveNormal:{value:waves.map},sunDirection:atmo.sun,sunStrength:atmo.sunStrength,atmoLight:atmo.light,atmoTint:atmo.tint,skyHorizon:atmo.skyHorizon,skyZenith:atmo.skyZenith},vertexShader,fragmentShader:`#include <fog_pars_fragment>
   ${noise}uniform vec3 sunDirection,atmoTint,skyHorizon,skyZenith;uniform sampler2D waveNormal;uniform float mistTime,sunStrength,atmoLight;
   // the lake normal map does not tile left-to-right: near that edge, read a copy shifted half a tile
   vec2 waveSlope(vec2 uv){float edge=smoothstep(.6,1.,abs(fract(uv.x)-.5)*2.);return mix(texture2D(waveNormal,uv).xy,texture2D(waveNormal,uv+vec2(.5,0.)).xy,edge)*2.-1.;}
   void main(){
    vec2 p=vec2(seaWorld.x-seaTravel,seaWorld.z);float distanceToEye=length(cameraPosition-seaWorld);
    // two scrolling layers of a real water normal map (mipmapped, so distant water calms down instead of shimmering)
    // two wave trains crossing at an angle, plus a slow swell, keep the water visibly moving even with the car stopped
    // the sea is alive: a long swell rolling in toward the shore and two wind-wave trains crossing it
    vec2 a=waveSlope(p/42.+vec2(mistTime*.045,mistTime*.03)),b=waveSlope(mat2(.8,-.6,.6,.8)*p/9.5-vec2(mistTime*.11,-mistTime*.07)),c=waveSlope(mat2(.6,.8,-.8,.6)*p/18.+vec2(-mistTime*.06,mistTime*.05));
    float swell=sin(seaWorld.z*.09+mistTime*1.1+sin(seaWorld.x*.013)*2.)*.5+.5;
    float detail=1.-smoothstep(40.,170.,distanceToEye),calm=1.-smoothstep(60.,420.,distanceToEye);vec2 slope=(a*(.3+.4*calm)+b*.36*detail+c*.25*(.5+.5*calm))*.42*(.8+.4*swell)+vec2(0.,.05*cos(seaWorld.z*.09+mistTime*1.1)*calm)+vec2(seaNoise(p*.03+vec2(mistTime*.06,0.))-.5,seaNoise(p*.03+vec2(5.,mistTime*.05))-.5)*.14;
    vec3 n=normalize(vec3(slope.x,1.,-slope.y));
    vec3 eye=normalize(cameraPosition-seaWorld),r=reflect(-eye,n);float fresnel=.02+.98*pow(1.-max(dot(n,eye),0.),5.);
    vec3 sky=mix(skyHorizon,skyZenith,smoothstep(0.,.45,r.y));
    // deep blue-green offshore, turquoise shallows over the drowned slope near the shore, a broken line of surf on it
    float shallow=smoothstep(-85.,-50.,seaWorld.z);vec3 body=mix(vec3(.008,.05,.085),vec3(.03,.19,.21),shallow)*atmoLight*atmoTint;
    vec3 colour=mix(body,sky,clamp(fresnel,0.,1.)*.68);
    float surf=smoothstep(-55.,-49.,seaWorld.z)*smoothstep(.45,.75,seaNoise(p*.35+vec2(mistTime*.5,sin(mistTime*.4)*.8))*.6+(a.x*.5+.5)*.4);colour=mix(colour,vec3(.82,.86,.86)*atmoLight*atmoTint,surf*.55);
    // broad, soft sun path far out; sharp glints only where the ripples are resolved (no sparkle aliasing)
    float sunAngle=max(dot(r,sunDirection),0.);colour+=vec3(1.,.95,.86)*(pow(sunAngle,mix(70.,300.,detail))*mix(.45,1.6,detail))*sunStrength;
    gl_FragColor=vec4(colour,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #ifdef USE_FOG
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(fogNear*2.5,fogFar*4.5,vFogDepth));
    #endif
   }`})))
  sea.rotation.x=-Math.PI/2;sea.position.set(0,SEA_LEVEL,-46-2100);root.add(sea)
  for(const [height,density] of [[7,.38],[17,.22]] as const){
   const mist=new T.Mesh(own(new T.PlaneGeometry(9000,3200)),own(new T.ShaderMaterial({fog:true,transparent:true,depthWrite:false,uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),seaTravel:roadTravel,mistTime,mistDensity:{value:density},atmoLight:atmo.light,atmoTint:atmo.tint},vertexShader,fragmentShader:`#include <fog_pars_fragment>
    ${noise}uniform float mistTime,mistDensity,atmoLight;uniform vec3 atmoTint;
    void main(){
     vec2 p=vec2(seaWorld.x-seaTravel+mistTime*1.4,seaWorld.z+mistTime*.6)*.0045;
     float n=seaNoise(p)*.55+seaNoise(p*2.3+4.7)*.3+seaNoise(p*5.1+9.2)*.15;
     // fully faded well before the plane edge at z = -120, so no line where the mist begins
     float alpha=smoothstep(.42,.78,n)*mistDensity*smoothstep(-135.,-320.,seaWorld.z);
     gl_FragColor=vec4(mix(vec3(.80,.79,.80),vec3(.97,.95,.93),n)*atmoLight*atmoTint,alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
     #include <fog_fragment>
    }`})))
   mist.rotation.x=-Math.PI/2;mist.position.set(0,SEA_LEVEL+height,-120-1600);mist.renderOrder=1;root.add(mist)
  }
 }
 // Winter: light snowfall around the car, one point cloud animated entirely on the GPU. Flakes never fall inside the car
 // (its footprint follows the tyre contacts), so the cockpit camera stays clear.
 const snowCar={value:new T.Vector2()}
 let flakes:T.Points|undefined
 // rain (time of day / weather): streaks around the car, hidden until it rains
 const rain=createRain(0,roadTravel,atmo.light);root.add(rain.object);let contacts:T.Vector3[]=[]
 if(winter){
  const count=2600,positions=new Float32Array(count*3),seeds=new Float32Array(count)
  for(let i=0;i<count;i++){positions[i*3]=Math.random()*80-40;positions[i*3+1]=Math.random()*22;positions[i*3+2]=Math.random()*44-22;seeds[i]=Math.random()}
  const geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('seed',new T.BufferAttribute(seeds,1))
  flakes=new T.Points(geo,own(new T.ShaderMaterial({fog:true,transparent:true,depthWrite:false,uniforms:{...T.UniformsUtils.clone(T.UniformsLib.fog),snowTravel:roadTravel,snowTime:mistTime,snowCar},vertexShader:`#include <fog_pars_vertex>
   attribute float seed;uniform float snowTravel,snowTime;uniform vec2 snowCar;varying float flakeAlpha;
   void main(){
    vec3 p=position;p.y=mod(p.y-snowTime*(.9+seed*.7),22.);
    p.x=mod(p.x+snowTravel+sin(snowTime*.7+seed*40.)*.6,80.)-40.;p.z+=sin(snowTime*.5+seed*20.)*.8;
    vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
    gl_PointSize=min((.045+.035*seed)*700./max(.1,-mvPosition.z),22.);
    float inCar=step(abs(p.x-snowCar.x),2.6)*step(abs(p.z-snowCar.y),1.25)*step(p.y,1.6);
    flakeAlpha=smoothstep(0.,1.5,p.y)*smoothstep(22.,19.,p.y)*smoothstep(.6,2.5,-mvPosition.z)*(1.-inCar);
    #include <fog_vertex>
   }`,fragmentShader:`#include <fog_pars_fragment>
   varying float flakeAlpha;
   void main(){vec2 c=gl_PointCoord*2.-1.;float d=dot(c,c);if(d>1.||flakeAlpha<.01)discard;
    gl_FragColor=vec4(vec3(.82,.88,.96),flakeAlpha*.75*(1.-d));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
   }`})))
  flakes.frustumCulled=false;flakes.renderOrder=2;root.add(flakes)
 }
 const colour=assets.texture(`/models/${folder}/terrain-colour.webp`,true),rock=assets.texture(winter?'/textures/snow_02_diff_4k.webp':'/textures/rock_face_03_diff_4k.webp',true),rockRough=assets.texture(winter?'/textures/snow_02_rough_2k.webp':'/textures/rock_face_03_rough_2k.webp'),rockNormal=assets.texture(winter?'/textures/snow_02_nor_gl_2k.jpg':'/textures/rock_face_03_nor_gl_2k.webp')
 colour.map.wrapS=colour.map.wrapT=T.ClampToEdgeWrapping
 const terrain=own(new T.MeshStandardMaterial({map:colour.map,roughness:.91,envMapIntensity:.42}))
 terrain.onBeforeCompile=shader=>{
  shader.uniforms.rockDetail={value:rock.map};shader.uniforms.rockRough={value:rockRough.map};shader.uniforms.rockNormal={value:rockNormal.map}
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 terrainPoint; varying vec3 terrainNormal; varying vec3 terrainWorld; varying float seaCliff;').replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   seaCliff=0.;
   ${winter?'':`// Valley side: below the verge the ground falls at ~42° straight into the sea, so the water is in view from the road
   // (the source berm hid it); the relief terms repeat every 256 m chunk.
   float shoreCap=-.25-max(0.,-6.-position.z)*.9+(sin(position.x*.0491+position.z*.11)*1.4+sin(position.x*.1473-position.z*.07)*.7)*smoothstep(-6.,-14.,position.z);
   if(position.z<-6.&&position.y>shoreCap){seaCliff=1.;objectNormal=normalize(vec3(0.,1.,-.9));}`}`).replace('#include <begin_vertex>',`#include <begin_vertex>
   ${winter?'':'if(seaCliff>.5)transformed.y=shoreCap;'}
   terrainPoint=transformed; terrainNormal=objectNormal;terrainWorld=(modelMatrix*vec4(transformed,1.)).xyz;`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 terrainPoint,terrainNormal,terrainWorld;varying float seaCliff;uniform sampler2D rockDetail,rockRough,rockNormal;
   float mHash(vec2 c,float period){c.x=mod(c.x,period);return fract(sin(dot(c,vec2(127.1,311.7)))*43758.5453);}
   float mNoise(vec2 p,float period){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mHash(i,period),mHash(i+vec2(1.,0.),period),f.x),mix(mHash(i+vec2(0.,1.),period),mHash(i+vec2(1.,1.),period),f.x),f.y);}
   vec3 tri(sampler2D tex,vec3 p){vec3 w=pow(abs(normalize(terrainNormal)),vec3(4.));w/=max(.001,w.x+w.y+w.z);return texture2D(tex,p.yz).rgb*w.x+texture2D(tex,p.xz).rgb*w.y+texture2D(tex,p.xy).rgb*w.z;}
   ${vergeGlsl}
  `).replace('#include <map_fragment>',`#include <map_fragment>
   float closeDetail=1.-smoothstep(65.,320.,length(vViewPosition));vec3 grain=tri(rockDetail,terrainPoint*${winter?'.5':'.1875'});
   ${winter?'float sourceGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(sourceGrey)*vec3(.94,.98,1.04);diffuseColor.rgb=mix(diffuseColor.rgb,grain*vec3(.90,.95,1.0),closeDetail*.70);':`float sourceGrey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
   // Mountain side: grey-brown rock with strata on steep faces, scree and dry alpine grass on gentler ground, summer snow
   // patches on the high summits; a light share of the source scan keeps its large forms.
   vec3 up=normalize(terrainNormal);float steep=1.-smoothstep(.58,.84,up.y);
   float macro=mNoise(terrainPoint.xz/64.,4.)*.55+mNoise(terrainPoint.xz/16.,16.)*.3+mNoise(terrainPoint.xz/4.,64.)*.15;
   float nearDetail=1.-smoothstep(12.,45.,length(vViewPosition));
   float rockGrain=dot(grain,vec3(.2126,.7152,.0722));rockGrain=mix(rockGrain,rockGrain*.5+dot(tri(rockDetail,terrainPoint*.75),vec3(.2126,.7152,.0722))*.5,nearDetail);
   rockGrain=clamp((rockGrain-.3)*1.45+.3,0.,1.);
   vec3 rockColour=mix(vec3(.23,.222,.21),vec3(rockGrain)*vec3(1.08,1.02,.94),.25+.75*closeDetail)*(.82+.34*macro);
   rockColour*=.9+.16*(.5+.5*sin(terrainPoint.y*1.7+macro*6.))*steep;
   // warm ochre and rust bands in the strata, grey-green lichen on the faces: the cliff reads as real stone, not grey
   float ochre=smoothstep(.45,.8,mNoise(vec2(terrainPoint.x/90.,terrainPoint.y/9.+terrainPoint.z/90.),8.));
   rockColour*=mix(vec3(.97,.98,1.),vec3(1.16,1.,.8),ochre*.8);
   float lichen=smoothstep(.55,.75,mNoise(terrainPoint.xz/7.+vec2(3.,9.),32.))*steep*.5;
   rockColour=mix(rockColour,rockColour*vec3(.86,.96,.78),lichen);
   vec3 scree=vec3(.27,.258,.235)*(.8+.24*macro+.5*(rockGrain-.3)*closeDetail);
   vec3 grass=mix(vec3(.08,.11,.04),vec3(.21,.21,.1),macro)*(.82+.6*(rockGrain-.3)*(.3+.7*closeDetail));
   float grassMask=(1.-steep)*smoothstep(.24,.5,macro+.3*(up.y-.8))*(1.-smoothstep(95.,150.,terrainPoint.y));
   vec3 ground=mix(rockColour,scree,(1.-steep)*(1.-grassMask)*.65);ground=mix(ground,grass,grassMask*.9);
   ground=mix(ground,vec3(sourceGrey)*vec3(1.,.97,.93),.14);
   // the verge: compacted gravel along the shoulder, then soil and thatch under the grass up to the slope foot (no bare
   // grey shelf); its lattices repeat over the 256 m chunk, so chunk joints stay seamless
   float vergeZ=abs(terrainPoint.z),vergeGrain=dot(tri(rockDetail,terrainPoint*.875),vec3(.2126,.7152,.0722));
   float toMeadow=smoothstep(4.9,6.4,vergeZ)*smoothstep(.72,.9,up.y)*(1.-smoothstep(2.5,8.,terrainPoint.y+.22))*(1.-smoothstep(16.,24.,vergeZ));
   ground=mix(ground,vergeMeadow(terrainPoint.xz,vergeGrain),toMeadow*.92);
   ground=mix(ground,vergeGravel(terrainPoint.xz,vergeGrain),(1.-smoothstep(5.,6.4+1.2*vgNoise(terrainPoint.xz*.5,128.),vergeZ))*smoothstep(.6,.85,up.y));
   float summitSnow=smoothstep(128.,152.,terrainPoint.y+macro*24.)*(1.-steep*.55);
   diffuseColor.rgb=mix(ground,vec3(.80,.82,.85),summitSnow);vec3 outerTone=rockColour;`}
   // Source UVs stop at the scan border; the outer closure uses continuous
   // triplanar ground rather than stretching that last photographic pixel.
   float outerGround=smoothstep(200.,450.,abs(terrainPoint.z));
   diffuseColor.rgb=mix(diffuseColor.rgb,${winter?'grain*vec3(.90,.95,1.)':'outerTone'},outerGround);
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+tri(rockRough,terrainPoint*${winter?'.5':'.1875'}).r*.12-.06,.72,.99);
   ${winter?'':'roughnessFactor=mix(roughnessFactor,.62,summitSnow);'}
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float detailHeight=dot(tri(rockNormal,terrainPoint*${winter?'.5':'.1875'}).rg,vec2(.5))${winter?'':'+dot(tri(rockNormal,terrainPoint*.75).rg,vec2(.5))*.45*nearDetail'};
   vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);
   float det=dot(dpdx,r1);normal=normalize(abs(det)*normal-sign(det)*(dFdx(detailHeight)*r1+dFdy(detailHeight)*r2)*${winter?'.018':'mix(.016,.032,steep)'});
  `)
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`
   #ifdef USE_FOG
   float corridorFog=smoothstep(220.,520.,abs(terrainWorld.x));
   float valleyFog=${winter?'smoothstep(300.,620.,length(vViewPosition))':'max(smoothstep(300.,620.,length(vViewPosition)),smoothstep(75.,300.,max(0.,-terrainWorld.z)))'};
   gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,max(corridorFog,valleyFog));
   #endif
  `)
 }
 terrain.customProgramCacheKey=()=>`mountain-pbr-hidden-boundary-v8-${winter}`
 const asphalt=assets.texture('/textures/asphalt_01_diff_4k.webp',true),normal=assets.texture('/textures/asphalt_01_nor_gl_2k.webp'),rough=assets.texture('/textures/asphalt_01_rough_2k.webp')
 for(const t of [asphalt.map,normal.map,rough.map])t.repeat.set(128,3.8)
 // The road surface is one shader: the 4K asphalt scan read twice (the second read turned a quarter and rescaled, whole
 // tiles per chunk) so its 2 m tile never repeats visibly, slow changes of age along the route, wheel tracks, painted
 // lines filtered to the pixel and worn, a crumbly edge into the gravel shoulder (summer), and in winter packed snow
 // with the wheel tracks cleared to wet, glossy asphalt. Texture reads use the chunk's own UVs (exact to the texel at
 // any distance driven); only slow noise uses the travelled distance.
 const roadMat=own(new T.MeshStandardMaterial({map:asphalt.map,normalMap:normal.map,normalScale:new T.Vector2(.55,.55),roughnessMap:rough.map,roughness:.95,color:'#ffffff',envMapIntensity:.42}))
 roadMat.onBeforeCompile=s=>{Object.assign(s.uniforms,{roadTravel,atmoWet:atmo.wet,lakeTimeRipple:mistTime,snowColour:{value:rock.map},snowNormal:{value:rockNormal.map},snowRough:{value:rockRough.map},edgeDetail:{value:rock.map}})
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 roadPoint;varying vec2 roadLocal;uniform float roadTravel;').replace('#include <begin_vertex>','#include <begin_vertex>\nroadPoint=position;roadPoint.x=(modelMatrix*vec4(position,1.)).x-roadTravel;roadLocal=position.xy;')
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 roadPoint;varying vec2 roadLocal;uniform sampler2D snowColour,snowNormal,snowRough,edgeDetail;uniform float atmoWet,lakeTimeRipple;
 ${roadWearGlsl}${vergeGlsl}
 float rdHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
 float rdNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rdHash(i),rdHash(i+vec2(1.,0.)),f.x),mix(rdHash(i+vec2(0.,1.)),rdHash(i+vec2(1.,1.)),f.x),f.y);}
 `).replace('#include <map_fragment>',`#include <map_fragment>
 vec2 rp=roadPoint.xy;float lane=abs(rp.y);
 vec2 tileB=vec2(vMapUv.y*.723+.37,vMapUv.x*.6953125);float tileMix=smoothstep(.28,.72,rdNoise(mat2(.8,-.6,.6,.8)*rp*vec2(.16,.4)+vec2(3.,1.)));
 vec3 asp=mix(diffuseColor.rgb,texture2D(map,tileB).rgb,tileMix);float aspGrey=dot(asp,vec3(.2126,.7152,.0722));
 vec3 asphalt=mix(vec3(aspGrey)*vec3(1.,.985,.96),asp,.3)*.92+vec3(.018,.018,.017);
 // age: long, soft bands of greyer older surface and darker fresher stretches (no sharp patches)
 float age=rdNoise(rp*vec2(.011,.09)+vec2(9.,2.))*.65+rdNoise(rp*vec2(.05,.3)+vec2(1.,7.))*.35;
 asphalt*=.88+.24*age;asphalt=mix(asphalt,vec3(dot(asphalt,vec3(.3333)))*vec3(1.03,1.,.96),.3*age);
 float tyre=exp(-pow((abs(lane-1.9)-.8)/.3,2.));vec2 wear=roadWear(rp);
 // rain: a glossy film, water standing in the tyre ruts and shallow dips
 float roadWater=atmoWet*clamp(roadPuddles(rp)*.9+tyre*smoothstep(.3,.6,rdNoise(vec2(rp.x*.05,rp.y)+7.))*.85,0.,1.)*(1.-smoothstep(3.,3.6,lane));
 asphalt*=wear.x*(1.-.4*atmoWet-.22*roadWater);
 // painted lines: dashed centre (3.2 m in every 12.8 m, whole periods per chunk) and solid edges, worn thin in places
 float lineAA=max(fwidth(roadLocal.y),1e-4),dashU=(roadLocal.x+128.)/12.8,dashAA=max(fwidth(dashU),1e-4),dashF=fract(dashU);
 float dash=smoothstep(0.,dashAA,dashF)*(1.-smoothstep(.25-dashAA,.25+dashAA,dashF));
 float paint=max((1.-smoothstep(.06-lineAA,.06+lineAA,lane))*dash,1.-smoothstep(.06-lineAA,.06+lineAA,abs(lane-3.44)));
 paint*=clamp(1.-.45*smoothstep(.45,.95,rdNoise(rp*vec2(.35,3.)+vec2(2.,4.)))-.35*smoothstep(.5,.2,aspGrey*2.4),0.,1.);
 vec3 paintColour=vec3(.64,.635,.59)*(.86+.3*aspGrey);
 // the asphalt breaks off unevenly where the shoulder begins
 float edgeNoise=rdNoise(rp*vec2(1.7,2.3)+5.)*.6+rdNoise(rp*vec2(6.,7.))*.4,crumble=${winter?'0.':'smoothstep(3.6+.13*edgeNoise,3.8,lane)'};
 ${winter?`
 // packed snow (накат) over the whole lane, cleared by the tyres to wet asphalt in two tracks per lane, grey slush at
 // their rims, deeper snow drifted toward the banks; the lines show only where the tracks run over them
 float track=exp(-pow((abs(lane-1.9)-.85)/.3,2.));
 float nBig=rdNoise(rp*vec2(.035,.3)+vec2(11.,3.)),nMid=rdNoise(rp*vec2(.21,1.2)+vec2(5.,8.)),nFine=rdNoise(rp*vec2(1.6,3.8)+vec2(2.,6.));
 float clearTrack=smoothstep(.35,.8,track*(.8+.4*nMid)+.15*(nFine-.5));
 float snowCover=clamp(.5+.45*nBig+.25*(nMid-.5),0.,1.)*(1.-.94*clearTrack);
 snowCover=clamp(max(snowCover,smoothstep(2.85+.4*nMid,3.45,lane))+.14*(nFine-.5),0.,1.);
 float snowCoverage=smoothstep(.15,.85,snowCover);
 vec3 snowTex=mix(texture2D(snowColour,vMapUv).rgb,texture2D(snowColour,tileB).rgb,tileMix);float imprint=rdNoise(vec2(rp.x*.8,rp.y*7.5)+vec2(3.,9.));
 vec3 packedSnow=mix(vec3(dot(snowTex,vec3(.2126,.7152,.0722))),snowTex,.6)*vec3(.8,.85,.93)*(.84+.22*imprint);
 float slush=clearTrack*(1.-clearTrack)*4.*(1.-snowCoverage);
 vec3 winterGround=mix(asphalt*.5,vec3(.2,.21,.23)*(.75+.5*snowTex.g),slush*.6);
 winterGround=mix(winterGround,packedSnow,snowCoverage);
 diffuseColor.rgb=mix(winterGround,paintColour*.9,paint*(1.-.85*snowCoverage));`:`
 vec2 edgeAt=vec2(roadLocal.x,-roadLocal.y);vec3 edgeGround=vergeGravel(edgeAt,dot(texture2D(edgeDetail,edgeAt*.875).rgb,vec3(.2126,.7152,.0722)));
 diffuseColor.rgb=mix(mix(asphalt,paintColour,paint),edgeGround,crumble);`}
 `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=roughness*mix(texelRoughness.g,texture2D(roughnessMap,tileB).g,tileMix);
 roughnessFactor=mix(roughnessFactor,.7,tyre*.6)+wear.y;roughnessFactor=mix(roughnessFactor,.62,paint);roughnessFactor=mix(roughnessFactor,.96,crumble);
 ${winter?'roughnessFactor=mix(mix(roughnessFactor,.2,clearTrack*.85),max(.72,texture2D(snowRough,vMapUv).r),snowCoverage);roughnessFactor=mix(roughnessFactor,.38,slush);':''}
 roughnessFactor=mix(roughnessFactor,.2,atmoWet);roughnessFactor=mix(roughnessFactor,.025,roadWater);`).replace('#include <normal_fragment_maps>',`
 vec3 nA=texture2D(normalMap,vNormalMapUv).xyz*2.-1.,nB=texture2D(normalMap,tileB).xyz*2.-1.;
 vec3 mapN=mix(nA,vec3(nB.y,nB.x,nB.z),tileMix);mapN.xy*=normalScale*(1.-.7*paint)*(1.+crumble);normal=normalize(tbn*mapN);
 ${winter?`{vec3 snowN=texture2D(snowNormal,vMapUv).xyz*2.-1.;normal=normalize(mix(normal,normalize(tbn*vec3(snowN.xy*.7,snowN.z)),snowCoverage));
  // the cleared tracks hold a film of melt water: flatter, mirror-like
  normal=normalize(mix(normal,normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz),clearTrack*(1.-snowCoverage)*.55));}`:''}
 vec2 rippleCellPoint=rp*2.4;vec2 rippleCell=floor(rippleCellPoint),rippleLocal=fract(rippleCellPoint)-.5;float rippleSeed=rdHash(rippleCell+vec2(41.3,289.1));
 float rippleAge=fract(lakeTimeRipple*1.4+rippleSeed);vec2 rippleCentre=(vec2(fract(rippleSeed*7.3),fract(rippleSeed*3.1))-.5)*.5;float rippleR=length(rippleLocal-rippleCentre),rippleFront=rippleR-rippleAge*.42;
 float rippleRing=sin(rippleFront*70.)*exp(-pow(rippleFront*16.,2.))*(1.-rippleAge);vec2 rippleSlope=normalize(rippleLocal-rippleCentre+1e-4)*rippleRing*.12*roadWater*(1.-smoothstep(8.,30.,length(vViewPosition)));
 vec3 waterUp=normalize((viewMatrix*vec4(rippleSlope.x,1.,rippleSlope.y,0.)).xyz);normal=normalize(mix(normal,waterUp,roadWater*.85));`).replace('#include <fog_fragment>',`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(fogNear,fogFar,length(vViewPosition)));
 #endif`)}
 roadMat.customProgramCacheKey=()=> `mountain-road-v12-${winter}`
 const roadGeo=own(new T.PlaneGeometry(256,7.6)),placeholder=own(new T.BufferGeometry())
 const steel=own(new T.MeshStandardMaterial({color:'#a4afb6',metalness:.82,roughness:.43})),postGeo=own(new T.BoxGeometry(.11,.82,.08))
 steel.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
 gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(fogNear,fogFar,length(vViewPosition)));
 #endif`)};steel.customProgramCacheKey=()=> 'mountain-distance-fog-v1'
 // A closed pressed W-beam profile, rather than a flat texture pretending to be metal.
 const profile=[[-.08,.48],[-.025,.52],[.01,.59],[-.04,.64],[.01,.69],[-.025,.76],[-.08,.80]],points:number[]=[],indices:number[]=[]
 for(const x of [-128,128])for(const [z,y] of [...profile,...[...profile].reverse().map(([z,y])=>[z!-.009,y])])points.push(x,y!,z!)
 const n=profile.length*2;for(let i=0;i<n;i++){let j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i)}
 const railGeo=own(new T.BufferGeometry());railGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));railGeo.setIndex(indices);railGeo.computeVertexNormals()
 // Between the asphalt and the terrain: a gravel shoulder in summer, ploughed snow banks (one shape per chunk) in winter.
 const shoulder=winter?undefined:own(shoulderGeometry()),edgeMaterial=own(winter?snowBankMaterial(rock.map,rockNormal.map,rockRough.map):shoulderMaterial(rock.map)),bankShapes:T.BufferGeometry[]=[]
 type VergeMesh={mesh:T.InstancedMesh,centre:number,range:number,pick:(p:VergePlacement)=>{matrices:Float32Array,colours?:Float32Array}}
 const slots=Array.from({length:9},()=>{const group=new T.Group();root.add(group);const road=new T.Mesh(roadGeo,roadMat);road.rotation.x=-Math.PI/2;road.position.y=.007;road.receiveShadow=true;group.add(road)
  const dummy=new T.Object3D()
  // The valley-side barrier is deliberately absent from the mountain side.
  for(const z of winter?[-4.05,4.05]:[-4.05]){const rail=new T.Mesh(railGeo,steel);rail.position.z=z;group.add(rail);const posts=new T.InstancedMesh(postGeo,steel,64);for(let i=0;i<64;i++){dummy.position.set(-126+i*4,.35,z-.045);dummy.rotation.set(0,0,0);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix)}group.add(posts)}
  const edge=new T.Mesh(shoulder??placeholder,edgeMaterial);edge.receiveShadow=true;group.add(edge)
  const mesh=new T.Mesh(placeholder,terrain);mesh.receiveShadow=true;mesh.castShadow=false
  return {group,mesh,edge,verge:[] as VergeMesh[],variant:-1}
 })
 const geometries:T.BufferGeometry[]=[]
 let placements:VergePlacement[]=[]
 const ready=(async()=>{
  await Promise.all([colour.ready,rock.ready,rockRough.ready,rockNormal.ready,asphalt.ready,normal.ready,rough.ready,waves?.ready])
  // Bounded decoding keeps the loader responsive and all source chunks resident.
  for(let i=0;i<16;i++){const a=await assets.model(`/models/${folder}/terrain-${i}-near.glb`);let result:T.BufferGeometry|undefined;a.scene.traverse(o=>{if(o instanceof T.Mesh)result=o.geometry});if(!result)throw new Error('Terrain mesh missing');geometries[i]=result}
  if(!alive)return
  if(winter)for(let v=0;v<16;v++)bankShapes.push(own(snowBankGeometry(v)))
  else{
   // Summer verge: four boulder shapes and two small-stone shapes, two kinds of grass tuft, set once per chunk.
   const shapes=[...[1,2,3,4].map(k=>rockShape(k,3)),...[5,6].map(k=>rockShape(k,2))];shapes.forEach(s=>own(s.geometry))
   const tufts=[own(grassTuft(3,30,.3,3,.28)),own(grassTuft(8,12,.6,4,.6))]
   placements=geometries.map((geo,i)=>placeVerge(geo,i,shapes,4,tufts.length))
   const stone=own(rockMaterial(rock.map,rockNormal.map,rockRough.map)),blades=own(grassMaterial(mistTime))
   const capacity=(pick:VergeMesh['pick'])=>Math.max(1,...placements.map(p=>pick(p).matrices.length/16))
   slots.forEach(slot=>{
    shapes.forEach((shape,k)=>{const pick:VergeMesh['pick']=p=>({matrices:p.rocks[k]!}),mesh=new T.InstancedMesh(shape.geometry,stone,capacity(pick));mesh.castShadow=k<4;mesh.receiveShadow=true;mesh.count=0;slot.group.add(mesh);slot.verge.push({mesh,centre:0,range:k<4?640:240,pick})})
    for(let b=0;b<GRASS_BLOCKS;b++)tufts.forEach((geo,kind)=>{const pick:VergeMesh['pick']=p=>p.grass[b]![kind]!,size=capacity(pick),mesh=new T.InstancedMesh(geo,blades,size);mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(size*3).fill(1),3);mesh.receiveShadow=true;mesh.count=0;slot.group.add(mesh);slot.verge.push({mesh,centre:-128+GRASS_BLOCK*(b+.5),range:112,pick})})
   })
  }
  slots.forEach(s=>s.group.add(s.mesh));update(0,0,0)
 })()
 function fillVerge(e:VergeMesh,p:VergePlacement){const {matrices,colours}=e.pick(p);e.mesh.instanceMatrix.array.set(matrices);e.mesh.count=matrices.length/16;e.mesh.instanceMatrix.needsUpdate=true;if(colours&&e.mesh.instanceColor){e.mesh.instanceColor.array.set(colours);e.mesh.instanceColor.needsUpdate=true}e.mesh.computeBoundingSphere()}
 function update(distance:number,speed:number,time:number){if(rain.object.visible)rain.update(time,speed,contacts);const base=Math.floor(distance/256),offset=T.MathUtils.euclideanModulo(distance,256);roadTravel.value=T.MathUtils.euclideanModulo(distance,16384);mistTime.value=time
  // Every visible section keeps the same geometry/material. Recycle only beyond the opaque end of atmospheric fog
  // (a section changes its chunk only when it jumps from behind the car to ~1 km ahead); no LOD or foliage popping.
  for(let i=0;i<slots.length;i++){const s=slots[T.MathUtils.euclideanModulo(i-base,slots.length)]!;const chunk=i-4-base,variant=T.MathUtils.euclideanModulo(chunk,16),x=offset+(i-4)*256;s.group.position.x=x;s.group.visible=Math.abs(x)-128<650
   if(geometries[variant]&&s.variant!==variant){s.mesh.geometry=geometries[variant]!;if(bankShapes[variant])s.edge.geometry=bankShapes[variant]!;const p=placements[variant];if(p)s.verge.forEach(e=>fillVerge(e,p));s.variant=variant}
   for(const e of s.verge)e.mesh.visible=Math.abs(x+e.centre)<e.range
  }
 }
 function prepare(renderer:T.WebGLRenderer,camera:T.Camera){const stage=new T.Group();for(const geo of geometries){const m=new T.Mesh(geo,terrain);m.frustumCulled=false;stage.add(m)}for(const geo of bankShapes){const m=new T.Mesh(geo,edgeMaterial);m.frustumCulled=false;stage.add(m)}root.add(stage);const groupVisibility=slots.map(s=>s.group.visible);slots.forEach(s=>{s.group.visible=true});const extras=slots.flatMap(s=>s.verge.map(e=>e.mesh)),saved=extras.map(p=>[p.visible,p.frustumCulled]);extras.forEach(p=>{p.visible=true;p.frustumCulled=false});for(const t of [colour.map,rock.map,rockRough.map,rockNormal.map,asphalt.map,normal.map,rough.map,...(waves?[waves.map]:[])])renderer.initTexture(t);const old=renderer.getRenderTarget(),target=new T.WebGLRenderTarget(2,2);try{renderer.setRenderTarget(target);renderer.render(scene,camera)}finally{renderer.setRenderTarget(old);root.remove(stage);slots.forEach((s,i)=>{s.group.visible=groupVisibility[i]!});extras.forEach((p,i)=>{p.visible=saved[i]![0]!;p.frustumCulled=saved[i]![1]!});target.dispose()}}
 // Orbit stays in the carved corridor; no camera can enter the nearby mountain face.
 function adjustCamera(camera:T.PerspectiveCamera,position:T.Vector3){if(camera.position.z>4.8||(winter&&camera.position.z< -4.8)){camera.position.z=T.MathUtils.clamp(camera.position.z,winter?-4.8:-100,4.8);camera.lookAt(position.x,position.y+.65,position.z)}}
 return {ready,prepare,adjustCamera,heightAt:()=>.007,setAtmosphere(options:{rain:boolean,snow:boolean,horizon:T.Color}){rain.setVisible(options.rain);if(flakes)flakes.visible=options.snow;horizonMaterial.color.copy(options.horizon)},setContacts:(points:T.Vector3[])=>{contacts=points;if(points.length)snowCar.value.set(points.reduce((s,p)=>s+p.x,0)/points.length,points.reduce((s,p)=>s+p.z,0)/points.length)},update,setVisible:(visible:boolean)=>{root.visible=visible},dispose(){alive=false;rain.dispose();scene.remove(root);root.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose()});assets.dispose();owned.forEach(o=>o.dispose())}}
}


