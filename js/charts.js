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

/** 时间走势折线（身高、体重、BMI、血压、心率…）：横轴按真实日期排（体检隔几个月、隔一年都看得出快慢），刻度带年份；
 *  纵轴只取数据的范围、上下留一点白（不从 0 画起，长了 0.4 kg 也看得见）。
 *  lines: [{ name, color, pts: [{ ts, v, tag }] }]；tag（比如百分位 P62）写在点上方，点多时只写最后一个。几条线时左上角有图例。 */
function timeLine(lines, { title = "", dec = 1 } = {}){
  const W = 300, H = 160, L = 34, R = 14, T = lines.length > 1 ? 24 : 16, B = 22, DAY = 864e5;
  const all = lines.flatMap(l => l.pts); if (!all.length) return "";
  let t0 = Math.min(...all.map(p => p.ts)), t1 = Math.max(...all.map(p => p.ts));
  if (t1 - t0 < 20 * DAY) { t0 -= 15 * DAY; t1 += 15 * DAY; }   // 只有一两次：两边各留半个月，点不贴边
  let lo = Math.min(...all.map(p => p.v)), hi = Math.max(...all.map(p => p.v));
  const pad = (hi - lo) * 0.18 || Math.max(Math.abs(hi) * 0.05, 1); lo -= pad; hi += pad;
  const X = ts => L + (ts - t0) / (t1 - t0) * (W - L - R), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const r = v => Math.round(v * 10 ** dec) / 10 ** dec;
  const grid = [0.1, 0.5, 0.9].map(f => lo + (hi - lo) * f).map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)"/><text x="${L - 4}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end" class="ch-tick">${r(v)}</text>`).join("");
  const pad2 = n => String(n).padStart(2, "0"), span = t1 - t0, short = span < 100 * DAY;
  const fmt = ts => { const d = new Date(ts); return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}${short ? "/" + pad2(d.getDate()) : ""}`; };
  const n = short ? 3 : 4, seen = new Set();
  const xt = Array.from({ length: n }, (_, i) => t0 + span * i / (n - 1)).map((ts, i) => { const s = fmt(ts); if (seen.has(s)) return ""; seen.add(s);
    return `<text x="${X(ts).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}" class="ch-tick">${s}</text>`; }).join("");
  const body = lines.map(l => { const p = [...l.pts].sort((a, b) => a.ts - b.ts); if (!p.length) return "";
    const path = p.map((q, i) => `${i ? "L" : "M"}${X(q.ts).toFixed(1)} ${Y(q.v).toFixed(1)}`).join(" ");
    const dots = p.map((q, i) => `<circle cx="${X(q.ts).toFixed(1)}" cy="${Y(q.v).toFixed(1)}" r="3.5" fill="${l.color}" stroke="var(--surface)" stroke-width="1.2"><title>${esc(`${fmt(q.ts)}${short ? "" : "/" + pad2(new Date(q.ts).getDate())} · ${l.name ? l.name + " " : ""}${q.v}${q.tag ? " · " + q.tag : ""}`)}</title></circle>
      ${q.tag && (p.length <= 8 || i === p.length - 1) ? `<text x="${X(q.ts).toFixed(1)}" y="${(Y(q.v) - 7).toFixed(1)}" text-anchor="middle" class="ch-val">${esc(q.tag)}</text>` : ""}`).join("");
    return `<path d="${path}" fill="none" stroke="${l.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}`; }).join("");
  const legend = lines.length > 1 ? lines.map((l, i) => `<line x1="${L + i * 70}" x2="${L + i * 70 + 14}" y1="8" y2="8" stroke="${l.color}" stroke-width="2.5"/><text x="${L + i * 70 + 18}" y="11" class="ch-tick">${esc(l.name)}</text>`).join("") : "";
  return `<figure class="lib-chart tline"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${legend}${grid}${body}${xt}</svg></figure>`;
}

export { donut, stack, bars, curve, timeLine };
