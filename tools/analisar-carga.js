/* Descobre, para cada pagina, quais dos 15 arquivos de CSS sao realmente
 * necessarios.
 *
 * Criterio (exato): um arquivo so pode ser dispensado se NENHUM dos seus
 * seletores puder casar com algum elemento presente no DOM da pagina. Nesse
 * caso o arquivo nao declara nada para aquela pagina e remove-lo nao muda
 * nem um estilo computado.
 *
 * O DOM e percorrido nos mesmos estados que o verificador usa (inicial,
 * cada aba, cada dialogo), porque o JavaScript pode criar elementos.
 *
 * A normalizacao e conservadora por construcao: pseudo-estados (:hover,
 * :focus, ...) sao removidos e atributos com valor viram atributo sem
 * valor, de modo que a analise nunca subestima um arquivo. Se um seletor
 * normalizado for invalido, o arquivo e marcado como necessario.
 *
 * Uso: node tools/analisar-carga.js <raiz> <saida.json>
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { acharChrome } = require("./chrome");
const CHROME = acharChrome();
const PORT = 9855;

const RAIZ = process.argv[2];
const SAIDA = process.argv[3];

/* ---------- 1. extrai os seletores de cada arquivo ---------- */
const ORDEM = [
  "base", "layout", "botoes", "jogos", "componentes", "planos", "faceid",
  "galeria", "historia", "arena", "mobile", "login", "painel-jogos",
  "perfil", "ajustes-toque",
];

/* divide uma lista de seletores por virgulas de nivel superior */
function dividirTopo(txt) {
  const partes = [];
  let buf = "", prof = 0;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (c === "(") prof++;
    else if (c === ")") prof--;
    if (c === "," && prof === 0) { partes.push(buf.trim()); buf = ""; continue; }
    buf += c;
  }
  if (buf.trim()) partes.push(buf.trim());
  return partes;
}

/* le o bloco que comeca em txt[i] (que aponta para "{") e devolve o corpo
   e o indice logo depois do "}" correspondente */
function lerBloco(txt, i) {
  let depth = 1, j = i + 1;
  const inicio = j;
  while (j < txt.length && depth > 0) {
    const c = txt[j];
    if (c === "/" && txt[j + 1] === "*") {
      const f = txt.indexOf("*/", j + 2);
      j = f === -1 ? txt.length : f + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c; let k = j + 1;
      while (k < txt.length && txt[k] !== q) { if (txt[k] === "\\") k++; k++; }
      j = k + 1;
      continue;
    }
    if (c === "{") { depth++; j++; continue; }
    if (c === "}") { depth--; j++; continue; }
    j++;
  }
  return [txt.slice(inicio, j - 1), j];
}

const AT_RULES_COM_REGRAS = ["@media", "@supports", "@container", "@layer", "@scope"];

function extrairSeletores(css) {
  const sel = [];
  let buf = "", i = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const f = css.indexOf("*/", i + 2);
      i = f === -1 ? css.length : f + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch; let j = i + 1;
      while (j < css.length && css[j] !== q) { if (css[j] === "\\") j++; j++; }
      i = j + 1;
      continue;
    }
    if (ch === "{") {
      const cab = buf.trim();
      buf = "";
      const [corpo, fim] = lerBloco(css, i);
      if (AT_RULES_COM_REGRAS.some((a) => cab.startsWith(a))) {
        /* as regras dentro de @media/@supports tambem contam */
        sel.push.apply(sel, extrairSeletores(corpo));
      } else if (!cab.startsWith("@")) {
        dividirTopo(cab).forEach((s) => sel.push(s));
      }
      i = fim;
      continue;
    }
    if (ch === "}") { buf = ""; i++; continue; }
    buf += ch;
    i++;
  }
  return sel;
}

/* pseudo-classes cujo estado depende de runtime: se removidas, o seletor
   passa a casar com mais elementos (conservador) */
const DE_ESTADO = new Set([
  "hover", "focus", "focus-visible", "focus-within", "active", "visited", "target",
  "checked", "disabled", "enabled", "required", "optional", "read-only", "read-write",
  "placeholder-shown", "valid", "invalid", "in-range", "out-of-range", "indeterminate",
  "default", "modal", "popover-open", "autofill", "user-invalid", "user-valid", "blank",
  "fullscreen", "picture-in-picture", "defined", "any-link", "local-link", "scope",
  "playing", "paused", "current", "past", "future", "open",
]);

function semEstados(sel) {
  return sel.replace(/:([a-zA-Z-]+)(\([^()]*\))?/g, (m, nome) =>
    DE_ESTADO.has(nome) ? "" : m
  );
}

function semFuncionais(sel) {
  /* remove :not(...), :is(...), :where(...), :has(...) por inteiro */
  let s = sel, mudou = true;
  while (mudou) {
    mudou = false;
    s = s.replace(/:(not|is|where|has)\([^()]*\)/g, (m) => { mudou = true; return ""; });
  }
  return s;
}

