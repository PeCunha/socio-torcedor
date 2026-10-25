/* Aplica a carga seletiva: cada pagina passa a carregar apenas os arquivos
 * de CSS que ela usa, sempre na ordem global
 * (base -> layout -> botoes -> jogos -> componentes -> planos -> faceid ->
 *  galeria -> historia -> arena -> mobile -> login -> painel-jogos ->
 *  perfil -> ajustes-toque).
 *
 * Rode antes: node tools/analisar-carga.js <raiz> carga.json
 *
 * Uso: node tools/aplicar-carga.js <raiz> <carga.json>
 */

const fs = require("fs");
const path = require("path");

const RAIZ = process.argv[2];
const carga = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

const ORDEM = [
  "base", "layout", "botoes", "jogos", "componentes", "planos", "faceid",
  "galeria", "historia", "arena", "mobile", "login", "painel-jogos",
  "perfil", "ajustes-toque",
];

/* remove todos os <link> de estilo locais, mantendo os externos */
const RE_LINK_LOCAL = /^[ \t]*<link rel="stylesheet" href="assets\/css\/[a-z-]+\.css">\r?\n?/gm;

for (const [pag, dados] of Object.entries(carga)) {
  const p = path.join(RAIZ, pag);
  let html = fs.readFileSync(p, "utf8");

  const antes = (html.match(RE_LINK_LOCAL) || []).length;
  html = html.replace(RE_LINK_LOCAL, "");

  const usados = ORDEM.filter((a) => dados.necessarios.includes(a));
  const bloco = usados
    .map((a) => '  <link rel="stylesheet" href="assets/css/' + a + '.css">')
    .join("\n") + "\n";

  /* reinsere logo apos o ultimo <link> externo (fonte do Manrope) */
  const marcas = [];
  const re = /^[ \t]*<link\b[^>]*>\r?\n?/gm;
  let m;
  while ((m = re.exec(html))) marcas.push({ ini: m.index, fim: m.index + m[0].length, txt: m[0] });

  let ancora = null;
  for (const mk of marcas) {
    if (!/assets\/css\//.test(mk.txt)) ancora = mk;
  }
  if (!ancora) {
    console.error("ERRO: nenhum <link> externo encontrado em " + pag);
    process.exit(1);
  }
  html = html.slice(0, ancora.fim) + bloco + html.slice(ancora.fim);

  fs.writeFileSync(p, html, "utf8");
  console.log("  " + pag.padEnd(26) + antes + " -> " + usados.length + " arquivos  (" + usados.join(", ") + ")");
}
