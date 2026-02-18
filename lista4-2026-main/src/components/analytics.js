// src/components/analytics.js
export function renderAnalytics(insights) {
  const agent = insights || {};
  const wasteItems = agent.wasteItems || [];
  const priceyItems = agent.priceyItems || [];
  const dupes = agent.duplicates || [];
  const zeroPrice = agent.zeroPrice || [];
  const topBoughtByCount = agent.topBoughtByCount || [];
  const topBoughtByValue = agent.topBoughtByValue || [];

  return `
  <div class="card section" style="margin-top:12px">
    <div class="row space-between">
      <div>
        <h2>Analytics</h2>
        <div class="muted" style="font-size:12px;margin-top:4px">
          Faixas de preço + evolução mensal + pendente vs comprado
        </div>
      </div>
    </div>

    <div class="analytics-stack" style="margin-top:12px">
      <div class="card section">
        <h3>Agente Econômico</h3>
        <div class="muted" style="font-size:12px;margin-top:4px">
          Leitura automática de gastos e oportunidades de economia
        </div>
        <div style="margin-top:10px">
          <div class="row space-between">
            <div><b>Supérfluos</b></div>
            <div><b>${agent.wasteTotalLabel || "R$ 0,00"}</b></div>
          </div>
          <div class="muted" style="font-size:12px;margin-top:2px">
            ${agent.wastePctLabel || "0% do total"}
          </div>
        </div>

        <div class="hr"></div>

        <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px">Itens supérfluos (top)</div>
            ${wasteItems.length
              ? `<ul style="margin:0;padding-left:16px">
                  ${wasteItems.map((x) => `<li>${x}</li>`).join("")}
                </ul>`
              : `<div class="muted" style="font-size:12px">Nenhum encontrado</div>`}
          </div>
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px">Possíveis economias</div>
            <ul style="margin:0;padding-left:16px">
              ${(agent.tips || []).map((x) => `<li>${x}</li>`).join("")}
            </ul>
          </div>
        </div>

        <div class="hr"></div>

        <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px">Itens caros vs média</div>
            ${priceyItems.length
              ? `<ul style="margin:0;padding-left:16px">
                  ${priceyItems.map((x) => `<li>${x}</li>`).join("")}
                </ul>`
              : `<div class="muted" style="font-size:12px">Sem alerta</div>`}
          </div>
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px">Itens duplicados</div>
            ${dupes.length
              ? `<ul style="margin:0;padding-left:16px">
                  ${dupes.map((x) => `<li>${x}</li>`).join("")}
                </ul>`
              : `<div class="muted" style="font-size:12px">Nenhum duplicado</div>`}
          </div>
        </div>

        <div class="hr"></div>

        <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px">Top itens comprados (frequência)</div>
            ${topBoughtByCount.length
              ? `<ul style="margin:0;padding-left:16px">
                  ${topBoughtByCount.map((x) => `<li>${x}</li>`).join("")}
                </ul>`
              : `<div class="muted" style="font-size:12px">Sem compras suficientes</div>`}
          </div>
          <div>
            <div class="muted" style="font-size:12px;margin-bottom:6px">Top itens comprados (valor)</div>
            ${topBoughtByValue.length
              ? `<ul style="margin:0;padding-left:16px">
                  ${topBoughtByValue.map((x) => `<li>${x}</li>`).join("")}
                </ul>`
              : `<div class="muted" style="font-size:12px">Sem compras suficientes</div>`}
          </div>
        </div>

        ${zeroPrice.length
          ? `
        <div class="hr"></div>
        <div>
          <div class="muted" style="font-size:12px;margin-bottom:6px">Itens com preço zerado</div>
          <ul style="margin:0;padding-left:16px">
            ${zeroPrice.map((x) => `<li>${x}</li>`).join("")}
          </ul>
        </div>
        `
          : ""}
      </div>

      <div class="card section">
        <h3>Distribuição de preços (unitário)</h3>
        <div class="muted" style="font-size:12px;margin-top:4px">Até 10 • 10–50 • Acima 50</div>
        <div class="chart-box">
          <canvas id="chartPrice"></canvas>
        </div>
      </div>

      <div class="card section">
        <h3>Evolução mensal de gastos</h3>
        <div class="muted" style="font-size:12px;margin-top:4px">Total (R$) por período</div>
        <div class="chart-box">
          <canvas id="chartMonthly"></canvas>
        </div>
      </div>

      <div class="card section">
        <h3>Pendentes vs Comprados</h3>
        <div class="muted" style="font-size:12px;margin-top:4px">Por quantidade de itens</div>
        <div class="chart-box">
          <canvas id="chartStatus"></canvas>
        </div>
      </div>
    </div>
  </div>
  `;
}

