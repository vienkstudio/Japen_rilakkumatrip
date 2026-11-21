import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/atlas.html',import.meta.url),'utf8');
writeFileSync(new URL('../lib/atlas-markup.ts',import.meta.url),'export default '+JSON.stringify(html)+';\n');
