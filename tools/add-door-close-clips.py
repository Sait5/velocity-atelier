"""Append explicit Close clips by reversing baked glTF output samples."""
import struct,json,copy,os,glob

def add_close(path):
 data=open(path,'rb').read();size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);binary=bytearray(data[28+size:])
 if any(a['name'].endswith('_Close') for a in doc.get('animations',[])):return
 for original in list(doc.get('animations',[])):
  if not original['name'].endswith('_Open'):continue
  clip=copy.deepcopy(original);clip['name']=clip['name'].replace('_Open','_Close')
  for sampler in clip['samplers']:
   assert sampler.get('interpolation','LINEAR')=='LINEAR'
   source=doc['accessors'][sampler['output']];view=doc['bufferViews'][source['bufferView']]
   width={'SCALAR':1,'VEC3':3,'VEC4':4}[source['type']]*4
   assert source['componentType']==5126
   start=view.get('byteOffset',0)+source.get('byteOffset',0);stride=view.get('byteStride',width)
   result=b''.join(binary[start+i*stride:start+i*stride+width] for i in reversed(range(source['count'])))
   while len(binary)%4:binary.append(0)
   new_view={'buffer':0,'byteOffset':len(binary),'byteLength':len(result)};binary+=result
   output=copy.deepcopy(source);output['bufferView']=len(doc['bufferViews']);output.pop('byteOffset',None);output.pop('min',None);output.pop('max',None)
   doc['bufferViews'].append(new_view);sampler['output']=len(doc['accessors']);doc['accessors'].append(output)
  doc['animations'].append(clip)
 doc['buffers'][0]['byteLength']=len(binary)
 payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4);binary+=b'\0'*((-len(binary))%4)
 out=struct.pack('<III',0x46546c67,2,28+len(payload)+len(binary))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(binary),0x004e4942)+binary
 open(path,'wb').write(out)

if __name__=='__main__':
 for path in glob.glob('public/models/door-mechanisms/*.glb'):add_close(path)
