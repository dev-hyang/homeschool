import { SB } from "./core/auth.js";
import { t, tc } from "./core/i18n.js";
import { S, ageText, childName, stageOf } from "./core/state.js";
import { D, dayKey, esc, toast } from "./core/util.js";
import { OUTCOMES, PRINCIPLES } from "./data/bedtime.js";
import { CONFLICTS, FLOWS, STAGE_NAME } from "./data/flows.js";
import { activeSteps, cfg, deleteEvent, h2, isCf, kidName, kids, lastLog, migrateHTML, offlineHTML, online, outcomeLabel, saveCfg, saveEvent, sitStats, totalMin } from "./bedtime.js";
import { mrow } from "./me.js";
import { closeSheet, openForm } from "./sheet.js";
import { render } from "./views.js";

/* ============ 定制流程（资源页下的一层）：睡前安然 + 冲突管理 + 以后补充的流程 ============
   冲突管理：害怕、怕生、不愿分享、抢东西、打人、咬人、发脾气。每种状况按孩子现在的年龄段解释「为什么」，再给做法、怎么说、不要，
   并读取小月亮里这个孩子近 60 天的「情绪行为 / 社交」记录，显示次数、与上个 30 天的对比、平均持续、家里用过的处理办法。

   记录怎么回填（两个方向，规则很简单）：
   ① 家庭学堂 → 小月亮（自动）：在这里「记一笔」时，同时往小月亮写一条「情绪行为」（每个参加的孩子一条），不用再到小月亮手动记。
      小月亮那条的 id 固定（hscf-记录id-孩子id），所以在这里改这笔会更新它、删这笔会把它标成已删，不会重复。可在页面上关掉。
   ② 小月亮 → 家庭学堂（只读，不回写）：这里读小月亮已有的记录（包括你在小月亮手动记的）来显示次数和趋势；读到的不会再写回去，也不会复制一份。
   所以：想省事就只在家庭学堂记（同时进了小月亮）；在小月亮里已经记过的，这里直接能看到，不用重复录。
   补记：过去的日子也能补，小月亮那条的时间落在那天中午。 */
const B = (S.cf = S.cf || { loaded: false, loading: false, rows: [], ts: 0, err: "" });
const fid = () => S.family && S.family.id;
const stageKey = () => stageOf().key;
const cfEvents = () => S.bt.events.filter(isCf);

/* ---- 读小月亮的情绪行为 / 社交记录（只读）---- */
async function loadBaby(force){
  if (B.loading || !SB.client || !fid() || !S.hs.loaded) return;
  if (!force && B.loaded && Date.now() - B.ts < 60e3) return;
  B.loading = true;
  const { data, error } = await SB.client.from("entries").select("id,type,ts,data").eq("family_id", fid()).in("type", ["behavior", "social"]).eq("deleted", false).gte("ts", Date.now() - 61 * D).order("ts", { ascending: false }).limit(1500);
  B.loading = false; B.ts = Date.now(); B.loaded = !error; B.err = error ? (error.message || "error") : "";
  B.rows = (data || []).map(r => ({ ...(r.data || {}), id: r.id, type: r.type, ts: r.ts }));
  if (S.tab === "flow-conflict") render();
}
const mineRows = () => { const cid = S.childId, first = S.children[0] && S.children[0].id; return B.rows.filter(e => e.child === cid || (!e.child && first === cid)); };
const BL_KINDS = ["发脾气", "哭闹", "分离焦虑", "害怕", "打人/咬人", "分享合作", "开心"];
function blStats(sit){
  const rows = mineRows(), now = Date.now(), c30 = now - 30 * D;
  const hit = e => (e.type === "behavior" && sit.bl.kinds.includes(e.kind)) || (e.type === "social" && (sit.bl.social || []).includes(e.kind));
  const all = rows.filter(hit), cur = all.filter(e => e.ts >= c30), prev = all.filter(e => e.ts < c30);
  const mins = cur.filter(e => +e.minutes > 0), how = {};
  all.forEach(e => { const h = String(e.how || "").trim(); if (h) how[h] = (how[h] || 0) + 1; });
  return { cur: cur.length, prev: prev.length, avgMin: mins.length ? Math.round(mins.reduce((a, e) => a + +e.minutes, 0) / mins.length) : null,
    how: Object.entries(how).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]), fromHere: all.filter(e => String(e.id).startsWith("hscf-")).length };
}
const trendText = (a, b) => a > b ? `<span class="bt-up">▲ ${t("比上个 30 天多 {n}", { n: a - b })}</span>` : a < b ? `<span class="bt-down">▼ ${t("比上个 30 天少 {n}", { n: b - a })}</span>` : `<span class="muted">${t("和上个 30 天一样")}</span>`;

