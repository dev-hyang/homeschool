import { S } from "./core/state.js";
import { esc } from "./core/util.js";
import { SUBJECTS, subject } from "./data/subjects.js";

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
  return `<h2>资源库</h2>
  <div class="chips" role="group" aria-label="领域">${chip("subject", "", "全部", f.subject)}${Object.keys(SUBJECTS).map(k => chip("subject", k, SUBJECTS[k].short, f.subject)).join("")}</div>
  <div class="chips" role="group" aria-label="语言与类型" style="margin-top:0">${chip("lang", "", "所有语言", f.lang)}${Object.entries(LANGS).map(([k, l]) => chip("lang", k, l, f.lang)).join("")}<span style="flex-basis:100%"></span>${chip("type", "", "所有类型", f.type)}${Object.entries(TYPES).map(([k, l]) => chip("type", k, l, f.type)).join("")}</div>
  <div class="panel">${list.length ? list.map(row).join("") : `<p class="muted">${S.hs.resources.length ? "没有符合筛选的资源。" : "资源库是空的。导入起步资源（设计方案里核对过的中英文清单），或者添加你们自己的。"}</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="res-add">＋ 资源</button><button class="btn" data-act="seed-resources">${S.hs.resources.length ? "补充导入起步资源" : "导入起步资源"}</button></div></div>
  <p class="small muted" style="margin-top:8px">资源属于全家。链接随时会失效，发现了就点编辑改掉。</p>`;
}

export { viewResources, TYPES as RES_TYPES, LANGS as RES_LANGS };
