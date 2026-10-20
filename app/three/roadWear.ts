/**
 * Natural wear on the asphalt of every drive map, as one GLSL helper. `roadWear(p)` takes road metres (p.x along the
 * road, p.y across from the centre line, lanes 3.8 m wide) and returns (colour factor, roughness offset):
 * - wheel tracks polished a little lighter and smoother, an oily darker band between them;
 * - sealed cracks ("tar snakes"): thin, glossy, near-black lines meandering along the lanes, in some stretches only;
 * - grime toward the edges.
 * Every line is filtered to the pixel, so the detail fades into its average tone with distance instead of shimmering.
 */
export const roadWearGlsl=`
float rwHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float rwNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rwHash(i),rwHash(i+vec2(1.,0.)),f.x),mix(rwHash(i+vec2(0.,1.)),rwHash(i+vec2(1.,1.)),f.x),f.y);}
vec2 roadWear(vec2 p){
 float lane=abs(p.y),colour=1.,rough=0.;
 float track=exp(-pow((abs(lane-1.9)-.8)/.32,2.));
 colour*=1.+.045*track;rough-=.07*track;
 float oil=exp(-pow((lane-1.9)/.35,2.));colour*=1.-.06*oil*(.6+.4*rwNoise(p*vec2(.05,.8)));
 // tar snakes
 float stretch=smoothstep(.6,.7,rwNoise(vec2(p.x*.015,0.)+vec2(3.7,0.)));
 float meander=rwNoise(p*vec2(.07,.45)+vec2(5.,1.))+.25*rwNoise(p*vec2(.4,1.4));
 float line=abs(meander-.68),lineAA=max(fwidth(meander),1e-4),width=.009;
 float snake=(1.-smoothstep(width-lineAA,width+lineAA,line))*min(1.,width/lineAA)*stretch*(1.-smoothstep(3.3,3.6,lane));
 colour*=1.-.3*snake;rough-=.12*snake;
 // grime toward the edges
 colour*=1.-.08*smoothstep(2.9,3.6,lane);
 return vec2(colour,rough);
}
// Where rain water stands on the road: organic pools from noise turned against the road, so they never line up into
// rectangles with the noise lattice.
float roadPuddles(vec2 p){
 vec2 q=mat2(.8,-.6,.6,.8)*p;
 float n=rwNoise(q*vec2(.12,.5))*.6+rwNoise(q*vec2(.37,1.3)+vec2(4.,9.))*.3+rwNoise(q*1.9+vec2(2.,7.))*.1;
 return smoothstep(.58,.72,n);
}
`
