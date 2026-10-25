/* Verificador de equivalencia visual do portal.
 *
 * Abre cada pagina em um Chrome headless, em varias larguras, e em cada
 * estado interativo (inicial, cada aba, cada dialogo), extrai um "retrato
 * canonico" — estilos computados, geometria e metricas de rolagem de todos
 * os elementos renderizados — e grava o SHA-256 de cada retrato.
 *
 * O relogio e congelado e as animacoes sao desligadas, de modo que o
 * resultado seja deterministico. Os <link> e <style> do <head> ficam fora do
 * retrato: eles nao sao conteudo renderizado, e inclui-los faria o hash
 * depender de quantos arquivos de estilo a pagina carrega.
 *
 * O criterio de aceite do projeto e: 84 retratos (7 paginas x 12 larguras)
 * com zero divergencia entre duas execucoes.
 *
 * Uso:
 *   node tools/verificar-equivalencia.js <raiz> <saida.json> [porta] [larguras...]
 *
 * Exemplo:
 *   node tools/verificar-equivalencia.js . verif.json 9833 360 480 560 640 760 761 920 921 1080 1280 1440 1920
 *
 * Se o Chrome nao estiver no caminho padrao, defina CHROME_PATH.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const { acharChrome } = require("./chrome");
const CHROME = acharChrome();

const RAIZ = process.argv[2] || process.cwd();
const SAIDA = process.argv[3] || path.join(os.tmpdir(), "verificar2.json");
const PORT = Number(process.argv[4] || 9833);
const LARGURAS = (process.argv.slice(5).length ? process.argv.slice(5) : ["360", "1440"]).map(Number);

const PAGINAS = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).sort();

const PROPS = [
  "display", "position", "top", "right", "bottom", "left", "zIndex", "float", "clear", "visibility",
  "width", "height", "maxWidth", "maxHeight", "minWidth", "minHeight", "boxSizing",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderTopStyle", "borderTopLeftRadius", "borderTopRightRadius",
  "borderBottomLeftRadius", "borderBottomRightRadius",
  "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat",
  "color", "fontSize", "fontWeight", "fontFamily", "fontStyle", "fontVariant",
  "lineHeight", "letterSpacing", "wordSpacing", "textAlign", "textTransform",
  "textDecorationLine", "textDecorationColor", "textIndent", "whiteSpace", "wordBreak",
  "overflowWrap", "overflowX", "overflowY", "opacity", "boxShadow", "textShadow",
  "gap", "rowGap", "columnGap",
  "gridTemplateColumns", "gridTemplateRows", "gridTemplateAreas", "gridAutoFlow", "gridAutoColumns", "gridAutoRows",
  "flexDirection", "flexWrap", "flexGrow", "flexShrink", "flexBasis", "order",
  "justifyContent", "justifyItems", "alignItems", "alignContent", "alignSelf",
  "listStyleType", "listStylePosition", "verticalAlign", "objectFit", "objectPosition",
  "aspectRatio", "transform", "transition", "transformOrigin", "filter", "backdropFilter",
  "columns", "columnRule", "resize", "appearance", "cursor", "pointerEvents", "userSelect",
];

/* ---- retrato: ignora <link> e <style> (nao sao conteudo renderizado) ---- */
const PAGE_FN = `
(() => {
  const __saida = [];
  const __ignorar = new Set(["LINK", "STYLE"]);
  function __coletar(nome) {
    const itens = [];
    const todos = document.querySelectorAll("*");
    let n = 0;
    for (let i = 0; i < todos.length; i++) {
      const el = todos[i];
      if (__ignorar.has(el.tagName)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const cls = (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : (el.className || "");
      const partes = [];
      for (let p = 0; p < __PROPS.length; p++) partes.push(__PROPS[p] + "=" + cs[__PROPS[p]]);
      itens.push(
        n + " " + el.tagName +
        (el.id ? "#" + el.id : "") +
        (cls ? "." + String(cls).replace(/\\s+/g, ".") : "") +
        " [" + Math.round(r.left*10)/10 + "," + Math.round(r.top*10)/10 + "," +
        Math.round(r.width*10)/10 + "," + Math.round(r.height*10)/10 + "]" +
        " {" + partes.join(";") + "}"
      );
      n++;
    }
    __saida.push("### ESTADO " + nome + " (" + itens.length + " elementos)");
    for (const it of itens) __saida.push(it);
  }
  __coletar("inicial");

  const abas = Array.from(document.querySelectorAll('[role="tab"]'));
  for (let i = 0; i < abas.length; i++) {
    try { abas[i].click(); } catch (e) {}
    __coletar("tab" + i + ":" + (abas[i].textContent || "").trim().slice(0, 20));
  }
  if (abas.length) { try { abas[0].click(); } catch (e) {} }

  const dlg = Array.from(document.querySelectorAll("dialog"));
  for (const d of dlg) {
    try {
      if (!d.open) d.showModal();
      __coletar("dialog:" + (d.id || d.className));
      d.close();
    } catch (e) {}
  }

  __saida.push("### METRICAS");
  __saida.push("innerWidth=" + window.innerWidth);
  __saida.push("scrollWidth=" + document.documentElement.scrollWidth);
  __saida.push("bodyScrollWidth=" + document.body.scrollWidth);
  __saida.push("scrollHeight=" + document.documentElement.scrollHeight);

  return { n: __saida.length, texto: __saida.join("\\n") };
})()
`;

