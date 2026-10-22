(() => {
  "use strict";

  // Menu lateral e navegação móvel
  const body = document.body;
  const sidebar = document.getElementById("sidebar");
  const menuButton = document.getElementById("menu-button");
  const sidebarClose = document.getElementById("sidebar-close");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  const pageLinks = [...document.querySelectorAll("[data-page-link]")];
  const currentPage = body.dataset.page;

  pageLinks.forEach((link) => {
    const active = link.dataset.pageLink === currentPage;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  // Ano corrente no rodapé — evita copyright desatualizado
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const setMenu = (open) => {
    if (!sidebar || !menuButton) return;
    body.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    if (open) {
      window.setTimeout(() => sidebarClose?.focus(), 180);
    } else if (document.activeElement && sidebar.contains(document.activeElement)) {
      menuButton.focus();
    }
  };

  menuButton?.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  sidebarClose?.addEventListener("click", () => setMenu(false));
  sidebarOverlay?.addEventListener("click", () => setMenu(false));

  mobileQuery.addEventListener("change", (event) => {
    if (!event.matches) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("menu-open")) setMenu(false);
  });

  // Abas, navegação e rolagem suave
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll("[data-tab-panel]")];

  const activateTab = (name, { focus = false } = {}) => {
    const selectedTab = tabs.find((tab) => tab.dataset.tab === name);
    if (!selectedTab) return;

    tabs.forEach((tab) => {
      const selected = tab === selectedTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== name;
    });

    if (focus) selectedTab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
    });

    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      activateTab(tabs[nextIndex].dataset.tab, { focus: true });
    });
  });

  pageLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileQuery.matches) setMenu(false);
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", targetId);
    });
  });

  /* Contagem regressiva para o próximo jogo.
     O alvo vem de assets/js/temporada.js: o portal escolhe sempre o
     primeiro jogo ainda não disputado, então a contagem nunca fica
     desatualizada nem presa a uma data fixa no HTML. */
  const countdown = document.querySelector("[data-countdown]");
  const jogoProximo = window.SenaiTemporada ? window.SenaiTemporada.proximo() : null;

  if (countdown && jogoProximo) {
    countdown.dataset.countdown = jogoProximo.dataISO;
    const target = new Date(jogoProximo.dataISO);
    const units = {
      days: countdown.querySelector('[data-unit="days"]'),
      hours: countdown.querySelector('[data-unit="hours"]')
    };
    const status = countdown.querySelector("[data-countdown-status]");
    const values = countdown.querySelector(".countdown-values");

    /* O rótulo da data ("25 de outubro, 19:30") é escrito por
       temporada-view.js, que é o dono da apresentação da temporada.
       Aqui fica só a contagem que Anda. */

    const updateCountdown = () => {
      if (Number.isNaN(target.getTime())) return;

      const totalSeconds = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);

      if (units.days) units.days.textContent = String(days).padStart(2, "0");
      if (units.hours) units.hours.textContent = String(hours).padStart(2, "0");
      if (values) values.setAttribute("aria-label", `${days} dias e ${hours} horas para o jogo`);

      if (status) status.textContent = totalSeconds === 0 ? "Jogo iniciado" : "Faltam";
    };

    updateCountdown();
    window.setInterval(updateCountdown, 60000);
  }

  // Reserva de ingressos e modal
  const ticketDialog = document.getElementById("ticket-dialog");
  const ticketForm = document.getElementById("ticket-form");
  const selectedMatch = document.getElementById("selected-match");

  if (ticketDialog && ticketForm && selectedMatch) {
    /* Delegação de eventos: os botões de reserva são criados em tempo de
       execução pelo renderizador da temporada, então não dá para amarrar
       o listener no carregamento da página. */
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".js-reserve");
      if (!button) return;
      selectedMatch.textContent = button.dataset.match;
      ticketForm.reset();
      ticketDialog.showModal();
    });

    document.querySelector("[data-close-dialog]")?.addEventListener("click", () => ticketDialog.close());
    ticketDialog.addEventListener("click", (event) => {
      if (event.target === ticketDialog) ticketDialog.close();
    });

    ticketForm.addEventListener("submit", (event) => {
      if (event.submitter?.value !== "confirm") return;
      event.preventDefault();
      const quantity = document.getElementById("ticket-quantity").value;
      ticketDialog.close();
      showToast(`${quantity} ingresso${quantity === "1" ? "" : "s"} reservado${quantity === "1" ? "" : "s"} para ${selectedMatch.textContent}.`);
    });
  }

  // Notificações temporárias
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  let toastTimer;

  function showToast(message) {
    if (!toast || !toastMessage) return;
    window.clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 4200);
  }

  // Exposto para os blocos independentes do arquivo (ex.: tela de login)
  window.SenaiPortal = Object.assign(window.SenaiPortal || {}, { showToast });

  /* Delegação de eventos para as notificações. Os cards de jogo e de
     resultado são renderizados em tempo de execução e já nascem com o
     atributo data-message, então o listener precisa ser delegado. */
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.dataset.message) return;
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    showToast(form.dataset.message);
    form.reset();
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-message]");
    if (!target || target instanceof HTMLFormElement) return;
    showToast(target.dataset.message);
  });

  // Reconhecimento facial ao vivo (Webcam API + FaceDetector)
  const camDialog = document.getElementById("fid-cam");
  if (camDialog) initFaceScan(camDialog);

  function initFaceScan(dialog) {
    const el = (id) => document.getElementById(id);
    const video = el("fid-cam-video");
    const canvas = el("fid-cam-canvas");
    const box = el("fid-cam-frame");
    const empty = el("fid-cam-empty");
    const emptyText = el("fid-cam-empty-text");
    const hud = el("fid-cam-hud");
    const hudText = el("fid-cam-hud-text");
    const status = el("fid-cam-status");
    const sub = el("fid-cam-sub");
    const meterFill = el("fid-cam-meter-fill");
    const meterValue = el("fid-cam-meter-value");
    const captureBtn = el("fid-cam-capture");
    const flipBtn = el("fid-cam-flip");
    const retryBtn = el("fid-cam-retry");
    const metricsOut = el("fid-cam-metrics");
    const openBtn = el("fid-cam-open");
    const shot = el("fid-shot");
    const viewport = el("fid-viewport");
    const faceBox = el("fid-face-box");


    const ctx = canvas.getContext("2d");
    const probe = document.createElement("canvas");
    const probeCtx = probe.getContext("2d", { willReadFrequently: true });
    probe.width = 160;
    probe.height = 120;

    let stream = null;
    let detector = null;
    let raf = 0;
    let facing = "user";
    let prev = null;
    let hold = 0;
    let conf = 0;
    let lastAt = 0;
    let lastDetect = 0;
    let fps = 0;

    const NEED = 24;
    const FLOOR = 0.5;
    const allOk = () => CHIPS.every((k) => metrics[k] >= FLOOR);
    const state = () => (metrics.score >= 0.68 && allOk() ? 1 : 0);

    const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    const setStatus = (text, kind = "") => {
      status.textContent = text;
      status.className = "fid-cam-status" + (kind ? ` is-${kind}` : "");
    };

    const setMeter = (value) => {
      const pct = Math.max(0, Math.min(100, value));
      conf = pct;
      meterFill.style.width = `${pct}%`;
      meterValue.textContent = `${pct.toFixed(1)}%`;
    };

    const stop = () => {
      window.cancelAnimationFrame(raf);
      raf = 0;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      video.srcObject = null;
    };

    const fail = (message) => {
      stop();
      empty.hidden = false;
      box.hidden = true;
      hud.hidden = true;
      captureBtn.disabled = true;
      retryBtn.hidden = false;
      emptyText.textContent = message;
      setStatus(message, "error");
      setMeter(0);
    };

    // Análise de qualidade do quadro. Todas as métricas são medidas de verdade
    // sobre os pixels do vídeo: brilho, nitidez (variância do laplaciano),
    // imobilidade (diferença entre quadros) e enquadramento (energia de borda
    // no centro do guia em relação ao restante da imagem).
    const metrics = { lum: 0, sharp: 0, stable: 0, frame: 0, score: 0 };
    const CHIPS = ["lum", "sharp", "stable", "frame"];

    const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

    const setChip = (key, value, state) => {
      const out = el("fid-m-" + key);
      if (out) out.textContent = state === "ok" ? "ok" : "—";
      const chip = dialog.querySelector(`[data-fid-metric="${key}"]`);
      if (chip) chip.dataset.state = state;
    };

    const analyze = () => {
      const W = probe.width;
      const H = probe.height;
      probeCtx.drawImage(video, 0, 0, W, H);
      const data = probeCtx.getImageData(0, 0, W, H).data;

      const cur = new Float32Array(W * H);
      let sum = 0;
      for (let p = 0, i = 0; p < W * H; p += 1, i += 4) {
        const v = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        cur[p] = v;
        sum += v;
      }
      const lum = sum / (W * H);

      let lSum = 0;
      let lSq = 0;
      let n = 0;
      for (let y = 1; y < H - 1; y += 1) {
        for (let x = 1; x < W - 1; x += 1) {
          const p = y * W + x;
          const l = 4 * cur[p] - cur[p - 1] - cur[p + 1] - cur[p - W] - cur[p + W];
          lSum += l;
          lSq += l * l;
          n += 1;
        }
      }
      const sharp = Math.max(0, lSq / n - (lSum / n) * (lSum / n));

      // Imobilidade: fração de pixels que mudaram de fato entre dois quadros.
      // Ruído de sensor mexe em menos de 1%; um rosto tremendo mexe em vários %.
      let changed = 0;
      const had = !!prev;
      if (prev) {
        for (let p = 0; p < W * H; p += 1) {
          if (Math.abs(cur[p] - prev[p]) > 0.06) changed += 1;
        }
      }
      prev = cur;

      const gx0 = Math.round(W * 0.3);
      const gx1 = Math.round(W * 0.7);
      const gy0 = Math.round(H * 0.12);
      const gy1 = Math.round(H * 0.82);
      let inSum = 0;
      let outSum = 0;
      let cx = 0;
      let cy = 0;
      let cw = 0;
      let guideSum = 0;
      let guideN = 0;
      for (let y = 1; y < H - 1; y += 1) {
        for (let x = 1; x < W - 1; x += 1) {
          const p = y * W + x;
          const inside = x >= gx0 && x < gx1 && y >= gy0 && y < gy1;
          if (inside) {
            guideSum += cur[p];
            guideN += 1;
          }
          const g = Math.abs(cur[p + 1] - cur[p - 1]) + Math.abs(cur[p + W] - cur[p - W]);
          if (g < 0.08) continue;
          if (inside) {
            inSum += g;
            cx += x * g;
            cy += y * g;
            cw += g;
          } else {
            outSum += g;
          }
        }
      }

      // brilho medido na área onde o rosto deve estar
      const guideLum = guideN ? guideSum / guideN : lum;
      const sLum = clamp01(1 - Math.abs(guideLum - 0.5) / 0.45);
      const sSharp = clamp01(sharp / 0.0009);
      const sStable = had ? clamp01(1 - changed / (W * H) / 0.02) : 0;
      const sFrame = clamp01(inSum / (outSum * 0.5 + 0.05) / 1.8);

      metrics.lum = sLum;
      metrics.sharp = sSharp;
      metrics.stable = prev ? sStable : 0;
      metrics.frame = sFrame;
      metrics.score = 0.18 * sLum + 0.3 * sSharp + 0.2 * metrics.stable + 0.32 * sFrame;

      let rect = null;
      if (cw > 4) {
        rect = { x: cx / cw / W, y: cy / cw / H };
        rect.size = clamp01(inSum / (W * H) / 0.16) * 0.42 + 0.2;
      }
      return rect;
    };

    const advice = () => {
      if (metrics.stable < 0.6) return "Fique imóvel — a câmera está detectando movimento.";
      if (metrics.lum < 0.55) return "Ambiente muito escuro ou estourado. Ajuste a iluminação.";
      if (metrics.sharp < 0.55) return "Imagem desfocada. Aproxime-se da câmera.";
      if (metrics.frame < 0.55) return "Centralize o rosto dentro do quadro, de frente.";
      return "Ajustes aprovados. Mantenha a posição.";
    };

    /* Converte um retângulo normalizado do vídeo (0..1) para o espaço do
       canvas. O vídeo aparece com object-fit: cover e espelhado
       (scaleX(-1)); sem esta correção o desenho sai cortado e invertido. */
    const mapearParaTela = (r) => {
      const vw = video.videoWidth || 4;
      const vh = video.videoHeight || 3;
      const cw = canvas.clientWidth || vw;
      const ch = canvas.clientHeight || vh;
      const escala = Math.max(cw / vw, ch / vh);
      const dw = vw * escala;
      const dh = vh * escala;
      const x = (r.x * dw - (dw - cw) / 2) / cw;
      const y = (r.y * dh - (dh - ch) / 2) / ch;
      const w = (r.w * dw) / cw;
      const h = (r.h * dh) / ch;
      /* o vídeo é exibido espelhado: inverte o eixo horizontal */
      return { x: 1 - x - w, y, w, h };
    };

    const paintBox = (x, y, w, h) => {
      box.hidden = false;
      box.style.left = `${x * 100}%`;
      box.style.top = `${y * 100}%`;
      box.style.width = `${w * 100}%`;
      box.style.height = `${h * 100}%`;
    };

    const drawOverlay = (rect, label) => {
      const w = canvas.clientWidth || 640;
      const h = canvas.clientHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (!rect) return;
      /* rect chega normalizado no espaço do vídeo — convertemos para pixels */
      const r = mapearParaTela(rect);
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(65, 209, 140, 0.9)";
      ctx.strokeRect(r.x * w, r.y * h, r.w * w, r.h * h);
      ctx.fillStyle = "rgba(65, 209, 140, 0.9)";
      ctx.font = "600 11px ui-monospace, Consolas, monospace";
      ctx.fillText(label, r.x * w, Math.max(12, r.y * h - 6));
      ctx.restore();
    };

    const loop = async (now) => {
      raf = window.requestAnimationFrame(loop);
      if (!stream) return;

      if (lastAt) {
        const delta = now - lastAt;
        if (delta > 0) fps = fps ? fps * 0.8 + (1000 / delta) * 0.2 : 1000 / delta;
      }
      lastAt = now;

      let rect = null;

      if (detector) {
        try {
          if (now - lastDetect > 90) {
            lastDetect = now;
            const faces = await detector.detect(video);
            if (faces.length) {
              const f = faces[0].boundingBox;
              const w = video.videoWidth || 640;
              const h = video.videoHeight || 480;
              rect = { x: f.x / w, y: f.y / h, w: f.width / w, h: f.height / h };
              const tela = mapearParaTela(rect);
              paintBox(Math.max(0, tela.x), Math.max(0, tela.y), tela.w, tela.h);
              hold = Math.min(NEED, hold + 1);
            } else {
              hold = Math.max(0, hold - 3);
            }
          }
        } catch {
          detector = null;
        }
      }

      if (!detector) {
        let tracked = null;
        try {
          tracked = analyze();
        } catch {
          prev = null;
        }
        if (tracked) {
          rect = { x: tracked.x - tracked.size / 2, y: tracked.y - tracked.size * 0.62, w: tracked.size, h: tracked.size * 1.34 };
          const tela = mapearParaTela(rect);
          paintBox(Math.max(0, tela.x), Math.max(0, tela.y), tela.w, tela.h);
        } else {
          box.hidden = true;
        }
        hold = state() ? Math.min(NEED, hold + 1) : Math.max(0, hold - 2);
        CHIPS.forEach((k) => setChip(k, metrics[k], metrics[k] >= FLOOR ? "ok" : "warn"));
      } else {
        metrics.score = hold / NEED;
      }

      conf += (metrics.score * 100 - conf) * 0.18;
      setMeter(conf);
      drawOverlay(rect, state() ? "estável" : "ajustando");

      const enough = hold >= NEED;
      captureBtn.disabled = !enough;
      if (enough) {
        hudText.textContent = "leitura liberada";
        setStatus("Brilho, nitidez, imobilidade e enquadramento aprovados. Pode capturar.", "ok");
      } else if (hold > 2) {
        hudText.textContent = "concluindo leitura";
        setStatus(advice());
      } else {
        hudText.textContent = "ajuste o enquadramento";
        setStatus(advice());
      }
    };

    const start = async () => {
      if (!supported()) {
        fail("Este navegador não expõe acesso à câmera. Use Chrome ou Edge atualizados.");
        return;
      }
      reset();
      empty.hidden = false;
      emptyText.textContent = "Solicitando acesso à câmera…";
      setStatus("Aguardando permissão do navegador.", "ok");

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err) {
        const map = {
          NotAllowedError: "Permissão negada. Libere o acesso à câmera nas permissões do site.",
          NotFoundError: "Nenhuma câmera encontrada neste dispositivo.",
          NotReadableError: "A câmera está em uso por outro aplicativo.",
          OverconstrainedError: "A câmera não suporta o modo solicitado."
        };
        fail(map[err && err.name] || "Não foi possível acessar a câmera.");
        return;
      }

      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* alguns navegadores disparam play() mesmo com autoplay bloqueado */
      }
      await new Promise((resolve) => {
        if (video.videoWidth) return resolve();
        video.addEventListener("loadedmetadata", resolve, { once: true });
      });

      empty.hidden = true;
      hud.hidden = false;
      box.hidden = false;
      retryBtn.hidden = true;
      captureBtn.disabled = true;
      sub.textContent = "A leitura acontece no seu dispositivo; nenhuma imagem é enviada.";

      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        flipBtn.hidden = devices.filter((d) => d.kind === "videoinput").length < 2;
      }

      if ("FaceDetector" in window) {
        try {
          detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        } catch {
          detector = null;
        }
      }

      if (detector) {
        metricsOut.hidden = true;
        setStatus("Detector facial nativo disponível. Centralize o rosto no quadro.");
      } else {
        detector = null;
        metricsOut.hidden = false;
        sub.textContent = "Medindo brilho, nitidez, imobilidade e enquadramento. Tudo no seu dispositivo.";
        setStatus("Alinhamento automático: siga os avisos abaixo.");
      }

      lastAt = 0;
      prev = null;
      hold = 0;
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(loop);
    };

    const reset = () => {
      stop();
      prev = null;
      hold = 0;
      detector = null;
      setMeter(0);
      box.hidden = true;
      hud.hidden = true;
      metricsOut.hidden = true;
      captureBtn.disabled = true;
      flipBtn.hidden = true;
      retryBtn.hidden = true;
      sub.textContent = "Apresente seu rosto no quadro. A leitura acontece no seu dispositivo.";
    };

    const capture = () => {
      if (!stream) return;
      const w = video.videoWidth || 960;
      const h = video.videoHeight || 720;
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const octx = out.getContext("2d");
      octx.translate(w, 0);
      octx.scale(-1, 1);
      octx.drawImage(video, 0, 0, w, h);

      const value = conf.toFixed(2);
      const short = conf.toFixed(1);
      if (shot) {
        shot.src = out.toDataURL("image/jpeg", 0.82);
        shot.hidden = false;
      }
      if (viewport) viewport.classList.add("has-shot");
      if (faceBox) faceBox.hidden = true;

      const match = document.querySelector(".fid-match strong");
      if (match) match.textContent = `${short}%`;
      const first = document.querySelector(".fid-mini-item strong");
      if (first) first.textContent = `${value}%`;

      stop();
      setStatus("Biometria capturada e vinculada à matrícula #9842.", "ok");
      showToast(`Biometria registrada com ${short}% de qualidade de leitura.`);
      window.setTimeout(() => dialog.close(), 700);
    };

    openBtn.addEventListener("click", () => {
      dialog.showModal();
      start();
    });

    dialog.querySelectorAll("[data-fid-cam-close]").forEach((button) => {
      button.addEventListener("click", () => dialog.close());
    });

    dialog.addEventListener("close", stop);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    captureBtn.addEventListener("click", capture);
    retryBtn.addEventListener("click", start);
    flipBtn.addEventListener("click", () => {
      facing = facing === "user" ? "environment" : "user";
      start();
    });

    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") stop();
    });
  }
})();

