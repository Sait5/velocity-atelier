from pathlib import Path
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text().replace("import {Reflector} from 'three/addons/objects/Reflector.js'\n",'').replace('water:Reflector|undefined','water:T.Mesh|undefined')
s=s.replace("const asphalt=pbr('asphalt_01','#c2c4c6',.48),rock=pbr('rock_face_03','#c8b9a4',.25)","const asphalt=pbr('asphalt_01','#c2c4c6',.55),rock=new T.MeshStandardMaterial({color:'#87979e',roughness:1});materials.push(rock)")
a=s.index(' asphalt.onBeforeCompile=');b=s.index(' const salt=',a)
s=s[:a]+''' asphalt.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float aggregate=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(aggregate),.9);`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 if(length(vViewPosition)<45.){vec3 fineGrain=texture2D(normalMap,vNormalMapUv*4.).xyz*2.-1.;float fade=1.-smoothstep(12.,45.,length(vViewPosition));mapN.xy+=fineGrain.xy*.09*fade;normal=normalize(tbn*mapN);}`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\\nroughnessFactor=clamp(roughnessFactor,.66,.97);')
 };asphalt.customProgramCacheKey=()=>'near-photographic-asphalt-detail'
'''+s[b:]
a=s.index(' rock.onBeforeCompile=');b=s.index(' const paint=',a)
s=s[:a]+''' rock.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.58,.71,.81),.44);')};rock.customProgramCacheKey=()=>'lightweight-distant-silhouette'
'''+s[b:]
s=s.replace("const paint=new T.MeshStandardMaterial({color:'#ded9c5',roughness:.88});materials.push(salt,paint)",'''const paint=new T.MeshStandardMaterial({color:'#ece7d6',roughness:.9,map:asphalt.map});materials.push(salt,paint)
 paint.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`float wear=dot(texture2D(map,vMapUv*3.).rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=.93+.07*wear;`)};paint.customProgramCacheKey=()=>'mineral-painted-markings'
 // Reuse photographic maps: centimetre relief comes from Blender, broad colour/depth variation from world coordinates.
 for(const [m,wet] of [[salt,0],[gravel,1]] as const){m.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\\nvarying vec3 mineralPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\\nmineralPoint=position;')
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\\nvarying vec3 mineralPoint;').replace('#include <map_fragment>',`#include <map_fragment>
 float variation=sin(mineralPoint.x*.039+sin(mineralPoint.z*.9))*sin(mineralPoint.x*.078-mineralPoint.z*.4);diffuseColor.rgb*=.97+.035*variation;`)
 };m.customProgramCacheKey=()=>'photographic-mineral-'+wet}
''')
a=s.index("  const base=merge(far.scene,'Water_')");b=s.index('\n })()',a)
s=s[:a]+'''  const outerGeo=merge(far.scene,'OuterTerrain_'),outerMat=salt.clone();outerMat.normalMap=null;outerMat.roughnessMap=null;outerMat.color.set('#b9b9ae');outerMat.normalScale.set(0,0);materials.push(outerMat)
  for(let i=-10;i<=10;i++){const land=new T.Mesh(outerGeo,outerMat);land.position.x=i*160;tiles.add(land)}
  const base=merge(far.scene,'Water_'),pieces:T.BufferGeometry[]=[]
  for(let i=-10;i<=10;i++)pieces.push(base.clone().translate(i*160,0,0))
  const waterGeo=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());geometries.push(waterGeo)
  // No offscreen reflection render: animated normal waves reflect the same sky gradient used by the scene.
  const waterMaterial=new T.ShaderMaterial({uniforms:{waveNormal:{value:waveNormal},lakeTime:time,lakeTravel:travel,zenith:{value:new T.Color('#267caf')},horizon:{value:new T.Color('#c9dce9')}},vertexShader:`varying vec3 worldPosition;void main(){worldPosition=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D waveNormal;uniform float lakeTime,lakeTravel;uniform vec3 zenith,horizon;varying vec3 worldPosition;
 void main(){vec2 p=vec2(worldPosition.x-lakeTravel,worldPosition.z);float distanceToEye=length(cameraPosition-worldPosition);vec3 a=texture2D(waveNormal,p*.13+vec2(lakeTime*.014,lakeTime*.009)).rgb*2.-1.;vec3 b=texture2D(waveNormal,p*.42+vec2(-lakeTime*.009,lakeTime*.018)).rgb*2.-1.;float fine=1.-smoothstep(18.,80.,distanceToEye);vec3 n=normalize(vec3((a.x+b.x*.5*fine)*.21,1.,(a.y+b.y*.5*fine)*.21));vec3 eye=normalize(cameraPosition-worldPosition);float fresnel=.025+.975*pow(1.-max(dot(n,eye),0.),5.);vec3 reflected=reflect(-eye,n);float skyHeight=pow(clamp(reflected.y/.65,0.,1.),.65);vec3 sky=mix(horizon,zenith,skyHeight);float side=-sign(p.y);float phase=p.x/160.*6.2831853;float inner=7.4+.55*sin(phase+side*.7)+.25*sin(phase*3.+side*2.1)+.15*cos(phase*5.+.3);float outer=42.+4.*sin(phase*2.+side*.4)+1.5*cos(phase*3.+.8);float depth=min(max(0.,abs(p.y)-inner),max(0.,outer-abs(p.y)));float deep=smoothstep(0.,9.,depth);vec3 body=mix(vec3(.21,.39,.35),vec3(.055,.23,.27),deep);vec3 sun=normalize(vec3(-.52,.8,.3));float glint=pow(max(dot(n,normalize(sun+eye)),0.),100.);vec3 colour=mix(body,sky,.15+fresnel*.8)+glint*vec3(1.,.94,.83)*.5;float haze=smoothstep(550.,1450.,distanceToEye);colour=mix(colour,horizon,haze);gl_FragColor=vec4(colour,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});materials.push(waterMaterial)
  water=new T.Mesh(waterGeo,waterMaterial);water.name='Narrow lake without reflection render target';root.add(water)
'''+s[b:]
s=s.replace('water?.dispose();','')
p.write_text(s)
p=Path('app/components/VehicleScene.client.vue');s=p.read_text().replace("const shadowSize=desert&&state.quality.value!=='Medium'?2048:props.drive?1024:2048","const shadowSize=props.drive?1024:2048").replace("props.roadMap==='desert'?16:50","props.roadMap==='desert'?50:50").replace("key.position.set(-22,23,16);key.intensity=2.3;key.color.set('#fff6e8');key.shadow.radius=3;fill.position.set(12,20,-22);fill.intensity=8;fill.color.set('#f0f6ff');ambient.color.set('#dce9f3');ambient.groundColor.set('#d3d0c6');ambient.intensity=.95;scene.environmentIntensity=.55","key.position.set(-18,28,12);key.intensity=1.95;key.color.set('#fff8ee');key.shadow.radius=3;fill.position.set(12,20,-22);fill.intensity=5;fill.color.set('#f0f6ff');ambient.color.set('#dae9f4');ambient.groundColor.set('#d0cdc4');ambient.intensity=.78;scene.environmentIntensity=.55")
p.write_text(s)
