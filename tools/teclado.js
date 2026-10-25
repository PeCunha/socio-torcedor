/* Testa a navegacao por teclado em todas as paginas do portal.
 *
 * Para cada pagina:
 *   - levanta o inventario de controles realmente focaveis (os que tem caixa
 *     na tela e nao estao dentro de um <dialog> fechado nem de um painel
 *     [inert], como o menu lateral fechado no celular);
 *   - percorre a ordem de tabulacao com Tab de verdade (Input.dispatchKeyEvent
 *     via CDP, nao um evento sintetico);
 *   - confere que o foco chega a todos os controles;
 *   - confere que cada controle tem um indicador de foco visivel — detectado
 *     comparando a assinatura visual (outline, box-shadow, borda, fundo) do
 *     controle e de ate 3 ancestrais ANTES e DEPOIS do foco; assim o anel do
 *     wrapper (.login-control:focus-within) tambem conta;
 *   - confere que o controle focado e rolado para dentro da janela;
 *   - confere que todo controle tem nome acessivel (aria-labelledby, aria-label,
 *     <label for>, <label> que envolve o controle ou title).
 *
 * Uso: node tools/teclado.js <raiz> [largura]
 *
 * Exemplo:
 *   node tools/teclado.js . 1440
 *   node tools/teclado.js . 360
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { acharChrome } = require("./chrome");
const CHROME = acharChrome();
const PORT = 9860;

const RAIZ = process.argv[2] || process.cwd();
const LARGURA = Number(process.argv[3] || 1440);

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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("timeout " + method)); } }, 60000);
    });
  }
  on(method, fn) { if (!this.listeners.has(method)) this.listeners.set(method, []); this.listeners.get(method).push(fn); }
  once(method) { return new Promise((resolve) => { const fn = (p) => { const a = this.listeners.get(method); const k = a.indexOf(fn); if (k >= 0) a.splice(k, 1); resolve(p); }; this.on(method, fn); }); }
}

const FOCAVEIS = [
  "a[href]:not([tabindex='-1'])",
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([type=hidden]):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([tabindex='-1'])",
  '[tabindex]:not([tabindex="-1"])',
  "summary:not([tabindex='-1'])",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
].join(", ");

/* assinatura visual usada para detectar o indicador de foco */
const ASSINATURA = `
  function assinatura(el) {
    const partes = [];
    let alvo = el;
    for (let i = 0; i < 4 && alvo; i++) {
      const s = getComputedStyle(alvo);
      partes.push([
        s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset,
        s.boxShadow, s.borderTopWidth, s.borderTopColor,
        s.backgroundColor, s.color, s.textDecorationLine
      ].join("|"));
      alvo = alvo.parentElement;
    }
    return partes.join("||");
  }
`;

