from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt
x,rate=sf.read('tools/generated/bugatti-veyron-source.ogg');x=x.mean(axis=1)
x=sosfilt(butter(3,[65,4200],btype='bandpass',fs=rate,output='sos'),x)
out=Path('public/audio/bugatti');out.mkdir(exist_ok=True)
for name,start,end in [('idle',.2,1.5),('load',2.7,4.1),('coast',5.3,6.6)]:
 a=x[int(start*rate):int(end*rate)].copy();n=int(rate*.15);w=np.linspace(0,1,n)
 blend=a[-n:]*(1-w)+a[:n]*w;a=np.concatenate([a[n:-n],blend]);a-=a.mean()
 a*=min(3,.16/max(float(np.sqrt(np.mean(a*a))),.001))
 sf.write(str(out/(name+'.wav')),np.clip(a,-.95,.95),rate,subtype='PCM_16')
 print(name,len(a)/rate,float(np.max(np.abs(a))))
