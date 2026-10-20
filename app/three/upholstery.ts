import * as T from 'three'

const floor=new T.Color('#4a4f4c')
/** Very dark leathers (graphite, black) are lifted a little so stitching and seat shapes still read in the cabin;
 *  lighter colours are applied exactly. */
export function liftDarkUpholstery(color:string,target=new T.Color()){
 target.set(color)
 const luminance=target.r*.2126+target.g*.7152+target.b*.0722
 if(luminance<.08)target.lerp(floor,.35*(1-luminance/.08))
 return target
}
