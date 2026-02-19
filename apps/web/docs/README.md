# Documentacao do Projeto (Iniciante)

Este guia explica o codigo com exemplos reais. A ideia e voce conseguir
entender o fluxo e saber onde mexer sem se perder.

## Visao geral

Aplicacao: lista de compras colaborativa.
Principais recursos:
- Cadastro de itens (nome, quantidade, categoria, valor unitario, status).
- Edicao inline na tabela (desktop) e cards (mobile).
- Graficos (preco, evolucao mensal, pendente vs comprado).
- "Agente Economico" com regras simples de economia.

Arquivos importantes:
- `index.html`: carrega CSS e JS.
- `src/app.js`: logica principal (render, eventos, regras).
- `src/styles.css`: visual completo.
- `src/components/*.js`: partes da interface.
- `src/services/*.js`: leitura/gravação no Supabase.
- `src/utils/*.js`: funcoes utilitarias.

## Estrutura de pastas

```
src/
  app.js
  styles.css
  components/
  services/
  utils/
```

## Entrada da aplicacao

Arquivo: `index.html`

Ele so carrega os scripts e estilos:

```html
<link rel="stylesheet" href="./src/styles.css" />
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script type="module" src="./src/app.js"></script>
```

## app.js: coracao do app

### 1) Estado global

O estado guarda tema, periodo, itens, filtros e graficos.

```js
const state = {
  theme: getTheme(),
  collaboratorName: localStorage.getItem("collaboratorName") || "",
  currentPeriod: null,
  items: [],
  filterStatus: "ALL",
  searchText: "",
  sortKey: "name_asc",
  charts: null,
};
```

### 2) Render principal

`renderApp()` desenha tudo na tela.

```js
root.innerHTML = `
  ${renderHeader(...)}
  ${renderDashboard(kpis)}
  ${renderCollaboratorsSummary(byCollab)}
  ${renderItemListControls(state)}
  ${renderItemTable(filtered, state.sortKey)}
  ${renderItemMobileList(filtered, state.sortKey)}
  ${renderAnalytics(economy)}
`;
```

### 3) Eventos por delegacao

Em vez de colocar `addEventListener` em cada botao,
o app usa `data-action` e um unico listener no `root`.

```js
root.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  // switch de acoes: edit, delete, toggle-status, etc.
});
```

Isso facilita, porque os elementos sao recriados a todo render.

## Tabela (desktop) e cards (mobile)

Arquivo: `src/components/itemList.js`

### Desktop
O item vira uma linha da tabela:

```js
<span
  data-view
  data-action="edit-cell"
  data-field="quantidade"
  data-id="${it.id}"
>${qtdDisplay}</span>
```

Note o `data-action="edit-cell"`.
Isso dispara a edicao inline no `app.js`.

### Mobile
O item vira card com campos clicaveis:

```js
<div class="pill editing-cell mobile-edit-cell"
     data-action="edit-cell"
     data-field="valor_unitario"
     data-id="${it.id}">
  <div class="pvalue">${brl(it.valor_unitario)}</div>
</div>
```

## Edicao inline (sem botoes)

Arquivo: `src/app.js`

Quando o usuario clica no valor:
1) O texto vira input.
2) Ao sair do campo (blur) ou Enter, salva.
3) Esc cancela.
4) Se vazio, vira 0.

Trecho central:

```js
cell.innerHTML = `<input class="input cell-input" ... />`;
const inp = cell.querySelector("input");

inp.addEventListener("blur", saveInline);
inp.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") saveInline();
  if (ev.key === "Escape") renderApp();
});
```

## Moeda (formatacao automatica)

O valor unitario formata enquanto digita.

```js
function bindCurrencyInputs(rootEl) {
  qsa('input[data-currency="brl"]', rootEl).forEach((input) => {
    input.addEventListener("input", () => {
      const digits = input.value.replace(/\D/g, "");
      const asNumber = Number(digits || 0) / 100;
      input.value = brl(asNumber);
    });
  });
}
```

E para salvar:

