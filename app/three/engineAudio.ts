import {createTourbillonEngineAudio} from './tourbillonEngineAudio'
import {createSyntheticEngineAudio} from './syntheticEngineAudio'
import {createRevueltoEngineAudio} from './revueltoEngineAudio'
import {createFerrariEngineAudio} from './ferrariEngineAudio'
import {createPorscheEngineAudio} from './porscheEngineAudio'
export function createEngineAudio(recorded458:boolean|'revuelto'|'gt3'|'tourbillon'=true){
 if(recorded458==='tourbillon')return createTourbillonEngineAudio()
 if(recorded458==='gt3')return createPorscheEngineAudio()
 if(recorded458==='revuelto')return createRevueltoEngineAudio()
 return recorded458?createFerrariEngineAudio():createSyntheticEngineAudio()
}

