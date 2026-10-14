const fs=require('fs');const p='app/three/desertRoad.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace('float edge=smoothstep(2.5,4.3,abs(dp.x)+dn(dp*.75)*.6);','float margin=mix(3.35,2.8,step(0.,dp.x))+dn(vec2(dp.y*.13,dp.x*.4))*0.35;\nfloat edge=smoothstep(margin,4.3,abs(dp.x)+dn(dp*vec2(.65,.23)+vec2(7.,21.))*.75);');
s=s.replace('float drift=smoothstep(.68,.91,dn(dp*vec2(.27,.10)))*.26;','float drift=smoothstep(.73,.91,dn(dp*vec2(.31,.09)+vec2(23.,-17.)))*.35;');
s=s.replace(' const roadGeometry=',` function compactX(x:number){return Math.sign(x)*(Math.min(Math.abs(x),4.4)+Math.max(0,Math.abs(x)-4.4)*.5)}
 function compactHeight(y:number){return roadLevel+(y-roadLevel)*.75}
 const roadGeometry=`);
s=s.replace('PlaneGeometry(8.6,800)','PlaneGeometry(8.6,400)').replace('set(2.87,266.67)','set(2.87,133.33)').replace('sand.map.repeat.set(880,880)','sand.map.repeat.set(440,440)').replace('PlaneGeometry(2200,2200)','PlaneGeometry(1100,1100)').replace('distant.position.y=-7','distant.position.y=compactHeight(-7)');
s=s.replace('v.applyMatrix4(inverseWorld);positions.setXYZ','v.x=compactX(v.x);v.y=compactHeight(v.y);v.applyMatrix4(inverseWorld);positions.setXYZ');
s=s.replace('positions.push(x,height-.06,z);','positions.push(compactX(x),compactHeight(height)-.06,z);');
s=s.replace('[-2*meta.period,-meta.period,0,meta.period,2*meta.period]','[-meta.period,0,meta.period]');
s=s.replace('return basis.clone().multiply(m).multiply(inverse)','e[12]=compactX(e[12]!);e[14]=compactHeight(e[14]!);return basis.clone().multiply(m).multiply(inverse)');
fs.writeFileSync(p,s);const c='app/components/VehicleScene.client.vue';s=fs.readFileSync(c,'utf8').replace("new T.Fog('#c7d7df',160,280)","new T.Fog('#c7d7df',95,150)").replace("props.roadMap==='desert'?340","props.roadMap==='desert'?180").replace("key.intensity=2.8;key.color.set('#fff6e7');fill.intensity=3","key.intensity=3.1;key.color.set('#fff4df');fill.intensity=4").replace('ambient.intensity=1.15','ambient.intensity=1.25');fs.writeFileSync(c,s);
