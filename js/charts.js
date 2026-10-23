import { esc } from "./core/util.js";

/* ============ 轻量 SVG 图表（经文卡库用）：环形图、横向堆叠条、竖条、记忆曲线 ============
   颜色走 CSS 变量，深浅色都跟着变；每个色块旁都有数字和文字图例，不靠颜色单独传达信息。
   drill 是一个 "kind|status" 之类的字符串，写在 data-libf 上，点一下由 events.js 套用成筛选。 */
const hit = (drill, label) => (drill ? ` data-libf="${esc(drill)}" role="button" tabindex="0" aria-label="${esc(label)}" style="cursor:pointer"` : "");

/** 环形图 items: [{ name, value, color, drill }]；center 是圆心的大字 */
function donut(items, { center = "", sub = "", title = "" } = {}){
  const total = items.reduce((a, x) => a + x.value, 0), S = 160, R = 70, r = 44, cx = S / 2, cy = S / 2;
  let arcs = "", a0 = -Math.PI / 2;
  const P = (rad, ang) => `${(cx + rad * Math.cos(ang)).toFixed(2)} ${(cy + rad * Math.sin(ang)).toFixed(2)}`;
  for (const it of items) {
    if (it.value <= 0) continue;
    const frac = it.value / total, label = `${it.name}：${it.value}`;
    if (frac >= 0.9999) { arcs += `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${it.color}" stroke-width="${R - r}"${hit(it.drill, label)}><title>${esc(label)}</title></circle>`; continue; }
    const a1 = a0 + frac * Math.PI * 2, large = frac > 0.5 ? 1 : 0;
    arcs += `<path d="M ${P(R, a0)} A ${R} ${R} 0 ${large} 1 ${P(R, a1)} L ${P(r, a1)} A ${r} ${r} 0 ${large} 0 ${P(r, a0)} Z" fill="${it.color}"${hit(it.drill, label)}><title>${esc(label)}</title></path>`;
    a0 = a1;
  }
  if (!total) arcs = `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="var(--line)" stroke-width="${R - r}"/>`;
  const legend = items.map(it => `<li><i style="background:${it.color}"></i>${it.drill && it.value ? `<button class="linkbtn" data-libf="${esc(it.drill)}">${esc(it.name)}</button>` : `<span>${esc(it.name)}</span>`}<b>${it.value}</b><em>${total ? Math.round(it.value / total * 100) : 0}%</em></li>`).join("");
  return `<figure class="lib-chart donut"><svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(title)}">${arcs}
    <text x="${cx}" y="${cy + 2}" text-anchor="middle" class="ch-big">${esc(String(center))}</text><text x="${cx}" y="${cy + 18}" text-anchor="middle" class="ch-sub">${esc(sub)}</text></svg>
    <ul class="lib-legend">${legend}</ul></figure>`;
}

/** 横向堆叠条：rows: [{ label, segs: [{ name, value, color, drill }] }]；每行一条，右边写合计 */
function stack(rows, { title = "" } = {}){
  const max = Math.max(1, ...rows.map(r => r.segs.reduce((a, s) => a + s.value, 0)));
  return `<div class="lib-chart stack" role="group" aria-label="${esc(title)}">${rows.map(r => {
    const tot = r.segs.reduce((a, s) => a + s.value, 0);
    return `<div class="stack-row"><span class="stack-k">${esc(r.label)}</span><span class="stack-bar" style="width:${Math.max(tot ? 6 : 0, tot / max * 100)}%">${r.segs.filter(s => s.value > 0).map(s =>
      `<span class="stack-seg" style="flex:${s.value};background:${s.color}"${hit(s.drill, `${r.label} ${s.name}：${s.value}`)} title="${esc(`${s.name}：${s.value}`)}">${s.value}</span>`).join("")}</span><b class="stack-n">${tot}</b></div>`;
  }).join("")}</div>`;
}

/** 竖条：items: [{ label, value, color, drill }]；value 为 0 的画一条细线，标签在下面，数字在上面 */
function bars(items, { title = "", height = 110 } = {}){
  const max = Math.max(1, ...items.map(x => x.value)), W = 300, n = items.length, gap = 6, bw = (W - gap * (n + 1)) / n, base = height + 16;
  const g = items.map((x, i) => {
    const h = Math.max(x.value ? 3 : 1, x.value / max * height), x0 = gap + i * (bw + gap), label = `${x.label}：${x.value}`;
    return `<g${hit(x.drill && x.value ? x.drill : "", label)}><rect x="${x0.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${x.color}"><title>${esc(label)}</title></rect>
      ${x.value ? `<text x="${(x0 + bw / 2).toFixed(1)}" y="${(base - h - 3).toFixed(1)}" text-anchor="middle" class="ch-val">${x.value}</text>` : ""}
      <text x="${(x0 + bw / 2).toFixed(1)}" y="${base + 13}" text-anchor="middle" class="ch-tick">${esc(x.label)}</text></g>`;
  }).join("");
  return `<figure class="lib-chart bars"><svg viewBox="0 0 ${W} ${height + 36}" role="img" aria-label="${esc(title)}">${g}<line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="var(--line)"/></svg></figure>`;
}

/** 记忆曲线（估算）：横轴 = 学会后第几天（开方刻度，前几天不被挤扁），纵轴 = 估计记得多少。
 *  锯齿线 = 按 3 → 7 → 30 → 90 → 180 天复习时的理想曲线（每次复习回到 100%，复习点掉到约 85% 前复习）；点 = 每张已会背的卡现在大概在哪。
 *  curve: [{ day, v }] 折线点；marks 里的 { day, v, label }；ticks 里是横轴要标的天数 */
function curve(curve, marks, ticks, { title = "" } = {}){
  const W = 300, H = 130, L = 26, B = 22, T = 8, Rm = 8, maxD = Math.max(...ticks);
  const X = d => L + Math.sqrt(Math.max(0, d) / maxD) * (W - L - Rm), Y = v => T + (1 - v) * (H - T - B);
  const path = curve.map((p, i) => `${i ? "L" : "M"}${X(p.day).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
  const grid = [1, .85, .5, 0].map(v => `<line x1="${L}" x2="${W - Rm}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="${v === .85 ? "4 3" : "0"}"/><text x="${L - 4}" y="${Y(v) + 3}" text-anchor="end" class="ch-tick">${Math.round(v * 100)}%</text>`).join("");
  const xt = ticks.map(d => `<text x="${X(d).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="ch-tick">${d}</text>`).join("");
  const dots = marks.map(m => `<circle cx="${X(m.day).toFixed(1)}" cy="${Y(m.v).toFixed(1)}" r="3.5" fill="${m.color}" stroke="var(--surface)" stroke-width="1"><title>${esc(m.label)}</title></circle>`).join("");
  return `<figure class="lib-chart curve"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid}<path d="${path}" fill="none" stroke="var(--slate)" stroke-width="2"/>${dots}${xt}</svg></figure>`;
}

export { donut, stack, bars, curve };