```js
function parseCurrencyBRL(raw) {
  // "R$ 1.234,56" -> 1234.56
}
```

## Modal de adicionar/editar item

Arquivo: `src/components/itemForm.js`

O modal monta os inputs e preenche valores quando edita.
O campo de moeda usa `data-currency="brl"`.

```html
<input
  class="input"
  name="valor_unitario"
  type="text"
  inputmode="decimal"
  data-currency="brl"
  value="R$ 0,00"
/>
```

## Graficos (Chart.js)

Arquivo: `src/components/analytics.js`

O grafico mensal tem valores sempre visiveis.
Isso e feito com um plugin customizado:

```js
const valueLabelPlugin = {
  id: "valueLabel",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    // desenha pill + texto + linha sutil
  }
};

const monthlyChart = new Chart(ctxMonthly, {
  type: "line",
  data: { labels: [], datasets: [{ data: [] }] },
  plugins: [valueLabelPlugin],
});
```

## Agente Economico

Arquivo: `src/app.js`

Funcao principal:

```js
function computeEconomyInsights(items) {
  // 1) detecta superfluos por palavras-chave
  // 2) encontra itens caros vs media
  // 3) acha duplicados
  // 4) lista itens com preco zero
  return { tips, wasteItems, priceyItems, duplicates };
}
```

Esses dados aparecem no painel:

```js
renderAnalytics(economy);
```

Se quiser ajustar as regras, edite a lista de palavras-chave
ou os limites dentro de `computeEconomyInsights()`.

## Estilos da tabela "card"

Arquivo: `src/styles.css`

```css
table { border-collapse: separate; border-spacing: 0 8px; }
table tbody tr {
  background: rgba(255,255,255,.03);
  border-radius: 14px;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.26);
}
table tbody tr:hover {
  background: rgba(255,255,255,.06);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.34),
              0 8px 16px rgba(0,0,0,.25);
}
```

## Dicas para iniciantes

- Procure por `data-action` para entender o que dispara no JS.
- A tela inteira e reconstruida em `renderApp()`.
- Se algo quebrar, confira primeiro `app.js` e `itemList.js`.

## Funcoes (arquivo por arquivo)

Aqui estao as funcoes principais de cada arquivo, com explicacao simples.

### `src/app.js`
- `saveCursor()`: salva o mes atual no `localStorage` para manter o periodo apos recarregar.
- `normalizeItem(it)`: converte `quantidade` e `valor_unitario` para numero e evita `NaN`.
- `getCollaboratorName(it)`: pega o nome do colaborador com fallback seguro.
- `normalizeNameKey(value)`: normaliza nomes para comparar e achar duplicados.
- `totalOfItem(it)`: calcula total do item (qtd * valor ou valor direto quando e peso).
- `parseQuantidade(raw, categoria)`: interpreta entradas como `2`, `2,5`, `1kg`, `500g`.
- `parseCurrencyBRL(raw)`: converte `R$ 1.234,56` para numero `1234.56`.
- `bindCurrencyInputs(rootEl)`: formata moeda enquanto digita (modo centavos).
- `computeKPIs(items)`: calcula totais, pendentes, comprados e media.
- `computeByCollaborator(items)`: soma itens e gastos por colaborador.
- `normalizeText(value)`: remove acento e coloca em minusculo.
- `computeEconomyInsights(items)`: gera dicas e alertas do Agente Economico.
- `computePriceBuckets(items)`: conta itens por faixa de preco (ate 10, 10-50, acima 50).
- `computeStatusCounts(items)`: conta pendentes e comprados.
- `applyFilters()`: aplica filtro de status, busca e ordenacao.
- `rerenderListOnly()`: atualiza somente a lista mobile.
- `rerenderTableOnly()`: atualiza somente a tabela desktop.
- `renderNameGate()`: tela para digitar nome do colaborador.
- `loadDataForPeriod()`: busca itens do periodo atual.
- `computeMonthlySeries()`: agrega gastos por mes para o grafico.
- `renderApp()`: monta toda a interface.
- `bindPerRenderInputs()`: liga eventos de inputs a cada render.
- `bindDelegatedEvents()`: trata cliques por `data-action`.
- `boot()`: inicia a app (tema, dados e render).

