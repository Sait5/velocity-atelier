import fs from 'node:fs'
const fits=JSON.parse(fs.readFileSync('tools/generated/ferrari-hinge-clearance-fit.json','utf8'))
fs.writeFileSync('app/three/ferrariDoorHingeMounts.json',JSON.stringify(fits.map(({a,b,an,bn,length,bias})=>({a,b,an,bn,length,bias})),null,2)+'\n')
const baseline={}
for(const key of ['porsche','ferrari'])baseline[key]=JSON.parse(fs.readFileSync(`tools/generated/${key}-compact-hinges.json`,'utf8')).poses
if(!fs.existsSync('tools/generated/side-door-accepted-poses.json'))fs.writeFileSync('tools/generated/side-door-accepted-poses.json',JSON.stringify(baseline))
