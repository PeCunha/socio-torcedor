/* ==========================================================================
   Renderização da temporada.

   Lê os dados de `assets/js/temporada.js` e escreve no DOM:
     • o jogo em destaque (hero)
     • a lista de próximos jogos
     • a lista de resultados
     • o card "Último jogo" da coluna lateral
     • o alvo da contagem regressiva
     • o contador de "N próximos jogos"

   Nada aqui depende de markup fixo: se o calendário mudar em temporada.js,
   a home inteira se ajusta sozinha.
   ========================================================================== */
(() => {
  "use strict";

  const Temporada = window.SenaiTemporada;
  if (!Temporada) return;

  /* ------------------------------------------------------------------ */
  /* Datas em pt-BR — listas locais, sem depender do ICU do navegador.   */
  /* ------------------------------------------------------------------ */
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const MESES_LONGOS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const SEMANA_CURTA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const dia2 = (n) => String(n).padStart(2, "0");
  const dataCurta = (d) => `${dia2(d.getDate())} ${MESES[d.getMonth()]}`;
  const dataCurtaCap = (d) => {
    const mes = MESES[d.getMonth()];
    return `${dia2(d.getDate())} ${mes[0].toUpperCase()}${mes.slice(1)}`;
  };
  const dataBR = (d) => `${dia2(d.getDate())}/${dia2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const dataLonga = (d) => `${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}, ${d.getHours()}:${dia2(d.getMinutes())}`;
  const dataHero = (d) => `${SEMANA_CURTA[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
  const dataExtenso = (d) => `${SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}`;

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const setTexto = (el, texto) => {
    if (el) el.textContent = texto;
  };
  const icone = (nome) => `<svg class="icon" aria-hidden="true"><use href="#icon-${nome}"></use></svg>`;
  const isSenai = (time) => time.nome === "SENAI F.C.";
  const tomCrest = (time) => (isSenai(time) ? "" : " neutral");
  const rotuloRodada = (jogo) => (jogo.etapa ? jogo.etapa : `Rodada ${dia2(jogo.rodada)}`);
  const tituloPartida = (jogo) => `${jogo.mandante.nome} × ${jogo.visitante.nome}`;

  /* ------------------------------------------------------------------ */
  /* Blocos de time                                                      */
  /* ------------------------------------------------------------------ */
  function blocoTime(time, subtitulo, away) {
    const escudo = `<span class="small-crest${tomCrest(time)}" aria-hidden="true">${time.sigla}</span>`;
    const copy = `<div class="team-copy"><strong>${time.nome}</strong><span>${subtitulo}</span></div>`;
    return away
      ? `<div class="team-block away">${copy}${escudo}</div>`
      : `<div class="team-block">${escudo}${copy}</div>`;
  }

  function blocoResultado(time, lado) {
    return `<div class="result-team${lado === "Fora" ? " away" : ""}"><span class="small-crest${tomCrest(time)}" aria-hidden="true">${time.sigla}</span><div class="team-copy"><strong>${time.nome}</strong><span>${lado}</span></div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Card de jogo agendado                                               */
  /* ------------------------------------------------------------------ */
  function cardProximo(jogo) {
    const data = new Date(jogo.dataISO);
    const casa = isSenai(jogo.mandante);
    const subMandante = casa ? "Em casa" : jogo.mandante.posicao;
    const subVisitante = isSenai(jogo.visitante) ? jogo.visitante.posicao : jogo.visitante.posicao;
    const pill = jogo.statusTom === "neutro" ? "status-pill neutral" : "status-pill";

    const banner = jogo.evento
      ? `<div class="event-banner"><p><strong>${jogo.evento.titulo}</strong> • ${jogo.evento.texto}</p><button class="ghost-button" type="button" data-message="${jogo.evento.mensagem}">${jogo.evento.acao}</button></div>`
      : "";

    return `
      <article class="match-card" data-jogo="${jogo.id}">
        <header class="match-card-header">
          <div class="round-label"><span>${rotuloRodada(jogo)}</span> • ${dataCurtaCap(data)} • ${SEMANA[data.getDay()]}</div>
          <span class="${pill}">${jogo.statusTexto}</span>
        </header>
        <div class="match-card-body">
          <div class="match-row">
            ${blocoTime(jogo.mandante, subMandante, false)}
            <div class="card-time"><strong>${jogo.hora}</strong><span>${casa ? "Casa" : "Fora"}</span></div>
            ${blocoTime(jogo.visitante, subVisitante, true)}
          </div>
          <div class="match-details">
            <span class="match-note">${icone(jogo.nota.icone)}${jogo.nota.texto}</span>
            <div class="match-actions">
              <button class="ghost-button" type="button" data-message="${jogo.acao.mensagem}">${jogo.acao.rotulo}</button>
              <button class="secondary-button js-reserve" type="button" data-match="${tituloPartida(jogo)} • ${dataBR(data)}">Reservar</button>
            </div>
          </div>
        </div>
        ${banner}
      </article>`;
  }

  /* ------------------------------------------------------------------ */
  /* Card de resultado                                                    */
  /* ------------------------------------------------------------------ */
  function cardResultado(jogo) {
    const data = new Date(jogo.dataISO);
    const [golsCasa, golsFora] = jogo.placar;

    return `
      <article class="result-card" data-jogo="${jogo.id}">
        <header class="result-card-header">
          <div class="round-label"><span>${rotuloRodada(jogo)}</span> • ${dataCurtaCap(data)}</div>
          <span class="status-pill neutral">Encerrado</span>
        </header>
        <div class="result-card-body">
          ${blocoResultado(jogo.mandante, "Casa")}
          <div class="result-score">${golsCasa} <span>×</span> ${golsFora}</div>
          ${blocoResultado(jogo.visitante, "Fora")}
        </div>
        <div class="result-summary">${jogo.gols} <button class="text-button" type="button" data-message="${jogo.resumo}">Ver súmula ${icone("arrow")}</button></div>
      </article>`;
  }

  /* ------------------------------------------------------------------ */
  /* Render principal                                                    */
  /* ------------------------------------------------------------------ */
  function render() {
    const agendados = Temporada.agendados();
    const concluidos = Temporada.concluidos();
    const destaque = agendados[0];
    const ultimoJogo = concluidos[0];

    /* ---- Contador de jogos restantes -------------------------------- */
    setTexto($("[data-match-count]"), `${agendados.length} próximos jogos`);

    /* ---- Destaque do hero ------------------------------------------ */
    if (destaque) {
      const data = new Date(destaque.dataISO);
      const heroTimes = $$(".featured-team");

      if (heroTimes[0]) {
        setTexto($(".crest", heroTimes[0]), destaque.mandante.sigla);
        setTexto($("h2", heroTimes[0]), destaque.mandante.nome);
        setTexto($("p", heroTimes[0]), `Mandante • ${destaque.mandante.posicao}`);
      }
      if (heroTimes[1]) {
        setTexto($(".crest", heroTimes[1]), destaque.visitante.sigla);
        setTexto($("h2", heroTimes[1]), destaque.visitante.nome);
        setTexto($("p", heroTimes[1]), `Visitante • ${destaque.visitante.posicao}`);
      }

      const blocoTempo = $(".match-time-block");
      if (blocoTempo) {
        setTexto($(".time", blocoTempo), destaque.hora);
        setTexto($(".date", blocoTempo), dataHero(data));
        setTexto(
          $(".versus-line", blocoTempo),
          destaque.rodada ? `Jogo ${destaque.rodada} / ${Temporada.TOTAL_RODADAS}` : "Próximo jogo"
        );
        blocoTempo.setAttribute("aria-label", `${dataExtenso(data)}, às ${destaque.hora.replace(":", " horas e ")} minutos`);
      }

      /* ---- Alvo da contagem regressiva ----------------------------- */
      const countdown = $("[data-countdown]");
      if (countdown) {
        countdown.dataset.countdown = destaque.dataISO;
        setTexto($("[data-countdown-date]", countdown), dataLonga(data));
        const botao = $(".js-reserve", countdown);
        if (botao) botao.dataset.match = `${tituloPartida(destaque)} • ${dataBR(data)}`;
      }
    }

    /* ---- Lista de próximos jogos ----------------------------------- */
    const listaProximos = $("[data-match-list]");
    if (listaProximos) listaProximos.innerHTML = agendados.map(cardProximo).join("");

    /* ---- Lista de resultados --------------------------------------- */
    const listaResultados = $("[data-result-list]");
    if (listaResultados) listaResultados.innerHTML = concluidos.map(cardResultado).join("");

    /* ---- Card "Último jogo" ---------------------------------------- */
    const cardUltimo = $("[data-last-match]");
    if (cardUltimo && ultimoJogo) {
      const [golsCasa, golsFora] = ultimoJogo.placar;
      const casa = isSenai(ultimoJogo.mandante);
      const diferenca = casa ? golsCasa - golsFora : golsFora - golsCasa;
      const sinal = diferenca > 0 ? "V" : diferenca < 0 ? "D" : "E";

      setTexto($("[data-last-result]", cardUltimo), `${golsCasa} × ${golsFora} • ${sinal}`);
      setTexto($("[data-last-home]", cardUltimo), ultimoJogo.mandante.curto);
      setTexto($("[data-last-away]", cardUltimo), ultimoJogo.visitante.curto);
      setTexto($("[data-last-score]", cardUltimo), `${golsCasa} × ${golsFora}`);
      setTexto($("[data-last-goals]", cardUltimo), ultimoJogo.gols);
    }

    /* ---- Marca os cards renderizados para os testes de teclado ------ */
    $$("[data-match-list] .match-card, [data-result-list] .result-card").forEach((card) => {
      card.setAttribute("tabindex", "-1");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
