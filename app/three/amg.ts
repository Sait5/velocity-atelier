import * as T from 'three'
import {createHeadlightPool} from './lampPool'
import {liftDarkUpholstery} from './upholstery'
import {installAmgInstruments} from './amgInstruments'

/**
 * Mercedes-AMG GT 63 S 4-Door (mohamedouartassi, Sketchfab), rigged by tools/prepare-amg-model.py: metre scale, front -x,
 * driver's side at +z, wheel groups at the wheel centres and four door groups hinged at their front edges. The free
 * model's placeholder cabin is replaced there by the Mercedes-AMG E 63 S (W213) cabin (Mona x Supercars, CC BY), whose
 * leather ('AMG leather') is a light grain the upholstery colour tints. The body's materials are plain colours (tyres and
 * indicator lenses corrected in the prepare script): paint, glass and lamps are set up here.
 */
/** Conventional doors on near-vertical hinges at their front edges; only the front pair opens, the rear doors stay shut. */
const OPEN=1.12
export function prepareAmg(root:T.Group){
 // two-sided: parts of the free model's bonnet and boot have their faces flipped, and one-sided paint left holes there
 // (seen through the windscreen and the rear window from the cabin); the cabin side of the skin is lined in Blender
 const body=new T.MeshPhysicalMaterial({name:'AMG paint',color:'#16181b',metalness:.55,roughness:.24,clearcoat:1,clearcoatRoughness:.05,side:T.DoubleSide})
 const materials=new Map<string,T.MeshStandardMaterial>()
 root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.set(m.name,m as T.MeshStandardMaterial)})
 const need=(name:string)=>{const m=materials.get(name);if(!m)throw Error('AMG material missing: '+name);return m}
 const paint=need('body'),rim=need('glossy black'),brake=need('brake.001'),leather=need('AMG leather'),glass=need('windows')
 const head=need('headlight.001'),tail=need('back headlight')
 const white=new T.MeshStandardMaterial({color:'#edf5ff',emissive:'#cbdfff',emissiveIntensity:0})
 root.traverse(o=>{
  if(!(o instanceof T.Mesh))return
  o.castShadow=true;o.receiveShadow=true
  const list=Array.isArray(o.material)?o.material:[o.material]
  const swapped=list.map(m=>m===paint?body:m)
  o.material=Array.isArray(o.material)?swapped:swapped[0]!
  if(swapped.some(m=>m.transparent))o.castShadow=false
 })
 paint.dispose()
 // windows: tinted like the other cars', so the cabin shows through; lamp lenses and covers clear
 glass.name='AMG window glass';glass.color.set('#0d1214');glass.opacity=.36;glass.roughness=.05;glass.metalness=.1;glass.transparent=true;glass.depthWrite=false;glass.side=T.DoubleSide
 for(const name of ['glass','glass.001']){const m=materials.get(name);if(m){m.color.set('#e9f0f2');m.opacity=.14;m.transparent=true;m.depthWrite=false;m.roughness=.04;m.metalness=0}}
 // a satin chrome: as a mirror (roughness .12) the sill and window trims glowed as white lines in the dark scenes
 const chrome=materials.get('chrome');if(chrome){chrome.metalness=1;chrome.roughness=.22;chrome.envMapIntensity=.75}
 const sill=materials.get('AMG sill trim');if(sill)sill.envMapIntensity=.45
 rim.metalness=.3;rim.roughness=.25
 leather.metalness=0;leather.roughness=.72
 // the cabin's light strips glow softly (at full strength they bloomed into neon lines); the screens are lit, not glaring
 const strip=materials.get('New_Material_2');if(strip){strip.emissive.set('#ff2617');strip.emissiveIntensity=.55}
 // their pictures are sampled one mip level sharper than the GPU picks (LOD bias -1): the cockpit shows the screens
 // small and steeply angled, where the default level smeared the lettering into a blur
 for(const name of ['AMG cluster screen','AMG media screen']){const m=materials.get(name);if(!m)continue
  m.emissiveIntensity=.9
  m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#ifdef USE_EMISSIVEMAP\n\ttotalEmissiveRadiance *= texture2D( emissiveMap, vEmissiveMapUv, -1.0 ).rgb;\n#endif')}
  m.customProgramCacheKey=()=>'amg-screen-lod-bias'}
 // the cabin's switch-label atlas and red trim stripes are cut-outs: drawn opaque with an alpha cut, so the cabin behind
 // them keeps its depth (blended, they let farther cabin parts show through)
 for(const name of ['Meshessalon0111_diff','Meshestr0021_diff']){const m=materials.get(name);if(m){m.transparent=false;m.alphaTest=.5;m.depthWrite=true;m.needsUpdate=true}}
 head.color.set('#0d0e10');head.emissive.set('#eef4ff');head.emissiveIntensity=0
 tail.emissive.set('#ff1a0a');tail.emissiveIntensity=0
 // no glare in the cabin: its trims keep a quarter of the environment's reflection (the door seals none), and three soft
 // bounce lights (between the front seats, over the rear bench, in the front footwell) sit clear of the screens and the
 // headliner (closer, each threw a hot spot on the nearest glossy surface)
 // cabin textures keep their detail at glancing angles (anisotropic filtering; without it the carbon, fabric and
 // leather grain smeared away towards the windscreen and the floor)
 // (multi-material door pieces load as a group of meshes: the group carries the name; the door shut faces share the body
 // paint, which keeps its own reflection)
 const cabin=/^W213|__card|__inner|__lower|__ledge|jamb/
 root.traverse(o=>{if(!(o instanceof T.Mesh)||!(cabin.test(o.name)||cabin.test(o.parent?.name??'')))return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial&&m!==body){m.envMapIntensity=/shut paint/i.test(m.name)?.6:/aluminium/i.test(m.name)?.7:/screen glass/i.test(m.name)?.35:/shut|seal/i.test(m.name)?0:/mirror glass/i.test(m.name)?.3:/fabric/i.test(m.name)?.1:/grille/i.test(m.name)?.5:.25;for(const v of Object.values(m))if(v instanceof T.Texture)v.anisotropy=16}})
 for(const [x,y,z,power] of [[-.25,1.0,0,.6],[.8,.92,0,.35],[-.6,.62,0,.35]]){
  const bounce=new T.PointLight('#f4f6f5',power,1.5,2);bounce.name='AMG cabin bounce';bounce.position.set(x!,y!,z!);root.add(bounce)
 }
 // the opening doors, driver's first: the rear doors are rigged too but stay closed
 const doors=['AMG_door_L_front','AMG_door_R_front'].map(name=>root.getObjectByName(name) as T.Group)
 const shut=['AMG_door_L_rear','AMG_door_R_rear'].map(name=>root.getObjectByName(name) as T.Group)
 const wheels=[0,1,2,3].map(i=>root.getObjectByName('AMG_wheel_'+i) as T.Group)
 if(doors.some(d=>!d)||shut.some(d=>!d)||wheels.some(w=>!w))throw Error('AMG rig unavailable')
 const up=new T.Vector3(0,1,0)
 // driver's side (+z) opens towards +z: a negative turn about +y, the passenger's side the other way
 function setDoors(left:number,right=left){doors.forEach((door,i)=>{const driver=i===0,value=T.MathUtils.clamp(driver?left:right,0,1);door.quaternion.setFromAxisAngle(up,value*OPEN*(driver?-1:1))})}
 // a soft courtesy light 30 cm off each front door card, riding with the door: the card reads when the door is open
 // (it also lays a small pool on the floor under it, as the real door's puddle lamp does); short-ranged and well back
 // from the hinge, so it does not reach the hinge pillar
 root.updateWorldMatrix(true,true)
 for(const [door,side] of [[doors[0]!,1],[doors[1]!,-1]] as const){const lamp=new T.PointLight('#f6f4ef',.5,.62,2);lamp.name='AMG door courtesy';lamp.position.set(-.34,.58,side*.55);root.add(lamp);door.attach(lamp)}
 // the shut faces and hinge pillars wear a satin version of the paint: it follows the body colour as it changes
 const shutPaint=materials.get('AMG shut paint')
 if(shutPaint)root.traverse(o=>{if(o instanceof T.Mesh&&(Array.isArray(o.material)?o.material:[o.material]).includes(shutPaint))o.onBeforeRender=()=>{shutPaint.color.copy(body.color)}})
 // the door glass lowers like a real regulator's: each pane is an arc whose centre is its origin (prepare-amg-model.py),
 // so turning it about its x axis slides it along itself through the belt slot into the door, between the card and the
 // skin. The turn that takes the pane's top 5 mm under the slot (its rest bottom edge) is found once, numerically.
 const panes=[...doors,...shut].flatMap(d=>d.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&o.name.endsWith('__glass')).map(mesh=>{
  const pos=mesh.geometry.getAttribute('position'),p=new T.Vector3();let top=new T.Vector3(),low=Infinity,hi=-Infinity
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);if(p.y>hi){hi=p.y;top=p.clone()}low=Math.min(low,p.y)}
  const lowered=(a:number)=>top.y*Math.cos(a)-top.z*Math.sin(a)
  const dir=lowered(.01)<top.y?1:-1;let turn=0
  while(lowered(turn)>low-.005&&Math.abs(turn)<1)turn+=dir*.002
  return {mesh,rest:mesh.rotation.x,turn}
 }))
 function setWindows(value:number){for(const {mesh,rest,turn} of panes){mesh.rotation.x=rest+value*turn;mesh.visible=value<.995}}
 const headlights:T.SpotLight[]=[]
 const spill=createHeadlightPool(-2.5,.66);root.add(spill)
 for(const side of [-1,1]){const lamp=new T.SpotLight('#dceaff',0,8,.42,.8,2);lamp.position.set(-2.35,.68,side*.72);lamp.target.position.set(-5.5,.05,side*.85);root.add(lamp,lamp.target);headlights.push(lamp)}
 function setLights(front:boolean,rear:boolean,frontLevel=Number(front),rearLevel=Number(rear)){root.userData.frontEnabled=front;root.userData.tailEnabled=rear;spill.visible=front;head.emissiveIntensity=4*frontLevel;tail.emissiveIntensity=3.2*rearLevel;headlights.forEach(l=>l.intensity=65*frontLevel)}
 function setUpholstery(color:string){liftDarkUpholstery(color,leather.color)}
 // the cluster is live: needles and centre readouts drawn over the glass (amgInstruments.ts)
 const {updateInstruments}=installAmgInstruments(root)
 function dispose(){const geo=new Set<T.BufferGeometry>(),mats=new Set<T.Material>([body,white]),tex=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m)}});geo.forEach(g=>g.dispose());mats.forEach(m=>{for(const v of Object.values(m))if(v instanceof T.Texture)tex.add(v);m.dispose()});tex.forEach(t=>t.dispose())}
 setDoors(0)
 return {root,body,rim,brake,glass,leather,white,doors,wheels,spokes:[] as T.Group[],setDoors,setWindows,setLights,setUpholstery,updateInstruments,dispose}
}
