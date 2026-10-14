import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
const data=ts.transpile(fs.readFileSync('app/data/music.ts','utf8').replace(/export /g,''))
const component=fs.readFileSync('app/components/AmbientAudio.client.vue','utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/mg,'')
const state={musicTheme:{value:'auto'},car:{value:{id:'revuelto'}},music:{value:true},musicAutoAdvance:{value:true},volume:{value:.2}}
const sandbox={useAtelier:()=>state,useRoute:()=>({path:'/'}),ref:()=>({value:undefined}),computed:fn=>({get value(){return fn()}}),watch:()=>{},onMounted:()=>{},onBeforeUnmount:()=>{}}
vm.createContext(sandbox)
vm.runInContext(data+'\n'+ts.transpile(component)+'\nthis.advance=ended;',sandbox)
// Ended on an inactive fading-out channel cannot skip the current track.
sandbox.advance(1);assert.equal(state.musicTheme.value,'auto')
// Auto-by-vehicle starts on Neon; its completion must advance to Soft Horizon.
sandbox.advance(0);assert.equal(state.musicTheme.value,'horizon')
state.musicTheme.value='titan';sandbox.advance(0);assert.equal(state.musicTheme.value,'atelier')
state.musicAutoAdvance.value=false;sandbox.advance(0);assert.equal(state.musicTheme.value,'atelier')
state.musicAutoAdvance.value=true;state.music.value=false;sandbox.advance(0);assert.equal(state.musicTheme.value,'atelier')
console.log('PASS: active channel only, vehicle selection, playlist wrap, repeat mode, disabled music')
