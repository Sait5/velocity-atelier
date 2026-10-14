import fs from 'node:fs'
const file='app/three/saltFlatRoad.ts';let s=fs.readFileSync(file,'utf8');s=s.replace(/ function ridgeProfile\([^\n]+\n/,'')
s=s.replace("const markingPosition=new T.Vector3(),markingScale=new T.Vector3(1,1,1)","const markingPosition=new T.Vector3(),markingScale=new T.Vector3(1,1,1)\n for(let i=0;i<400;i++){matrix.compose(markingPosition.set(i*10-2000,level+.006,0),rotation,markingScale);dashes.setMatrixAt(i,matrix)}dashes.instanceMatrix.needsUpdate=true")
s=s.replace("for(let i=0;i<400;i++){matrix.compose(markingPosition.set(i*10-2000+T.MathUtils.euclideanModulo(distance,10),level+.006,0),rotation,markingScale);dashes.setMatrixAt(i,matrix)}dashes.instanceMatrix.needsUpdate=true","dashes.position.x=T.MathUtils.euclideanModulo(distance,10)")
fs.writeFileSync(file,s)
const camera='app/three/driveLook.ts';fs.writeFileSync(camera,fs.readFileSync(camera,'utf8').replace('(desert?.55:2.55)','(desert?.22:2.55)'))
fs.appendFileSync('public/textures/CREDITS.md','\nOpen highway: Asphalt 01 base colour, OpenGL normal and roughness (Poly Haven, CC0); base colour remapped to neutral charcoal, procedural aggregate micro-normal and shoulder wear. Forward massif: Rock Face 03 diffuse, normal and roughness (Poly Haven, CC0), original procedural terrain geometry.\n')
