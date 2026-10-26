import { SB } from "./core/auth.js";
import { t, tc } from "./core/i18n.js";
import { S } from "./core/state.js";
import { $, H, esc, hm, pad, toast } from "./core/util.js";
import { WAKE_IDEAS } from "./data/bedtime.js";
import { cfg, kidName, kids, songBlob, songs } from "./bedtime.js";
import { closeSheet, head, showSheet } from "./sheet.js";
import { render } from "./views.js";

/* ============ 睡前 → 小月亮睡眠记录 · 唤醒 ============
   睡前流程「记下今晚」之后，给每个参加的孩子在小月亮的 entries 里写一条「睡眠」（type = sleep，入睡 = 流程结束的时间，
   怎么入睡 = 自主入睡，没有醒来时间 = 正在睡）。今天页「睡前」那一行就变成 😴 在睡 + 「唤醒」按钮；点它记下醒来时间（默认现在），
   也可以补记、改入睡 / 醒来时间、怎么醒、备注，改的就是小月亮里同一条记录，不用切过去。
   睡着的孩子不管是这里开的还是小月亮里点「开始睡」开的，都认（读 entries 里近 48 小时没有 end 的睡眠）。
   唤醒时可以放一首「轻柔唤醒」歌（歌单里标了该标签的），音量 30 秒慢慢升上来；没有歌就列出推荐。 */
S.wk = { rows: [], loaded: false };
const fid = () => S.family && S.family.id;
const ready = () => !!(SB.client && fid() && S.hs.loaded);
const clean = s => String(s).replace(/[^a-z0-9]/gi, "");
const childOf = r => r.data.child || (S.children[0] && S.children[0].id) || "";
const isOpen = r => !r.data.end;
const WAKE_NOTE = /(；|^)(自然醒|被叫醒)$/;
const SRC_NOTE = "来自家庭学堂 · 睡前安然";

const dur = ms => { const m = Math.max(0, Math.round(ms / 60e3)), h = Math.floor(m / 60); return h ? t("{h} 小时 {m} 分", { h, m: m % 60 }) : t("{n} 分钟", { n: m }); };
const toInput = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fromInput = v => v ? new Date(v).getTime() : null;

/* ---- 读取 ---- */
async function loadSleep(){
  if (!ready()) return;
  const { data, error } = await SB.client.from("entries").select("id,ts,updated,data").eq("family_id", fid()).eq("type", "sleep").eq("deleted", false).gte("ts", Date.now() - 48 * H).order("ts", { ascending: false }).limit(100);
  if (error) { console.warn("sleep", error.message); return; }
  S.wk.rows = (data || []).map(r => ({ id: r.id, ts: +r.ts, data: r.data || {} })); S.wk.loaded = true;
}
const rowOf = id => S.wk.rows.find(r => r.id === id) || null;
/** 每个孩子最近一条睡眠：在睡的一直显示；已醒的 12 小时内显示一行小字（可改） */
function status(){
  const out = [];
  for (const c of kids()) {
    const mine = S.wk.rows.filter(r => childOf(r) === c.id).sort((a, b) => b.ts - a.ts), r = mine[0];
    if (!r) continue;
    if (isOpen(r)) out.push({ child: c.id, row: r, open: true });
    else if (Date.now() - r.data.end < 12 * H) out.push({ child: c.id, row: r, open: false });
  }
  return out;
}
const sleeping = () => status().filter(x => x.open);
/** 今天页用：所有孩子都在睡时，「开始」那一行就不用显示了 */
const allAsleep = () => { const k = kids(); return !!k.length && sleeping().length >= k.length; };

/* ---- 睡前流程结束 → 写一条「开始睡」---- */
async function sleepFromLog(l){
  if (!ready() || cfg().sleepSync === false) return;
  const ended = l.ended_at ? new Date(l.ended_at).getTime() : 0;
  if (!ended || Date.now() - ended > 6 * H) return;   // 补记 / 很久以后才补传的不写，免得出现一个「睡了好几个小时」的假记录
  await loadSleep();
  const names = [];
  for (const child of l.children || []) {
    const id = "hsbt-sl-" + clean(l.id) + "-" + clean(child).slice(0, 12);
    if (rowOf(id) || sleeping().some(x => x.child === child)) continue;   // 已写过 / 小月亮里已经在睡
    const now = Date.now(), data = { id, type: "sleep", ts: ended, updated: now, child, how: "自主入睡", note: SRC_NOTE };
    const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id, type: "sleep", ts: ended, updated: now, deleted: false, data }, { onConflict: "family_id,id" });
    if (error) { console.error(error); continue; }
    names.push(kidName(child));
  }
  await loadSleep();
  if (names.length) toast(t("小月亮里已记下：{n} 开始睡了", { n: names.join("、") }));
}