(async () => {
  const paginas = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".html")).sort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "kbd-"));
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox",
    "--allow-file-access-from-files", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    "--window-size=" + LARGURA + ",900", "about:blank"], { stdio: "ignore" });

  let totalProblemas = 0;

  try {
    let pronto = false;
    for (let i = 0; i < 300 && !pronto; i++) {
      try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); pronto = r.ok; } catch {}
      if (!pronto) await sleep(100);
    }
    const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const ws = new WebSocket(lista.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((res) => ws.addEventListener("open", res, { once: true }));
    const cdp = new CDP(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: LARGURA, height: 900, deviceScaleFactor: 1, mobile: LARGURA <= 768 });
    await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});


    for (const pag of paginas) {
      const carregou = cdp.once("Page.loadEventFired");
      await cdp.send("Page.navigate", { url: "file:///" + path.resolve(RAIZ, pag).replace(/\\/g, "/") });
      await carregou;
      await sleep(700);

      /* rolagem instantanea e sem transicoes: com scroll-behavior smooth ou
         com o transform animado do .skip-link a medicao ficaria atrasada em
         relacao ao foco */
      await cdp.send("Runtime.evaluate", {
        expression: `(function () {
          var s = document.createElement("style");
          s.textContent = "html { scroll-behavior: auto !important; }" +
            "*, *::before, *::after { transition: none !important; animation: none !important; }";
          document.head.appendChild(s);
          return getComputedStyle(document.documentElement).scrollBehavior;
        })()`,
        returnByValue: true,
      });

      /* ---------- inventario ---------- */
      const exprInv = `(() => {
        const FOC = ${JSON.stringify(FOCAVEIS)};
        ${ASSINATURA}
        const els = Array.from(document.querySelectorAll(FOC));
        const visiveis = els.filter((el) => {
          if (el.getClientRects().length === 0) return false;
          const s = getComputedStyle(el);
          if (s.display === "none" || s.visibility === "hidden") return false;
          /* dentro de um painel inert (menu lateral fechado no celular) o
             controle nao recebe foco — nao entra na ordem de tabulacao */
          if (el.closest("[inert]")) return false;
          return true;
        });
        visiveis.forEach((el, i) => { el.setAttribute("data-kbd-idx", String(i)); });

        function nomeAcessivel(el) {
          const porId = el.getAttribute("aria-labelledby");
          if (porId) {
            const t = porId.split(/\\s+/).map((id) => {
              const o = document.getElementById(id);
              return o ? o.textContent : "";
            }).join(" ").trim();
            if (t) return { nome: t, origem: "aria-labelledby" };
          }
          const al = el.getAttribute("aria-label");
          if (al && al.trim()) return { nome: al.trim(), origem: "aria-label" };
          if (el.id) {
            const lb = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
            if (lb && lb.textContent.trim()) return { nome: lb.textContent.trim(), origem: "label[for]" };
          }
          const envolvente = el.closest("label");
          if (envolvente && envolvente.textContent.trim()) return { nome: envolvente.textContent.trim(), origem: "label" };
          const ti = el.getAttribute("title");
          if (ti && ti.trim()) return { nome: ti.trim(), origem: "title" };
          const txt = (el.textContent || "").trim();
          if (txt) return { nome: txt, origem: "texto" };
          return { nome: "", origem: "nenhuma" };
        }

        const semNome = [];
        const detalhes = [];
        for (const el of visiveis) {
          const n = nomeAcessivel(el);
          if (!n.nome) semNome.push(el.tagName + (el.id ? "#" + el.id : "") + "." + String(el.className || "").split(" ")[0]);
          detalhes.push({
            idx: el.getAttribute("data-kbd-idx"), base: assinatura(el), nome: n.nome, origem: n.origem,
            desc: el.tagName + (el.id ? "#" + el.id : "") + "." + String(el.className || "").split(" ").join(".") +
                  " [tabindex=" + (el.getAttribute("tabindex") || "-") + "]"
          });
        }
        window.__kbd = { detalhes, total: visiveis.length, todos: els.length };
        return JSON.stringify({ total: visiveis.length, todos: els.length, semNome, detalhes });
      })()`;

      const rInv = await cdp.send("Runtime.evaluate", { expression: exprInv, returnByValue: true });
      const inv = JSON.parse(rInv.result.value);

      /* ---------- tabulacao real ---------- */
      await cdp.send("Runtime.evaluate", {
        expression: "document.body.setAttribute('tabindex','-1'); document.body.focus(); 'ok'",
        returnByValue: true,
      });

      const visitados = new Set();
      const semIndicador = [];
      const foraDaTela = [];
      const ordem = [];
      let semNovos = 0;

      for (let i = 0; i < inv.total + 20; i++) {
        await cdp.send("Input.dispatchKeyEvent", {
          type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
        });
        await cdp.send("Input.dispatchKeyEvent", {
          type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9,
        });
        await sleep(140); /* deixa as transicoes de foco terminarem */

        const r = await cdp.send("Runtime.evaluate", {
          expression: `(() => {
            const el = document.activeElement;
            if (!el || el === document.body || el === document.documentElement) return JSON.stringify({ fim: true });
            const idx = el.getAttribute("data-kbd-idx");
            /* o JavaScript pode re-criar o elemento depois do inventario; nesse
               caso nao ha assinatura de referencia, e o controle e aceito
               como alcancavel (so o indicador de foco nao pode ser medido) */
            const desc = el.tagName + (el.id ? "#" + el.id : "") + "." +
                         String(el.className || "").split(" ").join(".");
            ${ASSINATURA}
            const r = el.getBoundingClientRect();
            const dentro = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
            let yDoc = 0;
            let a = el;
            while (a) { yDoc += a.offsetTop; a = a.offsetParent; }
            return JSON.stringify({
              idx, desc, semBase: idx === null,
              rotulo: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 26),
              atual: assinatura(el), dentro,
              rect: [Math.round(r.top), Math.round(r.left), Math.round(r.width), Math.round(r.height)].join(","),
              vp: window.innerWidth + "x" + window.innerHeight,
              scroll: "win=" + Math.round(window.scrollY) +
                      " docEl=" + Math.round(document.documentElement.scrollTop) +
                      " body=" + Math.round(document.body.scrollTop) +
                      " yDoc=" + Math.round(yDoc) +
                      " docH=" + document.documentElement.scrollHeight +
                      " beh=" + Math.round(getComputedStyle(document.body).height)
            });
          })()`,
          returnByValue: true,
        });
        const info = JSON.parse(r.result.value);
        if (info.fim) break;

        /* um mesmo elemento pode receber o foco varias vezes seguidas (por
           exemplo, os segmentos de um <input type="date">). So encerramos o
           percurso quando ja nao aparece nenhum controle novo ha 8 Tabs. */
        const chave = (info.idx === null || info.idx === undefined) ? "d" + info.desc : "i" + info.idx;
        if (visitados.has(chave)) {
          semNovos++;
          if (semNovos >= 8) break;
          continue;
        }
        semNovos = 0;
        visitados.add(chave);
        ordem.push(info.rotulo);

        const base = (inv.detalhes.find((d) => d.idx === info.idx) || {}).base;
        if (base === undefined) {
          /* elemento recriado pelo JavaScript depois do inventario: nao ha
             assinatura de referencia para comparar */
        } else if (base !== info.atual) {
          /* ha mudanca visual: e o indicador de foco */
        } else {
          semIndicador.push(info.idx + " (" + info.rotulo + ")");
        }
        if (!info.dentro) foraDaTela.push(chave + " (" + info.rotulo + ") rect=" + info.rect + " vp=" + info.vp + " " + info.scroll);
      }

      /* ---------- relatorio ---------- */
      const problemas = [];
      if (inv.semNome.length) {
        problemas.push(inv.semNome.length + " controle(s) sem nome acessivel: " + inv.semNome.join(", "));
      }
      if (visitados.size < inv.total) {
        const faltando = inv.detalhes.filter((d) => !visitados.has("i" + d.idx)).map((d) => d.desc);
        problemas.push("apenas " + visitados.size + " de " + inv.total + " controles alcancaveis por Tab -> " + faltando.slice(0, 8).join(" | "));
      }
      if (semIndicador.length) {
        problemas.push(semIndicador.length + " sem indicador de foco visivel: " + semIndicador.slice(0, 6).join(" | "));
      }
      if (foraDaTela.length) {
        const det = foraDaTela.map((f) => {
          const idx = f.split(" ")[0];
          const d = inv.detalhes.find((x) => x.idx === idx);
          return (d ? d.desc : idx) + " " + f.slice(idx.length);
        });
        problemas.push(foraDaTela.length + " fora da janela apos o foco: " + det.slice(0, 6).join(" | "));
      }

      console.log("\n" + pad(pag, 26) + " controles: " + inv.total + "   visitados: " + visitados.size +
        "   " + (problemas.length ? "PROBLEMAS" : "ok"));
      if (process.env.VERBOSE) {
        ordem.forEach((r, i) => console.log("      " + String(i + 1).padStart(3) + ". " + r));
      }
      for (const p of problemas) { console.log("    - " + p); totalProblemas++; }
    }
    ws.close();
  } finally {
    proc.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }

  console.log("\ntotal de problemas: " + totalProblemas);
  process.exit(totalProblemas ? 1 : 0);
})();

function pad(s, n) { return s + " ".repeat(Math.max(0, n - s.length)); }
