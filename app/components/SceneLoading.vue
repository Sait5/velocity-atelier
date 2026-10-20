<script setup lang="ts">
const props=defineProps<{active:boolean,progress:number,title:string,vehicle:string,error?:string,status?:string}>()
const emit=defineEmits<{retry:[],complete:[],revealed:[]}>();const {t}=useLocale();const shown=ref(1)
let timer:ReturnType<typeof setInterval>|undefined,completed=false
function restart(){shown.value=1;completed=false}
watch(()=>props.progress,value=>{if(value===0)restart()})
watch(()=>props.active,value=>{if(value)restart()})
onMounted(()=>{timer=setInterval(()=>{
 if(props.error||!props.active)return
 const target=Math.max(1,Math.min(100,Math.floor(props.progress)))
 if(shown.value<target)shown.value++
 if(shown.value===100&&!completed){completed=true;emit('complete')}
},18)})
onBeforeUnmount(()=>clearInterval(timer))
</script>
<template>
 <Transition name="scene-reveal" @after-leave="emit('revealed')">
  <div v-if="active||error" class="scene-loader" role="status" aria-live="polite">
   <div class="scene-load-orbit" aria-hidden="true"><i/><i/><i/></div>
   <small>VELOCITY / {{t('ATELIER','ATELIER')}}</small>
   <h2>{{title}}</h2><p>{{vehicle}}</p>
   <template v-if="!error">
    <div class="scene-load-track" role="progressbar" :aria-label="t('Подготовка сцены','Preparing scene')" :aria-valuenow="Math.round(shown)" aria-valuemin="0" aria-valuemax="100"><i :style="{width:shown+'%'}"/></div>
    <div class="scene-load-status"><span>{{status??(progress<65?t('Подготовка автомобиля и окружения','Preparing vehicle and environment'):progress<90?t('Загрузка деталей и текстур','Loading details and textures'):t('Настройка света и отражений','Preparing light and reflections'))}}</span><b>{{Math.round(shown)}}<small>%</small></b></div>
   </template>
   <template v-else><p>{{error}}</p><button class="outline" @click="emit('retry')">{{t('ПОВТОРИТЬ','RETRY')}}</button></template>
  </div>
 </Transition>
</template>
<style scoped>
.scene-loader{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 38%,#202922,#060a08 64%);text-align:center;overflow:hidden}
.scene-loader>small{color:#c7d0bd;letter-spacing:4px;margin-top:30px}
.scene-loader h2{font-size:clamp(32px,5vw,60px);letter-spacing:-1px;margin:18px 0 12px}
.scene-loader p{font-size:12px;color:#9aa693;margin:0 0 32px}
.scene-load-orbit{position:relative;width:110px;height:110px;border:1px solid #d9ec8a18;border-radius:50%}
.scene-load-orbit i{position:absolute;inset:9px;border:1px solid #d9ec8a22;border-top-color:#d9ec8a;border-radius:50%;animation:load-orbit 3s linear infinite}
.scene-load-orbit i:nth-child(2){inset:25px;animation-direction:reverse;animation-duration:4s}
.scene-load-orbit i:nth-child(3){inset:44px;border:0;background:#d9ec8a;box-shadow:0 0 28px #d9ec8a55;animation:none}
.scene-load-track{height:2px;width:min(360px,76vw);background:#d9ec8a20;overflow:hidden}
.scene-load-track i{display:block;height:100%;background:#d9ec8a;transition:width 18ms linear}
.scene-load-status{display:flex;align-items:center;justify-content:space-between;width:min(360px,76vw);margin-top:16px;font-size:10px;color:#9aa693;gap:15px;text-align:left}
.scene-load-status b{font-size:24px;font-weight:400;color:#e9efdf}.scene-load-status b small{margin-left:3px}
.scene-reveal-leave-active{transition:opacity .7s ease}.scene-reveal-leave-to{opacity:0;pointer-events:none}

@keyframes load-orbit{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.scene-load-orbit i{animation:none}.scene-reveal-leave-active,.scene-load-track i{transition:none}}

.scene-loader{z-index:100}.scene-loader>p{max-width:80vw}.scene-reveal-leave-active{transition:opacity .9s ease,filter .9s ease}.scene-reveal-leave-to{opacity:0;filter:blur(8px);pointer-events:none}
</style>
