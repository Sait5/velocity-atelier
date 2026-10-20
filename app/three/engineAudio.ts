import {createTourbillonEngineAudio} from './tourbillonEngineAudio'
import {createSyntheticEngineAudio} from './syntheticEngineAudio'
import {createRevueltoEngineAudio} from './revueltoEngineAudio'
import {createFerrariEngineAudio} from './ferrariEngineAudio'
import {createPorscheEngineAudio} from './porscheEngineAudio'
import {createMcLarenEngineAudio} from './mclarenEngineAudio'
import {createValhallaEngineAudio} from './valhallaEngineAudio'
import {createJeskoEngineAudio} from './jeskoEngineAudio'
import {createAmgEngineAudio} from './amgEngineAudio'
export function createEngineAudio(recorded458:boolean|'revuelto'|'gt3'|'tourbillon'|'750s'|'valhalla'|'jesko'|'amg'=true){
 if(recorded458==='amg')return createAmgEngineAudio()
 if(recorded458==='jesko')return createJeskoEngineAudio()
 if(recorded458==='valhalla')return createValhallaEngineAudio()
 if(recorded458==='750s')return createMcLarenEngineAudio()
 if(recorded458==='tourbillon')return createTourbillonEngineAudio()
 if(recorded458==='gt3')return createPorscheEngineAudio()
 if(recorded458==='revuelto')return createRevueltoEngineAudio()
 return recorded458?createFerrariEngineAudio():createSyntheticEngineAudio()
}

