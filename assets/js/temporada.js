/* ==========================================================================
   Calendário da Copa Indústria 2026 — fonte única de verdade do portal.

   Toda a agenda (destaque, próximos jogos, resultados, contagem
   regressiva, número de jogos restantes e card do último jogo) é gerada a
   partir deste arquivo. Para atualizar a temporada, edite apenas a
   constante JOGOS abaixo.

   Cada jogo:
     id            identificador estável (usado em data-jogo)
     etapa         "Pré-temporada" ou null
     rodada        número da rodada (1..5) ou null
     dataISO       data/hora com fuso — usada pelo countdown e pela ordenação
     hora          horário exibido (HH:MM)
     mandante      { nome, sigla, posicao, curto }
     visitante     { nome, sigla, posicao, curto }
     placar        [gols mandante, gols visitante] — null enquanto não jogou
     gols          resumo dos gols (aparece no card de resultado)
     resumo        frase de fechamento (aparece na notificação)
     status        "proximo" | "encerrado"
     statusTexto   etiqueta exibida no card do jogo
     statusTom     "ok" | "neutro" — define a cor da etiqueta
     nota          { icone, texto } aviso do card
     acao          { rotulo, mensagem } botão secundário
     evento        { titulo, texto, acao, mensagem } faixa promocional
   ========================================================================== */
(() => {
  "use strict";

  const JOGOS = [
    /* ------------------------------------------------------------------ */
    /* Resultados                                                          */
    /* ------------------------------------------------------------------ */
    {
      id: "pre-20set",
      etapa: "Pré-temporada",
      rodada: null,
      dataISO: "2026-09-20T16:00:00-03:00",
      hora: "16:00",
      mandante: { nome: "Automação FC", sigla: "A", posicao: "5º colocado", curto: "Automação" },
      visitante: { nome: "SENAI F.C.", sigla: "S", posicao: "1º colocado", curto: "SENAI F.C." },
      placar: [1, 1],
      gols: "Teixeira 90'.",
      resumo: "Teixeira marcou o gol de empate nos minutos finais.",
      status: "encerrado"
    },
    {
      id: "pre-27set",
      etapa: "Pré-temporada",
      rodada: null,
      dataISO: "2026-09-27T16:00:00-03:00",
      hora: "16:00",
      mandante: { nome: "Polímeros United", sigla: "P", posicao: "6º colocado", curto: "Polímeros" },
      visitante: { nome: "SENAI F.C.", sigla: "S", posicao: "1º colocado", curto: "SENAI F.C." },
      placar: [0, 2],
      gols: "Rocha 31' e Lima 64'.",
      resumo: "Gols de Rocha e Lima garantiram a vitória fora de casa.",
      status: "encerrado"
    },
    {
      id: "r01",
      etapa: null,
      rodada: 1,
      dataISO: "2026-10-04T16:00:00-03:00",
      hora: "16:00",
      mandante: { nome: "SENAI F.C.", sigla: "S", posicao: "1º colocado", curto: "SENAI F.C." },
      visitante: { nome: "Metalúrgica F.C.", sigla: "M", posicao: "2º colocado", curto: "Metalúrgica" },
      placar: [3, 1],
      gols: "Lima 22', Rocha 34' e Teixeira 81'.",
      resumo: "Vitória por 3 a 1 com gol de Teixeira nos minutos finais.",
      status: "encerrado"
    },
    {
      id: "r02",
      etapa: null,
      rodada: 2,
      dataISO: "2026-10-18T16:00:00-03:00",
      hora: "16:00",
      mandante: { nome: "SENAI F.C.", sigla: "S", posicao: "1º colocado", curto: "SENAI F.C." },
      visitante: { nome: "Eletro Volt AC", sigla: "E", posicao: "4º colocado", curto: "Eletro Volt AC" },
      placar: [2, 1],
      gols: "Rocha 51' e Lima 78'.",
      resumo: "Vitória suada com gol de Lima aos 78 minutos.",
      status: "encerrado"
    },

    /* ------------------------------------------------------------------ */
    /* Próximos jogos                                                      */
    /* ------------------------------------------------------------------ */
    {
      id: "r03",
      etapa: null,
      rodada: 3,
      dataISO: "2026-10-25T19:30:00-03:00",
      hora: "19:30",
      mandante: { nome: "SENAI F.C.", sigla: "S", posicao: "1º colocado", curto: "SENAI F.C." },
      visitante: { nome: "Mecânica Stars", sigla: "M", posicao: "3º colocado", curto: "Mecânica Stars" },
      placar: null,
      status: "proximo",
      statusTexto: "Ingressos disponíveis",
      statusTom: "ok",
      nota: { icone: "shield", texto: "Entrada rápida com Face ID" },
      acao: { rotulo: "Prévia", mensagem: "Prévia da Rodada 03 será publicada às 18h." }
    },
    {
      id: "r04",
      etapa: null,
      rodada: 4,
      dataISO: "2026-11-01T16:00:00-03:00",
      hora: "16:00",
      mandante: { nome: "Automação FC", sigla: "A", posicao: "5º colocado", curto: "Automação" },
      visitante: { nome: "SENAI F.C.", sigla: "S", posicao: "1º colocado", curto: "SENAI F.C." },
      placar: null,
      status: "proximo",
      statusTexto: "Prioridade Master",
      statusTom: "ok",
      nota: { icone: "lock", texto: "Acesso rápido pelo Setor Master" },
      acao: { rotulo: "Caravana", mensagem: "Informações da caravana enviadas ao seu e-mail." }
    },
    {
      id: "r05",
      etapa: null,
      rodada: 5,
      dataISO: "2026-11-08T16:00:00-03:00",
      hora: "16:00",
      mandante: { nome: "SENAI F.C.", sigla: "S", posicao: "1º colocado", curto: "SENAI F.C." },
      visitante: { nome: "Polímeros United", sigla: "P", posicao: "6º colocado", curto: "Polímeros United" },
      placar: null,
      status: "proximo",
      statusTexto: "Últimas vagas",
      statusTom: "neutro",
      nota: { icone: "map", texto: "Caravana oficial • Saída às 13h" },
      acao: { rotulo: "Caravana", mensagem: "Informações da caravana enviadas ao seu e-mail." },
      evento: {
        titulo: "Dia da Família",
        texto: "Open Food no Espaço VIP",
        acao: "Mais infos",
        mensagem: "Informações do Open Food enviadas para o seu e-mail."
      }
    }
  ];

  const COMPETICAO = "Copa Indústria 2026";
  const ARENA = { nome: "Arena SENAI Lab", setor: "Pólo Metalúrgico" };
  const TOTAL_RODADAS = JOGOS.filter((j) => j.rodada).length;

  const porData = (a, b) => new Date(a.dataISO) - new Date(b.dataISO);
  const concluidos = () => JOGOS.filter((j) => j.status === "encerrado").sort((a, b) => porData(b, a));
  const agendados = () => JOGOS.filter((j) => j.status !== "encerrado").sort(porData);
  const proximo = () => agendados()[0] || null;
  const ultimo = () => concluidos()[0] || null;

  window.SenaiTemporada = {
    COMPETICAO,
    ARENA,
    TOTAL_RODADAS,
    JOGOS,
    agendados,
    concluidos,
    proximo,
    ultimo
  };
})();