/* ============ 定制流程：入口页 ============ */
function viewFlows(){
  const c = cfg(), last = lastLog(), today = dayKey(Date.now());
  const n30 = cfEvents().filter(e => e.date >= dayKey(Date.now() - 29 * D)).length;
  const desc = {
    bedtime: `${t("{n} 步 · 约 {m} 分钟", { n: activeSteps(c).length, m: totalMin(c) })} · ${!last ? t("还没做过") : last.date === today ? t("今晚已完成 · {n} 分钟", { n: last.actual_min }) : t("上次 {d} · {n} 分钟", { d: last.date, n: last.actual_min })}`,
    conflict: n30 ? t("{k} 种状况 · 近 30 天记了 {n} 次", { k: CONFLICTS.length, n: n30 }) : t("{k} 种状况：害怕、怕生、不愿分享、抢东西、打人、咬人、发脾气", { k: CONFLICTS.length })
  };
  return `${h2(t("定制流程"))}
  <p class="small muted">${t("把家里反复出现的情境做成「流程 + 模板 + 记录」：事先想好怎么做、怎么说，当场照着做，事后记一笔，过几周回头看哪些做法值得继续。每个流程是下面的一个子层级，以后会陆续补充。")}</p>
  <div class="panel mlist">${FLOWS.map(f => mrow(`data-tab="${f.tab}"`, t(f.name), desc[f.id] || esc(tc(f.desc)), f.icon)).join("")}</div>`;
}

