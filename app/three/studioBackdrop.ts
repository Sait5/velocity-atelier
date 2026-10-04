import * as T from 'three'

/** A clean studio background: no architectural ribs or visible light strips. */
export function createStudioBackdrop(){
 const group=new T.Group();group.name='Clean studio backdrop'
 function set(_background:string,_visible:boolean){group.visible=false}
 return {group,set}
}
