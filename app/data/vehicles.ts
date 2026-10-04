export const vehicles = [
 {id:'revuelto',brand:'Lamborghini',name:'Revuelto',year:'2024',power:'1,015',accel:'2.5',speed:'350+',drive:'AWD',color:'#ff5700',engine:'V12 hybrid',shape:0},
 {id:'gt3',brand:'Porsche',name:'911 GT3',year:'2025',power:'510',accel:'3.4',speed:'311',drive:'RWD',color:'#c0c3c1',engine:'Flat-six',shape:1},
 {id:'296',brand:'Ferrari',name:'296 GTB',year:'2024',power:'830',accel:'2.9',speed:'330+',drive:'RWD',color:'#ae2028',engine:'V6 hybrid',shape:2},
 {id:'tourbillon',brand:'Bugatti',name:'Tourbillon',year:'2026',power:'1,800',accel:'2.0',speed:'445',drive:'AWD',color:'#366274',engine:'V16 hybrid',shape:3},
 {id:'750s',brand:'McLaren',name:'750S',year:'2024',power:'750',accel:'2.8',speed:'332',drive:'RWD',color:'#cf742c',engine:'Twin-turbo V8',shape:4},
 {id:'valhalla',brand:'Aston Martin',name:'Valhalla',year:'2026',power:'1,079',accel:'2.5',speed:'350',drive:'AWD',color:'#4e7064',engine:'V8 hybrid',shape:5},
 {id:'amg',brand:'Mercedes-AMG',name:'GT 63',year:'2025',power:'585',accel:'3.2',speed:'315',drive:'AWD',color:'#777d82',engine:'Biturbo V8',shape:6},
 {id:'jesko',brand:'Koenigsegg',name:'Jesko',year:'2024',power:'1,600',accel:'—',speed:'—',drive:'RWD',color:'#dddacb',engine:'Twin-turbo V8',shape:7}
]
export type Vehicle = typeof vehicles[number]
export const previewVehicle:Vehicle={id:'458',brand:'Ferrari',name:'458 Italia',year:'2015',power:'570',accel:'3.4',speed:'325',drive:'RWD',color:'#a2b368',engine:'Naturally aspirated V8',shape:8}