/* ---- 今天页「睡前」那一行里的睡眠状态 ---- */
function sleepCardsHTML(){
  const st = status(), ms = music.song;
  if (!st.length && !ms) return "";
  const rows = st.map(x => {
    const r = x.row, n = esc(kidName(x.child));
    return x.open
      ? `<div class="wk-card"><div class="wk-top"><span class="wk-ic" aria-hidden="true">😴</span><div class="wk-t"><b>${t("{n} 在睡", { n })}</b><span class="small muted">${t("{t} 入睡", { t: hm(r.ts) })} · ${t("已睡")} <span data-wk-since="${r.ts}">${dur(Date.now() - r.ts)}</span></span></div></div><div class="wk-acts"><button class="chip wk-music" data-act="wk-music" aria-label="${t("放一首轻柔唤醒的歌")}">${ms ? "■" : "♪"}</button><button class="btn primary sm" data-act="wk-wake" data-id="${esc(r.id)}">${t("唤醒")}</button><button class="chip" data-act="wk-edit" data-id="${esc(r.id)}">${t("改")}</button></div></div>`
      : `<div class="wk-line small muted"><span aria-hidden="true">☀</span> ${t("{n} {t} 醒来 · 睡了 {d}", { n, t: hm(r.data.end), d: dur(r.data.end - r.ts) })}${r.data.wake ? ` · ${t(r.data.wake)}` : ""} <button class="bt-more" data-act="wk-edit" data-id="${esc(r.id)}">${t("改")}</button></div>`;
  }).join("");
  const many = wakeList().length > 1;
  const mus = ms ? `<div class="wk-line small wk-now"><span aria-hidden="true">♪</span> <span class="wk-title">${esc(ms.title)}</span>${many ? `<button class="chip" data-act="wk-prev" aria-label="${t("上一首")}">⏮</button><button class="chip" data-act="wk-next" aria-label="${t("下一首")}">⏭</button>` : ""}<button class="chip" data-act="wk-stop">${t("停止")}</button></div>` : "";
  return `<div class="wk-list">${rows}${mus}</div>`;
}
// 「已睡 x 分钟」每分钟原地更新（不整页重画，免得打断正在填的东西）
setInterval(() => { for (const el of document.querySelectorAll("[data-wk-since]")) el.textContent = dur(Date.now() - +el.dataset.wkSince); }, 30e3);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && ready()) refresh(); });
let refreshTimer = null;
function refresh(){ clearTimeout(refreshTimer); refreshTimer = setTimeout(async () => { await loadSleep(); if (S.tab === "today" && !$("#sheet").open) render(); }, 400); }
/** 实时：小月亮那边（或另一个家人）点了开始睡 / 醒来，这里的状态跟着变 */
function onEntriesChange(payload){ const r = payload && payload.new; if (r && r.type === "sleep") refresh(); }

