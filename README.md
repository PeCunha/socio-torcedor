# Portal do Sócio Torcedor — SENAI F.C.

Projeto final do curso técnico em **Desenvolvimento Web**, usando a identidade
visual do **SENAI F.C.**, um clube fictício de futebol industrial fundado em
1974. O portal reúne a agenda da temporada, a classificação da Copa Indústria
2026, o acervo de títulos, a história do clube, os planos de sócio e um fluxo
de acesso por reconhecimento facial (Face ID).

O projeto é **estático**: HTML, CSS e JavaScript puro, sem build, sem
dependências e sem backend. Qualquer navegador moderno abre as páginas
direto do disco.

---

## Como executar

**Opção 1 — abrir direto no disco.** Abra `senai-torcedor-web.html` no
navegador. Não há dependência de servidor: nenhuma página faz requisição
`fetch` para a API.

**Opção 2 — servidor local** (recomendado para testar em mais de um
dispositivo ao mesmo tempo):

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000/senai-torcedor-web.html`.

---

## Estrutura do projeto

```
projeto_final/
├── senai-torcedor-web.html      Página inicial (aba Jogos)
├── face-id-acesso.html          Tela Face ID & Acesso
├── planos-de-socio.html         Planos de Sócio
├── galeria-de-titulos.html      Galeria de Títulos
├── nossa-historia.html          Nossa História
├── perfil.html                  Meu perfil
├── login.html                   Entrar
├── assets/
│   ├── css/                     15 arquivos de estilo (ver tabela abaixo)
│   ├── js/
│   │   ├── temporada.js         Calendário da Copa Indústria 2026 (fonte única)
│   │   ├── temporada-view.js    Renderiza a temporada no DOM
│   │   └── senai-torcedor-web.js Menu, abas, diálogos, formulários, Face ID
│   └── images/
│       ├── avatar-operario.png
│       ├── favicon.svg
│       └── senai_logo_light.png
├── tools/                       Harness de verificação (Node puro, sem dependências)
│   ├── verificar-equivalencia.js Retratos canônicos das 7 páginas × 12 larguras
│   ├── comparar.js               Compara dois JSONs de retratos
│   ├── analisar-carga.js         Calcula quais CSS cada página precisa
│   ├── aplicar-carga.js          Aplica o subconjunto aos <link> dos HTMLs
│   ├── teclado.js                Teste de navegação por teclado
│   └── chrome.js                 Localiza o Chrome (ou usa CHROME_PATH)
├── .gitattributes               Normaliza fim de linha (LF) e o charset
└── .gitignore
```

O portal tem **7 páginas**. `login.html` é a única órfã: não tem barra
lateral, topbar nem rodapé, e é acessada por link a partir de `perfil.html`.

---

## CSS: 15 arquivos por escopo

O CSS passou de um arquivo monolítico de ~8.600 linhas para **15 arquivos
organizados por escopo**, todos em `assets/css/`.

### Ordem de carga

A ordem dos `<link>` nos HTMLs **não é decorativa**: ela reproduz a ordem de
origem do monólito, e portanto preserva a cascata exatamente como ela era
(declarações de mesmo peso vencem a mais recente).

```
base  →  layout  →  botoes  →  jogos  →  componentes  →  planos  →
faceid  →  galeria  →  historia  →  arena  →  mobile  →  login  →
painel-jogos  →  perfil  →  ajustes-toque
```

| Arquivo | Linhas | Escopo |
| --- | ---: | --- |
| `base.css` | 149 | Tokens de cor e tipografia (`:root`), reset do navegador, caixa de sizing, corpo da página |
| `layout.css` | 414 | Sidebar, topbar, `main-shell`, container de página e bloco de perfil do usuário |
| `botoes.css` | 89 | Botão principal, secundário, fantasma, de perigo e botão de texto |
| `jogos.css` | 876 | Cabeçalho de página, destaque do próximo jogo, card da rodada, abas de Resultados e Classificação |
| `componentes.css` | 1.155 | Cards, tabelas roláveis, rodapé, aviso de demonstração, faixa de `<noscript>`, diálogo, formulários, toast e **a camada responsiva do portal** |
| `planos.css` | 776 | Grade de planos, tabela comparativa, perguntas frequentes, blocos de segurança e suporte |
| `faceid.css` | 1.400 | Reconhecimento facial ao vivo, scanner, veredito, indicadores de qualidade, credencial digital |
| `galeria.css` | 658 | Hero, faixa de totais, abas do acervo, dossiê de taça, acervo fotográfico |
| `historia.css` | 718 | Hero, registro notarial, artefatos, crônicas, hall da glória, hino |
| `arena.css` | 179 | Mapa da arena e o scroller que o comporta |
| `mobile.css` | 478 | Piso tipográfico de 12 px, alvos de toque de 44×44 px, campos de 16 px (evita zoom no iOS) |
| `login.css` | 513 | Formulário de acesso, painel de demonstração |
| `painel-jogos.css` | 296 | Painéis ampliados da aba Jogos a partir de 561 px |
| `perfil.css` | 746 | Configurações da conta do sócio (prefixo `.pf-*`) |
| `ajustes-toque.css` | 251 | Casos de toque que ainda mediam menos de 44×44 px (WCAG 2.5.5) |

### Carga seletiva por página

Cada página carrega **apenas os arquivos que ela usa** — sempre na mesma
ordem global, de modo que a cascata de cada página continue idêntica à do
monólito.

| Página | Arquivos | Qtde. |
| --- | --- | ---: |
| `senai-torcedor-web.html` | base · layout · botoes · jogos · componentes · arena · mobile · painel-jogos · ajustes-toque | 9 |
| `planos-de-socio.html` | base · layout · botoes · jogos · componentes · planos · historia · mobile | 8 |
| `nossa-historia.html` | base · layout · botoes · jogos · componentes · galeria · historia · mobile | 8 |
| `perfil.html` | base · layout · botoes · componentes · planos · mobile · perfil · ajustes-toque | 8 |
| `galeria-de-titulos.html` | base · layout · botoes · jogos · componentes · galeria · mobile | 7 |
| `login.html` | base · botoes · componentes · mobile · login · ajustes-toque | 6 |
| `face-id-acesso.html` | base · layout · componentes · faceid · mobile | 5 |

Isso derruba o CSS baixado por página de ~150 KB (monólito) para 48–95 KB.

**Ao mexer no DOM de uma página, refaça a conta.** O subconjunto acima foi
calculado por uma análise que percorre cada página em todos os estados
interativos (inicial, cada aba, cada diálogo) e pergunta, para cada um dos
15 arquivos, se algum dos seus seletores casa com algum elemento presente.
Se nenhum casa, o arquivo pode ser retirado da página sem alterar um único
estilo computado.

Duas exclusões merecem nota:

- `nossa-historia.html` carrega `galeria.css` porque reusa duas classes da
  galeria (`.gl-ribbon` e `.gl-registry`) no bloco de artefatos.
- `perfil.html` e `planos-de-socio.html` carregam `planos.css`; o primeiro
  por causa do breadcrumb `.plans-breadcrumb`, o segundo por causa do bloco
  `.pl-security` que mora no arquivo `historia.css`.

### Duas regras que não podem ser quebradas

1. **A camada responsiva fica no fim de `componentes.css`.** Os breakpoints de
   1280, 1080, 920, 760, 560 e 390 px sobrescrevem regras de `layout.css`,
   `jogos.css` e `componentes.css`. Se ela for carregada antes, a cascata
   inverte e o layout quebra.
2. **`botoes.css` é carregado antes de `jogos.css`.** Os botões eram um bloco
   contíguo no meio da seção de jogos e foram extraídos para o arquivo
   próprio. Nenhuma regra da seção de jogos usa os mesmos seletores, então a
   extração não altera o resultado.

> **Ao criar um arquivo novo:** coloque-o na posição da tabela acima que
> corresponde ao seu escopo e mantenha a ordem dos `<link>` nos 7 HTMLs
> sincronizada com a tabela. Se precisar de um arquivo que não existe ainda
> (por exemplo, uma página nova), posicione-o de forma que nenhum seletor
> existente mude de vencedor na cascata.

### Regras que foram realocados

Duas regras estavam no arquivo errado depois da divisão e foram movidas sem
efeito visual:

- `@keyframes pulse` foi de `componentes.css` para `jogos.css`, que é o
  único arquivo que usa essa animação. Keyframes são resolvidos por nome e
  não participam da cascata.
- `.footer-highlight` foi de `planos.css` para `componentes.css`, porque é
  um elemento do rodapé presente em 6 das 7 páginas. Sem a mudança, 4 páginas
  carregariam `planos.css` só por causa dessa regra.

---

## JavaScript

| Arquivo | Linhas | Responsabilidade |
| --- | ---: | --- |
| `temporada.js` | 169 | **Fonte única de verdade.** A constante `JOGOS` guarda a agenda da Copa Indústria 2026: datas, rodadas, adversários, mando de campo, placares e estádios. |
| `temporada-view.js` | 220 | Lê `temporada.js` e escreve no DOM: jogo em destaque, próximos jogos, resultados, card do último jogo, alvo da contagem regressiva e contador de jogos restantes. |
| `senai-torcedor-web.js` | 1.530 | Menu lateral e navegação móvel, abas, diálogos, formulários, simulador de Face ID, toast e persistência de preferências. |

### Atualizar a temporada

Para mudar o calendário, edite **apenas** a constante `JOGOS` em
`assets/js/temporada.js`. O destaque da home, a lista de próximos jogos, os
resultados, a contagem regressiva e o card "Último jogo" são todos gerados a
partir dela. Nenhum outro arquivo precisa ser tocado.

---

## Acessibilidade

O projeto segue a WCAG 2.1 nível AA nos pontos que mais importam:

- Foco visível em todos os elementos interativos
  (`outline: 3px solid rgba(240, 123, 106, 0.55)`).
- Alvos de toque de **44×44 px** em mobile (WCAG 2.5.5).
- Contraste de texto corrigido para atender 4.5:1 em texto corrente.
- Campos de formulário com **16 px** no mobile — abaixo disso o iOS aplica
  zoom automático ao focar o campo.
- Piso tipográfico de **12 px** no desktop (desvio consciente do Figma, para
  não quebrar a hierarquia visual em telas menores).
- `prefers-reduced-motion` desliga transições e animações.
- Cada página tem `<noscript>` com o conteúdo essencial em texto.
- O SVG do logo e do avatar é um *sprite* inline referenciado por `<use>`, o
  que evita requisições extras e dá um nome acessível ao ícone.
- Diálogos com `<dialog>` nativo, abas com `role="tab"`/`aria-selected` e
  grupos com `role="group"`. A aba selecionada é a única com `tabindex="0"`;
  as demais ficam com `tabindex="-1"` e são alcançadas pelas setas, como manda
  o padrão ARIA de abas.
- **Navegação por teclado** verificada nas 7 páginas em 360 px e 1440 px:
  todo controle é alcançável por Tab, cada um tem indicador de foco visível e
  é rolado para dentro da janela, e todos têm nome acessível.
- No celular, o menu lateral fechado recebe o atributo **`inert`**: os links
  do painel fora da tela deixam de entrar na ordem de tabulação e na árvore de
  acessibilidade. `inert` não altera nenhum estilo computado — o desenho é
  exatamente o mesmo; o que muda é só o comportamento do foco.

### Mapa da arena

O `viewBox` do SVG é fixo (`0 0 800 600`) e a largura é travada em **600 px**
dentro de um container com rolagem horizontal. Sem essa trava, o mapa
encolheria junto com a janela e os rótulos dos setores ficariam ilegíveis.

---

## Verificação de equivalência visual

Durante a refatoração do CSS foi usado um *harness* automatizado que compara
**retratos canônicos** das 7 páginas: cada página é aberta no Chrome
headless em 12 larguras (360, 480, 560, 640, 760, 761, 920, 921, 1080, 1280,
1440 e 1920 px) e, em cada estado interativo (inicial, cada aba, cada
diálogo), é extraído o retrato canônico — estilos computados, geometria e
métricas de rolagem. O retrato vira um hash SHA-256.

O resultado é **84 retratos (7 páginas × 12 larguras)**, e o critério de
aceite do projeto é: **zero divergência**. O relógio é congelado e as
animações são desligadas no harness, para que o resultado seja determinístico.
O retrato ignora os próprios `<link>` e `<style>` do `<head>`: eles não são
conteúdo renderizado, e incluí-los faria o hash depender de quantos arquivos
de estilo a página carrega.

O mesmo harness foi usado para validar:

1. a remoção de 676 linhas de CSS morto (Fase 3a);
2. a incorporação da camada visual de referência do Figma ao monólito
   (Fase 3b);
3. a divisão do monólito nos 15 arquivos por escopo (Fase 3c);
4. a carga seletiva por página (Fase 3d).

Em todos os casos o resultado foi **84/84 idênticos**.

### Como rodar

As ferramentas estão em `tools/` (Node puro, sem dependências):

```bash
# 1. gera os retratos de uma copia do projeto
node tools/verificar-equivalencia.js <raiz> verif-a.json 9833 \
  360 480 560 640 760 761 920 921 1080 1280 1440 1920

