from pathlib import Path
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text()
s=s.replace("const asphalt=pbr('asphalt_01','#c2c4c6',.55),rock=new T.MeshStandardMaterial({color:'#87979e',roughness:1});materials.push(rock)","const asphalt=pbr('asphalt_01','#e0d8ca',.65)")
s=s.replace('vec3(aggregate),.9)','vec3(aggregate),.65)').replace('fineGrain.xy*.09','fineGrain.xy*.16')
s=s.replace("color:'#d6d8d5'","color:'#c7c9c3'").replace('new T.Vector2(.30,.30)','new T.Vector2(.45,.45)')
a=s.index(' rock.onBeforeCompile=');b=s.index(' const paint=',a);s=s[:a]+s[b:]
s=s.replace("const [near,far,mountain]=await Promise.all([assets.model('/models/saltflat/road-banks-near.glb'),assets.model('/models/saltflat/road-banks-far.glb'),assets.model('/models/saltflat/forward-massif.glb')])","const [near,far]=await Promise.all([assets.model('/models/saltflat/road-banks-near.glb'),assets.model('/models/saltflat/road-banks-far.glb')])")
a=s.index('  const mountainGeo=');b=s.index('  const outerGeo=',a);s=s[:a]+s[b:]
s=s.replace("outerMat.color.set('#d6d8d5')","outerMat.color.set('#c7c9c3')")
s=s.replace('diffuseColor.rgb*=.93+.07*wear','diffuseColor.rgb*=.87+.13*wear')
a=s.index(' float island(');b=s.index('\n void main()',a)
functions='''float island(vec2 p,vec4 q){vec2 d=vec2(mod(p.x-q.x+80.,160.)-80.,p.y-q.y)/q.zw;float a=atan(d.y,d.x);float r=length(d+vec2(.13*sin(d.y*3.),.09*sin(d.x*4.)))/(1.+.16*sin(a*3.+.4)+.09*sin(a*5.));return smoothstep(.64,1.12,r);}
 float basin(vec2 p){float y=-p.y;if(y<0.)return 0.;float phase=p.x/160.*6.2831853;float inner=max(4.8,6.8+1.8*sin(phase+.3)+1.2*sin(phase*3.+1.1)+.5*sin(phase*7.));float outer=43.+7.*sin(phase*2.+1.)+4.*sin(phase*3.)+1.5*sin(phase*7.+.7);return (.15+.03*sin(phase*2.+y*.13))*smoothstep(inner,inner+2.8,y)*(1.-smoothstep(outer-6.,outer,y))*island(vec2(p.x,y),vec4(-48.,18.,24.,10.))*island(vec2(p.x,y),vec4(22.,30.,24.,12.))*island(vec2(p.x,y),vec4(68.,13.,18.,9.));}'''
s=s[:a]+' '+functions+s[b:]
s=s.replace('vec3(-.52,.8,.3)','vec3(-.82,.34,.44)').replace('pow(max(dot(n,normalize(sun+eye)),0.),150.)','pow(max(dot(n,normalize(sun+eye)),0.),mix(95.,175.,deep))')
# Shared basin equations also give the near salt material a dark, rough wet fringe.
s=s.replace("'#include <common>\\nvarying vec3 mineralPoint;').replace('#include <map_fragment>',", "'#include <common>\\nvarying vec3 mineralPoint;\\n'+saltBasinGLSL).replace('#include <map_fragment>',")
s=s.replace("// Reuse photographic maps:", "const saltBasinGLSL=`"+functions+"`\n // Reuse photographic maps:")
s=s.replace('diffuseColor.rgb*=.97+.035*variation;','float wetness=smoothstep(.004,.075,basin(vec2(mineralPoint.x,mineralPoint.z)));diffuseColor.rgb*=mix(.94+.08*variation,.72,wetness);')
s=s.replace(" };m.customProgramCacheKey=()=>'photographic-mineral-'+wet}"," shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\\nroughnessFactor=mix(clamp(roughnessFactor,.7,1.),.46,smoothstep(.004,.075,basin(vec2(mineralPoint.x,mineralPoint.z))));');};m.customProgramCacheKey=()=>'photographic-mineral-wet-v2-'+wet}")
p.write_text(s)
p=Path('app/components/VehicleScene.client.vue');s=p.read_text().replace('key.shadow.intensity=desert?.48:1','key.shadow.intensity=desert?.68:1').replace("key.position.set(-18,28,12);key.intensity=1.95","key.position.set(-28,20,15);key.intensity=2.6").replace("ambient.intensity=.78;scene.environmentIntensity=.55","ambient.intensity=.45;scene.environmentIntensity=.4").replace('fill.intensity=5;fill.color','fill.intensity=3;fill.color');p.write_text(s)