/* ---- 唤醒 / 补记 / 修改 ---- */
let W = null;   // 正在编辑的那条 { id, wake: 是不是「唤醒」按钮进来的, d: 草稿 }
const HOW = ["自主入睡", "奶睡", "抱睡", "拍睡/摇睡"], WHERE = ["婴儿床", "怀里", "推车/安全座椅", "大床"], WAKEHOW = ["自然醒", "被叫醒"];
function openWake(id, asWake){
  const r = rowOf(id); if (!r) return;
  const d = r.data;
  W = { id, wake: !!asWake, d: { start: toInput(r.ts), end: d.end ? toInput(d.end) : asWake ? toInput(Date.now()) : "", how: d.how || "", where: d.where || "", wakeHow: d.wake || "自然醒", note: String(d.note || "").replace(WAKE_NOTE, "") } };
  drawWake(); showSheet();
}
function readWake(){
  if (!W) return;
  const g = i => { const el = $("#" + i); return el ? el.value : null; };
  const s = g("wkStart"), e = g("wkEnd"), n = g("wkNote");
  if (s != null) W.d.start = s; if (e != null) W.d.end = e; if (n != null) W.d.note = n.trim();
}
function drawWake(){
  const r = rowOf(W.id), d = W.d, name = esc(kidName(childOf(r)));
  const seg = (k, opts) => `<div class="seg">${opts.map(o => `<button type="button" data-act="wk-seg" data-k="${k}" data-v="${esc(o)}" aria-pressed="${d[k] === o}">${t(o)}</button>`).join("")}</div>`;
  const wakeSongs = songs().filter(s => (s.tags || []).includes("wake") && s.path);
  const ideas = `<details class="wk-ideas"><summary class="small">${t("可以去找的唤醒歌")}</summary><p class="small muted" style="margin:6px 0">${t("原则：中速偏慢、大调、原声乐器（吉他、钢琴、竖琴），没有突然的鼓点和高音；不要比催眠曲更慢，也不要像闹钟。音量从很小慢慢升上来，同时拉开窗帘、轻声叫名字。")}</p>${WAKE_IDEAS.map(([n, a, why]) => `<div class="small"><b>${esc(tc(n))}</b> <span class="muted">${esc(tc(a))} · ${esc(tc(why))}</span></div>`).join("")}</details>`;
  const musicHTML = `<div class="field"><div class="lab">${t("轻柔唤醒音乐")}</div>${wakeSongs.length
    ? `<div class="seg" style="flex-direction:column;align-items:stretch">${wakeSongs.map(s => `<button type="button" data-act="wk-play" data-song="${esc(s.id)}" aria-pressed="${music.song && music.song.id === s.id}">♪ ${esc(s.title)}</button>`).join("")}</div><p class="small muted" style="margin:6px 0 0">${t("音量 30 秒慢慢升上来；放完自动接下一首，整个唤醒歌单循环到你点「停止」。")}</p>`
    : `<p class="small muted" style="margin:0 0 6px">${t("歌单里还没有标了「轻柔唤醒」的歌：在睡前页的歌单里加歌时勾上这个标签。")}</p>`}${music.song ? `<div class="btns" style="margin-top:6px">${wakeSongs.length > 1 ? `<button class="btn" data-act="wk-prev">⏮ ${t("上一首")}</button><button class="btn" data-act="wk-next">${t("下一首")} ⏭</button>` : ""}<button class="btn" data-act="wk-stop">${t("停止音乐")}</button></div>` : ""}${ideas}</div>`;
  $("#sheetIn").innerHTML = `${head(esc(W.wake ? t("唤醒 · {n}", { n: name }) : t("睡眠记录 · {n}", { n: name })))}
  ${W.wake ? musicHTML : ""}
  <div class="field"><label for="wkStart">${t("入睡时间")}</label><input id="wkStart" type="datetime-local" value="${esc(d.start)}"></div>
  <div class="field"><label for="wkEnd">${t("醒来时间（还在睡就留空）")}</label><input id="wkEnd" type="datetime-local" value="${esc(d.end)}"></div>
  <div class="field"><div class="lab">${t("怎么醒的")}</div>${seg("wakeHow", WAKEHOW)}</div>
  <div class="field"><div class="lab">${t("怎么入睡")}</div>${seg("how", HOW)}</div>
  <div class="field"><div class="lab">${t("在哪儿睡")}</div>${seg("where", WHERE)}</div>
  <div class="field"><label for="wkNote">${t("备注")}</label><input id="wkNote" type="text" value="${esc(d.note)}" placeholder="${esc(t("夜醒次数、哭闹…"))}"></div>
  ${W.wake ? "" : musicHTML}
  <p class="small muted">${t("改的就是小月亮里的这条睡眠记录，那边会同步更新。")}</p>
  <div class="btns"><button class="btn primary" data-act="wk-save">${W.wake ? t("记下醒来") : t("保存")}</button><button class="btn danger" data-act="wk-del">${t("删除这条")}</button></div>`;
}
async function saveWake(btn){
  readWake(); const d = W.d, start = fromInput(d.start), end = fromInput(d.end);
  if (!start) { toast(t("请填入睡时间")); return; }
  if (end && end < start) { toast(t("醒来时间要晚于入睡时间")); return; }
  btn.disabled = true;
  try {
    const { data: cur } = await SB.client.from("entries").select("data,deleted").eq("family_id", fid()).eq("id", W.id).maybeSingle();   // 先读最新的再合并，免得盖掉小月亮那边刚改的
    const base = (cur && cur.data) || rowOf(W.id).data, now = Date.now(), data = { ...base, id: W.id, type: "sleep", ts: start, updated: now };
    for (const k of ["how", "where"]) { if (d[k]) data[k] = d[k]; else delete data[k]; }
    if (end) { data.end = end; data.wake = d.wakeHow; } else { delete data.end; delete data.wake; }
    data.note = [d.note, end ? d.wakeHow : ""].filter(Boolean).join("；");
    if (!data.note) delete data.note;
    const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id: W.id, type: "sleep", ts: start, updated: now, deleted: false, data }, { onConflict: "family_id,id" });
    if (error) throw error;
    const was = W.wake; W = null; await loadSleep();
    closeSheet(); toast(was ? t("记下了，早安") : t("已保存，小月亮里同步更新"));
  } catch (e) { console.error(e); toast(t("云端保存失败") + (e.message ? "：" + String(e.message).slice(0, 80) : "")); btn.disabled = false; }
}
async function deleteWake(){
  if (!confirm(t("删除这条睡眠记录？小月亮里也会删掉。"))) return;
  const now = Date.now(), r = rowOf(W.id);
  const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id: W.id, type: "sleep", ts: r.ts, updated: now, deleted: true, data: { ...r.data, updated: now } }, { onConflict: "family_id,id" });
  if (error) { toast(t("云端保存失败") + "：" + String(error.message).slice(0, 80)); return; }
  W = null; await loadSleep(); closeSheet();
}

