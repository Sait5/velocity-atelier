from pathlib import Path
p=Path('tools/build-saltflat-blender.py');s=p.read_text();a=s.index('PONDS=');b=s.index('\ndef mesh(',a)
s=s[:a]+'''def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def lake_depth(x,y):
 if y<0:return 0
 p=x/160*math.tau
 inner=8.0+1.3*math.sin(p)+.8*math.sin(p*3+.7)
 outer=46+5*math.sin(p*2+1)+2*math.sin(p*3)
 depth=.14*smooth(inner,inner+3,y)*(1-smooth(outer-5,outer,y))
 for cx,cy,rx,ry in [(-40,23,18,7),(30,34,22,8)]:
  r=math.hypot((x-cx)/rx,(y-cy)/ry)
  depth*=smooth(.72,1.25,r)
 return depth
def salt_height(x,y):
 return LEVEL-.08-lake_depth(x,y)+.003*math.sin(x/160*math.tau*3)*math.sin(y*.6)
'''+s[b:]
a=s.index(' for index,(cx,cy,rx,ry)');b=s.index('# A low mineral shore',a)
s=s[:a]+" grid('Water_0_'+lod,40,2,lambda x,t:(5.0+t*51.0,WATER),water,16,collection)\n"+s[b:]
s=s.replace('waterReflectionScenePasses=0,drivingShadowResolution=1024,ponds=PONDS,saltPlainHalfWidth=1600','waterReflectionScenePasses=0,drivingShadowResolution=1024,waterSide="right",waterShoreCentreDistance=[5.9,10.1],saltPlainHalfWidth=1600')
p.write_text(s)
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text();a=s.index(' float basin(');b=s.index('\n void main()',a)
s=s[:a]+''' float island(vec2 p,vec4 q){float r=length((p-q.xy)/q.zw);return smoothstep(.72,1.25,r);}
 float basin(vec2 p){float y=-p.y;if(y<0.)return 0.;float phase=p.x/160.*6.2831853;float inner=8.+1.3*sin(phase)+.8*sin(phase*3.+.7);float outer=46.+5.*sin(phase*2.+1.)+2.*sin(phase*3.);return .14*smoothstep(inner,inner+3.,y)*(1.-smoothstep(outer-5.,outer,y))*island(vec2(p.x,y),vec4(-40.,23.,18.,7.))*island(vec2(p.x,y),vec4(30.,34.,22.,8.));}'''+s[b:]
s=s.replace('basin(p,vec4(-25.,-23.,42.,13.))','basin(p)').replace('.004*sin(p.x/160.*6.2831853*3.)','.003*sin(p.x/160.*6.2831853*3.)').replace('vec3(.10,.55,.64)','vec3(.045,.37,.49)')
s=s.replace("water.name='Shallow isolated salt pools'","water.name='Right-side shallows and salt islands'")
p.write_text(s)
