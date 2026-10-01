// Embed author-supplied RGB/depth thumbnails in an original, editable SVG schematic.
// Usage: node tools/build-pipeline.mjs rgb.jpg depth.png
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const [rgb,depth]=process.argv.slice(2);
if (!rgb||!depth) throw Error('Provide RGB and depth thumbnails from the same frame.');
const uri=async p=>`data:image/${/\.png$/i.test(p)?'png':'jpeg'};base64,${(await readFile(p)).toString('base64')}`;
const source=await readFile(new URL('pipeline-template.svg',import.meta.url),'utf8');
const svg=source.replace('{{RGB_DATA}}',await uri(rgb)).replace('{{DEPTH_DATA}}',await uri(depth));
await writeFile(new URL('../assets/images/pipeline-overview.svg',import.meta.url),svg);
console.log(`Built overview with ${path.basename(rgb)} and ${path.basename(depth)}.`);
