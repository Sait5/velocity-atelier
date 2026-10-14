import * as T from 'three'

/** The authored wheel atlas assigns the alloy faces their own UV swatch. */
export function installPorscheRimFinish(root:T.Group){
 const rim=new T.MeshPhysicalMaterial({name:'Porsche alloy finish',color:'#151719',metalness:.65,roughness:.28,clearcoat:.35,clearcoatRoughness:.22})
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||Array.isArray(o.material)||!/3DWheel1C_/.test(o.material.name))return
  const source=o.geometry,uv=source.getAttribute('uv'),index=source.index
  if(!uv||!index)return
  const original:number[]=[],alloy:number[]=[]
  for(let i=0;i<index.count;i+=3){
   const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)]
   const selected=ids.every(v=>uv.getX(v)>.07&&uv.getX(v)<.105&&uv.getY(v)>.258&&uv.getY(v)<.29)
   ;(selected?alloy:original).push(...ids)
  }
  if(!alloy.length)return
  const geometry=source.clone();geometry.setIndex([...original,...alloy]);geometry.clearGroups()
  geometry.addGroup(0,original.length,0);geometry.addGroup(original.length,alloy.length,1)
  o.geometry=geometry;o.material=[o.material,rim]
 })
 return rim
}
