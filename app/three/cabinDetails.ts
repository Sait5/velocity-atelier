import * as T from 'three'

/** Fine leather grain uses the existing seat geometry and authored seam normals. */
export function enhanceCabin(root:T.Group,leather:T.MeshStandardMaterial){
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!,data=c.createImageData(512,512)
  let seed=458;for(let i=0;i<data.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const grain=210+(seed%45);data.data[i]=data.data[i+1]=data.data[i+2]=grain;data.data[i+3]=255}c.putImageData(data,0,0)
  const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(28,28);map.anisotropy=16;leather.roughnessMap=map;leather.roughness=.82;leather.normalScale?.set(1.35,1.35)
 }
 root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial){if(/carbon/.test(m.name)){m.roughness=.36;m.metalness=.18;m.envMapIntensity=.7}if(/stitch/.test(m.name)){m.roughness=.85;m.envMapIntensity=.25}}})
 const light=new T.PointLight('#fff2dc',.38,1.8,2);light.name='Soft cabin bounce';light.position.set(.1,.85,0);root.add(light)
 const seat=new T.PointLight('#e4e9ed',.55,1.45,2);seat.name='Driver cabin fill';seat.position.set(.25,.63,.4);root.add(seat)
 const footwell=new T.PointLight('#dce7ef',.4,1.25,2);footwell.name='Footwell fill';footwell.position.set(-.55,.5,.35);root.add(footwell)
}