/* ---- 轻柔唤醒音乐：从很小声慢慢升到 0.5（30 秒）---- */
let wakeNext = 0;   // 一键放歌时，每次从歌单的下一首开始
const music = { audio: null, url: null, song: null, iv: null, vol: 0.5 };
const wakeList = () => songs().filter(s => (s.tags || []).includes("wake") && s.path);
function stopMusic(){
  clearInterval(music.iv);
  if (music.audio) { try { music.audio.pause(); music.audio.src = ""; } catch (e) {} }
  if (music.url) URL.revokeObjectURL(music.url);
  music.audio = music.url = music.song = music.iv = null;
}
const redrawMusic = () => { if (W && $("#sheet").open) { readWake(); drawWake(); } else if (S.tab === "today") render(); };
/** 放一首：第一首从很小声 30 秒升到 0.5；切歌 / 自动下一首沿用当前音量。放完自动接下一首，整个唤醒歌单循环，直到点停止 */
async function startWake(s, fade){
  const vol = fade ? 0.03 : (music.audio ? music.audio.volume : music.vol);
  stopMusic();
  try {
    const blob = await songBlob(s), a = new Audio();
    music.url = URL.createObjectURL(blob); a.src = music.url; a.volume = vol; music.audio = a; music.song = s;
    a.onended = () => { if (music.audio === a) skipWake(1); };
    await a.play();
    if (fade) { const t0 = Date.now(); music.iv = setInterval(() => { if (music.audio !== a) return; a.volume = Math.min(music.vol, 0.03 + (music.vol - 0.03) * (Date.now() - t0) / 30e3); if (a.volume >= music.vol) clearInterval(music.iv); }, 500); }
  } catch (e) { stopMusic(); toast(e.message || t("播放失败")); }
  redrawMusic();
}
async function skipWake(d){
  const list = wakeList(); if (!list.length) return;
  const i = music.song ? list.findIndex(x => x.id === music.song.id) : -1;
  await startWake(list[(i + d + list.length * 2) % list.length], false);
}
async function playWake(id){
  const s = wakeList().find(x => x.id === id) || songs().find(x => x.id === id); if (!s) return;
  if (music.song && music.song.id === id) { stopMusic(); redrawMusic(); return; }
  await startWake(s, !music.song);   // 已经在放别的就直接切，不再从头淡入
}

/* ---- 点击 ---- */
async function wakeAct(act, btn){
  const d = btn.dataset;
  switch (act) {
    case "wk-wake": openWake(d.id, true); break;
    case "wk-edit": openWake(d.id, false); break;
    case "wk-seg": readWake(); W.d[d.k] = W.d[d.k] === d.v ? "" : d.v; if (d.k === "wakeHow" && !W.d.wakeHow) W.d.wakeHow = "自然醒"; drawWake(); break;
    case "wk-save": await saveWake(btn); break;
    case "wk-del": await deleteWake(); break;
    case "wk-play": await playWake(d.song); break;
    case "wk-music": { if (music.song) { stopMusic(); render(); break; }
      const list = wakeList();
      if (!list.length) { toast(t("还没有唤醒歌：在「歌单」里给歌勾上「轻柔唤醒」标签")); break; }
      await startWake(list[wakeNext++ % list.length], true); break; }
    case "wk-prev": await skipWake(-1); break;
    case "wk-next": await skipWake(1); break;
    case "wk-stop": stopMusic(); if (W && $("#sheet").open) { readWake(); drawWake(); } else render(); break;
  }
}
const isWakeAct = act => act.startsWith("wk-");

export { loadSleep, sleepFromLog, sleepCardsHTML, allAsleep, onEntriesChange, wakeAct, isWakeAct };
