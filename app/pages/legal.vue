<script setup lang="ts">
import {musicThemes} from '~/data/music'
// Credits: what the site is built from, who made it and under which terms, and what was made for the project itself.
const {t}=useLocale()
type Entry={name:string,author:string,url:string,license:string,licenseUrl?:string,ru:string,en:string}
const models:Entry[]=[
 {name:'2011 Ferrari 458 Italia',author:'Ddiaz Design',url:'https://sketchfab.com/3d-models/2011-ferrari-458-italia-bb6c7fa565c04ec59cd9d0e0a4d0098c',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',ru:'Положение и масштаб, двери на петлях, опускаемые стёкла, вращение колёс по своим осям, материалы, свет, живые приборы, номерной знак. Загрузчик указывает происхождение модели из Forza Motorsport 4.',en:'Placement and scale, hinged doors, lowering windows, wheels spinning on their own axles, materials, lights, live instruments, licence plate. The uploader names Forza Motorsport 4 as the origin.'},
 {name:'Lamborghini Revuelto',author:'Anatolian Studios',url:'https://sketchfab.com/3d-models/lamborghini-revuelto-099b60042519463ead19ce054d479724',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',ru:'Ориентация, группы дверей и колёс, механизм дверей-ножниц, опускаемые стёкла, материалы, свет, экраны приборов, номерной знак.',en:'Orientation, door and wheel groups, scissor-door mechanism, lowering windows, materials, lights, instrument displays, licence plate.'},
 {name:'2025 Porsche 911 GT3 (992.2)',author:'Ddiaz Design; GM25',url:'https://sketchfab.com/3d-models/2025-porsche-911-gt3-992-2-1503f8d08f154ec7ab52f95a99c55134',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',ru:'Масштаб в метрах, оси дверей и колёс, стёкла, PBR-материалы, свет, живая приборная панель, номерной знак. Загрузчик указывает происхождение из CSR2. Только некоммерческое использование.',en:'Metric scale, door and wheel axes, windows, PBR materials, lights, live instrument cluster, licence plate. The uploader names CSR2 as the origin. Non-commercial use only.'},
 {name:'2026 Bugatti Tourbillon',author:'Ddiaz Design; CSR2; ZD 3D Modelling and Design',url:'https://sketchfab.com/3d-models/2026-bugatti-tourbillon-4f63f5a74611477989cefd9861b9784a',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',ru:'Масштаб, отдельные колёса и двери с петлями, восстановленная обшивка дверей, два цвета кузова, стрелки приборов на руле, номерной знак. Только некоммерческое использование.',en:'Scale, separate wheels and hinged doors, repaired door skins, two-tone body, live needles on the steering wheel hub, licence plate. Non-commercial use only.'},
 {name:'McLaren 750S',author:'geyges',url:'https://sketchfab.com/3d-models/mclaren-750s-d9c90e0bb53c450f88544559640143e0',license:'Sketchfab Free Standard',licenseUrl:'https://sketchfab.com/licenses',ru:'Поворот к осям сайта, отдельные колёса и двери-крылья (диэдральные) из разрозненных деталей, объединение одинаковых материалов, стёкла, свет фар и фонарей, цвет обивки и суппортов.',en:'Turned to the site axes, separate wheels and dihedral doors assembled from scattered parts, duplicate materials folded, glass, head and tail lamps, upholstery and caliper colours.'},
 {name:'Mercedes-AMG GT 63 S 4-Door',author:'mohamedouartassi',url:'https://sketchfab.com/3d-models/mercedes-gt63-amg-fdca0306571b47adaf440f08a9b98231',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',ru:'Кузов. Масштаб в метрах и поворот к осям сайта, модификаторы применены (сглаживание на уровень легче), отдельные колёса, четыре двери на петлях (стальные петли и ограничители построены для проекта) с торцами и подоконниками, опускающиеся стёкла, раздельный свет фар и фонарей. Цвета шин и поворотников исправлены, надписи номера автора убраны — на сайте свой номер. Салон модели был заготовкой — он заменён салоном Mercedes-AMG E 63 S (W213).',en:'Body. Metric scale and site axes, modifiers applied (subdivision one level lighter), separate wheels, four hinged doors (steel hinges and check straps built for the project) with closed edges and window ledges, retracting windows, separate head and tail lights. Tyre and indicator colours corrected; the plate lettering of the original removed in favour of the site plate. The model came with a placeholder cabin, replaced by the Mercedes-AMG E 63 S (W213) cabin.'},
 {name:'Mercedes-AMG E 63 S (W213) — '+t('салон для AMG GT 63','cabin of the AMG GT 63'),author:'Mona x Supercars (Car2022)',url:'https://sketchfab.com/3d-models/mercedes-amg-e-63-s-w213-f61d8efb0b9b4c499fc66fcf35a4d09c',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',ru:'Из модели взят только салон (торпеда с приборами и экранами, руль, консоль, сиденья, обшивка дверей, потолок): вписан под крышу и стёкла AMG GT 63, обшивка отдана дверям, рамки стёкол срезаны (у AMG безрамочные двери), материалы сделаны матовыми, кожа перекрашивается в конфигураторе.',en:'Only the cabin is used (dash with instruments and screens, wheel, console, seats, door cards, headliner): fitted under the AMG GT 63 roof and glass, door cards given to the doors, window frames cut off (the AMG doors are frameless), materials made matte, the leather takes the configurator colour.'},
 {name:'2023 Koenigsegg Jesko Attack',author:'Ddiaz Design',url:'https://sketchfab.com/3d-models/2023-koenigsegg-jesko-attack-18240b21b4d747c7b7e86a404c3a195a',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',ru:'Масштаб в метрах и поворот к осям сайта, колёса на своих осях, двери с диэдральным подъёмом на одной диагональной оси у основания передней стойки (родной рычаг петли сохранён в двери), фары и фонари разделены, матовый салон с сатиновым алюминием, все материалы двусторонние, подкладка под крышей. Для проекта нарисованы карбон 2048 px, экраны 4096 px (центральный с русским интерфейсом и живой щиток на руле) и надписи на боковинах шин; остальные текстуры увеличены в 4 раза; газовый упор двери построен в Blender.',en:'Metre scale and the site axes, wheels on their axles, dihedral doors on one diagonal hinge axis at the A-pillar root (the model\'s own hinge arm kept in the door), split head and tail lamps, a matte cabin with satin aluminium, every material two-sided, lining under the roof. Drawn for the project: a 2048 px carbon weave, 4096 px screens (the centre touchscreen in Russian and the live cluster on the wheel) and the tyres\' sidewall lettering; the other textures upscaled 4x; the door gas strut built in Blender.'},
 {name:'2026 Aston Martin Valhalla',author:'Ddiaz Design; S7471C (BeamNG.drive mod)',url:'https://sketchfab.com/3d-models/2026-aston-martin-valhalla-deeba86cc31e47de90237cafdf2be348',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/',ru:'Масштаб в метрах и поворот к осям сайта, отдельные колёса и двери-крылья вместе с половинами крыши: состав дверей, ось петли, закрытые торцы дверей и проёмы дверей (порог и стойки) взяты из модификации Aston Martin Valhalla для BeamNG.drive (автор S7471C). Газовые упоры дверей, стёкла, раздельный свет фар и фонарей. Только некоммерческое использование.',en:'Metric scale and site axes, separate wheels and dihedral doors with their halves of the roof: the door parts, hinge axis, closed door ends and door apertures (sill and jambs) follow the Aston Martin Valhalla mod for BeamNG.drive by S7471C. Door gas struts, glass, separate head and tail lights. Non-commercial use only.'},
]
const scenes:Entry[]=[
 {name:t('Тоннель','Tunnel'),author:'judefelix',url:'https://www.cgtrader.com/free-3d-models/exterior/cityscape/road-tunnel-1a320a5a-c9a7-407a-a7b6-74ddcfd05d85',license:'CGTrader Royalty Free (no AI)',ru:'Стыковка бесконечных секций, облицовка, торкрет-бетон свода, светильники, износ асфальта.',en:'Seamless repeating sections, wall cladding, sprayed-concrete vault, luminaires, asphalt wear.'},
 {name:t('Солончак','Salt flat'),author:'Velocity Atelier · cspykstra',url:'https://www.cgtrader.com/free-3d-models/textures/natural-textures/ground-salt-flat-smooth',license:'CGTrader Royalty Free (no AI)',ru:'Геометрия, озёра, холмики соли, дальние хребты и ограждение созданы для проекта в Blender и в шейдерах; корка — фотоскан соли (cspykstra).',en:'Geometry, brine lakes, salt mounds, distant ranges and the barrier were made for the project in Blender and shaders; the crust is a photographic salt scan (cspykstra).'},
 {name:t('Горная долина','Mountain valley'),author:'Kubocarte',url:'https://sketchfab.com/3d-models/snowy-terrain-eef014b3a7dd4056a2481234e5b64f74',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',ru:'Рельеф адаптирован в Blender: каменные склоны, прямая дорога, море справа, валуны и кусты вдоль обочины.',en:'Terrain adapted in Blender: rock slopes, a straight road, the sea on the right, boulders and shrubs along the verge.'},
 {name:t('Зимний перевал','Winter pass'),author:'ridwansyah940',url:'https://www.cgtrader.com/free-3d-models/exterior/landscape/snowy-mountain-with-slopes-and-forests-free-to-download',license:'CGTrader Royalty Free (no AI)',ru:'Рельеф и текстура адаптированы в Blender: прямой горный проход, снег на обочинах, ночь с луной и дневной вариант.',en:'Terrain and texture adapted in Blender: a straight mountain pass, snow on the verges, a moonlit night and a daytime variant.'}
]
const textures=[['Asphalt 01','Charlotte Baglioni, Dario Barresi','asphalt_01'],['Rock Face 03','Dario Barresi, Rico Cilliers','rock_face_03'],['Snow 02','Rob Tuytel','snow_02'],['Sand 01','Rob Tuytel','sand_01'],['Shrub 01','Poly Haven','shrub_01'],['Kloofendal 43d Clear Pure Sky','Greg Zaal','kloofendal_43d_clear_puresky'],['Brown Leather','Rob Tuytel','brown_leather']]
const software=[['three.js','MIT','https://threejs.org/'],['Nuxt / Vue','MIT','https://nuxt.com/'],['GSAP','GreenSock Standard License','https://gsap.com/'],['Draco','Apache 2.0','https://google.github.io/draco/'],['Blender',t('GPL · результаты принадлежат авторам','GPL · results belong to their authors'),'https://www.blender.org/'],['Manrope, Barlow Condensed','SIL Open Font License','https://fonts.google.com/']]
const own=[t('Студийные фото гаража (рендер Blender Cycles) и ролики гаража','Garage studio photos (Blender Cycles renders) and garage films'),t('Петли и механизмы дверей Ferrari, Porsche и Bugatti, кронштейн Revuelto','Door hinges and mechanisms for the Ferrari, Porsche and Bugatti, the Revuelto bracket'),t('Номерные знаки и ливреи (полосы)','Licence plates and liveries (stripes)'),t('Небо, луна, дождь, снег, время суток, вода и износ дорог','Sky, moon, rain, snow, time of day, water and road wear'),t('Музыка Atelier Ambient и Soft Horizon','The music Atelier Ambient and Soft Horizon'),t('Интерфейс, иконки, анимации и код сайта','The interface, icons, animations and the site code')]
const credited=musicThemes.filter(theme=>theme.artist==='Scott Buckley')
</script>

<template><div class="legal-page"><AtelierHeader/>
<main>
 <small class="eyebrow-line"><i />VELOCITY 3 / {{t('АВТОРЫ И ЛИЦЕНЗИИ','CREDITS & LICENCES')}}</small>
 <h1>{{t('Лицензии и авторы','Credits & licences')}}</h1>
 <p class="lead">{{t('Velocity Atelier — независимый некоммерческий художественный проект. Он не связан с Ferrari, Lamborghini, Porsche, Bugatti, McLaren или Aston Martin; их названия и эмблемы принадлежат владельцам. Ниже — всё, из чего собран сайт, авторы и условия использования.','Velocity Atelier is an independent, non-commercial art project. It is not affiliated with Ferrari, Lamborghini, Porsche, Bugatti, McLaren or Aston Martin; their names and emblems belong to their owners. Below is everything the site is built from, its authors and terms.')}}</p>
 <nav class="toc"><a href="#models">{{t('Автомобили','Cars')}}</a><a href="#scenes">{{t('Карты','Maps')}}</a><a href="#textures">{{t('Материалы','Materials')}}</a><a href="#sound">{{t('Музыка и звук','Music & sound')}}</a><a href="#software">{{t('Программы и шрифты','Software & fonts')}}</a><a href="#own">{{t('Сделано для проекта','Made for the project')}}</a></nav>

 <section id="models"><h2>{{t('Автомобили','Cars')}}</h2>
  <article v-for="m in models" :key="m.name"><header><h3>{{m.name}}</h3><a class="badge" :href="m.licenseUrl" target="_blank" rel="noopener">{{m.license}}</a></header><p class="by">{{t('Автор','By')}} <a :href="m.url" target="_blank" rel="noopener">{{m.author}}</a></p><p>{{t(m.ru,m.en)}}</p></article>
 </section>

 <section id="scenes"><h2>{{t('Карты поездки','Driving maps')}}</h2>
  <article v-for="s in scenes" :key="s.name"><header><h3>{{s.name}}</h3><a class="badge" :href="s.licenseUrl??s.url" target="_blank" rel="noopener">{{s.license}}</a></header><p class="by">{{t('Источник','Source')}}: <a :href="s.url" target="_blank" rel="noopener">{{s.author}}</a></p><p>{{t(s.ru,s.en)}}</p></article>
 </section>

 <section id="textures"><h2>{{t('Материалы и небо','Materials & sky')}}</h2>
  <p>{{t('Сканы материалов и панорама неба — Poly Haven, лицензия CC0 (общественное достояние). Нормали воды — примеры three.js, MIT.','Material scans and the sky panorama are from Poly Haven under CC0 (public domain). The water normals come from the three.js examples, MIT.')}}</p>
  <ul class="grid"><li v-for="a in textures" :key="a[2]"><a :href="'https://polyhaven.com/a/'+a[2]" target="_blank" rel="noopener">{{a[0]}}</a><span>{{a[1]}}</span></li></ul>
 </section>

 <section id="sound"><h2>{{t('Музыка и звук','Music & sound')}}</h2>
  <ul class="grid"><li v-for="theme in credited" :key="theme.id"><a :href="theme.source" target="_blank" rel="noopener">{{theme.name}}</a><span>Scott Buckley · CC BY 4.0</span></li></ul>
  <p>{{t('Звуки моторов и дверей — записи владельца проекта; для Porsche также Pole Position Production / Sonniss (997 GT3 RS). Мотор McLaren 750S — звуки выхлопа McLaren 720S (тот же V8) из звукового мода Legacy DMC. Мотор Aston Martin Valhalla — петли двигателя и выхлопа (M840T) из мода Aston Martin Valhalla для BeamNG.drive (S7471C); запуск и остановка — как у McLaren. Мотор Koenigsegg Jesko — петли разгона и сброса газа, холостой ход, запуск и глушение из звукового мода Koenigsegg Regera от Legacy DMC (тот же V8). Визг шин — Dorian Clair / BigSoundBank, CC0.','Engine and door sounds are the project owner\'s recordings; for the Porsche also Pole Position Production / Sonniss (997 GT3 RS). The McLaren 750S engine uses the McLaren 720S exhaust sounds (the same V8) from the Legacy DMC sound mod. The Aston Martin Valhalla engine uses the engine and exhaust loops (M840T) of the Aston Martin Valhalla mod for BeamNG.drive by S7471C; start and stop as on the McLaren. The Koenigsegg Jesko engine uses load and overrun loops, the idle, start and stop of the Koenigsegg Regera sound mod by Legacy DMC (the same V8). Tyre squeal — Dorian Clair / BigSoundBank, CC0.')}} <a href="/audio/CREDITS.html" target="_blank" rel="noopener">{{t('Подробные источники звуков','Detailed audio sources')}}</a></p>
 </section>

 <section id="software"><h2>{{t('Программы и шрифты','Software & fonts')}}</h2>
  <ul class="grid"><li v-for="s in software" :key="s[0]"><a :href="s[2]" target="_blank" rel="noopener">{{s[0]}}</a><span>{{s[1]}}</span></li></ul>
 </section>

 <section id="own"><h2>{{t('Сделано для проекта','Made for the project')}}</h2>
  <ul class="own"><li v-for="item in own" :key="item">{{item}}</li></ul>
  <p>{{t('Оригинальное оформление, анимации и код принадлежат авторам Velocity Atelier. Сторонние материалы сохраняют свои лицензии.','Original design, animation and code belong to the authors of Velocity Atelier. Third-party material keeps its own licence.')}}</p>
 </section>

 <section class="records"><h2>{{t('Полные записи об источниках','Full source records')}}</h2><div class="credit-links"><a href="/models/CREDITS.md" target="_blank">{{t('3D-модели','3D models')}}</a><a href="/textures/CREDITS.md" target="_blank">{{t('Текстуры','Textures')}}</a><a href="/audio/CREDITS.md" target="_blank">{{t('Звук','Audio')}}</a></div></section>
 <NuxtLink class="back" to="/">← {{t('Вернуться в шоурум','Back to the showroom')}}</NuxtLink>
</main></div></template>

<style scoped>
.legal-page{min-height:100vh;background:radial-gradient(ellipse 80% 40% at 50% 0%,#18231a 0%,#0b0f0c 60%);color:#dce2dc}
.legal-page main{max-width:980px;margin:auto;padding:150px 30px 80px}
.eyebrow-line{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:3px;color:#a9b2a4}
.eyebrow-line i{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent)}
.legal-page h1{font-family:Barlow Condensed,Impact,sans-serif;font-weight:500;font-size:clamp(44px,6vw,78px);letter-spacing:1px;margin:14px 0 18px}
.lead{max-width:720px;font-size:14px;line-height:1.8;color:#aebbb1}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:26px 0 10px}
.toc a{padding:8px 14px;border:1px solid #ffffff22;border-radius:20px;font-size:11px;color:#d8dfd2;text-decoration:none;transition:border-color .2s,color .2s}
.toc a:hover{border-color:var(--accent);color:var(--accent)}
.legal-page section{padding:34px 0 10px;border-top:1px solid #ffffff14;margin-top:26px;scroll-margin-top:110px}
.legal-page h2{font-size:26px;font-weight:600;letter-spacing:-.5px;margin:0 0 18px}
.legal-page article{padding:16px 18px;margin-bottom:10px;border:1px solid #ffffff12;border-radius:12px;background:#ffffff04}
.legal-page article header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.legal-page h3{margin:0;font-size:16px;font-weight:600}
.badge{padding:4px 10px;border:1px solid #d9ec8a66;border-radius:12px;font-size:10px;letter-spacing:.5px;color:var(--accent)!important;text-decoration:none!important;white-space:nowrap}
.by{margin:8px 0 4px;font-size:12px}
.legal-page p,.legal-page li{line-height:1.7;color:#aebbb1;font-size:13px}
.legal-page article p:last-child{margin:4px 0 0}
.legal-page a{color:#c9db97;text-decoration:underline;text-underline-offset:3px}
.grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.grid li{display:flex;flex-direction:column;gap:2px;padding:10px 14px;border:1px solid #ffffff12;border-radius:10px;background:#ffffff03}
.grid li span{font-size:11px;color:#8f998b}
.own{margin:0 0 12px;padding-left:18px}
.credit-links{display:flex;gap:10px;flex-wrap:wrap}
.credit-links a{padding:9px 16px;border:1px solid #ffffff22;border-radius:20px;text-decoration:none;font-size:12px}
.back{display:inline-block;margin-top:34px}
@media(max-width:600px){.legal-page main{padding:120px 16px 60px}}
</style>
