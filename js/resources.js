import { S, ageMonths, childName } from "./core/state.js";
import { esc } from "./core/util.js";
import { SUBJECTS, subject } from "./data/subjects.js";
import { BANDS, CATS, IDEA_SOURCES, bandFor, ideas } from "./data/ideas.js";

/* ============ 日常点子：手工 / 户外 / 家务，按孩子年龄段 ============ */
S.ideaFilter = S.ideaFilter || { band: "", cat: "craft", seed: 0, all: false };
// 伪随机但稳定：同一天同一 seed 看到同一批，点“换一批”才变
function pick(list, n, seed){
  const day = new Date().toISOString().slice(0, 10); let h = 0; for (const c of day + seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const arr = list.map((x, i) => [x, i]); for (let i = arr.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, n);
}
function viewIdeas(){
  const f = S.ideaFilter, auto = bandFor(ageMonths()), band = BANDS.find(b => b.id === f.band) || auto, list = ideas(band.id, f.cat);
  const shown = f.all ? list.map((x, i) => [x, i]) : pick(list, 4, f.seed);
  const chip = (attr, val, label, cur) => `<button class="chip" data-if="${attr}" data-v="${esc(val)}" aria-pressed="${cur === val}">${esc(label)}</button>`;
  const item = ([x, i]) => `<div class="res"><span class="bar" style="background:${subject(CATS[f.cat].subject).color}"></span>
    <div class="v"><b>${esc(x.t)}</b><div class="small">${esc(x.h)}</div>${x.f ? `<div class="small muted">✝ ${esc(x.f)}</div>` : ""}</div>
    <button class="chip" data-act="idea-add" data-band="${band.id}" data-cat="${f.cat}" data-i="${i}" title="加到${childName()}今天的任务">加到今天</button></div>`;
  return `<h2>日常点子</h2>
  <div class="chips" role="group" aria-label="年龄段">${BANDS.map(b => chip("band", b.id, b.name + (b.id === auto.id ? `（${childName()}）` : ""), band.id)).join("")}</div>
  <div class="chips" role="group" aria-label="类别" style="margin-top:0">${Object.entries(CATS).map(([k, c]) => chip("cat", k, `${c.icon} ${c.name}`, f.cat)).join("")}</div>
  <div class="panel">${f.cat === "chore" ? `<p class="small muted" style="margin-top:0">家务按年龄逐级加码：前一档会做的继续做，这里只列本档新加的。先一起做，再放手。</p>` : ""}
    ${shown.map(item).join("")}
    <div class="btns" style="margin-top:8px">${f.all ? `<button class="btn" data-act="idea-less">只看几条</button>` : `<button class="btn" data-act="idea-shuffle">换一批</button><button class="btn" data-act="idea-all">看全部 ${list.length} 条</button>`}<button class="btn" data-act="idea-sources">参考来源</button></div></div>`;
}
const ideaSourcesHTML = () => `<p class="small muted">点子大多改写自下面这些长期更新的站点，年龄只是参考，以自己孩子的能力为准。微信公众号和 Facebook 的内容抓不到，看到好的可以手动加进资源库。</p>
  ${IDEA_SOURCES.map(s => `<div class="res"><span class="bar" style="background:var(--line)"></span><div class="v"><a href="${esc(s.url)}" target="_blank" rel="noopener"><b>${esc(s.name)}</b></a><div class="small muted">${esc(s.note)}</div></div><span></span></div>`).join("")}`;

/* ============ 资源页：链接、书目、视频、打印件，按领域 / 语言 / 类型筛选 ============ */
S.resFilter = S.resFilter || { subject: "", lang: "", type: "" };
const TYPES = { link: "链接", book: "书", video: "视频", print: "打印件", course: "课程", org: "机构" };
const LANGS = { zh: "中文", en: "英文", bi: "双语" };

function viewResources(){
  if (!S.hs.phase2) return `<div class="empty">资源库需要数据库迁移 004。<br>请在 Supabase 执行本地 <code>supabase/migrations/004_homeschool_phase2_4.sql</code>，然后刷新。</div>`;
  const f = S.resFilter;
  const list = S.hs.resources.filter(r => (!f.subject || r.subject === f.subject) && (!f.lang || r.lang === f.lang) && (!f.type || r.type === f.type)).sort((a, b) => a.sort - b.sort);
  const chip = (attr, val, label, cur) => `<button class="chip" data-rf="${attr}" data-v="${esc(val)}" aria-pressed="${cur === val}">${esc(label)}</button>`;
  const row = r => `<div class="res"><span class="bar" style="background:${r.subject ? subject(r.subject).color : "var(--line)"}"></span>
    <div class="v">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.title)}</b></a>` : `<b>${esc(r.title)}</b>`}
      <div class="meta small muted">${TYPES[r.type] || r.type} · ${LANGS[r.lang] || r.lang}${r.subject ? ` · ${subject(r.subject).short}` : ""}${r.age_min != null || r.age_max != null ? ` · ${r.age_min ?? ""}${r.age_min != null && r.age_max != null ? "–" : ""}${r.age_max ?? ""} 岁${r.age_min != null && r.age_max == null ? "起" : ""}` : ""}${r.source ? ` · ${esc(r.source)}` : ""}${(r.tags || []).length ? ` · ${r.tags.map(esc).join(" / ")}` : ""}</div>
      ${r.note ? `<div class="small">${esc(r.note)}</div>` : ""}</div>
    <button class="chip" data-act="res-edit" data-rid="${esc(r.id)}">编辑</button></div>`;
  return `${viewIdeas()}<h2>资源库</h2>
  <div class="chips" role="group" aria-label="领域">${chip("subject", "", "全部", f.subject)}${Object.keys(SUBJECTS).map(k => chip("subject", k, SUBJECTS[k].short, f.subject)).join("")}</div>
  <div class="chips" role="group" aria-label="语言与类型" style="margin-top:0">${chip("lang", "", "所有语言", f.lang)}${Object.entries(LANGS).map(([k, l]) => chip("lang", k, l, f.lang)).join("")}<span style="flex-basis:100%"></span>${chip("type", "", "所有类型", f.type)}${Object.entries(TYPES).map(([k, l]) => chip("type", k, l, f.type)).join("")}</div>
  <div class="panel">${list.length ? list.map(row).join("") : `<p class="muted">${S.hs.resources.length ? "没有符合筛选的资源。" : "资源库是空的。导入起步资源（设计方案里核对过的中英文清单），或者添加你们自己的。"}</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="res-add">＋ 资源</button><button class="btn" data-act="seed-resources">${S.hs.resources.length ? "补充导入起步资源" : "导入起步资源"}</button></div></div>
  <p class="small muted" style="margin-top:8px">资源属于全家。链接随时会失效，发现了就点编辑改掉。</p>`;
}

export { viewResources, ideaSourcesHTML, TYPES as RES_TYPES, LANGS as RES_LANGS };
