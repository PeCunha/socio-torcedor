/* Compara dois arquivos de verificacao (JSON) e lista as combinacoes
 * que divergem. Sai com codigo 1 se houver qualquer divergencia.
 *
 * Uso: node tools/comparar.js <a.json> <b.json>
 */

const fs = require("fs");

const a = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const b = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

let iguais = 0;
let difs = 0;

for (const pag of Object.keys(a)) {
  for (const W of Object.keys(a[pag])) {
    const ha = a[pag][W];
    const hb = b[pag] && b[pag][W];
    if (!hb) { console.log(`  AUSENTE  ${pag} @ ${W}px`); difs++; continue; }
    if (ha.hash === hb.hash) iguais++;
    else {
      difs++;
      console.log(`  DIVERGE  ${pag} @ ${W}px  ${ha.hash.slice(0, 12)} -> ${hb.hash.slice(0, 12)}  (${ha.chars} -> ${hb.chars} chars)`);
    }
  }
}
for (const pag of Object.keys(b)) {
  for (const W of Object.keys(b[pag])) {
    if (!a[pag] || !a[pag][W]) { console.log(`  EXTRA    ${pag} @ ${W}px`); difs++; }
  }
}

console.log(`\niguais: ${iguais}   divergentes: ${difs}`);
process.exit(difs === 0 ? 0 : 1);
