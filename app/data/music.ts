export const musicThemes=[
 {id:'atelier',name:'Atelier · Ambient',genre:'Ambient',artist:'Velocity Atelier',source:'',gain:1,src:'/audio/atelier-ambient.wav'},
 {id:'pulse',name:'Neon',genre:'Synthwave',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/neon/',gain:.65,src:'/audio/sb-neon.mp3'},
 {id:'horizon',name:'Soft Horizon',genre:'Ambient',artist:'Velocity Atelier',source:'',gain:1,src:'/audio/soft-horizon.wav'},
 {id:'midnight',name:'Machina',genre:'Electronic / cinematic',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/machina/',gain:.65,src:'/audio/sb-machina.mp3'},
 {id:'sunset',name:'Chasing Daylight',genre:'Piano / cinematic',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/chasing-daylight/',gain:.65,src:'/audio/sb-chasing-daylight.mp3'},
 {id:'electric',name:'Electric Dreams',genre:'Synthwave / night drive',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/electric-dreams/',gain:.58,src:'/audio/sb-electric-dreams.mp3'},
 {id:'twilight',name:'Twilight Echo',genre:'Retro electronic',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/twilight-echo/',gain:.6,src:'/audio/sb-twilight-echo.mp3'},
 {id:'supernova',name:'Supernova',genre:'Electronic / rock',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/supernova/',gain:.52,src:'/audio/sb-supernova.mp3'},
 {id:'nightfall',name:'Nightfall',genre:'Electronic / cinematic',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/nightfall/',gain:.58,src:'/audio/sb-nightfall.mp3'},
 {id:'rain',name:'Tears in Rain',genre:'Ambient / electronic',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/tears-in-rain/',gain:.65,src:'/audio/sb-tears-in-rain.mp3'},
 {id:'hiraeth',name:'Hiraeth',genre:'Ambient / cello',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/hiraeth/',gain:.65,src:'/audio/sb-hiraeth.mp3'},
 {id:'convergence',name:'Convergence',genre:'Piano / electronic',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/convergence/',gain:.6,src:'/audio/sb-convergence.mp3'},
 {id:'catalyst',name:'Catalyst',genre:'Driving synth / McLaren',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/catalyst/',gain:.52,src:'/audio/sb-catalyst.mp3'},
 {id:'discovery',name:'Discovery',genre:'Hybrid orchestral / Porsche',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/discovery/',gain:.52,src:'/audio/sb-discovery.mp3'},
 {id:'titan',name:'Titan',genre:'Orchestral / Bugatti',artist:'Scott Buckley',source:'https://www.scottbuckley.com.au/library/titan/',gain:.55,src:'/audio/sb-titan.mp3'}
]

// One shared choice for playback and the selected state in the music picker.
const vehicleMusic:Record<string,string>={revuelto:'pulse',gt3:'discovery','458':'sunset',tourbillon:'titan','750s':'catalyst',valhalla:'hiraeth',amg:'nightfall',jesko:'supernova'}
export function musicForVehicle(vehicleId:string){return vehicleMusic[vehicleId]??'atelier'}