/* ============ 冲突管理 ============ */
function viewConflict(){
  loadBaby();
  const stage = stageKey(), c = cfg(), rows = mineRows();
  const counts = BL_KINDS.map(k => { const now = Date.now(), c30 = now - 30 * D, mine = rows.filter(e => e.type === "behavior" && e.kind === k); return { k, cur: mine.filter(e => e.ts >= c30).length, prev: mine.filter(e => e.ts < c30).length }; });
  const top = CONFLICTS.map(s => ({ s, st: blStats(s) })).filter(x => !x.s.bl.good && x.st.cur > 0).sort((a, b) => b.st.cur - a.st.cur)[0];
  const evs = cfEvents();
  const card = s => {
    const bl = blStats(s), mine = sitStats(s.id), keep = mine.keep;
    const others = ["baby", "toddler", "prek", "school"].filter(k => k !== stage);
    return `<div class="panel bt-sit"><div class="bt-card-row"><div><b>${esc(tc(s.when))}</b><div class="small muted">${esc(tc(s.short))}</div></div><button class="btn primary" data-act="cf-ev-add" data-sit="${esc(s.id)}">${t("记一笔")}</button></div>
      <p class="cf-why"><b>${esc(childName())} · ${esc(ageText())}（${esc(STAGE_NAME[stage])}）</b><br>${esc(tc(s.why[stage]))}</p>
      <details class="cf-others"><summary class="small muted">${t("其他年龄段怎么看")}</summary>${others.map(k => `<p class="small"><b>${esc(STAGE_NAME[k])}</b>　${esc(tc(s.why[k]))}</p>`).join("")}</details>
      <div class="lab small" style="margin-top:8px">${t("怎么做")}</div>
      <ol class="bt-steps">${s.steps.map(x => `<li>${esc(tc(x))}</li>`).join("")}</ol>
      <p class="bt-say">「${esc(tc(s.say))}」</p>
      <p class="small" style="color:var(--rose);margin:4px 0 0">${t("不要")}：${esc(tc(s.avoid))}</p>
      <p class="small muted" style="margin:4px 0 0">${t("经文")}：${esc(tc(s.verse))}</p>
      <details class="cf-others"><summary class="small muted">${t("什么时候要找专业人员")}</summary><p class="small">${esc(tc(s.flag))}</p></details>
      <div class="bt-trend small">${B.loaded
        ? (bl.cur || bl.prev ? `<b>${t("小月亮里")}</b>：${s.bl.good ? t("近 30 天记了 {n} 次分享合作", { n: bl.cur }) : t("近 30 天 {n} 次", { n: bl.cur })} ${trendText(bl.cur, bl.prev)}${bl.avgMin != null ? ` · ${t("平均 {n} 分钟", { n: bl.avgMin })}` : ""}${bl.how.length ? `<br>${t("家里记过的处理办法")}：${esc(bl.how.join("；"))}` : ""}`
          : `<span class="muted">${t("小月亮里近 60 天没有相关记录")}</span>`)
        : `<span class="muted">${B.loading ? t("正在读取小月亮的记录…") : B.err ? t("读不到小月亮的记录") : ""}</span>`}
        ${mine.cur || mine.total ? `<br><b>${t("这里")}</b>：${mine.cur ? t("近 30 天记了 {n} 次", { n: mine.cur }) + ` ${trendText(mine.cur, mine.prev)}` : t("近 30 天没记")}${mine.calmRate != null ? ` · ${t("平静下来 {p}%", { p: mine.calmRate })}` : ""}${mine.avgMin != null ? ` · ${t("平均 {n} 分钟", { n: mine.avgMin })}` : ""}` : ""}</div>
      ${keep.length ? `<div class="bt-keep"><b class="small">${t("我们家验证过的做法")}</b>${keep.map(e => `<div class="small">✓ ${esc(e.approach)} <span class="muted">· ${e.date}</span></div>`).join("")}</div>` : ""}</div>`;
  };
  const evRow = e => { const s = CONFLICTS.find(x => x.id === e.situation);
    return `<div class="task"><span class="bar" style="background:${e.outcome === "calm" ? "var(--sage)" : e.outcome === "worse" ? "var(--rose)" : "var(--honey)"}"></span>
    <button class="main" data-act="cf-ev-edit" data-id="${esc(e.id)}"><span class="title">${esc(e.date)} · ${esc(tc(s ? s.when : t("其他")))}${e.keep ? " ★" : ""}</span><span class="meta">${(e.children || []).map(kidName).join("、")}${e.outcome ? ` · ${outcomeLabel(e.outcome)}` : ""}${e.minutes != null ? ` · ${t("{n} 分钟", { n: e.minutes })}` : ""}${e.title ? `<br>${t("起因")}：${esc(e.title)}` : ""}${e.approach ? `<br>${esc(e.approach)}` : ""}</span></button>
    <span class="acts"><button class="chip" data-act="cf-ev-keep" data-id="${esc(e.id)}" aria-pressed="${!!e.keep}">${e.keep ? t("值得继续 ★") : t("值得继续")}</button></span></div>`; };
  return `${h2(t("冲突管理"), `${esc(childName())} · ${esc(ageText())}`)}
  ${offlineHTML()}${S.bt.missing ? migrateHTML() : ""}
  <div class="panel bt-principle"><p style="margin-top:0"><b>${esc(tc(PRINCIPLES.core))}</b></p>
    ${PRINCIPLES.verses.map(v => `<p class="small"><b>${esc(tc(v.ref))}</b> ${esc(tc(v.zh))}</p>`).join("")}
    <p class="small muted" style="margin-bottom:0">${t("以下解释依据儿童发展的一般共识（AAP、CDC 等的公开育儿建议），只作参考，不是诊断。每个孩子不一样；持续而严重时，请找儿科医生或儿童心理专业人员。")}</p></div>

  <h2>${t("小月亮里的表现")}</h2>
  <div class="panel">
    ${!B.loaded ? `<p class="small muted" style="margin:0">${B.loading ? t("正在读取小月亮的记录…") : B.err ? t("读不到小月亮的记录：") + esc(B.err) : ""}</p>`
      : rows.length ? `<div class="scroll-x"><table><thead><tr><th>${t("情绪行为")}</th><th class="num">${t("近 30 天")}</th><th class="num">${t("上个 30 天")}</th></tr></thead><tbody>${counts.map(x => `<tr><td>${esc(t(x.k))}</td><td class="num">${x.cur}</td><td class="num">${x.prev}</td></tr>`).join("")}</tbody></table></div>
        <p class="small" style="margin:8px 0 0">${top ? t("按小月亮的记录，最近最常出现的是「{s}」（近 30 天 {n} 次）。先从它开始看下面的做法。", { s: tc(top.s.when), n: top.st.cur }) : t("这个孩子近 30 天在小月亮里没有相关的情绪行为记录。")}</p>`
      : `<p class="small muted" style="margin:0">${t("小月亮里近 60 天还没有这个孩子的「情绪行为 / 社交」记录。在这里记一笔会自动同步过去，也可以去小月亮手动记。")}</p>`}
    <div class="btns" style="margin-top:8px"><button class="chip" data-act="cf-refresh">${t("重新读取")}</button></div></div>

  <h2>${t("记录怎么回填")}</h2>
  <div class="panel">
    <p class="small" style="margin-top:0"><b>${t("在这里记一笔 → 自动写进小月亮")}</b><br>${t("每笔、每个孩子写一条「情绪行为」（起因、怎么处理的、持续几分钟）。在这里改这笔，小月亮那条跟着改；删了，那条也删，不会重复。不用再到小月亮手动记一遍。")}</p>
    <p class="small"><b>${t("小月亮里已有的记录 → 这里只读")}</b><br>${t("你在小月亮手动记的，这里下次打开就能看到，用来显示次数、趋势和家里用过的办法。这里读到的不会再写回去，也不会复制一份。")}</p>
    <p class="small" style="margin-bottom:0"><b>${t("补记")}</b>：${t("过去的日子也能补，小月亮那条的时间落在那天中午。")}</p>
    <div class="btns"><button class="chip" data-act="cf-mirror" aria-pressed="${c.mirrorConflict}">${c.mirrorConflict ? t("记一笔时同步到小月亮 ✓") : t("记一笔时同步到小月亮")}</button></div></div>

  <h2>${t("常见状况")}</h2>
  ${CONFLICTS.map(card).join("")}

  <h2>${t("最近的记录")}</h2>
  <div class="panel">${evs.length ? `<div class="tasks">${evs.slice(0, 40).map(evRow).join("")}</div>` : `<div class="empty">${t("还没有记录。遇到状况时点上面的「记一笔」；过去的也能补。")}</div>`}</div>
  ${S.bt.pendingEv.length ? `<p class="small muted" style="margin-top:8px">${t("还有 {n} 条离线记录等着联网补传。", { n: S.bt.pendingEv.length })}</p>` : ""}`;
}