# 2. gera os retratos de outra copia e compara
node tools/verificar-equivalencia.js <raiz-b> verif-b.json 9834 \
  360 480 560 640 760 761 920 921 1080 1280 1440 1920
node tools/comparar.js verif-a.json verif-b.json
```

`comparar.js` sai com código 1 se houver qualquer divergência.

Para recalcular a carga seletiva depois de mexer no DOM das páginas:

```bash
node tools/analisar-carga.js . carga.json   # calcula o subconjunto de cada pagina
node tools/aplicar-carga.js . carga.json     # aplica aos <link> dos HTMLs
```

### Verificação de acessibilidade e de teclado

```bash
node tools/teclado.js . 1440    # desktop
node tools/teclado.js . 360     # celular
```

O script percorre cada página com Tab de verdade (via CDP), confere que todos
os controles são alcançáveis, que cada um tem indicador de foco visível, que o
controle focado é rolado para dentro da janela e que todos têm nome acessível.
Sai com código 1 se encontrar qualquer problema. O resultado no estado atual é
**0 problemas** nas 7 páginas, em 1440 px e em 360 px.

Se o Chrome não estiver no caminho padrão, defina `CHROME_PATH`.

---

## Convenções

- **UTF-8 sem BOM** e **LF** em todos os arquivos (garantido por
  `.gitattributes`).
- Indentação de 2 espaços em HTML, CSS e JS.
- Seletores de escopo de página usam prefixo (`pf-` no perfil); o restante
  usa classes semânticas curtas (`btn`, `card`, `chip`).
- Nomes de classe em **kebab-case**; ids em **kebab-case** também.
- A identidade visual (cores, tipografia, espaçamentos) vive nos tokens de
  `base.css`; nada de cor literal fora das regras de componente.
- Nenhum `!important` fora da camada responsiva global e do bloco de
  `prefers-reduced-motion`.

---

## Créditos

Projeto escolar developed para a disciplina de Desenvolvimento Web.
SENAI F.C. é um clube fictício criado para fins didáticos; o calendário, a
tabela de classificação, o acervo de títulos e o hino foram escritos para o
projeto.
