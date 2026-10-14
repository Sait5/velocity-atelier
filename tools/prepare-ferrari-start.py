from pathlib import Path
import hashlib,json
import soundfile as sf
import numpy as np
root=Path(__file__).resolve().parents[1]
source=root/'tools/source-audio/ferrari-start-oscar-patrick.mp3'
x,sr=sf.read(source,always_2d=True);clip=x[int(.9*sr):int(3.7*sr)].copy()
clip[:int(.005*sr)]*=np.linspace(0,1,int(.005*sr))[:,None]
clip[-int(.12*sr):]*=np.linspace(1,0,int(.12*sr))[:,None]
gain=min(1.2,.85/np.max(np.abs(clip)))
sf.write(root/'public/audio/ferrari-start.wav',clip*gain,sr,subtype='PCM_24')
manifest={'source':'https://freesound.org/people/Oscar_Patrick/sounds/812434/',
 'author':'Oscar_Patrick','title':'Ferrari Engine On Front',
 'license':'CC BY 4.0','license_url':'https://creativecommons.org/licenses/by/4.0/',
 'download':'https://cdn.freesound.org/previews/812/812434_5918919-hq.mp3',
 'model':'Ferrari, exact model unspecified by author','source_seconds':[.9,3.7],
 'gain':gain,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
(root/'tools/ferrari-start-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
