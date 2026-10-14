from pathlib import Path
import bpy,math
p=Path('tools/build-saltflat-blender.py');s=p.read_text().replace('NISHITA','MULTIPLE_SCATTERING');p.write_text(s)
extras=s[s.index('# Match the editable'):s.index('# Editable natural lighting')]
script=Path('tools/saltflat-daylight-finish.py').read_text();tail=script[script.index('bpy.ops.wm.open_mainfile'):].replace('NISHITA','MULTIPLE_SCATTERING');exec(tail)