### `src/components/analytics.js`
- `renderAnalytics(insights)`: gera o painel de analytics e do agente.
- `buildCharts()`: cria os graficos do Chart.js (bar, line, doughnut).
- `updateCharts(...)`: atualiza os dados dos graficos.

### `src/components/itemList.js`
- `collabName(it)`: escolhe o nome do colaborador com fallback.
- `isChurrasco(it)`: decide se item e por peso.
- `totalOfItem(it)`: calcula total do item para a tabela.
- `sortItems(items, sortKey)`: ordena a lista conforme filtro.
- `sumTotals(items)`: soma quantidade e total do bloco.
- `renderSummaryRow(items, forChurrasco)`: linha de resumo por bloco.
- `renderTableBlock(...)`: tabela desktop de um bloco.
- `renderItemListControls(state)`: filtros e busca.
- `renderItemTable(items, sortKey)`: duas tabelas (compras e peso).
- `renderItemMobileList(items, sortKey)`: cards no mobile.

### `src/components/itemForm.js`
- `renderItemFormModal()`: HTML do modal de item.
- `ensureOption(selectEl, value)`: adiciona opcao se nao existir.
- `openModal({ title, subtitle, hint, data })`: abre modal e preenche.
- `closeModal()`: fecha o modal.

### `src/components/header.js`
- `renderHeader({ periodLabel, userName, theme })`: monta o topo (mes, tema, logout).

### `src/components/dashboard.js`
- `renderDashboard(kpis)`: mostra KPIs e barra de progresso.

### `src/components/collaborators.js`
- `renderCollaboratorsSummary(rows)`: tabela e cards de colaboradores.

### `src/components/toast.js`
- `mountToast(root)`: cria notificacoes toast e retorna `show()`.

### `src/services/items.js`
- `fetchItems(periodoId)`: busca itens do periodo.
- `addItem(payload)`: cria um item.
- `updateItem(id, patch)`: atualiza item.
- `deleteItem(id)`: remove item.
- `bulkZeroPrices(periodoId)`: zera precos do mes.
- `bulkDeleteByPeriod(periodoId)`: apaga todos os itens do mes.
- `copyItemsToPeriod(...)`: copia itens para o proximo mes.

### `src/services/periods.js`
- `ensurePeriod(date)`: busca ou cria um periodo.
- `listRecentPeriods(limit)`: lista periodos recentes.

### `src/services/db.js`
- `mustOk(res)`: valida resposta do Supabase (lanca erro se falhar).

### `src/services/auth.js`
- `signUp(...)`: cadastro no Supabase Auth.
- `signIn(...)`: login e criacao de perfil.
- `signOut()`: encerra sessao.
- `getSession()`: retorna sessao atual.
- `onAuthChange(cb)`: observa mudancas de login.
- `getProfile(userId)`: busca perfil em `usuarios`.
- `upsertProfile(...)`: cria ou atualiza perfil.
- `ensureProfile(user)`: garante perfil para usuario logado.

### `src/utils/format.js`
- `brl(v)`: formata numero em moeda BRL.
- `num(v)`: converte string em numero.
- `isPesoCategoria(categoria)`: detecta categoria por peso.
- `formatQuantidade(kgValue, categoria)`: formata quantidade (kg/g ou unidades).
- `capitalize(s)`: primeira letra maiuscula.
- `normalizeItemName(name)`: normaliza nome para comparar.
- `findDuplicateItem(newItemName, existingItems)`: detecta duplicados.

### `src/utils/ui.js`
- `qs(sel, root)`: `querySelector` curto.
- `qsa(sel, root)`: `querySelectorAll` como array.
- `setTheme(theme)`: salva e aplica tema.
- `getTheme()`: le tema do `localStorage`.

### `src/utils/period.js`
- `monthKey(date)`: cria chave `YYYY-MM`.
- `periodName(date)`: formata "Fevereiro/2026".
- `startOfMonth(date)`: primeiro dia do mes.
- `endOfMonth(date)`: ultimo dia do mes.
- `addMonths(date, delta)`: soma/subtrai meses.
- `toISODate(d)`: formata data `YYYY-MM-DD`.

