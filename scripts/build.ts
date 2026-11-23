import { build } from 'esbuild';
import { readdirSync,readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { join,extname } from 'node:path';
const map:Record<string,{body:string,type:string}>={};
function visit(dir:string) {for(const item of readdirSync(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())visit(p);else map['/'+p.slice('dist/client/'.length)]={body:readFileSync(p).toString('base64'),type:({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'} as Record<string,string>)[extname(p)]||'application/octet-stream'};}}
visit('dist/client'); writeFileSync('dist/asset-map.json',JSON.stringify(map));
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
await build({entryPoints:['server/worker.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'node',target:'es2022',external:['cloudflare:*','node:*','better-sqlite3'],minify:true});
const manifest=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
writeFileSync('dist/.openai/hosting.json',JSON.stringify({...manifest,compatibility_date:'2026-11-01',compatibility_flags:['nodejs_compat']}));