/* Filtro do acervo de tacas (referencia: Galeria de Gloria) */
(() => {
  const buttons = Array.from(document.querySelectorAll("[data-gl-filter]"));
  if (!buttons.length) return;

  const dossiers = document.querySelectorAll("[data-gl-category]");
  const mode = document.querySelector(".gl-viewmode");

  const LABELS = {
    nacionais: "taças nacionais",
    regionais: "taças regionais",
    copas: "copas da indústria"
  };

  const apply = (key) => {
    let visible = 0;
    dossiers.forEach((card) => {
      const show = !key || card.dataset.glCategory === key;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (mode) {
      mode.innerHTML = key
        ? "Visualização: <b>" + visible + " " + (LABELS[key] || "do acervo") + "</b>"
        : "Visualização: <b>acervo completo</b>";
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const already = button.getAttribute("aria-selected") === "true";
      buttons.forEach((other) => other.setAttribute("aria-selected", "false"));
      if (already) {
        apply(null);
        return;
      }
      button.setAttribute("aria-selected", "true");
      apply(button.dataset.glFilter);
    });
  });

  apply(null);
})();

/* Mapa interativo da Arena */
(() => {
  const sectors = document.querySelectorAll(".arena-sector");
  const selectionBox = document.getElementById("arena-selection");
  if (!sectors.length || !selectionBox) return;

  let selectedSector = null;

  const sectorNames = {
    norte: "Setor Norte",
    leste: "Setor Leste",
    sul: "Setor Sul",
    "oeste-superior": "Setor Oeste Superior",
    "oeste-inferior": "Setor Oeste Inferior"
  };

  const selectSector = (sector) => {
    sectors.forEach((s) => s.classList.remove("selected"));
    sector.classList.add("selected");
    selectedSector = sector.dataset.setor;
    const name = sectorNames[selectedSector] || selectedSector;
    const portoes = sector.dataset.portoes || "";
    selectionBox.innerHTML = `<strong>${name}</strong><br><small>Portões: ${portoes}</small>`;
    selectionBox.classList.add("has-selection");
  };

  sectors.forEach((sector) => {
    sector.addEventListener("click", () => selectSector(sector));
    sector.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectSector(sector);
      }
    });
  });
})();

