import fs from 'node:fs'
import * as T from 'three'
const rows=JSON.parse(fs.readFileSync('tools/generated/ferrari-approved-link-mounts.json','utf8'))
const poses=JSON.parse(fs.readFileSync('tools/generated/side-door-accepted-poses.json','utf8')).ferrari
const rest=new T.Matrix4().fromArray(poses[0][1]).invert()
for(const [index,a,normal] of [
 [2,[-.6469,.44,.8275],[.92879194,.04350218,.36803952]],
 [3,[-.6415,.652,.8275],[.93644768,.05939505,.34574273]],
]){
 const row=rows[index];row.a=a;row.an=normal
 const body=new T.Vector3().fromArray(a),door=new T.Vector3().fromArray(row.b)
 const span=Math.max(...poses.map(p=>body.distanceTo(door.clone().applyMatrix4(new T.Matrix4().fromArray(p[1]).multiply(rest)))))
 row.length=Math.max(row.length,span*.505)
}
fs.writeFileSync('app/three/ferrariDoorHingeMounts.json',JSON.stringify(rows,null,2)+'\n')
