import * as T from 'three'

function loadMap(url:string,repeatX:number,repeatY:number,color=false){
 const texture=new T.TextureLoader().load(url)
 texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(repeatX,repeatY)
 texture.anisotropy=8;texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace
 return texture
}
export function applyLeatherMaps(material:T.MeshPhysicalMaterial){
 // Authored upholstery UVs use metres. Poly Haven's scanned tile covers 0.4 m.
 material.normalMap=loadMap('/textures/brown_leather_nor_gl_1k.png',2.5,2.5)
 material.normalScale.set(.28,.28)
 material.roughnessMap=loadMap('/textures/brown_leather_rough_1k.png',2.5,2.5)
 material.roughness=.9;material.needsUpdate=true
}
export function applyAsphaltMaps(material:T.MeshStandardMaterial){
 // Road dimensions are 2200 × 12 m; this scan covers 2.08 × 2.08 m.
 material.map=loadMap('/textures/asphalt_01_diff_1k.jpg',2200/2.08,12/2.08,true)
 material.normalMap=loadMap('/textures/asphalt_01_nor_gl_1k.png',2200/2.08,12/2.08)
 material.normalScale.set(.5,.5);material.bumpMap=null
 material.roughnessMap=loadMap('/textures/asphalt_01_rough_1k.png',2200/2.08,12/2.08)
 material.color.set('#c9ccca');material.needsUpdate=true
}
