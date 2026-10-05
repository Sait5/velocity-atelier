type Position=[number,number,number]
type Rig={key:number,keyColor:string,keyPosition:Position,fill:number,fillColor:string,fillPosition:Position,ambient:number,environment:number}
const base:Rig={key:2.7,keyColor:'#ffffff',keyPosition:[-3,7,4],fill:26,fillColor:'#ffffff',fillPosition:[5,3,-4],ambient:.38,environment:1}
const rigs:Record<string,Rig>={
 Studio:base,
 'Soft Day':{...base,key:2.2,ambient:.65},
 Night:{...base,key:.8,fill:11,fillColor:'#a5b9df',ambient:.25,environment:.7},
 Sunset:{...base,keyColor:'#ffdda9',fillColor:'#ffd0a3'},
 'Dark Room':{...base,key:.65,fill:8,ambient:.18,environment:.6},
 Editorial:{key:2.2,keyColor:'#fffaf2',keyPosition:[-4,6,2],fill:18,fillColor:'#e8f0ff',fillPosition:[3,4,-5],ambient:.5,environment:.95},
 Rim:{key:3,keyColor:'#e3edff',keyPosition:[4,5,-4],fill:12,fillColor:'#fff1df',fillPosition:[-4,2,3],ambient:.18,environment:.75},
 Pearl:{key:2.4,keyColor:'#fff1e5',keyPosition:[-2,7,1],fill:20,fillColor:'#dceaff',fillPosition:[4,4,-3],ambient:.55,environment:1.1},
}
/** Existing two sources are repositioned; presets add no extra rendering passes. */
export const studioLightRig=(preset:string)=>rigs[preset]??base