const FIXAR_RELOGIO = `
(() => {
  const Fixo = 1761300000000;
  const RealDate = Date;
  function DataFixa(...args) {
    if (args.length === 0) return new RealDate(Fixo);
    return new RealDate(...args);
  }
  DataFixa.prototype = RealDate.prototype;
  DataFixa.now = () => Fixo;
  DataFixa.parse = RealDate.parse;
  DataFixa.UTC = RealDate.UTC;
  window.Date = DataFixa;
})();
`;

const CONGELAR_ANIMACAO = `
(() => {
  const estilo = document.createElement("style");
  estilo.id = "__harness_congela_animacao";
  estilo.textContent = "*, *::before, *::after { animation: none !important; transition: none !important; }";
  const inserir = () => {
    if (!document.head) return;
    document.head.appendChild(estilo);
  };
  if (document.head) inserir();
  else document.addEventListener("DOMContentLoaded", inserir);
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "verif2-"));
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--allow-file-access-from-files",
    "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--window-size=1920,1080", "about:blank"], { stdio: "ignore" });

  const resultado = {};
  try {
    let pronto = false;
    for (let i = 0; i < 200 && !pronto; i++) {
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); pronto = r.ok; } catch {}
      if (!pronto) await sleep(100);
    }
    const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const ws = new WebSocket(lista.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((res) => ws.addEventListener("open", res, { once: true }));
    const cdp = new CDP(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: FIXAR_RELOGIO });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: CONGELAR_ANIMACAO });

    for (const pag of PAGINAS) {
      resultado[pag] = {};
      for (const W of LARGURAS) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: 900, deviceScaleFactor: 1, mobile: W <= 768 });
        const carregou = cdp.once("Page.loadEventFired");
        await cdp.send("Page.navigate", { url: "file:///" + path.resolve(RAIZ, pag).replace(/\\/g, "/") });
        await carregou;
        await sleep(800);
        const expr = `window.__PROPS = ${JSON.stringify(PROPS)};\n${PAGE_FN}`;
        const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
        const txt = (r.result && r.result.value && r.result.value.texto) || "";
        const hash = crypto.createHash("sha256").update(txt).digest("hex");
        resultado[pag][W] = { hash, chars: txt.length, estados: (r.result && r.result.value && r.result.value.n) || 0 };
        console.log(`  ${pag} @ ${String(W).padStart(4)}px  ${hash.slice(0, 12)}  ${String(txt.length).padStart(9)} chars`);
      }
    }
    ws.close();
  } catch (e) {
    console.log("ERRO: " + e.message);
    process.exitCode = 1;
  } finally {
    proc.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }

  fs.writeFileSync(SAIDA, JSON.stringify(resultado, null, 2), "utf8");
  console.log("verificacao gravada em: " + SAIDA);
  process.exit(process.exitCode || 0);
})();
