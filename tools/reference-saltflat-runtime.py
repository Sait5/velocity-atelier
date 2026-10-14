from pathlib import Path
p=Path('app/three/blenderSaltFlatRoad.ts');s=p.read_text()
s=s.replace("color:'#bfbdb5'","color:'#f1f2ee'").replace("gravel.color.set('#a9a79f')","gravel.color.set('#dedfd9')").replace("normalScale:new T.Vector2(.4,.4)","normalScale:new T.Vector2(.22,.22)")
s=s.replace("outerMat.color.set('#b9b9ae')","outerMat.color.set('#f1f2ee')")
s=s.replace("'#267caf'","'#1267af'")
s=s.replace("vec3(.58,.71,.81),.44","vec3(.58,.71,.81),.26")
s=s.replace("const waterMaterial=new T.ShaderMaterial({uniforms:{waveNormal:","const waterMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{saltColour:{value:salt.map},waveNormal:")
a=s.index('uniform sampler2D waveNormal;uniform float lakeTime,lakeTravel;');b=s.index('\n #include <tonemapping_fragment>',a)
s=s[:a]+'''uniform sampler2D waveNormal,saltColour;uniform float lakeTime,lakeTravel;uniform vec3 zenith,horizon;varying vec3 worldPosition;
 float basin(vec2 p,vec4 pond){float r=length((p-pond.xy)/pond.zw);float t=clamp((r-.55)/.45,0.,1.);return .14*(1.-t*t*(3.-2.*t));}
 void main(){vec2 p=vec2(worldPosition.x-lakeTravel,worldPosition.z);p.x=mod(p.x+80.,160.)-80.;float distanceToEye=length(cameraPosition-worldPosition);vec3 a=texture2D(waveNormal,p*.11+vec2(lakeTime*.006,lakeTime*.004)).rgb*2.-1.;vec3 b=texture2D(waveNormal,p*.37+vec2(-lakeTime*.004,lakeTime*.008)).rgb*2.-1.;float fine=1.-smoothstep(18.,80.,distanceToEye);vec3 n=normalize(vec3((a.x+b.x*.3*fine)*.055,1.,(a.y+b.y*.3*fine)*.055));vec3 eye=normalize(cameraPosition-worldPosition);float fresnel=.025+.975*pow(1.-max(dot(n,eye),0.),5.);vec3 reflected=reflect(-eye,n);float skyHeight=pow(clamp(reflected.y/.65,0.,1.),.65);vec3 sky=mix(horizon,zenith,skyHeight);float depth=max(0.,basin(p,vec4(-25.,-23.,42.,13.))+basin(p,vec4(48.,31.,20.,10.))-.04-.004*sin(p.x/160.*6.2831853*3.)*sin(-p.y*.6));vec3 bottom=texture2D(saltColour,vec2(p.x,-p.y)/4.+n.xz*.035).rgb;float deep=smoothstep(0.,.1,depth);vec3 body=mix(bottom*vec3(.84,.96,.96),vec3(.10,.55,.64),deep*.76);vec3 sun=normalize(vec3(-.52,.8,.3));float glint=pow(max(dot(n,normalize(sun+eye)),0.),150.);vec3 colour=mix(body,sky,.05+fresnel*.45)+glint*vec3(1.,.94,.83)*.18;float haze=smoothstep(850.,1450.,distanceToEye);colour=mix(colour,horizon,haze);gl_FragColor=vec4(colour,smoothstep(.001,.025,depth));'''+s[b:]
s=s.replace("water.name='Narrow lake without reflection render target'","water.name='Shallow isolated salt pools'")
p.write_text(s)
p=Path('app/components/VehicleScene.client.vue');s=p.read_text().replace("new T.Fog('#c9dce9',550,1450)","new T.Fog('#c9dce9',850,1450)");p.write_text(s)
