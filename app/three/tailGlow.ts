import * as T from 'three'
import {createLampPool} from './lampPool'
export function installTailGlow(root:T.Group,rearX:number){
 const lights=[-1,1].map(side=>{const light=new T.PointLight('#ff2010',5,3.2,2);light.position.set(rearX,.55,side*.72);root.add(light);return light})
 const glow=createLampPool(rearX,true);root.add(glow)
 function set(enabled:boolean){glow.visible=enabled;lights.forEach(l=>l.intensity=enabled?5:0)}
 return {set}
}
