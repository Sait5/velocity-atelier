from pathlib import Path
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace('(.48,.49,.47,1)','(.32,.34,.31,1)').replace('(.65,.66,.63,1)','(.56,.59,.54,1)').replace('(.79,.80,.77,1)','(.74,.77,.71,1)').replace('(.88,.89,.85,1)','(.85,.87,.81,1)')
a=s.index('def lake_depth(');b=s.index('\ndef salt_height(',a)
s=s[:a]+'''def lake_depth(x,y):
 if y<0:return 0
 p=x/160*math.tau
 inner=max(4.8,6.8+1.8*math.sin(p+.3)+1.2*math.sin(p*3+1.1)+.5*math.sin(p*7))
 outer=43+7*math.sin(p*2+1)+4*math.sin(p*3)+1.5*math.sin(p*7+.7)
 depth=(.15+.03*math.sin(p*2+y*.13))*smooth(inner,inner+2.8,y)*(1-smooth(outer-6,outer,y))
 for cx,cy,rx,ry in [(-48,18,24,10),(22,30,24,12),(68,13,18,9)]:
  dx=((x-cx+80)%160-80)/rx;dy=(y-cy)/ry
  angle=math.atan2(dy,dx)
  r=math.hypot(dx+.13*math.sin(dy*3),dy+.09*math.sin(dx*4))/(1+.16*math.sin(angle*3+.4)+.09*math.sin(angle*5))
  depth*=smooth(.64,1.12,r)
 return depth
'''+s[b:]
s=s.replace("grid('Road_'+lod,1,1,lambda x,t:(-4.6+t*9.2,LEVEL),asphalt,1.25,collection)","grid('Road_'+lod,nx,1,lambda x,t:(-roadedge(x,-1)+t*(roadedge(x,1)+roadedge(x,-1)),LEVEL),asphalt,1.25,collection)")
s=s.replace('def verge(x,t,side=side):\n   y=side*(4.6+t*.45)','def verge(x,t,side=side):\n   y=side*(roadedge(x,side)+t*.55)')
s=s.replace('y=side*(5.05+t*59.95)','edge=roadedge(x,side)+.55; y=side*(edge+t*(65-edge))')
s=s.replace('side*(4.1+t*.105)','side*(3.35+t*.105)')
s=s.replace("lambda x,t:(5.0+t*51.0,WATER)","lambda x,t:(4.5+t*53.5,WATER)")
a=s.index('# Connected ridged massif.');b=s.index('# Editable natural lighting',a);s=s[:a]+s[b:]
s=s.replace("export(far,'road-banks-far.glb');export([mountain],'forward-massif.glb')","export(far,'road-banks-far.glb')")
s=s.replace("'mountainTriangles':sum(len(p.vertices)-2 for p in mountain.data.polygons)","'mountainTriangles':0")
s=s.replace('stationaryMountainOffset=-1800,shoulderWidth=.45,mountainWidthMultiplier=4.0,mountainHeightMultiplier=.65,','roadWidth=7.4,shoulderWidth=.55,')
s=s.replace('waterShoreCentreDistance=[5.0,6.6]','waterShoreCentreDistance=[4.8,10.3]')
s=s.replace("sun.data.energy=2;sun.data.angle=.06;sun.rotation_euler=(math.radians(32),math.radians(-24),math.radians(-35))","sun.data.energy=2.6;sun.data.angle=.045;sun.rotation_euler=(math.radians(58),math.radians(-18),math.radians(-42))")
s=s.replace("default_value=.55;scene.world=world","default_value=.35;scene.world=world")
s=s.replace('def smooth(a,b,x):', 'def roadedge(x,side):\n p=x/160*math.tau\n return 3.7+.018*math.sin(p*11+side)+.009*math.sin(p*23+side*.7)\ndef smooth(a,b,x):')
p.write_text(s)