export function buildCharts() {
  const ctxPrice = document.getElementById("chartPrice");
  const ctxMonthly = document.getElementById("chartMonthly");
  const ctxStatus = document.getElementById("chartStatus");

  // Verifica se os elementos existem no DOM
  if (!ctxPrice || !ctxMonthly || !ctxStatus) {
    console.warn("Elementos canvas não encontrados no DOM");
    return null;
  }

  const priceChart = new Chart(ctxPrice, {
    type: "bar",
    data: {
      labels: ["Até R$ 10", "R$ 10–50", "Acima de R$ 50"],
      datasets: [{ label: "Itens", data: [0, 0, 0] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  const valueLabelPlugin = {
    id: "valueLabel",
    afterDatasetsDraw(chart, _args, pluginOptions) {
      const { ctx } = chart;
      const datasetIndex = 0;
      const meta = chart.getDatasetMeta(datasetIndex);
      const data = chart.data.datasets[datasetIndex]?.data || [];

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = pluginOptions?.font || "11px system-ui, -apple-system, Segoe UI";

      const area = chart.chartArea;
      data.forEach((value, i) => {
        const point = meta.data[i];
        if (!point) return;
        const pos = point.getProps(["x", "y"], true);
        const text = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(Number(value || 0));
        const y = Math.max(pos.y - 8, area.top + 16);

        // fundo para melhorar legibilidade
        const paddingX = 6;
        const paddingY = 3;
        const metrics = ctx.measureText(text);
        const textW = metrics.width;
        const textH = 12;
        const boxW = textW + paddingX * 2;
        const boxH = textH + paddingY * 2;
        const boxX = pos.x - boxW / 2;
        const boxY = y - boxH + 2;

        ctx.fillStyle = pluginOptions?.bg || "rgba(11,14,20,0.75)";
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(boxX + r, boxY);
        ctx.lineTo(boxX + boxW - r, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
        ctx.lineTo(boxX + boxW, boxY + boxH - r);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
        ctx.lineTo(boxX + r, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
        ctx.lineTo(boxX, boxY + r);
        ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
        ctx.fill();

        // linha de apoio até o ponto
        ctx.strokeStyle = pluginOptions?.lineColor || "rgba(148,163,184,0.35)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const lineTop = boxY + boxH;
        const lineBottom = Math.max(pos.y - 4, lineTop + 10);
        ctx.moveTo(pos.x, lineTop);
        ctx.lineTo(pos.x, lineBottom);
        ctx.stroke();

        ctx.fillStyle = pluginOptions?.color || "#e5e7eb";
        ctx.fillText(text, pos.x, y);
      });

      ctx.restore();
    },
  };

  const monthlyChart = new Chart(ctxMonthly, {
    type: "line",
    data: { labels: [], datasets: [{ label: "Total (R$)", data: [] }] },
    plugins: [valueLabelPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 18 } },
      plugins: {
        legend: { display: false },
        valueLabel: {
          color: "#ffffff",
          bg: "rgba(11,14,20,0.94)",
          lineColor: "rgba(203,213,245,0.6)",
          font: "11px system-ui, -apple-system, Segoe UI",
        },
      },
    },
  });

  const statusChart = new Chart(ctxStatus, {
    type: "doughnut",
    data: { labels: ["Pendentes", "Comprados"], datasets: [{ data: [0, 0] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });

  return { priceChart, monthlyChart, statusChart };
}

export function updateCharts({
  charts,
  priceBuckets,
  monthlySeries,
  statusCounts,
}) {
  // Se os gráficos não foram inicializados, não tenta atualizar
  if (!charts) return;
  charts.priceChart.data.datasets[0].data = [
    priceBuckets.at10,
    priceBuckets.between10and50,
    priceBuckets.above50,
  ];
  charts.priceChart.update();

  charts.monthlyChart.data.labels = monthlySeries.labels;
  charts.monthlyChart.data.datasets[0].data = monthlySeries.values;
  charts.monthlyChart.update();

  charts.statusChart.data.datasets[0].data = [
    statusCounts.pending,
    statusCounts.bought,
  ];
  charts.statusChart.update();
}