const evFields = () => [
  { k: "situation", label: "什么情况", type: "seg", raw: true, opts: CONFLICTS.map(s => [s.id, s.when]) },
  { k: "date", label: "哪一天（过去的也能补）", type: "date" },
  { k: "children", label: "谁", type: "multi", raw: true, opts: kids().map(k => [k.id, k.name || t("宝宝")]) },
  { k: "title", label: "起因（可空）", type: "text", ph: "玩具被抢、饿了、换环境…" },
  { k: "approach", label: "怎么处理的", type: "area", rows: 4, ph: "先把孩子分开，说了一次「不可以打人」，陪他冷静…" }, { k: "minutes", label: "持续几分钟", type: "num" },
  { k: "outcome", label: "结果", type: "seg", opts: OUTCOMES }, { k: "keep", label: "这个做法值得继续用（会列在状况卡上）", type: "check" },
  { k: "note", label: "备注（可空）：孩子的反应、明天要跟进什么", type: "area" }];
const toRow = f => ({ situation: f.situation, title: f.title || "", date: f.date || dayKey(Date.now()), children: f.children || [], approach: f.approach || "", minutes: f.minutes == null || f.minutes === "" ? null : +f.minutes, outcome: f.outcome || "", keep: !!f.keep, note: f.note || "" });

async function cfAct(act, btn){
  const d = btn.dataset;
  switch (act) {
    case "cf-refresh": B.loaded = false; await loadBaby(true); break;
    case "cf-mirror": await saveCfg({ mirrorConflict: !cfg().mirrorConflict }); render(); break;
    case "cf-ev-add": openForm("记一笔", evFields(), { situation: d.sit || CONFLICTS[0].id, date: dayKey(Date.now()), children: kids().length === 1 ? [kids()[0].id] : (S.childId ? [S.childId] : []), title: "", approach: "", minutes: null, outcome: "calm", keep: false, note: "" },
      async f => { if (!(f.children || []).length) { toast(t("请选是哪个孩子")); return; } await saveEvent(toRow(f)); closeSheet(); B.loaded = false; loadBaby(true); }); break;
    case "cf-ev-edit": { const e = S.bt.events.find(x => x.id === d.id); if (!e) break;
      openForm("这一笔", evFields(), e, async f => { if (!(f.children || []).length) { toast(t("请选是哪个孩子")); return; } await saveEvent({ ...e, ...toRow(f) }); closeSheet(); B.loaded = false; loadBaby(true); },
        async () => { if (confirm(t("删除这条记录？小月亮里同步过去的那条也会删掉。"))) { await deleteEvent(e.id); closeSheet(); B.loaded = false; loadBaby(true); } }); break; }
    case "cf-ev-keep": { const e = S.bt.events.find(x => x.id === d.id); if (!e) break; await saveEvent({ ...e, keep: !e.keep }); render(); break; }
  }
}

export { viewFlows, viewConflict, cfAct };
