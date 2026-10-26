<script setup lang="ts">
import {musicThemes} from '~/data/music'
// Credits: what the site is built from, who made it and under which terms, and what was made for the project itself.
const {t}=useLocale()
// every card says in the same tone what the project started from, never a list of the changes (the full records stay linked below)
type Note={ru:string,en:string}
type Entry={name:string,author:string,url:string,license:string,licenseUrl?:string,note?:Note}
const say=(note:Note)=>t(note.ru,note.en)
const modelNote:Note={ru:'За основу взят каркас модели, остальное сделано и доработано для проекта.',en:'The model\'s base mesh was the starting point; the rest was made and refined for the project.'}
const terrainNote:Note={ru:'За основу взят каркас рельефа, остальное сделано и доработано для проекта.',en:'The base terrain mesh was the starting point; the rest was made and refined for the project.'}
// computed, so the lists follow a language switch made after the page has loaded
const models=computed<Entry[]>(()=>[
 {name:'2011 Ferrari 458 Italia',author:'Ddiaz Design',url:'https://sketchfab.com/3d-models/2011-ferrari-458-italia-bb6c7fa565c04ec59cd9d0e0a4d0098c',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'},
 {name:'Lamborghini Revuelto',author:'Anatolian Studios',url:'https://sketchfab.com/3d-models/lamborghini-revuelto-099b60042519463ead19ce054d479724',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'},
 {name:'2025 Porsche 911 GT3 (992.2)',author:'Ddiaz Design; GM25',url:'https://sketchfab.com/3d-models/2025-porsche-911-gt3-992-2-1503f8d08f154ec7ab52f95a99c55134',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/'},
 {name:'2026 Bugatti Tourbillon',author:'Ddiaz Design; CSR2; ZD 3D Modelling and Design',url:'https://sketchfab.com/3d-models/2026-bugatti-tourbillon-4f63f5a74611477989cefd9861b9784a',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/'},
 {name:'McLaren 750S',author:'geyges',url:'https://sketchfab.com/3d-models/mclaren-750s-d9c90e0bb53c450f88544559640143e0',license:'Sketchfab Free Standard',licenseUrl:'https://sketchfab.com/licenses'},
 {name:'Mercedes-AMG GT 63 S 4-Door',author:'mohamedouartassi',url:'https://sketchfab.com/3d-models/mercedes-gt63-amg-fdca0306571b47adaf440f08a9b98231',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',note:{ru:'За основу взят каркас кузова, остальное сделано и доработано для проекта. Салон — на основе Mercedes-AMG E 63 S (W213).',en:'The body\'s base mesh was the starting point; the rest was made and refined for the project. The cabin is based on the Mercedes-AMG E 63 S (W213).'}},
 {name:'Mercedes-AMG E 63 S (W213) — '+t('салон для AMG GT 63','cabin of the AMG GT 63'),author:'Mona x Supercars (Car2022)',url:'https://sketchfab.com/3d-models/mercedes-amg-e-63-s-w213-f61d8efb0b9b4c499fc66fcf35a4d09c',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',note:{ru:'За основу взят каркас салона, остальное сделано и доработано для проекта.',en:'The cabin\'s base mesh was the starting point; the rest was made and refined for the project.'}},
 {name:'2023 Koenigsegg Jesko Attack',author:'Ddiaz Design',url:'https://sketchfab.com/3d-models/2023-koenigsegg-jesko-attack-18240b21b4d747c7b7e86a404c3a195a',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/'},
 {name:'2026 Aston Martin Valhalla',author:'Ddiaz Design; S7471C ('+t('мод для BeamNG.drive','BeamNG.drive mod')+')',url:'https://sketchfab.com/3d-models/2026-aston-martin-valhalla-deeba86cc31e47de90237cafdf2be348',license:'CC BY-NC-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-nc-sa/4.0/'},
])
const scenes=computed<Entry[]>(()=>[
 {name:t('Тоннель','Tunnel'),author:'judefelix',url:'https://www.cgtrader.com/free-3d-models/exterior/cityscape/road-tunnel-1a320a5a-c9a7-407a-a7b6-74ddcfd05d85',license:'CGTrader Royalty Free (no AI)',note:{ru:'За основу взят каркас тоннеля, остальное сделано и доработано для проекта.',en:'The tunnel\'s base mesh was the starting point; the rest was made and refined for the project.'}},
 {name:t('Солончак','Salt flat'),author:'Velocity Atelier · cspykstra',url:'https://www.cgtrader.com/free-3d-models/textures/natural-textures/ground-salt-flat-smooth',license:'CGTrader Royalty Free (no AI)',note:{ru:'За основу взят фотоскан соляной корки, остальное сделано для проекта.',en:'A photo scan of the salt crust was the starting point; the rest was made for the project.'}},
 {name:t('Горная долина','Mountain valley'),author:'Kubocarte',url:'https://sketchfab.com/3d-models/snowy-terrain-eef014b3a7dd4056a2481234e5b64f74',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'},
 {name:t('Зимний перевал','Winter pass'),author:'ridwansyah940',url:'https://www.cgtrader.com/free-3d-models/exterior/landscape/snowy-mountain-with-slopes-and-forests-free-to-download',license:'CGTrader Royalty Free (no AI)'}
])
const textures=[['Asphalt 01','Charlotte Baglioni, Dario Barresi','asphalt_01'],['Rock Face 03','Dario Barresi, Rico Cilliers','rock_face_03'],['Snow 02','Rob Tuytel','snow_02'],['Sand 01','Rob Tuytel','sand_01'],['Shrub 01','Poly Haven','shrub_01'],['Kloofendal 43d Clear Pure Sky','Greg Zaal','kloofendal_43d_clear_puresky']]
const software=computed(()=>[['three.js','MIT','https://threejs.org/'],['Nuxt / Vue','MIT','https://nuxt.com/'],['GSAP','GreenSock Standard License','https://gsap.com/'],['Draco','Apache 2.0','https://google.github.io/draco/'],['Blender',t('GPL · результаты принадлежат авторам','GPL · results belong to their authors'),'https://www.blender.org/'],['Manrope, Barlow Condensed','SIL Open Font License','https://fonts.google.com/']])
const own=computed(()=>[t('Студийные фото гаража (рендер Blender Cycles) и ролики гаража','Garage studio photos (Blender Cycles renders) and garage films'),t('Петли, упоры и механизмы дверей всех машин','Door hinges, struts and mechanisms for every car'),t('Экраны и живые приборы в салонах','Cabin screens and live instruments'),t('Номерные знаки и ливреи (полосы)','Licence plates and liveries (stripes)'),t('Небо, луна, дождь, снег, время суток, вода и износ дорог','Sky, moon, rain, snow, time of day, water and road wear'),t('Музыка Atelier Ambient и Soft Horizon','The music Atelier Ambient and Soft Horizon'),t('Интерфейс, иконки, анимации и код сайта','The interface, icons, animations and the site code')])
const credited=musicThemes.filter(theme=>theme.artist==='Scott Buckley')
</script>

<template><div class="legal-page"><AtelierHeader/>
<main>
 <small class="eyebrow-line"><i />VELOCITY 3 / {{t('АВТОРЫ И ЛИЦЕНЗИИ','CREDITS & LICENCES')}}</small>
 <h1>{{t('Лицензии и авторы','Credits & licences')}}</h1>
 <p class="lead">{{t('Velocity Atelier — независимый некоммерческий художественный проект. Он не связан с Ferrari, Lamborghini, Porsche, Bugatti, McLaren, Mercedes-AMG, Koenigsegg или Aston Martin; их названия и эмблемы принадлежат владельцам. Ниже — чьи работы взяты за основу, их авторы и условия использования.','Velocity Atelier is an independent, non-commercial art project. It is not affiliated with Ferrari, Lamborghini, Porsche, Bugatti, McLaren, Mercedes-AMG, Koenigsegg or Aston Martin; their names and emblems belong to their owners. Below are the works the site builds on, their authors and terms.')}}</p>
 <nav class="toc"><a href="#models">{{t('Автомобили','Cars')}}</a><a href="#scenes">{{t('Карты','Maps')}}</a><a href="#textures">{{t('Материалы','Materials')}}</a><a href="#sound">{{t('Музыка и звук','Music & sound')}}</a><a href="#software">{{t('Программы и шрифты','Software & fonts')}}</a><a href="#own">{{t('Сделано для проекта','Made for the project')}}</a></nav>

 <section id="models"><h2>{{t('Автомобили','Cars')}}</h2>
  <article v-for="m in models" :key="m.name"><header><h3>{{m.name}}</h3><a class="badge" :href="m.licenseUrl" target="_blank" rel="noopener">{{m.license}}</a></header><p class="by">{{t('Автор','By')}} <a :href="m.url" target="_blank" rel="noopener">{{m.author}}</a></p><p>{{say(m.note??modelNote)}}</p></article>
 </section>

 <section id="scenes"><h2>{{t('Карты поездки','Driving maps')}}</h2>
  <article v-for="s in scenes" :key="s.name"><header><h3>{{s.name}}</h3><a class="badge" :href="s.licenseUrl??s.url" target="_blank" rel="noopener">{{s.license}}</a></header><p class="by">{{t('Источник','Source')}}: <a :href="s.url" target="_blank" rel="noopener">{{s.author}}</a></p><p>{{say(s.note??terrainNote)}}</p></article>
 </section>

 <section id="textures"><h2>{{t('Материалы и небо','Materials & sky')}}</h2>
  <p>{{t('За основу взяты сканы материалов и панорама неба Poly Haven (CC0, общественное достояние), остальное сделано и доработано для проекта. Бетон тоннеля — ambientCG (CC0), нормали воды — из примеров three.js (MIT).','Poly Haven material scans and the sky panorama (CC0, public domain) were the starting point; the rest was made and refined for the project. The tunnel concrete is from ambientCG (CC0), the water normals from the three.js examples (MIT).')}}</p>
  <ul class="grid"><li v-for="a in textures" :key="a[2]"><a :href="'https://polyhaven.com/a/'+a[2]" target="_blank" rel="noopener">{{a[0]}}</a><span>{{a[1]}}</span></li></ul>
 </section>

 <section id="sound"><h2>{{t('Музыка и звук','Music & sound')}}</h2>
  <ul class="grid"><li v-for="theme in credited" :key="theme.id"><a :href="theme.source" target="_blank" rel="noopener">{{theme.name}}</a><span>Scott Buckley · CC BY 4.0</span></li></ul>
  <p>{{t('За основу звуков моторов взяты записи и звуковые моды (Legacy DMC, M17x Engine Sound Pack, BeamNG.drive — S7471C, Pole Position Production / Sonniss), остальное сделано и доработано для проекта. Запуск мотора Ferrari — ','Recordings and sound mods (Legacy DMC, M17x Engine Sound Pack, BeamNG.drive — S7471C, Pole Position Production / Sonniss) were the starting point for the engine sounds; the rest was made and refined for the project. The Ferrari start-up — ')}}<a href="https://freesound.org/people/Oscar_Patrick/sounds/812434/" target="_blank" rel="noopener">Oscar_Patrick</a>{{t(' (Freesound, CC BY 4.0). Звуки дверей — записи владельца проекта. Визг шин — Dorian Clair / BigSoundBank, CC0.',' (Freesound, CC BY 4.0). Door sounds are the project owner\'s recordings. Tyre squeal — Dorian Clair / BigSoundBank, CC0.')}} <a href="/audio/CREDITS.html" target="_blank" rel="noopener">{{t('Подробные источники звуков','Detailed audio sources')}}</a></p>
 </section>

 <section id="software"><h2>{{t('Программы и шрифты','Software & fonts')}}</h2>
  <ul class="grid"><li v-for="s in software" :key="s[0]"><a :href="s[2]" target="_blank" rel="noopener">{{s[0]}}</a><span>{{s[1]}}</span></li></ul>
 </section>

 <section id="own"><h2>{{t('Сделано для проекта','Made for the project')}}</h2>
  <ul class="own"><li v-for="item in own" :key="item">{{item}}</li></ul>
  <p>{{t('Оригинальное оформление, анимации и код принадлежат авторам Velocity Atelier. Сторонние материалы сохраняют свои лицензии.','Original design, animation and code belong to the authors of Velocity Atelier. Third-party material keeps its own licence.')}}</p>
 </section>

 <section class="records"><h2>{{t('Полные записи об источниках','Full source records')}}</h2><div class="credit-links"><a href="/models/CREDITS.html" target="_blank" rel="noopener">{{t('3D-модели','3D models')}}</a><a href="/textures/CREDITS.html" target="_blank" rel="noopener">{{t('Текстуры','Textures')}}</a><a href="/audio/CREDITS.html" target="_blank" rel="noopener">{{t('Звук','Audio')}}</a></div></section>
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
