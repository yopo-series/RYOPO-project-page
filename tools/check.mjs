import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const html=await readFile(path.join(root,'index.html'),'utf8');
const css=await readFile(path.join(root,'styles.css'),'utf8');
const js=await readFile(path.join(root,'app.js'),'utf8');
let failures=[];
for(const match of html.matchAll(/(?:href|src|poster|data-src|data-zoom)="([^"#][^"]*)"/g)) {
  const ref=match[1]; if(/^(https?:|mailto:)/.test(ref)) continue;
  try {await stat(path.join(root,ref));} catch {failures.push(`Missing local asset: ${ref}`);}
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const id of new Set(ids)) if(ids.filter(x=>x===id).length>1) failures.push(`Duplicate ID: ${id}`);
for(const match of html.matchAll(/href="#([^"]+)"/g)) if(!ids.includes(match[1])) failures.push(`Broken anchor: ${match[1]}`);
for(const match of html.matchAll(/aria-controls="([^"]+)"/g)) if(!ids.includes(match[1])) failures.push(`Missing control target: ${match[1]}`);
for(const match of js.matchAll(/from\s+'(\.\/[^']+)'/g)) {
  try { await stat(path.join(root,match[1])); } catch { failures.push(`Missing JS import: ${match[1]}`); }
}
if(/\.pdf\b/i.test(html)) failures.push('Paper/PDF links must remain withheld.');
if(/\/workspace\/|\/home\/|\/fdisk/.test(html+css+js)) failures.push('Internal server paths in website.');
async function walk(dir) {const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else files.push(p);}return files;}
let bytes=0;
for(const f of await walk(path.join(root,'assets'))) {const s=await stat(f);bytes+=s.size;if(s.size>95e6)failures.push(`Oversized Git asset: ${f}`);if(/\.(pdf|pth|pptx|pkl|npz)$/i.test(f))failures.push(`Non-web asset: ${f}`);}
const data=JSON.parse(await readFile(path.join(root,'data/results.json')));
for (const [name,d] of Object.entries(data)) if(!d.rows.some(r=>r[0]==='RYOPO, mask-free')) failures.push(`No mask-free result: ${name}`);
for(const [name,d] of Object.entries(data)) {if(!d.rows.some(r=>r[0]==='RYOPO'))failures.push(`No RYOPO row: ${name}`);for(const row of d.rows)if(row.length!==5 || row.slice(1).some(v=>typeof v!=='number'||v<0||v>100))failures.push(`Invalid metric row: ${name}`);}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`Checks passed: local links, anchors, withheld PDF, ${Object.keys(data).length} benchmark tables. Media ${(bytes/1e6).toFixed(1)} MB.`);
