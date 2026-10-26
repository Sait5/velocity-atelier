/**
 * Decode an engine loop without a seam. decodeAudioData converts a file to the context's rate (48 kHz) and treats what
 * lies past either end as silence, so the first and last milliseconds of a 30, 32 or 44.1 kHz loop came out bent and
 * every wrap of the loop clicked: up to 50 times the usual sample-to-sample change in the Jesko and AMG loops and the
 * 458's coast loop, several times a second. Such a file is decoded at its own rate instead; an AudioBuffer of any rate
 * plays in any context, and the source node converts the rate as it plays, reading straight across the wrap.
 */
const decoders=new Map<number,BaseAudioContext>()
/** sample rate from a FLAC file's STREAMINFO block (0 for anything else) */
function flacRate(bytes:ArrayBuffer){
 const u=new Uint8Array(bytes,0,Math.min(64,bytes.byteLength))
 for(let i=0;i+30<u.length;i++)if(u[i]===0x66&&u[i+1]===0x4c&&u[i+2]===0x61&&u[i+3]===0x43)return (u[i+18]!<<12|u[i+19]!<<4|u[i+20]!>>4)
 return 0
}
export function decodeEngineAudio(context:BaseAudioContext,bytes:ArrayBuffer){
 const rate=flacRate(bytes)
 if(!rate||rate===context.sampleRate||typeof OfflineAudioContext==='undefined')return context.decodeAudioData(bytes)
 let decoder=decoders.get(rate);if(!decoder){decoder=new OfflineAudioContext(1,1,rate);decoders.set(rate,decoder)}
 return decoder.decodeAudioData(bytes)
}
