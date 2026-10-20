import * as T from 'three'
import {createHeadlightPool} from './lampPool'
import {liftDarkUpholstery} from './upholstery'
import {installJeskoInstruments} from './jeskoInstruments'

/**
 * Koenigsegg Jesko Attack (ddiaz-design, Sketchfab; a Racing Master game model), rigged by tools/prepare-jesko-model.py:
 * metre scale, front -x, driver's side at +z, wheel groups at the wheel centres and the two doors hinged at the A-pillar
 * root. The game's own materials keep their names; the ones driven here were given names of their own there: paint and
 * pinstripe, the lamp atlas split into head, tail and mirror-indicator lamps, glass, calipers and the cabin leather.
 */
/** Dihedral synchro-helix door: one turn about a diagonal axis leaning forward, outward and down from the A-pillar root
 *  (found in Blender by sweeping the door's whole path against the body). The open door stands upright beside the front
 *  wheel arch with its skin turned forward. Axis for the driver's (+z) door; the other side's is mirrored. */
const AXIS=new T.Vector3(-.505,-.674,.539).normalize(),OPEN=115*Math.PI/180
export function prepareJesko(root:T.Group){
 const body=new T.MeshPhysicalMaterial({name:'Jesko body paint',color:'#f65c00',metalness:.3,roughness:.22,clearcoat:1,clearcoatRoughness:.05})
 const materials=new Map<string,T.MeshStandardMaterial>()
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m as T.MeshStandardMaterial)})
 const need=(name:string)=>{const m=materials.get(name);if(!m)throw Error('Jesko material missing: '+name);return m}
 const paint=need('Jesko paint'),stripe=need('Jesko pinstripe'),rim=need('Jesko wheel carbon'),brake=need('Jesko caliper'),leather=need('Jesko leather'),glass=need('Jesko glass')
 const head=need('Jesko head lamp'),tail=need('Jesko tail lamp'),indicator=need('Jesko mirror indicator')
 const white=new T.MeshStandardMaterial({color:'#edf5ff',emissive:'#cbdfff',emissiveIntensity:0})
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return
  o.castShadow=true;o.receiveShadow=true
  const list=Array.isArray(o.material)?o.material:[o.material]
  const swapped=list.map(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=16;return m===paint?body:m})
  o.material=Array.isArray(o.material)?swapped:swapped[0]!
  if(swapped.some(m=>m.transparent))o.castShadow=false
 })
 paint.dispose()
 // windows tinted like the other cars', so the cabin shows through; lamp covers clear; the mirrors a dark mirror glass
 glass.color.set('#0d1214');glass.opacity=.36;glass.roughness=.05;glass.metalness=.1;glass.transparent=true;glass.depthWrite=false;glass.side=T.DoubleSide
 const lens=materials.get('Jesko lamp glass');if(lens){lens.color.set('#e9f0f2');lens.opacity=.14;lens.transparent=true;lens.depthWrite=false;lens.roughness=.04;lens.metalness=0}
 const mirror=materials.get('Jesko mirror glass');if(mirror){mirror.color.set('#9aa3a8');mirror.metalness=1;mirror.roughness=.04}
 stripe.color.set('#b9bcbf');stripe.metalness=.85;stripe.roughness=.24
 leather.metalness=0;leather.roughness=.68
 // the lamps glow only when switched on; at rest the atlas shows the clusters' own chrome and lenses
 head.emissive.set('#ffffff');head.emissiveIntensity=0
 tail.emissive.set('#ffffff');tail.emissiveIntensity=0
 indicator.emissive.set('#ffffff');indicator.emissiveIntensity=0
 // no glare in the cabin: its materials keep a quarter of the environment's reflection (the screens a third), and soft
 // bounce lights over the seats, the console and the footwells lift the black-and-carbon cabin out of the dark scenes
 const cabin=/^AttackMI_Cabin|^AttackStitch|^AttackMI_Dashboard|^Jesko (leather|cabin carbon|cabin aluminium)/
 for(const [name,m] of materials)if(cabin.test(name))m.envMapIntensity=/Dashboard/.test(name)?.35:/carbon/.test(name)?.3:/aluminium/.test(name)?.22:.25
 // the label, badge, stitching and grille atlases are cut-outs: drawn opaque with an alpha cut, so what lies behind them
 // keeps its depth (blended, farther cabin parts showed through them)
 for(const [name,m] of materials)if(/^Attack(MI_Cabin_A1|Stitch|MI_Logo1|MI_Engine_A1|MI_Engine_Grid_[ABC]1|gruid_alt)$/.test(name)){m.transparent=false;m.alphaTest=.5;m.depthWrite=true;m.needsUpdate=true}
 // the screens glow softly and are sampled one mip level sharper than the GPU picks (they sit small and steep in the
 // cockpit view, where the default level smeared the lettering)
 const screens=materials.get('AttackMI_Dashboard1')
 if(screens){screens.color.set('#000000');screens.metalness=0;screens.roughness=.35;screens.emissive.set('#ffffff');screens.emissiveIntensity=.85
  screens.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#ifdef USE_EMISSIVEMAP\n\ttotalEmissiveRadiance *= texture2D( emissiveMap, vEmissiveMapUv, -1.0 ).rgb;\n#endif')}
  screens.customProgramCacheKey=()=>'jesko-screen-lod-bias'}
 for(const [x,y,z,power] of [[-.05,.95,0,.55],[.25,.8,0,.35],[-.55,.55,0,.3]]){
  const bounce=new T.PointLight('#f4f6f5',power,1.4,2);bounce.name='Jesko cabin bounce';bounce.position.set(x!,y!,z!);root.add(bounce)
 }
 const doors=['Jesko_door_L','Jesko_door_R'].map(name=>root.getObjectByName(name) as T.Group)
 const wheels=[0,1,2,3].map(i=>root.getObjectByName('Jesko_wheel_'+i) as T.Group)
 if(doors.some(d=>!d)||wheels.some(w=>!w))throw Error('Jesko rig unavailable')
 const axes=doors.map((_,i)=>i===0?AXIS.clone():new T.Vector3(AXIS.x,AXIS.y,-AXIS.z))
 // the driver's door (+z) turns positively about its axis, the mirrored one negatively
 function setDoors(left:number,right=left){doors.forEach((door,i)=>door.quaternion.setFromAxisAngle(axes[i]!,T.MathUtils.clamp(i===0?left:right,0,1)*OPEN*(i===0?1:-1)))}
 // The door glass slides down along its own slope into the door; whatever passes the belt line is clipped away (the
 // pane leans in steeply towards the roof, so it cannot drop straight down). The clipping plane rides with the door.
 const panes=doors.flatMap(door=>door.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&/Carwindow|Glass_In5__|Exhaust_01[34]__/.test(o.name)&&(o.material as T.Material).name==='Jesko glass').map(mesh=>{
  const pos=mesh.geometry.getAttribute('position'),p=new T.Vector3(),top=new T.Vector3(),low=new T.Vector3();let nt=0,nl=0,ymin=Infinity,ymax=-Infinity
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);ymin=Math.min(ymin,p.y);ymax=Math.max(ymax,p.y)}
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);if(p.y>ymax-.02){top.add(p);nt++}if(p.y<ymin+.02){low.add(p);nl++}}
  top.divideScalar(nt);low.divideScalar(nl)
  const down=low.clone().sub(top),travel=down.length()+.005;down.normalize()
  const material=(mesh.material as T.MeshStandardMaterial).clone(),local=new T.Plane().setFromNormalAndCoplanarPoint(down.clone().negate(),low.clone().addScaledVector(down,-.004))
  material.clippingPlanes=[new T.Plane()];mesh.material=material
  const parentMatrix=new T.Matrix4()
  mesh.onBeforeRender=()=>{parentMatrix.copy(mesh.parent!.matrixWorld);material.clippingPlanes![0]!.copy(local).applyMatrix4(parentMatrix)}
  return {mesh,rest:mesh.position.clone(),down,travel}
 }))
 function setWindows(value:number){for(const {mesh,rest,down,travel} of panes){mesh.position.copy(rest).addScaledVector(down,value*travel);mesh.visible=value<.995}}
 const headlights:T.SpotLight[]=[]
 const spill=createHeadlightPool(-2.35,.62);root.add(spill)
 for(const side of [-1,1]){const lamp=new T.SpotLight('#dceaff',0,8,.42,.8,2);lamp.position.set(-2.1,.62,side*.7);lamp.target.position.set(-5.5,.05,side*.85);root.add(lamp,lamp.target);headlights.push(lamp)}
 function setLights(front:boolean,rear:boolean,frontLevel=Number(front),rearLevel=Number(rear)){root.userData.frontEnabled=front;root.userData.tailEnabled=rear;spill.visible=front;head.emissiveIntensity=3*frontLevel;indicator.emissiveIntensity=2*frontLevel;tail.emissiveIntensity=2.6*rearLevel;headlights.forEach(l=>l.intensity=65*frontLevel)}
 function setUpholstery(color:string){liftDarkUpholstery(color,leather.color)}
 // the cluster on the steering wheel is live: speed, gear and the power and boost bars (jeskoInstruments.ts)
 const {updateInstruments}=installJeskoInstruments(root)
 function dispose(){const geo=new Set<T.BufferGeometry>(),mats=new Set<T.Material>([body,white]),tex=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}});geo.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)tex.add(v);m.dispose()});tex.forEach(t=>t.dispose())}
 setDoors(0)
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,updateInstruments,dispose}
}