/* Sessão do Sócio Torcedor e tela de login */
(() => {
  // ------------------------------------------------------------------
  // Sessão do Sócio Torcedor
  // ------------------------------------------------------------------
  const SESSION_KEY = "senai-torcedor:session";

  // Notificacao temporaria (reaproveita o toast global definido no bloco principal)
  const notify = (message) => {
    if (typeof window.SenaiPortal?.showToast === "function") {
      window.SenaiPortal.showToast(message);
      return;
    }
    const toastEl = document.getElementById("toast");
    const toastText = document.getElementById("toast-message");
    if (!toastEl || !toastText) return;
    toastText.textContent = message;
    toastEl.classList.add("show");
    window.setTimeout(() => toastEl.classList.remove("show"), 4200);
  };

  // Contrato da API de autenticação. Ajuste as URLs para o seu back-end.
  // POST login   -> { "usuario": "...", "senha": "..." }
  // <- 200        -> { "token": "...", "usuario": { "nome", "email", "plano", "matricula" } }
  // <- 401/403   -> { "erro": "..." }            credenciais invalidas
  // <- 422        -> { "erro": "...", "campos": { "senha": "..." } }
  const API = {
    loginUrl: "https://api.senai-fc.com.br/v1/auth/login",
    recoverUrl: "https://api.senai-fc.com.br/v1/auth/recover",
    timeoutMs: 8000,
    // Enquanto nao houver back-end no ar, a sessao e simulada localmente
    // para o portal continuar navegavel. Desligue quando a API responder.
    demoFallback: true
  };

  const readSession = () => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const writeSession = (session, remember) => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
      (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      /* armazenamento indisponivel */
    }
  };

  const clearSession = () => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      /* ignore */
    }
  };

  const firstName = (name) => String(name || "Operário").trim().split(/\s+/)[0];

  // Preenche os dados do socio logado em qualquer pagina do portal
  const applySession = () => {
    const session = readSession();
    if (!session || !session.usuario) return session;

    const usuario = session.usuario;
    const nome = usuario.nome || "Operário";
    const matricula = usuario.matricula || "#9842";
    const plano = usuario.plano || "Master";

    document.querySelectorAll("[data-user-name]").forEach((el) => { el.textContent = nome; });
    document.querySelectorAll("[data-user-first-name]").forEach((el) => { el.textContent = firstName(nome); });
    document.querySelectorAll("[data-user-full-name]").forEach((el) => { el.textContent = nome; });
    document.querySelectorAll("[data-user-matricula]").forEach((el) => { el.textContent = `Matrícula ${matricula}`; });
    document.querySelectorAll("[data-user-matricula-id]").forEach((el) => { el.textContent = matricula; });
    document.querySelectorAll("[data-user-plan]").forEach((el) => { el.textContent = plano; });

    // O botao de perfil virou link para a tela de configuracoes (perfil.html)
    const profileButton = document.querySelector(".profile-button");
    if (profileButton) {
      profileButton.setAttribute("aria-label", `Abrir configurações do perfil — Sócio ${plano} ${matricula}`);
      profileButton.setAttribute("title", `Perfil do Sócio ${plano} ${matricula}`);
    }

    return session;
  };

  const currentSession = applySession();

  // Saudacao exibida logo apos o login (parametro ?bem-vindo=1)
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("bem-vindo") && currentSession?.usuario?.nome) {
      notify(`Bem-vindo de volta, ${firstName(currentSession.usuario.nome)}!`);
      params.delete("bem-vindo");
      const clean = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (clean ? `?${clean}` : ""));
    }
  } catch (error) {
    /* URL nao manipulavel */
  }

  // ------------------------------------------------------------------
  // Tela de perfil — configuracoes da conta
  // ------------------------------------------------------------------
  const PROFILE_KEY = "senai-torcedor:perfil";

  const PROFILE_DEFAULTS = {
    fields: {
      nome: "Operário",
      email: "operario@senai.com.br",
      telefone: "(11) 98877-6655",
      cpf: "",
      nascimento: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      cidade: "",
      uf: "",
      visibilidade: "privado"
    },
    switches: {
      cpf: true,
      lembrete: true,
      comunicados: true,
      marketing: false,
      faceid: true,
      localizacao: false,
      beneficios: true,
      "dois-fatores": false,
      ingresso: true
    },
    avatar: ""
  };

  const readProfile = () => {
    const base = {
      fields: { ...PROFILE_DEFAULTS.fields },
      switches: { ...PROFILE_DEFAULTS.switches },
      avatar: ""
    };
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      return {
        fields: { ...base.fields, ...(saved?.fields || {}) },
        switches: { ...base.switches, ...(saved?.switches || {}) },
        avatar: typeof saved?.avatar === "string" ? saved.avatar : ""
      };
    } catch (error) {
      return base;
    }
  };

  const writeProfile = (profile) => {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      return false;
    }
  };

  // Reduz a foto para 256px antes de guardar (localStorage tem limite de ~5 MB)
  const shrinkImage = (dataUrl, size) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const scale = Math.min(1, size / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (error) {
        resolve(dataUrl);
      }
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });

  const profilePage = document.querySelector(".pf-page");
  if (profilePage) initProfile();

  function initProfile() {
    const el = (id) => document.getElementById(id);
    const statusEl = el("pf-status");
    const avatarBox = el("pf-avatar");
    const avatarInitials = el("pf-avatar-iniciais");
    const avatarInput = el("pf-avatar-input");
    const avatarButton = el("pf-avatar-btn");
    const strengthBox = el("pf-forca");
    const passwordInput = el("pf-senha-nova");
    const cpfInput = el("pf-cpf");
    const cepInput = el("pf-cep");
    const phoneInput = el("pf-telefone");
    const fieldInputs = [...profilePage.querySelectorAll("[name]")];
    const switchButtons = [...profilePage.querySelectorAll(".pf-switch[data-setting]")];

    let saved = readProfile();
    let pendingAvatar = null;

    // Sem perfil salvo, herda os dados da sessao ativa
    try {
      const hasProfile = !!window.localStorage.getItem(PROFILE_KEY);
      const session = readSession();
      if (!hasProfile && session?.usuario) {
        if (session.usuario.nome) saved.fields.nome = session.usuario.nome;
        if (session.usuario.email) saved.fields.email = session.usuario.email;
      }
    } catch (error) {
      /* armazenamento indisponivel */
    }

    const initialsFrom = (name) => {
      const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return "OP";
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const renderAvatar = (profile) => {
      if (!avatarBox) return;
      const current = avatarBox.querySelector("img");
      if (profile.avatar) {
        if (current) {
          current.src = profile.avatar;
        } else {
          const img = document.createElement("img");
          img.alt = "";
          img.src = profile.avatar;
          avatarBox.appendChild(img);
        }
        if (avatarInitials) avatarInitials.hidden = true;
        return;
      }
      if (current) current.remove();
      if (avatarInitials) {
        avatarInitials.hidden = false;
        avatarInitials.textContent = initialsFrom(profile.fields.nome);
      }
    };

    const fill = (profile) => {
      fieldInputs.forEach((input) => {
        const key = input.name;
        if (!(key in profile.fields)) return;
        const value = profile.fields[key] ?? "";
        if (input.tagName === "SELECT") {
          const index = [...input.options].findIndex((option) => option.value === value);
          input.selectedIndex = index >= 0 ? index : 0;
        } else {
          input.value = value;
        }
      });
      switchButtons.forEach((button) => {
        button.setAttribute("aria-checked", String(profile.switches[button.dataset.setting] !== false));
      });
      pendingAvatar = null;
      renderAvatar(profile);
      updateChecks();
      updateStrength();
    };

    const collect = () => {
      const fields = { ...saved.fields };
      fieldInputs.forEach((input) => {
        if (input.name in fields) fields[input.name] = input.value.trim();
      });
      const switches = { ...saved.switches };
      switchButtons.forEach((button) => {
        switches[button.dataset.setting] = button.getAttribute("aria-checked") === "true";
      });
      return { fields, switches, avatar: pendingAvatar ?? saved.avatar };
    };

    const setStatus = (state, message) => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.toggle("is-dirty", state === "dirty");
      statusEl.classList.toggle("is-saved", state === "saved");
    };

    const markDirty = () => setStatus("dirty", "Alterações não salvas");

    // Atualiza a lista de "Conta e acesso" conforme os dados preenchidos
    const updateChecks = () => {
      const cpfItem = el("pf-check-cpf");
      if (cpfItem) {
        const hasCpf = Boolean(cpfInput?.value.trim());
        cpfItem.className = hasCpf ? "ok" : "warn";
        cpfItem.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-${hasCpf ? "check" : "lock"}"></use></svg>CPF ${hasCpf ? "informado" : "não informado"}`;
      }
      const twofaItem = el("pf-check-2fa");
      if (twofaItem) {
        const on = document.querySelector('.pf-switch[data-setting="dois-fatores"]')?.getAttribute("aria-checked") === "true";
        twofaItem.className = on ? "ok" : "warn";
        twofaItem.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#icon-${on ? "check" : "lock"}"></use></svg>Verificação em duas etapas ${on ? "ativada" : "desativada"}`;
      }
    };

    // Medidor de forca da senha
    const updateStrength = () => {
      if (!strengthBox) return;
      const value = passwordInput?.value || "";
      let nivel = 0;
      if (value.length >= 8) nivel = 1;
      if (value.length >= 10 && /[A-Z]/.test(value) && /[0-9]/.test(value)) nivel = 2;
      if (value.length >= 12 && /[^A-Za-z0-9]/.test(value)) nivel = 3;
      const labels = ["Mínimo de 8 caracteres", "Senha fraca", "Senha razoável", "Senha forte"];
      strengthBox.querySelectorAll("[data-nivel]").forEach((node) => node.setAttribute("data-nivel", String(nivel)));
      const text = strengthBox.querySelector(".pf-strength-text");
      if (text) text.textContent = value ? labels[nivel] : "Mínimo de 8 caracteres";
    };

    // Mascaras de CPF, CEP e telefone
    const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
    const maskCpf = (value) => {
      const d = onlyDigits(value).slice(0, 11);
      return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
    };
    const maskCep = (value) => {
      const d = onlyDigits(value).slice(0, 8);
      return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    };
    const maskPhone = (value) => {
      const d = onlyDigits(value).slice(0, 11);
      if (d.length <= 2) return d;
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    };

    const applyMask = (input, mask) => {
      input?.addEventListener("input", () => {
        const masked = mask(input.value);
        if (input.value !== masked) input.value = masked;
      });
    };

    applyMask(cpfInput, maskCpf);
    applyMask(cepInput, maskCep);
    applyMask(phoneInput, maskPhone);

    // Atualiza o cabecalho e a sessao global do portal
    const syncSession = (profile) => {
      const session = readSession();
      if (session?.usuario) {
        session.usuario.nome = profile.fields.nome;
        session.usuario.email = profile.fields.email;
        let remembered = false;
        try {
          remembered = !!window.localStorage.getItem(SESSION_KEY);
        } catch (error) {
          remembered = false;
        }
        writeSession(session, remembered);
      }
      applySession();
      document.querySelectorAll("[data-user-name]").forEach((node) => { node.textContent = profile.fields.nome; });
      document.querySelectorAll("[data-user-full-name]").forEach((node) => { node.textContent = profile.fields.nome; });
    };

    const save = () => {
      const forms = [el("pf-form-dados"), el("pf-form-endereco"), el("pf-form-senha")];
      for (const form of forms) {
        if (form && !form.checkValidity()) {
          form.reportValidity();
          return;
        }
      }
      const profile = collect();
      if (!writeProfile(profile)) {
        notify("Não foi possível salvar as alterações neste navegador.");
        return;
      }
      saved = profile;
      pendingAvatar = null;
      syncSession(profile);
      renderAvatar(profile);
      setStatus("saved", "Alterações salvas agora");
      notify("Perfil atualizado com sucesso.");
    };

    const discard = () => {
      saved = readProfile();
      fill(saved);
      setStatus("idle", "Nenhuma alteração pendente");
      notify("Alterações descartadas.");
    };

    switchButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        const on = button.getAttribute("aria-checked") === "true";
        button.setAttribute("aria-checked", String(!on));
        updateChecks();
        markDirty();
      });
    });

    fieldInputs.forEach((input) => {
      input.addEventListener("input", () => {
        updateChecks();
        markDirty();
      });
      input.addEventListener("change", () => {
        updateChecks();
        markDirty();
      });
    });

    [el("pf-form-dados"), el("pf-form-endereco"), el("pf-form-senha")].forEach((form) => {
      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        save();
      });
    });

    el("pf-salvar")?.addEventListener("click", save);
    el("pf-descartar")?.addEventListener("click", discard);

    passwordInput?.addEventListener("input", updateStrength);

    avatarButton?.addEventListener("click", () => avatarInput?.click());
    avatarInput?.addEventListener("change", () => {
      const file = avatarInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        notify("Escolha um arquivo de imagem.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        shrinkImage(String(reader.result || ""), 256).then((small) => {
          pendingAvatar = small;
          renderAvatar({ fields: saved.fields, avatar: small });
          markDirty();
          notify("Foto atualizada. Salve para confirmar.");
        });
      };
      reader.readAsDataURL(file);
    });

    fill(saved);
    setStatus("idle", "Nenhuma alteração pendente");
  }

  // ------------------------------------------------------------------
  // Tela de login
  // ------------------------------------------------------------------
  const loginForm = document.getElementById("login-form");
  if (loginForm) initLogin();

  function initLogin() {
    const form = document.getElementById("login-form");
    const recoverForm = document.getElementById("login-recuperar");
    const sessionCard = document.getElementById("login-sessao");
    const userInput = document.getElementById("login-usuario");
    const passInput = document.getElementById("login-senha");
    const toggleButton = document.getElementById("login-ver-senha");
    const rememberInput = document.getElementById("login-lembrar");
    const forgotButton = document.getElementById("login-esqueci");
    const backButton = document.getElementById("login-voltar");
    const exitButton = document.getElementById("login-sair");
    if (!form || !userInput || !passInput) return;

    const setError = (input, message) => {
      const control = input.closest(".login-control");
      const errorEl = document.getElementById(`${input.id}-erro`);
      if (message) {
        control?.classList.add("is-invalid");
        input.setAttribute("aria-invalid", "true");
        if (errorEl) errorEl.textContent = message;
      } else {
        control?.classList.remove("is-invalid");
        input.removeAttribute("aria-invalid");
        if (errorEl) errorEl.textContent = "";
      }
    };

    const setLoading = (button, loading) => {
      if (!button) return;
      button.classList.toggle("is-loading", loading);
      button.disabled = loading;
      button.setAttribute("aria-busy", String(loading));
    };

    const validateLogin = () => {
      let valid = true;
      const user = userInput.value.trim();
      const pass = passInput.value;

      if (!user) {
        setError(userInput, "Informe seu e-mail ou matrícula.");
        valid = false;
      } else if (user.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(user)) {
        setError(userInput, "Digite um e-mail válido.");
        valid = false;
      } else if (!user.includes("@") && !/^#?\d{3,8}$/.test(user.replace(/\s/g, ""))) {
        setError(userInput, "Use um e-mail válido ou a matrícula (ex.: #9842).");
        valid = false;
      } else {
        setError(userInput, "");
      }

      if (!pass) {
        setError(passInput, "Informe sua senha.");
        valid = false;
      } else if (pass.length < 6) {
        setError(passInput, "A senha precisa ter ao menos 6 caracteres.");
        valid = false;
      } else {
        setError(passInput, "");
      }

      return valid;
    };

    // Perfil simulado quando a API ainda nao responde
    const demoProfile = (user) => {
      const base = user.includes("@") ? user.split("@")[0] : user.replace(/^#/, "");
      const words = base
        .split(/[._\s-]+/)
        .map((word) => word.replace(/\d+$/, ""))
        .filter(Boolean);
      const nome = words.length
        ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
        : "Operário";
      return {
        nome,
        email: user.includes("@") ? user : `${user}@senai.com`,
        plano: "Master",
        matricula: "#9842"
      };
    };

    const requestJson = async (url, payload) => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), API.timeoutMs);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        let data = null;
        try {
          data = await response.json();
        } catch (error) {
          data = null;
        }
        return { ok: response.ok, status: response.status, data };
      } catch (error) {
        return { ok: false, status: 0, data: null, offline: true };
      } finally {
        window.clearTimeout(timer);
      }
    };

    const authenticate = async (user, pass) => {
      const result = await requestJson(API.loginUrl, { usuario: user, senha: pass });
      if (result.ok) return result;

      const semBackend = result.offline || result.status === 404 || result.status === 405 || result.status === 501 || result.status >= 500;
      if (API.demoFallback && semBackend) {
        return {
          ok: true,
          status: 200,
          data: { token: `demo-${Date.now()}`, usuario: demoProfile(user) },
          demo: true
        };
      }
      return result;
    };

    const showSessionCard = (session) => {
      const usuario = session.usuario || {};
      const nome = usuario.nome || "Operário";
      const nameEl = document.getElementById("login-sessao-nome");
      const mailEl = document.getElementById("login-sessao-email");
      const firstEl = document.getElementById("login-sessao-primeiro");
      if (nameEl) nameEl.textContent = nome;
      if (mailEl) mailEl.textContent = usuario.email || "";
      if (firstEl) firstEl.textContent = firstName(nome);
      form.hidden = true;
      if (recoverForm) recoverForm.hidden = true;
      if (sessionCard) sessionCard.hidden = false;
    };

    const showLoginForm = () => {
      if (sessionCard) sessionCard.hidden = true;
      form.hidden = false;
    };

    // Estado "já conectado"
    const stored = readSession();
    if (stored && stored.usuario) {
      showSessionCard(stored);
    } else if (stored?.usuario?.email) {
      userInput.value = stored.usuario.email;
    }

    // Mostrar / ocultar senha
    toggleButton?.addEventListener("click", () => {
      const showing = passInput.type === "text";
      passInput.type = showing ? "password" : "text";
      toggleButton.setAttribute("aria-pressed", String(!showing));
      toggleButton.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
      const use = toggleButton.querySelector("use");
      if (use) use.setAttribute("href", showing ? "#icon-eye" : "#icon-eye-off");
      passInput.focus();
    });

    // Revalidação enquanto o usuário digita
    [userInput, passInput].forEach((input) => {
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") validateLogin();
      });
      input.addEventListener("blur", () => {
        if (input.value.trim()) validateLogin();
      });
    });

    // Envio do formulário
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validateLogin()) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }

      const button = document.getElementById("login-enviar");
      setLoading(button, true);
      let redirecting = false;

      try {
        const result = await authenticate(userInput.value.trim(), passInput.value);

        if (result.ok) {
          const payload = result.data?.usuario || result.data || {};
          const session = {
            token: result.data?.token || "",
            usuario: {
              nome: payload.nome || "Operário",
              email: payload.email || userInput.value.trim(),
              plano: payload.plano || "Master",
              matricula: payload.matricula || "#9842"
            },
            em: Date.now()
          };

          writeSession(session, rememberInput.checked);
          applySession();
          redirecting = true;
          // a saudacao aparece no portal, logo apos o redirecionamento
          window.setTimeout(() => {
            window.location.href = "senai-torcedor-web.html?bem-vindo=1";
          }, 450);
          return;
        }

        if (result.status === 401 || result.status === 403) {
          setError(userInput, "");
          setError(passInput, "Usuário ou senha incorretos.");
          passInput.focus();
        } else if (result.status === 422 && result.data?.campos) {
          const campos = result.data.campos;
          setError(userInput, campos.usuario || campos.email || "");
          setError(passInput, campos.senha || campos.password || "");
          form.querySelector('[aria-invalid="true"]')?.focus();
        } else {
          notify(result.data?.erro || "Não foi possível concluir o acesso. Tente novamente.");
        }
      } catch (error) {
        notify("Não foi possível falar com o servidor. Tente novamente.");
      } finally {
        if (!redirecting) setLoading(button, false);
      }
    });

    // Recuperação de senha
    forgotButton?.addEventListener("click", () => {
      form.hidden = true;
      if (sessionCard) sessionCard.hidden = true;
      if (!recoverForm) return;
      recoverForm.hidden = false;
      const input = document.getElementById("recuperar-usuario");
      if (input) {
        input.value = userInput.value.trim();
        input.focus();
      }
    });

    backButton?.addEventListener("click", () => {
      if (recoverForm) recoverForm.hidden = true;
      form.hidden = false;
      userInput.focus();
    });

    recoverForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("recuperar-usuario");
      if (!input) return;
      const value = input.value.trim();

      if (!value) {
        setError(input, "Informe seu e-mail ou matrícula.");
        input.focus();
        return;
      }
      setError(input, "");

      const button = recoverForm.querySelector(".login-submit");
      setLoading(button, true);
      const result = await requestJson(API.recoverUrl, { usuario: value });
      setLoading(button, false);

      const entregue = result.ok || (API.demoFallback && (result.offline || result.status === 404 || result.status >= 500));
      if (entregue) {
        notify("Se o e-mail estiver cadastrado, o link de redefinição foi enviado.");
        recoverForm.hidden = true;
        form.hidden = false;
        userInput.focus();
      } else {
        notify(result.data?.erro || "Não foi possível enviar o link agora. Tente novamente.");
      }
    });

    // Encerrar a sessão
    exitButton?.addEventListener("click", () => {
      clearSession();
      passInput.value = "";
      showLoginForm();
      notify("Sessão encerrada.");
      userInput.focus();
    });
  }
})();
