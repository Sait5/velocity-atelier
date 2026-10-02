const fs=require('fs'),ts=require('typescript'),path=require('path');
const out='tools/generated';fs.mkdirSync(out,{recursive:true});
const visited=new Set();
function emit(file){
 const target=path.basename(file).replace(/\.ts$/,'.mjs');if(visited.has(file))return;visited.add(file);
 let code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 code=code.replace(/from ['"](\.[^'"]+)['"]/g,(all,p)=>{const dep=path.resolve(path.dirname(file),p+'.ts');emit(dep);return 'from '+JSON.stringify('./'+path.basename(dep).replace(/\.ts$/,'.mjs'))});
 fs.writeFileSync(out+'/'+target,code);
}
emit(path.resolve('tools/export-interior.ts'));
