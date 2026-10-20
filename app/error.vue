<script setup lang="ts">
import type {NuxtError} from '#app'
// The site's own error page (404 and anything else) in the dark atelier palette with the green accent, instead of
// Nuxt's white default.
const props=defineProps<{error:NuxtError}>()
const {t}=useLocale()
const missing=computed(()=>props.error.statusCode===404)
const path=computed(()=>import.meta.client?location.pathname:'')
useHead({title:computed(()=>(missing.value?t('Страница не найдена','Page not found'):t('Ошибка','Error'))+' — Velocity 3')})
const leave=(to:string)=>clearError({redirect:to})
</script>

<template><div class="error-page"><AtelierHeader />
 <main>
  <small class="error-eyebrow"><i />VELOCITY 3 / {{error.statusCode}}</small>
  <strong class="error-code">{{missing?'404':error.statusCode}}</strong>
  <h1>{{missing?t('Такой страницы нет','This page does not exist'):t('Что-то пошло не так','Something went wrong')}}</h1>
  <p>{{missing?t('Адрес','The address')+' '+path+' '+t('никуда не ведёт. Машины ждут в шоуруме и в гараже.','leads nowhere. The cars are waiting in the showroom and the garage.'):t('Попробуйте вернуться в шоурум.','Try going back to the showroom.')}}</p>
  <div class="error-actions"><button class="accent-button" type="button" @click="leave('/')">{{t('В ШОУРУМ','TO THE SHOWROOM')}} <span>↗</span></button><button class="error-outline" type="button" @click="leave('/garage')">{{t('ГАРАЖ','GARAGE')}}</button></div>
 </main>
</div></template>

<style scoped>
.error-page{min-height:100vh;background:radial-gradient(ellipse 70% 55% at 50% 58%,#1d2a1a 0%,#0b0f0c 60%,#070908 100%);color:#f1f2ea;display:flex;flex-direction:column}
.error-page main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:140px 24px 80px}
.error-eyebrow{display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:3px;color:#a9b2a4}
.error-eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.error-code{font-family:Barlow Condensed,Impact,sans-serif;font-weight:500;font-size:clamp(130px,24vw,300px);line-height:.9;letter-spacing:6px;color:var(--accent);text-shadow:0 0 60px #d9ec8a40;margin:18px 0 8px}
.error-page h1{font-family:Manrope,Arial,sans-serif;font-weight:600;font-size:clamp(26px,3vw,38px);letter-spacing:-.5px;margin:0 0 14px}
.error-page p{max-width:440px;font-size:13px;line-height:1.8;color:#a4ad9f;margin:0 0 34px;word-break:break-word}
.error-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.error-actions .accent-button{gap:28px}
.error-outline{border:1px solid #ffffff38;padding:20px 26px;font-family:Barlow Condensed,Arial,sans-serif;font-size:11px;letter-spacing:1.8px;transition:border-color .2s,color .2s}
.error-outline:hover,.error-outline:focus-visible{border-color:var(--accent);color:var(--accent)}
</style>
