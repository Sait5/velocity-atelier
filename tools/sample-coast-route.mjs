import fs from 'node:fs'
import {CatmullRomCurve3,Vector3} from 'three'
const source=JSON.parse(fs.readFileSync('app/three/coastRoute.json','utf8'))
const curve=new CatmullRomCurve3(source.map(p=>new Vector3(...p)),false,'centripetal');curve.arcLengthDivisions=600
fs.writeFileSync('tools/coast-probes.json',JSON.stringify(Array.from({length:301},(_,i)=>curve.getPointAt(i/300).toArray())))
