// Kleine SVG-Diagramme ohne externe Bibliothek.
import { esc, fmt } from './common.js';

const C = { bar: '#38a8e0', hi: '#1f9d55', series: ['#9fb8c8', '#f28c28'], grid: '#d9e6ee', text: '#16364a', muted: '#557287' };

export function chartSVG(chart) {
  if (!chart) return '';
  if (chart.kind === 'bar') return barChart(chart);
  if (chart.kind === 'grouped') return groupedChart(chart);
  if (chart.kind === 'line') return lineChart(chart);
  return '';
}

const wrap = (chart, svg) => `<figure class="chart"><figcaption>${esc(chart.title)}</figcaption>${svg}${chart.note ? `<p class="chart-note">${esc(chart.note)}</p>` : ''}</figure>`;

function barChart(chart) {
  const W = 800, row = 46, labelW = 300, pad = 10;
  const H = chart.data.length * row + pad;
  const max = Math.max(...chart.data.map((d) => d[1])) || 1;
  const bw = W - labelW - 120;
  const bars = chart.data.map(([label, v], i) => {
    const y = pad + i * row;
    const w = Math.max(3, (v / max) * bw);
    const hi = (chart.highlight || []).includes(label);
    return `<g class="bar-row" style="--i:${i}">
      <text x="${labelW - 12}" y="${y + 26}" text-anchor="end" font-size="22" fill="${C.text}" font-weight="${hi ? 700 : 500}">${esc(label)}</text>
      <rect class="bar-grow" x="${labelW}" y="${y + 4}" width="${w}" height="${row - 14}" rx="6" fill="${hi ? C.hi : C.bar}"/>
      <text x="${labelW + w + 10}" y="${y + 26}" font-size="22" font-weight="700" fill="${C.text}">${fmt(v)}${esc(chart.unit || '')}</text>
    </g>`;
  }).join('');
  return wrap(chart, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(chart.title)}">${bars}</svg>`);
}

function groupedChart(chart) {
  const W = 800, labelW = 230, sub = 30, gap = 18, pad = 40;
  const n = chart.series.length;
  const groupH = n * sub + gap;
  const H = pad + chart.categories.length * groupH;
  const max = Math.max(...chart.series.flatMap((s) => s[1])) || 1;
  const bw = W - labelW - 110;
  const legend = chart.series.map(([name], j) =>
    `<rect x="${labelW + j * 140}" y="6" width="22" height="22" rx="4" fill="${C.series[j % 2]}"/>
     <text x="${labelW + j * 140 + 30}" y="25" font-size="20" fill="${C.text}">${esc(name)}</text>`).join('');
  const groups = chart.categories.map((cat, i) => {
    const y0 = pad + i * groupH;
    const bars = chart.series.map(([, vals], j) => {
      const v = vals[i];
      const w = Math.max(3, (v / max) * bw);
      const y = y0 + j * sub;
      return `<rect class="bar-grow" style="--i:${i * n + j}" x="${labelW}" y="${y}" width="${w}" height="${sub - 6}" rx="5" fill="${C.series[j % 2]}"/>
        <text x="${labelW + w + 8}" y="${y + 19}" font-size="19" font-weight="700" fill="${C.text}">${fmt(v)}</text>`;
    }).join('');
    return `<text x="${labelW - 12}" y="${y0 + (n * sub) / 2 + 4}" text-anchor="end" font-size="21" font-weight="600" fill="${C.text}">${esc(cat)}</text>${bars}`;
  }).join('');
  return wrap(chart, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(chart.title)}">${legend}${groups}</svg>`);
}

function lineChart(chart) {
  const W = 800, H = 340, L = 70, R = 30, T = 24, B = 50;
  const xs = chart.points.map((p) => p[0]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = chart.yMin ?? 0, yMax = chart.yMax ?? Math.max(...chart.points.map((p) => p[1])) * 1.15;
  const X = (x) => L + ((x - xMin) / ((xMax - xMin) || 1)) * (W - L - R);
  const Y = (y) => T + (1 - (y - yMin) / (yMax - yMin)) * (H - T - B);
  const ticks = 5;
  let grid = '';
  for (let i = 0; i <= ticks; i++) {
    const v = yMin + ((yMax - yMin) / ticks) * i;
    grid += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${C.grid}"/>
      <text x="${L - 10}" y="${Y(v) + 6}" text-anchor="end" font-size="18" fill="${C.muted}">${fmt(Math.round(v))}</text>`;
  }
  const refs = (chart.refLines || []).map(([y, label, color]) =>
    `<line x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}" stroke="${color}" stroke-width="3" stroke-dasharray="10 7"/>
      <text x="${L + 10}" y="${Y(y) - 8}" font-size="19" font-weight="700" fill="${color}">${esc(label)}</text>`).join('');
  const path = chart.points.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  const dots = chart.points.map((p) => `
    <circle cx="${X(p[0])}" cy="${Y(p[1])}" r="8" fill="#1f9d55" stroke="#fff" stroke-width="3"/>
    <text x="${X(p[0])}" y="${Y(p[1]) - 16}" text-anchor="middle" font-size="21" font-weight="700" fill="${C.text}">${fmt(p[1])}</text>
    <text x="${X(p[0])}" y="${H - 16}" text-anchor="middle" font-size="19" fill="${C.muted}">${p[0]}</text>`).join('');
  return wrap(chart, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(chart.title)}">${grid}${refs}
    <path class="line-draw" d="${path}" fill="none" stroke="#1f9d55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>${dots}</svg>`);
}
