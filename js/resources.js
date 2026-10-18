import { t, tc } from "./core/i18n.js";
import { S, ageMonths, childName } from "./core/state.js";
import { esc } from "./core/util.js";
import { SUBJECTS, subject } from "./data/subjects.js";
import { BANDS, CATS, IDEA_SOURCES, bandFor, ideas } from "./data/ideas.js";
import { FEEDS, dailyPicks } from "./data/feeds.js";
import { render } from "./views.js";
import { mrow } from "./me.js";

/* ============ 资源：入口页（日常点子 / 资源库 / 参考来源 三个入口带摘要）→ 子页 ============ */
const missing = () => `<div class="empty">${t("资源库需要数据库迁移 004。")}<br>${t("请在 Supabase 执行本地")} <code>supabase/migrations/004_homeschool_phase2_4.sql</code>${t("，然后刷新。")}</div>`;

/* ============ 日常点子：手工 / 户外 / 家务，按孩子年龄段 ============
   两种来源：每日新鲜 = 直接读几家博客的公开接口，每条链接到原文；精选清单 = 内置的固定清单（离线也能用）。 */
S.ideaFilter = S.ideaFilter || { band: "", cat: "craft", seed: 0, all: false, mode: "feed", lang: "en" };
const feedCache = new Map(); // key → "loading" | { items, errors, feeds }
let shownFeed = [];          // 当前画在页面上的那组，给“加到今天”按下标取
const feedItem = i => shownFeed[i];
function ensureFeed(f, band){
  const key = `${new Date().toISOString().slice(0, 10)}|${band}|${f.cat}|${f.lang}|${f.seed}`;
  if (feedCache.has(key)) return feedCache.get(key);
  feedCache.set(key, "loading");
  dailyPicks({ band, cat: f.cat, lang: f.lang, seed: f.seed })
    .then(r => { feedCache.set(key, r); if (S.tab === "res-ideas") render(); })
    .catch(e => { feedCache.set(key, { items: [], errors: [e.message], feeds: [] }); if (S.tab === "res-ideas") render(); });
  return "loading";
}
const searchUrl = x => `https://www.google.com/search?q=${encodeURIComponent(`${x.t} ${x.q || "幼儿 活动"}`)}`;
function feedHTML(f, band, color){
  const r = ensureFeed(f, band);
  if (r === "loading") return `<p class="muted">${t("正在从博客取今天的点子…")}</p>`;
  shownFeed = r.items;
  if (!r.items.length) return `<p class="muted">${t("这一批没取到")}${r.errors.length ? `（${esc(r.errors.join("；"))}）` : ""}。${t("点“换一批”，或切到精选清单。")}</p>`;
  return r.items.map((x, i) => `<div class="res"><span class="bar" style="background:${color}"></span>
    <div class="v"><a href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.title)}</b></a>${x.excerpt ? `<div class="small">${esc(x.excerpt)}${x.excerpt.length >= 140 ? "…" : ""}</div>` : ""}<div class="small muted">${esc(x.source)}${x.date ? ` · ${esc(x.date)}` : ""} · ${t("点标题看原文")}</div></div>
    <button class="chip" data-act="feed-add" data-i="${i}" title="${t("加到{name}今天的任务", { name: esc(childName()) })}">${t("加到今天")}</button></div>`).join("")
    + `<p class="small muted" style="margin:8px 0 0">${t("今天这组来自 {feeds}。同一天看到的一样，“换一批”换站或换页。", { feeds: esc(r.feeds.join("、")) })}</p>`;
}
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
  const color = subject(CATS[f.cat].subject).color, feed = f.mode !== "list";
  const item = ([x, i]) => `<div class="res"><span class="bar" style="background:${color}"></span>
    <div class="v"><b>${tc(esc(x.t))}</b> <a class="small" href="${searchUrl(x)}" target="_blank" rel="noopener">${t("搜详情")}</a><div class="small">${tc(esc(x.h))}</div>${x.f ? `<div class="small muted">✝ ${tc(esc(x.f))}</div>` : ""}</div>
    <button class="chip" data-act="idea-add" data-band="${band.id}" data-cat="${f.cat}" data-i="${i}" title="${t("加到{name}今天的任务", { name: esc(childName()) })}">${t("加到今天")}</button></div>`;
  return `<h2>${t("日常点子")}</h2>
  <div class="chips" role="group" aria-label="${t("来源")}">${chip("mode", "feed", t("每日新鲜（博客）"), feed ? "feed" : "list")}${chip("mode", "list", t("精选清单"), feed ? "feed" : "list")}${feed ? `<span style="flex-basis:100%"></span>${chip("lang", "en", t("English 博客"), f.lang)}${chip("lang", "zh", t("中文博客（在家教育 · 亲子）"), f.lang)}` : ""}</div>
  <div class="chips" role="group" aria-label="${t("年龄段")}" style="margin-top:0">${BANDS.map(b => chip("band", b.id, t(b.name) + (b.id === auto.id ? `（${childName()}）` : ""), band.id)).join("")}</div>
  <div class="chips" role="group" aria-label="${t("类别")}" style="margin-top:0">${Object.entries(CATS).map(([k, c]) => chip("cat", k, `${c.icon} ${t(c.name)}`, f.cat)).join("")}</div>
  <div class="panel">${feed ? feedHTML(f, band.id, color) : `${f.cat === "chore" ? `<p class="small muted" style="margin-top:0">${t("家务按年龄逐级加码：前一档会做的继续做，这里只列本档新加的。先一起做，再放手。")}</p>` : ""}${shown.map(item).join("")}`}
    <div class="btns" style="margin-top:8px">${feed ? `<button class="btn" data-act="idea-shuffle">${t("换一批")}</button>` : f.all ? `<button class="btn" data-act="idea-less">${t("只看几条")}</button>` : `<button class="btn" data-act="idea-shuffle">${t("换一批")}</button><button class="btn" data-act="idea-all">${t("看全部 {n} 条", { n: list.length })}</button>`}<button class="btn" data-act="idea-sources">${t("参考来源")}</button></div></div>`;
}
const ideaSourcesHTML = () => `<p class="small muted">${t("<b>每日新鲜</b>直接读下面博客的 WordPress 公开接口（和经文抓取用 getBible 一个道理：无密钥、浏览器直取），每条都链接到原文；<b>精选清单</b>是内置的固定清单，每条带一个“搜详情”。年龄只是参考，以自己孩子的能力为准。微信公众号和 Facebook 没有公开接口，抓不到，看到好的可以手动加进资源库。")}</p>
  <h2>${t("每日新鲜读的博客")}</h2>
  ${FEEDS.map(s => `<div class="res"><span class="bar" style="background:var(--line)"></span><div class="v"><a href="https://${esc(s.host)}/" target="_blank" rel="noopener"><b>${esc(s.name)}</b></a><div class="small muted">${s.lang === "zh" ? t("中文") : t("英文")} · ${s.cats.map(c => t(CATS[c].name)).join(" / ")}</div></div><span></span></div>`).join("")}
  <p class="small muted">${t("中文站少：吹号者（纽约华人在家教育事工）、在基督裡自學（台湾基督徒自学家庭，WordPress.com）、舉目（海外校园的亲子与教养文章）。它们的文章偏信仰与教养，手工类不多。知道别的开着公开接口的中文博客，告诉我们就能加。")}</p>
  <h2>${t("精选清单参考")}</h2>
  ${IDEA_SOURCES.map(s => `<div class="res"><span class="bar" style="background:var(--line)"></span><div class="v"><a href="${esc(s.url)}" target="_blank" rel="noopener"><b>${esc(s.name)}</b></a><div class="small muted">${tc(esc(s.note))}</div></div><span></span></div>`).join("")}`;