function normalizar(sel) {
  let s = sel.replace(/::[a-zA-Z-]+(\([^()]*\))?/g, "");   /* pseudo-elementos */
  s = semEstados(s);
  s = s.replace(/\[\s*([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*[~^$*|]?=\s*("[^"]*"|'[^']*'|[^\]]+)\s*\]/g, "[$1]");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/* candidatos de teste, do mais fiel ao mais conservador */
function candidatos(sel) {
  const base = normalizar(sel);
  const lista = [];
  const push = (x) => {
    const t = x.replace(/\s+/g, " ").trim();
    if (t && !lista.includes(t)) lista.push(t);
  };
  push(base);
  push(semFuncionais(base));
  push(semFuncionais(semEstados(sel)));
  return lista;
}

const seletoresPorArquivo = {};
const brutosPorArquivo = {};
for (const nome of ORDEM) {
  const p = path.join(RAIZ, "assets", "css", nome + ".css");
  const lista = extrairSeletores(fs.readFileSync(p, "utf8"));
  brutosPorArquivo[nome] = lista;
  const vistos = new Set();
  const norm = [];
  for (const s of lista) {
    for (const c of candidatos(s)) {
      if (vistos.has(c)) continue;
      vistos.add(c);
      norm.push(c);
    }
  }
  seletoresPorArquivo[nome] = norm;
}

/* ---------- 2. navegador ---------- */
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map();
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      } else if (m.method && this.listeners.has(m.method)) {
        this.listeners.get(m.method).forEach((fn) => fn(m.params));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("timeout " + method)); } }, 90000);
    });
  }
  on(method, fn) { if (!this.listeners.has(method)) this.listeners.set(method, []); this.listeners.get(method).push(fn); }
  once(method) { return new Promise((resolve) => { const fn = (p) => { const a = this.listeners.get(method); const k = a.indexOf(fn); if (k >= 0) a.splice(k, 1); resolve(p); }; this.on(method, fn); }); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* index.html e apenas um redirecionamento para o login: nao carrega CSS */
  const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html") && f !== "index.html").sort();
  const resultado = {};

  for (let idx = 0; idx < paginas.length; idx++) {
    const pag = paginas[idx];
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "carga-"));
    const porta = PORT + idx;
    const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox",
      "--allow-file-access-from-files", "--hide-scrollbars",
      `--remote-debugging-port=${porta}`, `--user-data-dir=${profile}`,
      "--window-size=1920,1080", "about:blank"], { stdio: "ignore" });
    try {
      let pronto = false;
      for (let i = 0; i < 300 && !pronto; i++) {
        try { const r = await fetch(`http://127.0.0.1:${porta}/json/version`); pronto = r.ok; } catch {}
        if (!pronto) await sleep(100);
      }
      if (!pronto) throw new Error("Chrome nao respondeu na porta " + porta);
      const lista = await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json();
      const ws = new WebSocket(lista.find((t) => t.type === "page").webSocketDebuggerUrl);
      await new Promise((res) => ws.addEventListener("open", res, { once: true }));
      const cdp = new CDP(ws);
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      const carregou = cdp.once("Page.loadEventFired");
      await cdp.send("Page.navigate", { url: "file:///" + path.resolve(RAIZ, pag).replace(/\\/g, "/") });
      await carregou;
      await sleep(900);

      const expr = `(() => {
        const S = ${JSON.stringify(seletoresPorArquivo)};
        function medir() {
          const out = {};
          for (const arq in S) {
            const atingidos = [];
            for (const sel of S[arq]) {
              let m = null;
              try { m = document.querySelector(sel); } catch (e) { continue; }
              if (m) atingidos.push(sel);
            }
            out[arq] = atingidos;
          }
          return out;
        }
        const estados = [];
        estados.push(medir());
        const abas = Array.from(document.querySelectorAll('[role="tab"]'));
        for (const a of abas) {
          try { a.click(); } catch (e) {}
          estados.push(medir());
        }
        if (abas.length) { try { abas[0].click(); } catch (e) {} }
        for (const d of Array.from(document.querySelectorAll("dialog"))) {
          try { if (!d.open) d.showModal(); } catch (e) {}
          estados.push(medir());
          try { d.close(); } catch (e) {}
        }
        const resumo = {};
        for (const arq in S) {
          const set = new Set();
          for (const e of estados) for (const s of (e[arq] || [])) set.add(s);
          resumo[arq] = Array.from(set);
        }
        return JSON.stringify(resumo);
      })()`;

      const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
      const porArquivo = JSON.parse((r.result && r.result.value) || "{}");

      const necessarios = [];
      const dispensaveis = [];
      for (const arq of ORDEM) {
        if ((porArquivo[arq] || []).length > 0) necessarios.push(arq);
        else dispensaveis.push(arq);
      }
      resultado[pag] = { necessarios, dispensaveis, porArquivo };
      console.log("\n" + pag);
      console.log("  necessarios  (" + necessarios.length + "): " + necessarios.join(", "));
      console.log("  dispensaveis (" + dispensaveis.length + "): " + (dispensaveis.join(", ") || "-"));
      for (const arq of dispensaveis) {
        console.log("      " + arq + ": " + brutosPorArquivo[arq].length + " seletores, nenhum casa com a pagina");
      }
      ws.close();
    } catch (e) {
      console.error("ERRO em " + pag + ": " + e.message);
    } finally {
      proc.kill();
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    }
  }

  fs.writeFileSync(SAIDA, JSON.stringify(resultado, null, 2), "utf8");
  console.log("\ngravado em " + SAIDA);
  process.exit(0);
})();
