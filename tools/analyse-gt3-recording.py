from pathlib import Path
import wave,numpy as np,json
ROOT=Path(__file__).resolve().parents[1]
with wave.open(str(ROOT/'tools/source-audio/porsche/gt3-onboard.wav'),'rb') as f:
 sr=f.getframerate();raw=np.frombuffer(f.readframes(f.getnframes()),dtype=np.uint8).reshape(-1,3)
 vals=raw[:,0].astype(np.int32)|(raw[:,1].astype(np.int32)<<8)|(raw[:,2].astype(np.int32)<<16)
 vals=(vals^0x800000)-0x800000;x=vals.reshape(-1,2).astype(np.float32)/8388608
x=(x[::2]+x[1::2])*.5;sr//=2
rows=[]
for t in np.arange(6,198,1):
 a=x[int(t*sr):int((t+.5)*sr)].mean(axis=1)[::4];rate=sr/4
 power=abs(np.fft.rfft(a*np.hanning(len(a))));freq=np.fft.rfftfreq(len(a),1/rate)
 candidates=np.arange(45,430,2);scores=[]
 for base in candidates:
  scores.append(sum(np.interp(base*k,freq,power)/k for k in [1,2,3,4]))
 hz=float(candidates[np.argmax(scores)])
 rows.append({'t':float(t),'hz':hz,'rms':float(np.sqrt(np.mean(a*a)))})
(ROOT/'tools/generated/gt3-frequency.json').write_text(json.dumps(rows))
for r in rows[::2]:print(r)