/* ============ 资源页：链接、书目、视频、打印件，按领域 / 语言 / 类型筛选 ============ */
S.resFilter = S.resFilter || { subject: "", lang: "", type: "" };
const TYPES = { link: "链接", book: "书", video: "视频", print: "打印件", course: "课程", org: "机构" };
const LANGS = { zh: "中文", en: "英文", bi: "双语" };

/* 入口页 */
function viewResources(){
  if (!S.hs.phase2) return missing();
  const f = S.ideaFilter, auto = bandFor(ageMonths()), band = BANDS.find(b => b.id === f.band) || auto, n = S.hs.resources.length;
  const kinds = {}; S.hs.resources.forEach(r => { kinds[r.type] = (kinds[r.type] || 0) + 1; });
  const kindLine = Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${TYPES[k] ? t(TYPES[k]) : k} ${v}`).join(" · ");
  return `<h2>${t("资源")}</h2>
  <div class="panel mlist">
    ${mrow('data-tab="res-ideas"', t("日常点子"), `${CATS[f.cat].icon} ${t(CATS[f.cat].name)} · ${t(band.name)}${band.id === auto.id ? `（${esc(childName())}）` : ""} · ${f.mode === "list" ? t("精选清单") : t("每日新鲜（博客）")}`, "✦")}
    ${mrow('data-tab="res-library"', t("资源库"), n ? t("{n} 条", { n }) + (kindLine ? ` · ${kindLine}` : "") : t("还是空的，进去导入起步资源"), "▤")}
    ${mrow('data-act="idea-sources"', t("参考来源"), t("每日新鲜读的博客、精选清单的出处"), "↗")}
  </div>`;
}

/* 子页：资源库 */
function viewLibrary(){
  if (!S.hs.phase2) return missing();
  const f = S.resFilter;
  const list = S.hs.resources.filter(r => (!f.subject || r.subject === f.subject) && (!f.lang || r.lang === f.lang) && (!f.type || r.type === f.type)).sort((a, b) => a.sort - b.sort);
  const chip = (attr, val, label, cur) => `<button class="chip" data-rf="${attr}" data-v="${esc(val)}" aria-pressed="${cur === val}">${esc(label)}</button>`;
  const age = r => r.age_min != null || r.age_max != null ? ` · ${r.age_min ?? ""}${r.age_min != null && r.age_max != null ? "–" : ""}${r.age_max ?? ""} ${t("岁")}${r.age_min != null && r.age_max == null ? t("起") : ""}` : "";
  const row = r => `<div class="res"><span class="bar" style="background:${r.subject ? subject(r.subject).color : "var(--line)"}"></span>
    <div class="v">${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.title)}</b></a>` : `<b>${esc(r.title)}</b>`}
      <div class="meta small muted">${TYPES[r.type] ? t(TYPES[r.type]) : esc(r.type)} · ${LANGS[r.lang] ? t(LANGS[r.lang]) : esc(r.lang)}${r.subject ? ` · ${esc(subject(r.subject).short)}` : ""}${age(r)}${r.source ? ` · ${esc(r.source)}` : ""}${(r.tags || []).length ? ` · ${r.tags.map(esc).join(" / ")}` : ""}</div>
      ${r.note ? `<div class="small">${esc(r.note)}</div>` : ""}</div>
    <button class="chip" data-act="res-edit" data-rid="${esc(r.id)}">${t("编辑")}</button></div>`;
  return `<h2>${t("资源库")}</h2>
  <div class="chips" role="group" aria-label="${t("领域")}">${chip("subject", "", t("全部"), f.subject)}${Object.keys(SUBJECTS).map(k => chip("subject", k, SUBJECTS[k].short, f.subject)).join("")}</div>
  <div class="chips" role="group" aria-label="${t("语言与类型")}" style="margin-top:0">${chip("lang", "", t("所有语言"), f.lang)}${Object.entries(LANGS).map(([k, l]) => chip("lang", k, t(l), f.lang)).join("")}<span style="flex-basis:100%"></span>${chip("type", "", t("所有类型"), f.type)}${Object.entries(TYPES).map(([k, l]) => chip("type", k, t(l), f.type)).join("")}</div>
  <div class="panel">${list.length ? list.map(row).join("") : `<p class="muted">${S.hs.resources.length ? t("没有符合筛选的资源。") : t("资源库是空的。导入起步资源（设计方案里核对过的中英文清单），或者添加你们自己的。")}</p>`}
    <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="res-add">＋ ${t("资源")}</button><button class="btn" data-act="seed-resources">${S.hs.resources.length ? t("补充导入起步资源") : t("导入起步资源")}</button></div></div>
  <p class="small muted" style="margin-top:8px">${t("资源属于全家。链接随时会失效，发现了就点编辑改掉。")}</p>`;
}

export { viewResources, viewIdeas, viewLibrary, ideaSourcesHTML, feedItem, TYPES as RES_TYPES, LANGS as RES_LANGS };