## Arquivo por arquivo (o que faz e por que)

### `index.html`
- O que faz: carrega CSS e JavaScript e cria o container `<div id="app"></div>`.
- Para que serve: ponto de entrada do site.
- Por que existe: sem ele a aplicacao nao renderiza nada.

### `src/app.js`
- O que faz: logica principal (estado, render, eventos, chamadas ao backend).
- Para que serve: coordena todos os componentes e fluxo da aplicacao.
- Por que existe: centraliza regras e evita logica espalhada.

### `src/styles.css`
- O que faz: define todo o visual (cores, layout, responsivo).
- Para que serve: deixa o app bonito e consistente.
- Por que existe: separar estilo da logica melhora manutencao.

### `src/config/supabase.js`
- O que faz: cria o cliente do Supabase.
- Para que serve: conecta no banco e autentica requisoes.
- Por que existe: isola a configuracao do backend.

### `src/services/db.js`
- O que faz: funcoes basicas de acesso ao banco.
- Para que serve: padroniza acesso ao Supabase.
- Por que existe: evita repetir codigo em varios lugares.

### `src/services/items.js`
- O que faz: CRUD de itens (buscar, criar, atualizar, excluir).
- Para que serve: encapsula as operacoes da lista.
- Por que existe: deixa o `app.js` focado no fluxo da tela.

### `src/services/periods.js`
- O que faz: gerencia periodos mensais (criar/buscar).
- Para que serve: separar a lista por mes.
- Por que existe: facilita historico e organizacao.

### `src/services/auth.js`
- O que faz: utilitarios de autenticacao (se houver).
- Para que serve: permitir controle de acesso.
- Por que existe: preparado para evolucao do app.

### `src/utils/ui.js`
- O que faz: helpers de DOM (qs, qsa) e tema.
- Para que serve: simplifica manipulacao de tela.
- Por que existe: evita repetir seletores e logica.

### `src/utils/format.js`
- O que faz: formata moeda e quantidade.
- Para que serve: padronizar exibicao de numeros.
- Por que existe: evitar bugs com formatos diferentes.

### `src/utils/period.js`
- O que faz: utilitarios para datas e periodos.
- Para que serve: calcular meses e labels.
- Por que existe: manter a logica de datas isolada.

### `src/components/header.js`
- O que faz: renderiza topo com titulo e controles.
- Para que serve: navegacao e identidade do app.
- Por que existe: componente reutilizavel e isolado.

### `src/components/dashboard.js`
- O que faz: mostra KPIs (totais e medias).
- Para que serve: resumo rapido do estado da lista.
- Por que existe: separa a logica de cards de resumo.

### `src/components/collaborators.js`
- O que faz: mostra resumo por colaborador.
- Para que serve: ver quem adicionou e comprou mais.
- Por que existe: deixa o painel mais organizado.

### `src/components/itemForm.js`
- O que faz: modal de adicionar/editar item.
- Para que serve: criar e editar itens.
- Por que existe: formulario centralizado em um arquivo.

### `src/components/itemList.js`
- O que faz: renderiza tabela desktop e cards mobile.
- Para que serve: mostrar a lista de compras.
- Por que existe: separar UI da lista do resto da app.

### `src/components/analytics.js`
- O que faz: renderiza graficos e o Agente Economico.
- Para que serve: analises visuais e dicas de economia.
- Por que existe: isolar Chart.js e insights.

### `src/components/toast.js`
- O que faz: pequenos avisos (sucesso, erro, validacao).
- Para que serve: feedback rapido para o usuario.
- Por que existe: UX melhor e mensagens centralizadas.

### `src/Vercel/vercel.json`
- O que faz: configuracao de deploy na Vercel.
- Para que serve: controlar build e rotas no deploy.
- Por que existe: garantir deploy consistente.

Se quiser, posso adicionar diagramas e um fluxo passo-a-passo de salvar item.
