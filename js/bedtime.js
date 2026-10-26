import { aiReady, askText } from "./ai.js";
import { SB, memberName } from "./core/auth.js";
import { LS_PREFIX } from "./core/config.js";
import { t, tc } from "./core/i18n.js";
import { S } from "./core/state.js";
import { $, D, dayKey, esc, loadJSON, newId, saveJSON, toast } from "./core/util.js";
import { fetchPassage, parseRef } from "./data/bible.js";
import { ANCHOR_EN, ANCHOR_REF, ANCHOR_ZH, FLOW_TEMPLATES, GUIDE, OUTCOMES, PARENT_LINES, PRINCIPLES, READINGS, SITUATIONS, SONG_IDEAS, SONG_TAGS, TEXT_TEMPLATE } from "./data/bedtime.js";
import { fetchVersions, saveSettings } from "./hs.js";
import { mrow } from "./me.js";
import { CONFLICTS, SIDES } from "./data/flows.js";
import { recordsHTML } from "./recfilter.js";
import { initSongRows } from "./songs-ui.js";
import { EMOTIONS } from "./data/emotions.js";
import { angerHTML } from "./principle.js";
import { closeSheet, head, openForm, showSheet } from "./sheet.js";
import { render } from "./views.js";
import { openPlayer, playAct, playChange, playerOpen } from "./bedtime-play.js";

/* ============ 睡前安然：数据层 + 页面（流程 / 歌单 / 带领词 / 睡前经文 / 记录） ============
   以诗篇 4:8 为中心的睡前敬拜流程。配置（步骤、带领词版本、经文清单、上限、开关）放在 hs_family.settings.bedtime，
   歌单在 hs_bedtime_songs（音频在 media 桶），每晚的完成记录在 hs_bedtime_logs（迁移 019）。
   深夜网络不稳也要能用：配置和歌单在本机留一份（localStorage），音频下载过一次就存在 IndexedDB；
   没连上云端时播放页照常打开，完成记录先排队，下次联网自动补传。播放页在 js/bedtime-play.js。 */
S.bt = { loaded: false, missing: false, sideCols: null, error: null, songs: [], logs: [], events: [], cached: new Set(), pending: loadJSON(LS_PREFIX + ".bedtime.pending", []), pendingEv: loadJSON(LS_PREFIX + ".bedtime.pendingEv", []) };
const CACHE_KEY = LS_PREFIX + ".bedtime", PEND_KEY = LS_PREFIX + ".bedtime.pending", PENDEV_KEY = LS_PREFIX + ".bedtime.pendingEv", VERSE_KEY = LS_PREFIX + ".bedtime.verses";
const fid = () => S.family && S.family.id;
const online = () => S.cloud === "ready" && S.hs.loaded && !!SB.client;
const missingTable = err => err && (err.code === "42P01" || err.code === "PGRST205" || /schema cache|does not exist/i.test(err.message || ""));
async function run(p, msg){ const { data, error } = await p; if (error) { console.error(error); toast(t(msg || "云端保存失败") + (error.message ? "：" + String(error.message).slice(0, 80) : "")); throw error; } return data; }
const put = (list, row) => { const i = list.findIndex(x => x.id === row.id); if (i >= 0) list[i] = row; else list.push(row); return row; };
const TEXT_KEYS = [["", "不显示文字"], ["open", "开场带领词"], ["reading", "读经"], ["prayer", "祷告词"], ["close", "结束的话"]];
const TEXT_LABEL = Object.fromEntries(TEXT_KEYS);

/* ---- 本机缓存：配置 + 歌单 + 孩子 / 家人称呼，离线时播放页用 ---- */
const cache = () => loadJSON(CACHE_KEY, null) || {};
const cacheReady = () => !!cache().cfg;
function writeCache(){
  if (!S.hs.loaded) return;
  saveJSON(CACHE_KEY, { cfg: cfg(), songs: S.bt.songs.map(s => ({ id: s.id, title: s.title, artist: s.artist, tags: s.tags, duration: s.duration, path: s.path, lyrics: s.lyrics, lyrics_ai: s.lyrics_ai })),
    children: S.children, members: Object.values(S.members).map(m => m.name), family: fid(), ts: Date.now() });
}
const kids = () => S.children.length ? S.children : (cache().children || []);
const kidName = id => { const c = kids().find(k => k.id === id); return c ? (c.name || t("宝宝")) : t("宝宝"); };
const members = () => { const m = Object.values(S.members).map(x => x.name); return m.length ? m : (cache().members || []); };
const songs = () => S.bt.loaded ? S.bt.songs : (cache().songs || []);
const song = id => songs().find(s => s.id === id) || null;

/* ---- 配置：settings.bedtime 规范化 ---- */
const stepId = () => "s" + newId();
const FLOW_KEY = LS_PREFIX + ".bedtime.flow";   // 这台设备上选的是哪个流程（不进家庭设置，免得每点一下都写云端）
const withIds = (steps, prefix) => steps.map((s, i) => ({ id: prefix ? prefix + i : stepId(), name: s.name, minutes: s.minutes, text: s.text || "", song: s.tag ? "tag:" + s.tag : "", loop: !!s.loop, skip: false, hint: s.hint || "" }));
const normSteps = list => list.filter(s => s && s.name).map(s => ({ id: s.id || stepId(), name: String(s.name).slice(0, 40), minutes: Math.max(0, +s.minutes || 0), text: TEXT_LABEL[s.text] != null ? s.text : "", song: s.song || "", loop: !!s.loop, skip: !!s.skip, hint: String(s.hint || "").slice(0, 300) }));
/* 流程：可以有多个（晚觉 20 分钟、午睡 8 分钟……），每个有名字、类型（night / nap）和自己的步骤；老数据里单个 steps 自动变成第一个流程「晚觉」。
   cfg().steps / flowName / flowKind 永远指当前选中的那个流程，所以流程页、播放页、今天页的老代码不用改。 */
function normalize(raw){
  const r = raw && typeof raw === "object" ? raw : {};
  let flows = Array.isArray(r.flows) ? r.flows.filter(f => f && f.id && Array.isArray(f.steps)).map(f => ({ id: String(f.id), name: String(f.name || "").slice(0, 20) || "睡前", kind: f.kind === "nap" ? "nap" : "night", steps: normSteps(f.steps) })) : [];
  if (!flows.length) flows = [{ id: "main", name: r.flowName && r.flowName === FLOW_TEMPLATES.starter.name ? FLOW_TEMPLATES.starter.flowName : FLOW_TEMPLATES.full.flowName, kind: "night", steps: Array.isArray(r.steps) && r.steps.length ? normSteps(r.steps) : withIds(FLOW_TEMPLATES.full.steps, "d") }];   // 默认步骤用固定编号，没保存过也能点中
  const want = loadJSON(FLOW_KEY, ""), flow = flows.find(f => f.id === want) || flows[0];
  const versions = Array.isArray(r.versions) ? r.versions.filter(v => v && v.id) : [];
  const ts = r.topicSongs && typeof r.topicSongs === "object" ? Object.fromEntries(Object.entries(r.topicSongs).filter(([, a]) => Array.isArray(a)).map(([k, a]) => [k, a.filter(x => typeof x === "string")])) : {};
  return { flows, flow: flow.id, steps: flow.steps, flowName: flow.name, flowKind: flow.kind, topicSongs: ts,
    versions, version: versions.some(v => v.id === r.version) ? r.version : (versions[0] ? versions[0].id : null),
    readings: Array.isArray(r.readings) ? r.readings.filter(x => x && x.ref) : [], reading: r.reading || READINGS[1].ref, anchor: r.anchor !== false,
    situations: Array.isArray(r.situations) ? r.situations.filter(x => x && x.id && x.when) : [],
    cap: +r.cap || 30, mirror: r.mirror !== false, mirrorConflict: r.mirrorConflict !== false, lang: ["zh", "en", "both"].includes(r.lang) ? r.lang : "zh", firstOn: r.firstOn || "" };
}
const cfg = () => normalize(S.hs.loaded ? S.hs.settings.bedtime : cache().cfg);
async function saveCfg(patch){
  if (!online()) { toast(t("没连上云端，现在不能改设置")); throw new Error("offline"); }
  const { steps: _s, flowName: _n, flowKind: _k, flow: _f, ...base } = cfg();   // steps / flowName / flowKind / flow 是当前流程派生出来的，不单独存
  await saveSettings({ bedtime: { ...base, ...patch } });
  writeCache();
}
const activeSteps = c => (c || cfg()).steps.filter(s => !s.skip);
const totalMin = c => activeSteps(c).reduce((a, s) => a + (+s.minutes || 0), 0);
const flowMin = f => f.steps.filter(s => !s.skip).reduce((a, s) => a + (+s.minutes || 0), 0);
const selectFlow = id => saveJSON(FLOW_KEY, id);
const flowOfLog = l => (l && l.steps && l.steps[0] && l.steps[0].flow) || "";
const isNapLog = l => !!(l && l.steps && l.steps[0] && l.steps[0].kind === "nap");
/** 选流程的小按钮：今天页、睡前页、流程页都用；点一下就选中（只记在这台设备） */
const flowChips = (c, always) => c.flows.length < 2 && !always ? "" : `<div class="chips bt-flows" role="group" aria-label="${t("选择流程")}">${c.flows.map(f => `<button type="button" class="chip" data-act="bt-flow-sel" data-id="${esc(f.id)}" aria-pressed="${f.id === c.flow}">${f.kind === "nap" ? "☀ " : "🌙 "}${esc(f.name)} · ${t("{n} 分", { n: flowMin(f) })}</button>`).join("")}</div>`;
/* 带领词：当前版本，没有自家版本时直接用内置模板 */
function currentText(c = cfg()){ const v = c.versions.find(x => x.id === c.version); return v || { id: null, name: TEXT_TEMPLATE.name + t("（内置模板）"), ...TEXT_TEMPLATE, builtin: true }; }
/* 状况模板：内置的可以被同 id 的自家版本覆盖（恢复 = 删掉覆盖），再加自家新增的 */
const isEm = e => String((e && e.situation) || "").startsWith("em-");   // 情绪管理的记录：em- 开头
const isCf = e => String((e && e.situation) || "").startsWith("cf-");   // 冲突管理的记录：situation 以 cf- 开头（和睡前状况共用一张表）
const btEvents = () => S.bt.events.filter(e => !isCf(e) && !isEm(e));
function allSituations(c = cfg()){
  const mine = c.situations.filter(x => !String(x.id).startsWith("cf-")), own = new Map(mine.map(x => [x.id, x]));
  return [...SITUATIONS.map(s => own.has(s.id) ? { ...own.get(s.id), builtin: true, edited: true } : { ...s, builtin: true }), ...mine.filter(x => !SITUATIONS.some(s => s.id === x.id)).map(x => ({ ...x, custom: true }))];
}
const situation = (id, c) => allSituations(c).find(s => s.id === id) || null;
const sitName = (ev, c) => ev.situation === "custom" || !situation(ev.situation, c) ? (ev.title || t("其他")) : situation(ev.situation, c).when;
const outcomeLabel = k => { const o = OUTCOMES.find(x => x[0] === k); return o ? t(o[1]) : ""; };
/* 一种状况的趋势：近 30 天 vs 再前 30 天的次数、平静下来的比例、平均分钟、标了「值得继续」的做法 */
function sitStats(id){
  const today = dayKey(Date.now()), d30 = dayKey(Date.now() - 29 * D), d60 = dayKey(Date.now() - 59 * D);
  const all = S.bt.events.filter(e => e.situation === id), cur = all.filter(e => e.date >= d30 && e.date <= today), prev = all.filter(e => e.date >= d60 && e.date < d30);
  const calm = cur.filter(e => e.outcome === "calm").length, mins = cur.filter(e => e.minutes != null);
  return { total: all.length, cur: cur.length, prev: prev.length, calm, calmRate: cur.length ? Math.round(calm / cur.length * 100) : null, avgMin: mins.length ? Math.round(mins.reduce((a, e) => a + (+e.minutes || 0), 0) / mins.length) : null,
    keep: all.filter(e => e.keep && e.approach).slice(0, 5), last: all[0] || null };
}
/* 经文清单：内置 + 自家加的 */
const allReadings = (c = cfg()) => [...READINGS, ...c.readings.map(x => ({ ...x, custom: true }))];
/* 一步该放哪首歌：指定的歌，或按标签挑第一首（播放页里可以「换一首」） */
function songFor(step, offset = 0){
  if (!step.song) return null;
  if (step.song.startsWith("tag:")) { const tag = step.song.slice(4), list = songs().filter(s => (s.tags || []).includes(tag) && s.path); return list.length ? list[offset % list.length] : null; }
  return song(step.song);
}
const songLabel = s => !s ? t("不放歌") : s.startsWith("tag:") ? `${t("按标签挑")}：${t(SONG_TAGS[s.slice(4)] || s)}` : (song(s) ? song(s).title : t("（这首歌已删除）"));
/* 两周起步引导：从第一次完成算起 */
function guidePhase(c = cfg()){
  const first = c.firstOn || (S.bt.logs.length ? S.bt.logs[S.bt.logs.length - 1].date : "");
  if (!first) return { day: 0, g: GUIDE[0] };
  const day = Math.floor((new Date(dayKey(Date.now()) + "T12:00:00") - new Date(first + "T12:00:00")) / D) + 1;
  return { day, g: GUIDE.find(g => day >= g.from && day <= g.to) || GUIDE[GUIDE.length - 1] };
}
const parentLine = () => PARENT_LINES[Math.floor(Date.now() / D) % PARENT_LINES.length];

/* ---- 经文正文：按设置里的抓取译本取，存本机，离线也能读 ---- */
const verseStore = () => loadJSON(VERSE_KEY, {});
const vkey = (ref, lang) => `${ref}|${lang === "en" ? fetchVersions().en : fetchVersions().zh}`;
function verseText(ref, lang){
  if (ref === ANCHOR_REF) return { text: lang === "en" ? ANCHOR_EN : ANCHOR_ZH, version: lang === "en" ? "ESV" : "和合本" };
  const v = verseStore()[vkey(ref, lang)]; return v ? { text: v, version: lang === "en" ? fetchVersions().en : fetchVersions().zh } : null;
}
/* 抓取：正在抓的不重复抓；抓失败的记住原因、10 分钟内不再试（否则失败 → 重绘 → 再抓 → 再失败会把页面卡死）。
   返回 true 表示这次真的抓到了新内容；多条同时抓完只合并成一次重绘（scheduleRender）。 */
const fetching = new Set(), failed = new Map();
const RETRY_MS = 10 * 60e3;
let renderTimer = null;
function scheduleRender(){ clearTimeout(renderTimer); renderTimer = setTimeout(() => { if ((BT_TABS.has(S.tab) || LIVE_EXTRA.has(S.tab)) && !playerOpen()) render(); }, 300); }
const verseError = (ref, lang) => { const f = failed.get(vkey(ref, lang)); return f && Date.now() - f.ts < RETRY_MS ? f.msg : ""; };
function retryVerse(ref){ for (const l of ["zh", "en"]) failed.delete(vkey(ref, l)); }
async function ensureVerse(ref, lang){
  if (verseText(ref, lang) || !navigator.onLine) return false;
  const k = vkey(ref, lang); if (fetching.has(k)) return false;
  const f = failed.get(k); if (f && Date.now() - f.ts < RETRY_MS) return false;
  fetching.add(k);
  try { const fv = fetchVersions(), r = await fetchPassage(ref, lang === "en" ? fv.en : fv.zh, S.hs.settings.esvProxy); const st = verseStore(); st[k] = r.text; saveJSON(VERSE_KEY, st); failed.delete(k); return true; }
  catch (e) { console.warn("verse", ref, lang, e.message); failed.set(k, { ts: Date.now(), msg: e.message || String(e) }); return "failed"; }   // 真的抓过：成功 true、失败 "failed"（都值得重绘一次）；没抓（已有 / 正在抓 / 刚失败过）false
  finally { fetching.delete(k); }
}
// 今晚要读的都取回来（主锚点 + 今晚那段，中英都取）
async function prefetchTonight(c = cfg()){ await Promise.all(["zh", "en"].flatMap(l => [ensureVerse(c.reading, l)])); }
async function prefetchAll(c = cfg()){ for (const r of allReadings(c)) for (const l of ["zh", "en"]) await ensureVerse(r.ref, l); }

/* ---- IndexedDB：下载过的音频 ---- */
const MDB = "homeschool-media";
function mdb(){ return new Promise((res, rej) => { const r = indexedDB.open(MDB, 1); r.onupgradeneeded = () => r.result.createObjectStore("songs"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function mGet(k){ try { const db = await mdb(); return await new Promise((res, rej) => { const q = db.transaction("songs").objectStore("songs").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { return null; } }
async function mSet(k, v){ try { const db = await mdb(); await new Promise((res, rej) => { const tx = db.transaction("songs", "readwrite"); if (v == null) tx.objectStore("songs").delete(k); else tx.objectStore("songs").put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); if (v == null) S.bt.cached.delete(k); else S.bt.cached.add(k); } catch (e) { /* 存不下就每次下载 */ } }
async function mKeys(){ try { const db = await mdb(); return await new Promise((res, rej) => { const q = db.transaction("songs").objectStore("songs").getAllKeys(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); } catch (e) { return []; } }
mKeys().then(ks => { S.bt.cached = new Set(ks); });
const bucket = () => SB.client.storage.from("media");
/* 拿到一首歌的音频：本机有就用本机的；没有就从云端下载并存起来 */
async function songBlob(s){
  const hit = await mGet(s.id); if (hit && hit.blob && hit.path === s.path) return hit.blob;
  if (!s.path) throw new Error(t("这首歌还没有音频文件"));
  if (!SB.client || !navigator.onLine) throw new Error(t("这首歌还没下载到这台设备，联网后先在歌单里下载"));
  const { data, error } = await bucket().download(s.path); if (error) throw new Error(t("下载失败：") + (error.message || error.error || error.statusCode || t("云端没有这个文件")));
  await mSet(s.id, { blob: data, path: s.path }); return data;
}
async function cacheAll(){ let n = 0; for (const s of songs()) { if (!s.path || S.bt.cached.has(s.id)) continue; try { await songBlob(s); n++; } catch (e) { toast(e.message); } } return n; }
function audioDuration(file){ return new Promise(res => { const a = new Audio(), u = URL.createObjectURL(file), done = v => { URL.revokeObjectURL(u); res(v); }; a.preload = "metadata"; a.onloadedmetadata = () => done(Math.round(a.duration) || null); a.onerror = () => done(null); setTimeout(() => done(null), 6000); a.src = u; }); }
const fmtDur = s => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";
const fmtSize = b => b ? (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB") : "";

/* ---- 读取（loadAll 末尾调用）---- */
async function loadBedtime(){
  const f = fid(); if (!f) return;
  const [sg, lg, ev] = await Promise.all([
    SB.client.from("hs_bedtime_songs").select("*").eq("family_id", f).order("sort"),
    SB.client.from("hs_bedtime_logs").select("*").eq("family_id", f).gte("date", dayKey(Date.now() - 120 * D)).order("date", { ascending: false }),
    SB.client.from("hs_bedtime_events").select("*").eq("family_id", f).gte("date", dayKey(Date.now() - 180 * D)).order("date", { ascending: false })
  ]);
  const bad = (sg.error && sg) || (lg.error && lg) || (ev.error && ev);
  if (bad) { console.error(bad.error); S.bt = { ...S.bt, loaded: false, missing: missingTable(bad.error), error: bad.error.message || "error", songs: [], logs: [], events: [] }; writeCache(); return; }
  S.bt = { ...S.bt, loaded: true, missing: false, error: null, songs: sg.data || [], logs: lg.data || [], events: ev.data || [] }; sortEvents();
  // 迁移 020 加的「孩子 / 大人状态」两列：任一行带该字段即视为已迁移；没有行时探测一次。没迁移时存的时候折进备注（withSides）
  S.bt.sideCols = (ev.data || []).length ? ("parent_state" in ev.data[0]) : !(await SB.client.from("hs_bedtime_events").select("parent_state").eq("family_id", f).limit(1)).error;
  writeCache();
  await flushPending();
  prefetchTonight().catch(() => {});
}
/* 离线时排队的完成记录，联网后补传 */
async function flushPending(){
  if (!S.bt.pending.length || !online()) return;
  const left = [], before = S.bt.pending.length;
  for (const row of S.bt.pending) { try { const saved = await run(SB.client.from("hs_bedtime_logs").upsert({ ...withSides(row), family_id: fid() }).select().single()); put(S.bt.logs, saved); await mirrorLog(saved); } catch (e) { left.push(row); } }
  S.bt.pending = left; saveJSON(PEND_KEY, left); sortLogs();
  const leftEv = [];
  for (const row of S.bt.pendingEv) { try { const saved = await run(SB.client.from("hs_bedtime_events").upsert({ ...withSides(row), family_id: fid() }).select().single()); put(S.bt.events, saved); await mirrorEvent(saved); } catch (e) { leftEv.push(row); } }
  const beforeEv = S.bt.pendingEv.length; S.bt.pendingEv = leftEv; saveJSON(PENDEV_KEY, leftEv); sortEvents();
  if (left.length < before || leftEv.length < beforeEv) toast(t("离线时的睡前记录已补传"));
}
const sortEvents = () => S.bt.events.sort((a, b) => (b.date + (b.updated_at || "")).localeCompare(a.date + (a.updated_at || "")));
const sortLogs = () => S.bt.logs.sort((a, b) => (b.date + (b.started_at || "")).localeCompare(a.date + (a.started_at || "")));
function attachBedtimeRealtime(channel, onChange){
  channel
    .on("postgres_changes", { event: "*", schema: "public", table: "hs_bedtime_songs", filter: "family_id=eq." + fid() }, payload => {
      if (payload.eventType === "DELETE") { const id = payload.old && payload.old.id; if (id) S.bt.songs = S.bt.songs.filter(s => s.id !== id); }
      else if (payload.new && payload.new.id) put(S.bt.songs, payload.new);
      S.bt.songs.sort((a, b) => a.sort - b.sort); writeCache(); onChange();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "hs_bedtime_logs", filter: "family_id=eq." + fid() }, payload => {
      if (payload.eventType === "DELETE") { const id = payload.old && payload.old.id; if (id) S.bt.logs = S.bt.logs.filter(l => l.id !== id); }
      else if (payload.new && payload.new.id) put(S.bt.logs, payload.new);
      sortLogs(); onChange();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "hs_bedtime_events", filter: "family_id=eq." + fid() }, payload => {
      if (payload.eventType === "DELETE") { const id = payload.old && payload.old.id; if (id) S.bt.events = S.bt.events.filter(e => e.id !== id); }
      else if (payload.new && payload.new.id) put(S.bt.events, payload.new);
      sortEvents(); onChange();
    });
}

/* ---- 歌单读写 ---- */
async function upsertSong(row){ const saved = await run(SB.client.from("hs_bedtime_songs").upsert({ ...row, family_id: fid() }).select().single()); put(S.bt.songs, saved); S.bt.songs.sort((a, b) => a.sort - b.sort); writeCache(); return saved; }
async function uploadSongFile(id, file, oldPath){
  if (file.size > 20 * 1048576) throw new Error(t("文件超过 20 MB，先压一下再传"));
  const ext = ((file.name || "").match(/\.(\w{1,5})$/) || [, "mp3"])[1].toLowerCase(), path = `family/${fid()}/bedtime/${id}.${ext}`;
  const { error } = await bucket().upload(path, file, { contentType: file.type || "audio/mpeg", upsert: true });
  if (error) throw new Error(t("上传失败：") + (error.message || ""));
  if (oldPath && oldPath !== path) await bucket().remove([oldPath]).catch(() => {});
  await mSet(id, { blob: file, path });
  return path;
}
async function deleteSong(s){
  if (s.path) await bucket().remove([s.path]).catch(() => {});
  await run(SB.client.from("hs_bedtime_songs").delete().eq("id", s.id));
  S.bt.songs = S.bt.songs.filter(x => x.id !== s.id); await mSet(s.id, null);
  const c = cfg(), used = c.flows.some(f => f.steps.some(st => st.song === s.id)) || Object.values(c.topicSongs).some(a => a.includes(s.id));
  if (used) await saveCfg({ flows: c.flows.map(f => ({ ...f, steps: f.steps.map(st => st.song === s.id ? { ...st, song: "" } : st) })), topicSongs: Object.fromEntries(Object.entries(c.topicSongs).map(([k, a]) => [k, a.filter(x => x !== s.id)])) }); else writeCache();
}
async function moveSong(id, dir){
  const list = [...S.bt.songs], i = list.findIndex(s => s.id === id), j = i + dir; if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) if (list[k].sort !== k) await upsertSong({ ...list[k], sort: k });
}

/* ---- 完成记录 ---- */
/* 孩子 / 大人状态：有两列（迁移 020）就原样存；没有就折进备注，不丢 */
function withSides(row){
  if (S.bt.sideCols === true) return row;
  const r = { ...row }, add = [];
  if (r.child_state) add.push(`孩子：${r.child_state}`); if (r.parent_state) add.push(`大人：${r.parent_state}`);
  delete r.child_state; delete r.parent_state;
  if (add.length) r.note = [r.note, add.join("；")].filter(Boolean).join("；");
  return r;
}
const sidesLine = x => [x.child_state && `${t("孩子")}：${t(x.child_state)}`, x.parent_state && `${t("大人")}：${t(x.parent_state)}`].filter(Boolean).map(s => " · " + s).join("");
const sidesHint = () => S.bt.sideCols === false ? `<div class="alert info">${t("还没有「孩子 / 大人状态」两列（数据库迁移 020）：现在这两项先折进备注里，不丢；执行迁移后才能在趋势图里统计。")}</div>` : "";
async function saveLog(log){
  const row = withSides({ id: log.id || newId(), ...log });
  if (!online()) { S.bt.pending.push(row); saveJSON(PEND_KEY, S.bt.pending); toast(t("没连上云端：记录先存在这台设备，联网后自动补传")); return row; }
  const saved = await run(SB.client.from("hs_bedtime_logs").upsert({ ...row, family_id: fid() }).select().single());
  put(S.bt.logs, saved); sortLogs();
  const c = cfg(); if (!c.firstOn) await saveCfg({ firstOn: saved.date }).catch(() => {});
  await mirrorLog(saved);
  return saved;
}
async function deleteLog(id){
  const l = S.bt.logs.find(x => x.id === id); if (!l) return;
  await run(SB.client.from("hs_bedtime_logs").delete().eq("id", id));
  S.bt.logs = S.bt.logs.filter(x => x.id !== id);
  await mirrorLog(l, true);
}
/* 回写小月亮：每个参加的孩子一条「信仰 · 家庭敬拜」记录（小月亮里信仰模块打开才看得到） */
async function mirrorLog(l, remove = false){
  if (!cfg().mirror || !SB.client) return;
  const ts = l.started_at ? new Date(l.started_at).getTime() : new Date(l.date + "T20:30:00").getTime(), now = Date.now();
  for (const child of l.children || []) {
    const id = "hsbt-" + String(l.id).replace(/[^a-z0-9]/gi, "") + "-" + String(child).replace(/[^a-z0-9]/gi, "").slice(0, 12);
    const data = { id, type: "faith", ts, updated: now, child, kind: "家庭敬拜", minutes: l.actual_min || l.planned_min || null, who: "全家", what: `${flowOfLog(l) || "睡前安然"}${l.passage ? "：" + l.passage : ""}${l.songs && l.songs.length ? " · " + l.songs.join("、") : ""}`, note: l.note ? l.note + "（来自家庭学堂）" : "来自家庭学堂" };
    const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id, type: "faith", ts, updated: now, deleted: remove, data }, { onConflict: "family_id,id" });
    if (error) console.error(error);
  }
}
/* 状况记录：离线时同样先排队 */
async function saveEvent(ev){
  const row = withSides({ id: ev.id || newId(), ...ev });
  if (!online()) { S.bt.pendingEv.push(row); saveJSON(PENDEV_KEY, S.bt.pendingEv); toast(t("没连上云端：记录先存在这台设备，联网后自动补传")); return row; }
  const old = S.bt.events.find(x => x.id === row.id);
  const saved = await run(SB.client.from("hs_bedtime_events").upsert({ ...row, family_id: fid() }).select().single());
  put(S.bt.events, saved); sortEvents();
  await mirrorEvent(saved);
  if (old) await mirrorEvent(old, { remove: true, only: (old.children || []).filter(c => !(saved.children || []).includes(c)) });   // 编辑时去掉的孩子，小月亮里那条一并删掉
  return saved;
}
async function deleteEvent(id){
  const old = S.bt.events.find(x => x.id === id);
  await run(SB.client.from("hs_bedtime_events").delete().eq("id", id)); S.bt.events = S.bt.events.filter(e => e.id !== id);
  if (old) await mirrorEvent(old, { remove: true });
}
/* 冲突管理 → 小月亮（自动）：每笔记录、每个孩子写一条「情绪行为」，id 固定为 hscf-<记录 id>-<孩子 id>，
   所以改这笔会更新小月亮那条、删这笔会把那条标成已删，不会重复。小月亮 → 这里是只读（见 js/flows.js）。可在冲突管理页关掉。 */
async function mirrorEvent(ev, { remove = false, only = null } = {}){
  if (!isCf(ev) || !SB.client || cfg().mirrorConflict === false) return;
  const sit = CONFLICTS.find(x => x.id === ev.situation) || cfg().situations.find(x => x.id === ev.situation), kind = (sit && sit.write) || "发脾气", today = dayKey(Date.now());
  const ts = ev.date === today ? Date.now() : new Date(ev.date + "T12:00:00").getTime(), now = Date.now();
  const trigger = [sit ? sit.when : "", ev.title].filter(Boolean).join("：") || "冲突";
  for (const child of (only || ev.children || [])) {
    const id = "hscf-" + String(ev.id).replace(/[^a-z0-9]/gi, "") + "-" + String(child).replace(/[^a-z0-9]/gi, "").slice(0, 12);
    const data = { id, type: "behavior", ts, updated: now, child, kind, trigger, how: ev.approach || "", note: "来自家庭学堂 · 冲突管理" + (ev.note ? "：" + ev.note : "") };
    if (ev.minutes != null) data.minutes = +ev.minutes;
    const { error } = await SB.client.from("entries").upsert({ family_id: fid(), id, type: "behavior", ts, updated: now, deleted: remove, data }, { onConflict: "family_id,id" });
    if (error) console.error(error);
  }
}
const nightsIn = (from, to) => S.bt.logs.filter(l => l.date >= from && l.date <= to);
const lastLog = () => S.bt.logs[0] || null;

/* ============ 页面 ============ */
const LIVE_EXTRA = new Set(["flow-conflict", "flow-emotion", "flow-trend"]);   // 这些页签里也有要等抓取结果的经文
const BT_TABS = new Set(["flows", "bedtime", "bt-flow", "bt-songs", "bt-texts", "bt-readings", "bt-logs", "bt-cases"]);
const migrateHTML = () => `<div class="alert info">${t("歌单和完成记录需要数据库迁移 019。")}${t("请在 Supabase 执行本地")} <code>supabase/migrations/019_bedtime.sql</code>${t("，然后刷新。")}${t("流程、带领词和经文清单不受影响。")}</div>`;
const offlineHTML = () => online() ? "" : `<div class="alert info">${t("没连上云端：用的是这台设备上次保存的设置和歌单。可以照常播放，完成记录会在联网后自动补传；改设置要等联网。")}</div>`;
const h2 = (title, extra = "") => `<h2>${title}${extra ? ` <span class="small muted" style="font-family:var(--f-body);font-weight:400">${extra}</span>` : ""}</h2>`;

/* ---- 今日敬拜里的一行：放在「祷告」下面、「参加」上面（js/today.js 的 devotionHTML）。点「开始」直接进播放页，点文字去设置 ---- */
function bedtimeRowHTML(){
  const c = cfg(), n = activeSteps(c).length, last = lastLog(), today = dayKey(Date.now());
  const lastTxt = !last ? t("还没做过") : last.date === today ? t("今晚已完成 · {n} 分钟", { n: last.actual_min }) : t("上次 {d} · {n} 分钟", { d: last.date, n: last.actual_min });
  // 流程名长就把字号缩小一点，保证一行放得下（按字数分档）
  const len = [...c.flowName].length, fs = len <= 6 ? 16 : len <= 8 ? 15 : len <= 10 ? 14 : len <= 13 ? 13 : len <= 16 ? 12 : 11;
  const icon = f => f.kind === "nap" ? "☀" : "🌙";
  const pick = c.flows.length > 1
    ? `<select id="btFlowSel" class="bt-sel" style="font-size:${fs}px" aria-label="${t("选择流程")}">${c.flows.map(f => `<option value="${esc(f.id)}" ${f.id === c.flow ? "selected" : ""}>${icon(f)} ${esc(f.name)}</option>`).join("")}</select>`
    : `<div class="bt-sel solo" style="font-size:${fs}px">${icon({ kind: c.flowKind })} ${esc(c.flowName)}</div>`;
  return `<div class="row bt-row"><span class="k">${t("睡前")}</span>
    <div class="v bt-card">
      <div class="bt-pick">${pick}<button class="btn primary sm bt-go" data-act="bt-start" ${n ? "" : "disabled"}>${t("开始")}</button></div>
      <div class="bt-card-foot"><span class="small muted">${esc(tc(c.reading))} · ${lastTxt}</span><button class="bt-more" data-tab="bedtime" data-from="today">${t("流程与歌单")} ›</button></div>
    </div></div>`;
}

/* ---- 入口页 ---- */
function viewBedtime(){
  const c = cfg(), n = activeSteps(c).length, m = totalMin(c), last = lastLog(), ph = guidePhase(c), today = dayKey(Date.now());
  const week = nightsIn(dayKey(Date.now() - 6 * D), today).length;
  const cached = songs().filter(s => s.path && S.bt.cached.has(s.id)).length;
  return `${h2(t("睡前安然"), esc(tc(ANCHOR_REF)))}
  ${offlineHTML()}${S.bt.missing ? migrateHTML() : ""}
  <div class="panel bt-hero">
    <p class="bt-verse">${esc(tc(ANCHOR_ZH))}</p>
    ${flowChips(c)}
    <div class="bt-card-row"><div><b>${esc(c.flowName)} · ${t("{n} 步 · 约 {m} 分钟", { n, m })}</b><div class="small muted">${t("带领词")}：${esc(currentText(c).name)} · ${t("经文")}：${esc(tc(c.reading))}${c.anchor ? `（${t("先读")} ${esc(tc(ANCHOR_REF))}）` : ""}</div></div>
      <button class="btn primary" data-act="bt-start" ${n ? "" : "disabled"}>${c.flowKind === "nap" ? "☀" : "🌙"} ${t("开始")} ${esc(c.flowName)}</button></div>
    ${m > c.cap ? `<p class="small" style="color:var(--rose);margin:8px 0 0">${t("合计 {m} 分钟，超过了 {cap} 分钟的上限：睡前流程宜短不宜长，去流程里减一减。", { m, cap: c.cap })}</p>` : ""}
    <p class="small muted" style="margin:8px 0 0">${last ? (last.date === today ? t("今晚已完成 · {n} 分钟", { n: last.actual_min }) : t("上次 {d} · {n} 分钟", { d: last.date, n: last.actual_min })) : t("还没做过")}${week ? ` · ${t("本周 {n} 晚", { n: week })}` : ""}</p>
  </div>
  <div class="panel" style="margin-top:10px"><b>${esc(tc(ph.g.title))}</b>${ph.day ? ` <span class="small muted">${t("第 {n} 天", { n: ph.day })}</span>` : ""}<p class="small" style="margin:4px 0 0">${esc(tc(ph.g.text))}</p>
    ${ph.day <= 3 && c.flowKind !== "nap" && c.flowName !== FLOW_TEMPLATES.starter.flowName ? `<div class="btns" style="margin-top:8px"><button class="chip" data-act="bt-flow-tpl" data-tpl="starter">${t("换成起步版（约 8 分钟）")}</button></div>` : ""}</div>
  <div class="panel mlist" style="margin-top:10px">
    ${mrow('data-tab="bt-flow"', t("流程"), c.flows.length > 1 ? t("{k} 个流程：{names}", { k: c.flows.length, names: esc(c.flows.map(f => `${f.name} ${flowMin(f)}`).join(" · ")) }) : t("{n} 步 · 约 {m} 分钟", { n, m }) + (c.steps.length > n ? ` · ${t("跳过 {n}", { n: c.steps.length - n })}` : ""), "☾")}
    ${mrow('data-tab="bt-songs"', t("歌单"), songs().length ? t("{n} 首 · 这台设备已下载 {k} 首", { n: songs().length, k: cached }) : t("还没有歌。放几首自己的 MP3，固定两三首就够"), "♪")}
    ${mrow('data-tab="bt-texts"', t("带领词"), c.versions.length ? t("当前：{name} · 共 {n} 版", { name: esc(currentText(c).name), n: c.versions.length }) : t("用内置模板；新建一版后可以随意改"), "✎")}
    ${mrow('data-tab="bt-readings"', t("睡前经文"), t("今晚：{ref} · 共 {n} 段", { ref: esc(tc(c.reading)), n: allReadings(c).length }), "📖")}
    ${mrow('data-tab="bt-logs"', t("记录"), S.bt.logs.length ? t("最近 {n} 晚 · 本周 {w} 晚", { n: S.bt.logs.length, w: week }) : t("还没有记录"), "▦")}
    ${mrow('data-tab="bt-cases"', t("状况与应对"), (() => { const n = btEvents().filter(e => e.date >= dayKey(Date.now() - 29 * D)).length; return n ? t("近 30 天记了 {n} 次 · {k} 种状况的模板", { n, k: allSituations(c).length }) : t("不肯睡、打人、自责、父母发脾气……怎么说、怎么做、怎么记"); })(), "⚑")}
  </div>
  <h2>${t("设置")}</h2>
  <div class="panel">
    <div class="lab">${t("总时长上限（分钟）")}</div><div class="seg">${[15, 20, 25, 30, 40].map(v => `<button data-act="bt-cap" data-v="${v}" aria-pressed="${c.cap === v}">${v}</button>`).join("")}</div>
    <p class="small muted" style="margin:6px 0 0">${t("超过上限时只提醒，不拦着。每一步到时也只是震一下、进度条变色，不响铃、不自动跳步；只有最后一步到时音乐淡出。")}</p>
    <div class="lab" style="margin-top:12px">${t("经文语言")}</div><div class="seg">${[["zh", "中文"], ["en", "English"], ["both", "中英都读"]].map(([v, l]) => `<button data-act="bt-lang" data-v="${v}" aria-pressed="${c.lang === v}">${t(l)}</button>`).join("")}</div>
    <div class="btns" style="margin-top:12px"><button class="chip" data-act="bt-anchor" aria-pressed="${c.anchor}">${c.anchor ? t("每晚先读诗篇 4:8 ✓") : t("每晚先读诗篇 4:8")}</button><button class="chip" data-act="bt-mirror" aria-pressed="${c.mirror}">${c.mirror ? t("完成后回写小月亮 ✓") : t("完成后回写小月亮")}</button></div>
    <p class="small muted" style="margin:6px 0 0">${t("回写 = 给每个参加的孩子在小月亮里记一条「信仰 · 家庭敬拜」（小月亮的信仰模块打开才看得到），这样睡眠记录旁边就能看到那晚做没做睡前流程。")}</p>
  </div>
  <p class="small muted" style="margin-top:12px">${t("安抚多过刑罚，不等于不管教：安抚是恢复安全感，管教是学习行为；两者可以同时存在，但不必用惩罚来制造平静。")}</p>`;
}

/* ---- 流程 ----
   三块：① 流程选择卡（选哪个流程、新建 / 另存为 / 改名 / 删除，说明折叠着）；② 步骤卡（顶上一条按分钟分段的时间条 + 合计，每步一个编号圆点、名称、几枚小标签，点一步去改，↑↓ 调顺序，底下「添加步骤」）；
   ③ 折叠的「套用模板」和「三段式选歌」。 */
const STEP_COLORS = ["var(--slate)", "var(--sky)", "var(--sage)", "var(--honey)", "var(--rose)"];
function viewFlow(){
  const c = cfg(), m = totalMin(c), over = m > c.cap, active = c.steps.filter(s => !s.skip);
  const songBit = s => { if (!s.song) return `<span class="bt-pill dim">${t("不放歌")}</span>`; const sg = songFor(s);
    if (sg) return `<span class="bt-pill song">♪ ${esc(sg.title)}</span>`;
    if (s.song.startsWith("tag:")) return `<span class="bt-pill song none">♪ ${esc(t(SONG_TAGS[s.song.slice(4)] || ""))} <small>${t("歌单里还没有")}</small></span>`;
    return `<span class="bt-pill none">${t("（这首歌已删除）")}</span>`; };
  const row = (s, i) => `<div class="song-row bt-step-row" data-id="${esc(s.id)}" data-kind="step"><div class="song-bg" aria-hidden="true"><span class="sb-del">🗑 ${t("删除")}</span></div>
    <div class="song-in bt-step ${s.skip ? "skip" : ""}"><span class="bt-badge">${i + 1}</span>
    <button class="main" data-act="bt-step-edit" data-id="${esc(s.id)}"><span class="bt-st-name">${esc(s.name)}${s.skip ? ` <small>${t("已跳过")}</small>` : ""}</span>
      <span class="bt-pills"><span class="bt-pill">⏱ ${t("{n} 分", { n: s.minutes })}</span>${s.text ? `<span class="bt-pill">📝 ${t(TEXT_LABEL[s.text])}</span>` : ""}${songBit(s)}${s.loop ? `<span class="bt-pill">↻ ${t("循环")}</span>` : ""}</span></button>
    <span class="song-handle" role="button" tabindex="0" aria-label="${t("长按拖动调整顺序；聚焦后按上下键也能移动")}" title="${t("长按拖动调整顺序")}">⋮⋮</span></div></div>`;
  const bar = active.length ? `<div class="bt-bar" role="img" aria-label="${t("各步骤的时间占比")}">${active.map((s, i) => `<span style="flex:${Math.max(1, +s.minutes || 1)};background:${STEP_COLORS[i % 5]}" title="${esc(s.name)} · ${t("{n} 分", { n: s.minutes })}"></span>`).join("")}</div>` : "";
  return `${h2(t("流程"), esc(c.flowName))}
  ${offlineHTML()}
  <div class="panel bt-flowcard">
    <div class="bt-fc-label">${t("选择流程")}</div>
    ${flowChips(c, true)}
    <div class="bt-tools"><button class="chip" data-act="bt-flow-new">＋ ${t("新建")}</button><button class="chip" data-act="bt-flow-copy">${t("另存为")}</button><button class="chip" data-act="bt-flow-rename">${t("改名")}</button>${c.flows.length > 1 ? `<button class="chip danger" data-act="bt-flow-del">${t("删除")}</button>` : ""}</div>
    <details class="bt-tip"><summary>${t("改动怎么保存？")}</summary><p class="small">${t("你改的步骤会自动保存在当前选中的流程里；切换或新建别的流程，不会影响已经保存的。想留一份原样再试别的改法，先点「另存为」；对当前流程「套用模板」会覆盖它的步骤，想保留就先另存。")}</p></details>
  </div>
  <div class="panel bt-stepcard">
    <div class="bt-sc-head"><b>${t("「{name}」的步骤", { name: esc(c.flowName) })}</b><span class="bt-total ${over ? "over" : ""}">${t("合计约 {m} 分钟", { m })}</span></div>
    ${bar}
    <p class="small ${over ? "" : "muted"} bt-cap-line" style="${over ? "color:var(--rose)" : ""}">${over ? t("超过了 {cap} 分钟的上限，睡前流程宜短不宜长", { cap: c.cap }) : t("上限 {cap} 分钟 · 点一步修改，长按 ⋮⋮ 拖动调顺序，向左滑删除；年幼的孩子可以把某步设为跳过", { cap: c.cap })}</p>
    <div class="bt-steps2">${c.steps.map(row).join("") || `<div class="empty">${t("这个流程还没有步骤")}</div>`}</div>
    <button class="bt-add" data-act="bt-step-add">＋ ${t("添加步骤")}</button>
  </div>
  <details class="panel bt-tpl"><summary><b>${t("套用模板")}</b> <span class="small muted">${t("会覆盖当前流程的步骤")}</span></summary>
    ${Object.entries(FLOW_TEMPLATES).map(([k, tp]) => `<button class="bt-tpl-row" data-act="bt-flow-tpl" data-tpl="${k}"><b>${esc(tc(tp.name))}</b><span class="small muted">${esc(tc(tp.desc))}</span></button>`).join("")}</details>
  <details class="panel bt-tpl"><summary><b>${t("三段式选歌")}</b></summary><p class="small" style="margin:6px 0 0">${t("一首有歌词的敬拜歌（被爱与安慰，2–3 分钟）＋ 一首经文歌（神的话语，2–4 分钟）＋ 纯音乐（放下与休息，5–15 分钟）。歌词比旋律重要：避免让孩子把「神爱我」听成「只有乖才爱我」。音量低、屏幕关、固定比丰富重要。")}</p></details>`;
}
const stepFields = () => [
  { k: "name", label: "这一步叫什么", type: "text", ph: "拥抱与敬拜" }, { k: "minutes", label: "建议几分钟", type: "num", ph: "4" },
  { k: "text", label: "这一步给父母看的文字", type: "seg", opts: TEXT_KEYS },
  { k: "song", label: "放哪首歌", type: "seg", raw: true, opts: [["", t("不放歌")], ...Object.entries(SONG_TAGS).map(([k, v]) => ["tag:" + k, t("按标签挑") + "：" + t(v)]), ...songs().filter(s => s.path).map(s => [s.id, s.title])] },
  { k: "hint", label: "给父母的一句提示（可空）", type: "area", ph: "收好玩具、上厕所、刷牙、穿睡衣。" },
  { k: "loop", label: "循环播放到时间结束（最后一步用）", type: "check" }, { k: "skip", label: "暂时跳过这一步", type: "check" }];
async function saveFlows(flows){ await saveCfg({ flows }); }
/* 只改当前选中的流程的步骤 */
async function saveSteps(steps){ const c = cfg(); await saveFlows(c.flows.map(f => f.id === c.flow ? { ...f, steps } : f)); }

/* ---- 歌单 ---- */
let songForm = null;   // { id, draft, file, oldPath }
function viewSongs(){
  const list = songs(), cached = list.filter(s => s.path && S.bt.cached.has(s.id)).length, bytes = list.reduce((a, s) => a + (+s.size || 0), 0);
  const row = s => `<div class="song-row" data-id="${esc(s.id)}"><div class="song-bg" aria-hidden="true"><span class="sb-add">＋ ${t("加到流程")}</span><span class="sb-del">🗑 ${t("删除")}</span></div>
    <div class="song-in task"><span class="bar" style="background:${s.path ? "var(--sage)" : "var(--line)"}"></span>
    <button class="main" data-act="bt-song-edit" data-id="${esc(s.id)}"><span class="title">${esc(s.title)}${s.lyrics_ai ? ` <span class="pill lv">${t("AI 补的词")}</span>` : ""}</span><span class="meta">${s.artist ? esc(s.artist) + " · " : ""}${(s.tags || []).map(k => t(SONG_TAGS[k] || k)).join("、") || t("没有标签")}${s.duration ? ` · ${fmtDur(s.duration)}` : ""}${s.size ? ` · ${fmtSize(s.size)}` : ""}${s.path ? (S.bt.cached.has(s.id) ? ` · ${t("已下载")}` : ` · ${t("还没下载到这台设备")}`) : ` · ${t("没有音频")}`}</span></button>
    <span class="acts">${s.path ? `<button class="iconbtn" data-act="bt-song-play" data-id="${esc(s.id)}" aria-label="${t("试听")}">${previewId === s.id ? "■" : "▶"}</button>` : ""}<span class="song-handle" role="button" tabindex="0" aria-label="${t("长按拖动调整顺序；聚焦后按上下键也能移动")}" title="${t("长按拖动调整顺序")}">⋮⋮</span></span></div></div>`;
  return `${h2(t("歌单"), list.length ? t("{n} 首", { n: list.length }) : "")}
  ${offlineHTML()}${S.bt.missing ? migrateHTML() : ""}
  <div class="btns" style="margin-top:0"><button class="btn primary" data-act="bt-song-add" ${online() && !S.bt.missing ? "" : "disabled"}>＋ ${t("添加歌曲（MP3）")}</button>${list.some(s => s.path && !S.bt.cached.has(s.id)) ? `<button class="btn" data-act="bt-cache-all">${t("全部下载到这台设备")}</button>` : ""}</div>
  <p class="small muted" style="margin-top:8px">${t("音频存在家庭共用的云端桶里（单首 20 MB 以内），每台设备第一次播时下载一次、之后离线也能放。")}${bytes ? ` ${t("已用 {s}。", { s: fmtSize(bytes) })}` : ""} ${t("这台设备已下载 {k}/{n}。", { k: cached, n: list.filter(s => s.path).length })}</p>
  <p class="small muted" style="margin:0 0 8px">${t("每首歌：向左滑删除，向右滑加到流程（睡前流程的某一步，或冲突 / 情绪话题的推荐歌曲），长按最右边的 ⋮⋮ 上下拖动调顺序。")}</p>
  <div class="panel">${list.length ? `<div class="tasks song-list">${list.map(row).join("")}</div>` : `<div class="empty">${t("还没有歌。先放两三首：一首被爱与安慰的、一首经文歌、一段纯音乐。")}</div>`}</div>
  <h2>${t("可以去找的歌")}</h2>
  <div class="panel"><p class="small muted" style="margin-top:0">${t("不内置音频：自己买或下载 MP3 后传进来。优先慢速、轻柔、没有突然增强的鼓点和高音的版本。")}</p>
    <div class="tasks">${SONG_IDEAS.map(([n, a, tag, why]) => `<div class="task"><span class="bar" style="background:var(--honey)"></span><div class="main"><span class="title">${esc(n)}</span><span class="meta">${esc(tc(a))} · ${t(SONG_TAGS[tag])} · ${esc(tc(why))}</span></div><span></span></div>`).join("")}</div></div>`;
}
function openSongForm(s){
  songForm = { id: s ? s.id : null, draft: s ? { title: s.title, artist: s.artist || "", tags: [...(s.tags || [])], lyrics: s.lyrics || "", lyrics_ai: !!s.lyrics_ai } : { title: "", artist: "", tags: [], lyrics: "", lyrics_ai: false }, file: null, oldPath: s ? s.path : "" };
  drawSongForm(); showSheet();
}
function drawSongForm(){
  const f = songForm, d = f.draft;
  $("#sheetIn").innerHTML = `${head(esc(t(f.id ? "编辑歌曲" : "添加歌曲")))}
  <div class="field"><label for="btTitle">${t("歌名")}</label><input id="btTitle" type="text" value="${esc(d.title)}" placeholder="Jesus Loves Me 耶稣爱我"></div>
  <div class="field"><label for="btArtist">${t("演唱者 / 来源（可空）")}</label><input id="btArtist" type="text" value="${esc(d.artist)}" placeholder="Seeds Kids Worship"></div>
  <div class="field"><div class="lab">${t("用在哪一段（可多选）")}</div><div class="seg">${Object.entries(SONG_TAGS).map(([k, v]) => `<button type="button" data-act="bt-song-tag" data-v="${k}" aria-pressed="${d.tags.includes(k)}">${t(v)}</button>`).join("")}</div></div>
  <div class="field"><label for="btFile">${f.id ? t("换音频文件（可空；MP3 / M4A，20 MB 以内）") : t("音频文件（MP3 / M4A，20 MB 以内）")}</label><input id="btFile" type="file" accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav">${f.file ? `<p class="small muted" style="margin:6px 0 0">${esc(f.file.name)} · ${fmtSize(f.file.size)}</p>` : f.oldPath ? `<p class="small muted" style="margin:6px 0 0">${t("已有音频")}</p>` : ""}</div>
  <div class="field"><label for="btLyrics">${t("歌词（可空；父母跟唱用，播放页默认不显示）")}</label><textarea id="btLyrics" style="min-height:160px" placeholder="${esc(t("一行一句。没有就点下面「让 AI 补词」"))}">${esc(d.lyrics)}</textarea>
    ${d.lyrics_ai ? `<div class="alert info" style="margin-top:6px">${t("这段歌词是 AI 补的，可能和原唱有出入（公共领域的老诗歌较准，近年的歌常记错）。核对过就勾掉：")} <label class="check" style="margin-left:6px"><input type="checkbox" id="btAiOk">${t("核对过了")}</label></div>` : ""}
    <div class="btns" style="margin-top:8px"><button class="btn" data-act="bt-song-ai">${t("让 AI 补词")}</button></div>
    <p class="small muted" style="margin:6px 0 0">${t("用咩咩咩里填的 API key（只存本机）。AI 只按歌名和演唱者回忆歌词，当草稿用，父母改完再保存。")}</p></div>
  <div class="btns"><button class="btn primary" data-act="bt-song-save">${t("保存")}</button>${f.id ? `<button class="btn" data-act="bt-song-addto">${t("加到流程…")}</button><button class="btn danger" data-act="bt-song-delete">${t("删除")}</button>` : ""}</div>`;
}
function readSongForm(){ const d = songForm.draft; d.title = ($("#btTitle") || {}).value?.trim() || ""; d.artist = ($("#btArtist") || {}).value?.trim() || ""; d.lyrics = ($("#btLyrics") || {}).value?.trim() || ""; const ok = $("#btAiOk"); if (ok && ok.checked) d.lyrics_ai = false; }
async function aiLyrics(){
  readSongForm(); const d = songForm.draft;
  if (!d.title) { toast(t("先填歌名")); return; }
  if (!aiReady()) { toast(t("还没填 API key，在咩咩咩页的「AI 设置」里填")); return; }
  const btn = $('[data-act="bt-song-ai"]'); if (btn) { btn.disabled = true; btn.textContent = t("正在补词…"); }
  try {
    const system = "你是帮助基督徒家庭整理儿童敬拜诗歌歌词的助手。只输出歌词正文：一行一句，段落之间空一行；不要标题、不要解释、不要括号里的说明。如果这首歌常见中英文两个版本，先中文后英文，中间空一行。如果你不确定这首歌的歌词，只输出两个字：不确定。";
    const text = (await askText(system, `歌名：${d.title}\n演唱者 / 来源：${d.artist || "不详"}\n请给出这首歌的歌词。`, { maxTokens: 1500, temperature: 0.1 })).trim();
    if (!text || /^不确定/.test(text) || text.length < 10) { toast(t("AI 不确定这首歌的歌词，请手动粘贴")); }
    else { d.lyrics = text; d.lyrics_ai = true; drawSongForm(); toast(t("已补上歌词草稿，请核对")); return; }
  } catch (e) { toast(e.message || t("补词失败")); }
  if (btn) { btn.disabled = false; btn.textContent = t("让 AI 补词"); }
}
async function saveSongForm(btn){
  readSongForm(); const f = songForm, d = f.draft;
  if (!d.title) { toast(t("请填歌名")); return; }
  if (!f.id && !f.file) { toast(t("请选一个音频文件")); return; }
  btn.disabled = true; btn.textContent = f.file ? t("上传中…") : t("保存中…");
  try {
    const id = f.id || newId(); let path = f.oldPath, duration = f.id ? song(f.id).duration : null, size = f.id ? song(f.id).size : null;
    if (f.file) { path = await uploadSongFile(id, f.file, f.oldPath); duration = await audioDuration(f.file); size = f.file.size; }
    const old = f.id ? song(f.id) : null;
    await upsertSong({ id, title: d.title, artist: d.artist, tags: d.tags, lyrics: d.lyrics, lyrics_ai: d.lyrics_ai, path, duration, size, sort: old ? old.sort : songs().length });
    closeSheet(); toast(t("已保存"));
  } catch (e) { toast(e.message || t("保存失败")); btn.disabled = false; btn.textContent = t("保存"); }
}
/* 试听（歌单页） */
let preview = null, previewId = null;
async function togglePreview(id){
  if (previewId === id) { stopPreview(); render(); return; }
  stopPreview(); const s = song(id); if (!s) return;
  try { const blob = await songBlob(s); preview = new Audio(URL.createObjectURL(blob)); previewId = id; preview.onended = () => { stopPreview(); render(); }; await preview.play(); render(); }
  catch (e) { toast(e.message); }
}
function stopPreview(){ if (preview) { try { preview.pause(); URL.revokeObjectURL(preview.src); } catch (e) {} } preview = null; previewId = null; }

/* ---- 带领词 ---- */
function viewTexts(){
  const c = cfg(), cur = currentText(c);
  const block = (k, label) => `<div class="bt-text"><div class="lab">${t(label)}</div><div class="bt-pre">${esc(tc(cur[k] || ""))}</div></div>`;
  const vrow = v => `<div class="task ${v.id === c.version ? "done" : ""}"><span class="bar" style="background:${v.id === c.version ? "var(--sage)" : "var(--line)"}"></span>
    <button class="main" data-act="bt-ver-edit" data-id="${esc(v.id)}"><span class="title" style="text-decoration:none;color:var(--ink)">${esc(v.name)}${v.id === c.version ? ` <span class="pill ok">${t("当前")}</span>` : ""}</span><span class="meta">${v.updated_at ? t("{d} · {who} 改过", { d: v.updated_at.slice(0, 10), who: esc(v.by || t("家人")) }) : ""}</span></button>
    <span class="acts">${v.id === c.version ? "" : `<button class="chip" data-act="bt-ver-use" data-id="${esc(v.id)}">${t("用这版")}</button>`}</span></div>`;
  return `${h2(t("带领词"), esc(cur.name))}
  ${offlineHTML()}
  <div class="btns" style="margin-top:0"><button class="btn primary" data-act="bt-ver-new">＋ ${t("新建版本（从模板）")}</button>${c.versions.length ? `<button class="btn" data-act="bt-ver-copy">${t("复制当前版")}</button>` : ""}</div>
  <p class="small muted" style="margin-top:8px">${t("先有一份家庭通用版；孩子长大、换带领人，就另存一版（幼儿版 / 学龄版 / 英文版…），播放前选今晚用哪版。每版都能恢复成模板。尽量每天用同样的话，让孩子熟悉这个节奏。")}</p>
  ${c.versions.length ? `<div class="panel"><div class="tasks">${c.versions.map(vrow).join("")}</div></div>` : `<div class="panel"><p class="muted" style="margin:0">${t("现在用的是内置模板。点「新建版本」生成一份自家的，就可以改了。")}</p></div>`}
  <h2>${esc(cur.name)}</h2>
  <div class="panel">${block("open", "开场带领词（拥抱与敬拜）")}${block("reading", "读经引导")}${block("prayer", "祷告词")}${block("close", "结束的话（音乐与安睡）")}
    ${cur.builtin ? "" : `<div class="btns"><button class="btn" data-act="bt-ver-edit" data-id="${esc(cur.id)}">${t("修改这版")}</button><button class="btn" data-act="bt-ver-reset" data-id="${esc(cur.id)}">${t("恢复成模板")}</button>${c.versions.length > 1 ? `<button class="btn danger" data-act="bt-ver-del" data-id="${esc(cur.id)}">${t("删除这版")}</button>` : ""}</div>`}</div>
  <div class="panel mlist" style="margin-top:10px">${mrow('data-tab="bt-cases"', t("状况与应对"), t("不肯睡、打人、自责、父母发脾气……怎么说、怎么做、怎么记"), "⚑")}</div>`;
}

/* ---- 状况与应对：原则提醒 + 模板（可改）+ 每种状况的趋势与验证过的做法 + 记录 ---- */
function viewCases(){
  const c = cfg(), list = allSituations(c), today = dayKey(Date.now()), d30 = dayKey(Date.now() - 29 * D), d60 = dayKey(Date.now() - 59 * D);
  const cur = btEvents().filter(e => e.date >= d30), prev = btEvents().filter(e => e.date >= d60 && e.date < d30), calm = cur.filter(e => e.outcome === "calm").length;
  const lang = c.lang === "en" ? "en" : "zh";
  const trend = (a, b) => b == null ? "" : a > b ? `<span class="bt-up">▲ ${t("比上个 30 天多 {n}", { n: a - b })}</span>` : a < b ? `<span class="bt-down">▼ ${t("比上个 30 天少 {n}", { n: b - a })}</span>` : `<span class="muted">${t("和上个 30 天一样")}</span>`;
  const card = s => { const st = sitStats(s.id);
    return `<div class="panel bt-sit"><div class="bt-card-row"><div><b>${esc(tc(s.when))}</b>${s.age ? ` <span class="small muted">${esc(tc(s.age))}</span>` : ""}${s.edited ? ` <span class="pill lv">${t("已改")}</span>` : s.custom ? ` <span class="pill lv">${t("自家")}</span>` : ""}</div><button class="btn primary" data-act="bt-ev-add" data-sit="${esc(s.id)}">${t("记一笔")}</button></div>
      <ol class="bt-steps">${(s.steps || []).map(x => `<li>${esc(tc(x))}</li>`).join("")}</ol>
      ${s.say ? `<p class="bt-say">「${esc(tc(s.say))}」</p>` : ""}
      ${s.avoid ? `<p class="small" style="color:var(--rose);margin:4px 0 0">${t("不要")}：${esc(tc(s.avoid))}</p>` : ""}
      ${s.verse ? `<p class="small muted" style="margin:4px 0 0">${t("经文")}：${esc(tc(s.verse))}</p>` : ""}
      <div class="bt-trend small">${st.cur ? `${t("近 30 天 {n} 次", { n: st.cur })} ${trend(st.cur, st.prev)}${st.calmRate != null ? ` · ${t("平静下来 {p}%", { p: st.calmRate })}` : ""}${st.avgMin != null ? ` · ${t("平均 {n} 分钟", { n: st.avgMin })}` : ""}` : st.total ? t("近 30 天没发生（共记过 {n} 次）", { n: st.total }) : `<span class="muted">${t("还没记过")}</span>`}</div>
      ${st.keep.length ? `<div class="bt-keep"><b class="small">${t("我们家验证过的做法")}</b>${st.keep.map(e => `<div class="small">✓ ${esc(e.approach)} <span class="muted">· ${e.date}</span></div>`).join("")}</div>` : ""}
      <div class="btns" style="margin-top:8px"><button class="chip" data-act="bt-sit-edit" data-id="${esc(s.id)}">${t("改模板")}</button>${s.edited ? `<button class="chip" data-act="bt-sit-reset" data-id="${esc(s.id)}">${t("恢复内置")}</button>` : ""}</div></div>`; };
  const evRow = e => `<div class="task"><span class="bar" style="background:${e.outcome === "calm" ? "var(--sage)" : e.outcome === "worse" ? "var(--rose)" : "var(--honey)"}"></span>
    <button class="main" data-act="bt-ev-edit" data-id="${esc(e.id)}"><span class="title">${esc(e.date)} · ${esc(tc(sitName(e, c)))}${e.keep ? " ★" : ""}</span><span class="meta">${(e.children || []).map(kidName).join("、")}${e.outcome ? ` · ${outcomeLabel(e.outcome)}` : ""}${sidesLine(e)}${e.minutes != null ? ` · ${t("{n} 分钟", { n: e.minutes })}` : ""}${e.approach ? `<br>${esc(e.approach)}` : ""}${e.note ? `<br><span class="muted">${esc(e.note)}</span>` : ""}</span></button><span class="acts"><button class="chip" data-act="bt-ev-keep" data-id="${esc(e.id)}" aria-pressed="${!!e.keep}">${e.keep ? t("值得继续 ★") : t("值得继续")}</button></span></div>`;
  return `${h2(t("状况与应对"))}
  ${offlineHTML()}${S.bt.missing ? migrateHTML() : sidesHint()}
  ${angerHTML()}
  <div class="panel bt-principle" style="margin-top:10px"><p style="margin-top:0"><b>${esc(tc(PRINCIPLES.core))}</b></p>
    ${PRINCIPLES.verses.map(v => `<p class="small"><b>${esc(tc(v.ref))}</b> ${esc(lang === "en" ? v.en : tc(v.zh))}</p>`).join("")}
    <p class="small">${esc(tc(PRINCIPLES.boundary))}</p><p class="small muted" style="margin-bottom:0">${esc(tc(PRINCIPLES.notEvery))}</p></div>
  <div class="panel" style="margin-top:10px"><div class="stats"><div class="stat"><div class="k">${t("近 30 天")}</div><div class="v num">${cur.length}<small>${t("次")}</small></div></div><div class="stat"><div class="k">${t("上个 30 天")}</div><div class="v num">${prev.length}<small>${t("次")}</small></div></div><div class="stat"><div class="k">${t("平静下来")}</div><div class="v num">${cur.length ? Math.round(calm / cur.length * 100) : 0}<small>%</small></div></div><div class="stat"><div class="k">${t("值得继续的做法")}</div><div class="v num">${btEvents().filter(e => e.keep).length}</div></div></div>
    <p class="small muted" style="margin:8px 0 0">${t("每次状况记一笔：怎么处理的、花了多久、结果如何。过几周回头看：哪种状况在减少、哪些做法值得继续用；标了「值得继续」的会列在那种状况的卡上，给后来的晚上、也给后来的父母。")}</p>
    <div class="btns" style="margin-top:8px"><button class="btn primary" data-act="bt-ev-add">＋ ${t("记一笔 / 补记")}</button><button class="btn" data-act="bt-sit-add">＋ ${t("加一种状况")}</button></div></div>
  <h2>${t("常见状况")}</h2>
  ${list.map(card).join("")}
  <h2>${t("最近的记录")}</h2>
  ${recordsHTML("bt-ev", btEvents(), evRow, null, t("还没有记录。遇到状况时在播放页点「遇到状况」记一笔，或者在这里补记。"))}
  ${S.bt.pendingEv.length ? `<p class="small muted" style="margin-top:8px">${t("还有 {n} 条离线记录等着联网补传。", { n: S.bt.pendingEv.length })}</p>` : ""}`;
}
const sitFields = [
  { k: "when", label: "什么情况", type: "text", ph: "孩子一直不肯睡，反复下床" }, { k: "age", label: "常见于（可空）", type: "text", ph: "2 岁前后" },
  { k: "stepsText", label: "推荐做法（一行一条）", type: "area", rows: 6 }, { k: "say", label: "可以这样说", type: "area", rows: 4 },
  { k: "avoid", label: "不要（可空）", type: "area", rows: 3 }, { k: "verse", label: "经文提醒（可空）", type: "text", ph: "诗篇 4:8" }];
const evFields = c => [
  { k: "situation", label: "什么情况", type: "seg", raw: true, opts: [...allSituations(c).map(s => [s.id, s.when]), ["custom", t("其他")]] },
  { k: "title", label: "「其他」时写一下是什么情况", type: "text" }, { k: "date", label: "哪一晚", type: "date" },
  { k: "children", label: "谁", type: "multi", raw: true, opts: kids().map(k => [k.id, k.name || t("宝宝")]) },
  { k: "approach", label: "怎么处理的", type: "area", rows: 4, ph: "温柔坚定说了一次，陪回床上三次，没有谈判" }, { k: "minutes", label: "花了几分钟", type: "num" },
  { k: "outcome", label: "结果", type: "seg", opts: OUTCOMES }, { k: "keep", label: "这个做法值得继续用（会列在状况卡上）", type: "check" },
  { k: "child_state", label: "孩子当时的状态", type: "seg", opts: SIDES.event.child.map(x => [x, x]) }, { k: "parent_state", label: "大人当时的状态", type: "seg", opts: SIDES.event.parent.map(x => [x, x]) },
  { k: "note", label: "备注（可空）：孩子的反应、明天要跟进什么", type: "area" }];
async function saveSituations(list){ await saveCfg({ situations: list }); }
const verFields = [
  { k: "name", label: "版本名", type: "text", ph: "家庭通用版 / 幼儿版 / 学龄版" },
  { k: "open", label: "开场带领词（拥抱与敬拜那一步）", type: "area", rows: 8 }, { k: "reading", label: "读经引导（读诗篇 4:8 那一步）", type: "area", rows: 6 },
  { k: "prayer", label: "祷告词", type: "area", rows: 6 }, { k: "close", label: "结束的话（音乐与安睡那一步）", type: "area", rows: 6 }];
const stamp = () => ({ updated_at: new Date().toISOString(), by: S.user ? memberName(S.user.id) : "" });
async function saveVersions(versions, version){ await saveCfg({ versions, ...(version !== undefined ? { version } : {}) }); }
function newVersion(from, name){ return { id: "v" + newId(), name: name || from.name, open: from.open, reading: from.reading, prayer: from.prayer, close: from.close, ...stamp() }; }

/* ---- 睡前经文 ---- */
function viewReadings(){
  const c = cfg(), list = allReadings(c), lang = c.lang;
  const show = r => { const parts = []; for (const l of (lang === "both" ? ["zh", "en"] : [lang])) { const v = verseText(r.ref, l);
    if (v) parts.push(`<span class="verse">${esc(v.text)} <span class="small muted">（${esc(v.version)}）</span></span>`);
    else { const err = verseError(r.ref, l);
      if (err) parts.push(`<span class="verse small" style="color:var(--rose)">${t("没抓到")}（${l === "en" ? "EN" : "中"}）：${esc(err)} <button class="chip" data-act="bt-read-retry" data-ref="${esc(r.ref)}">${t("再试")}</button></span>`);
      else { ensureVerse(r.ref, l).then(ok => { if (ok) scheduleRender(); }); parts.push(`<span class="verse muted small">${navigator.onLine ? t("正在抓取经文…") : t("离线，还没抓到这段")}</span>`); } } }
    return parts.join(""); };
  const row = r => `<div class="task ${r.ref === c.reading ? "done" : ""}"><span class="bar" style="background:${r.ref === c.reading ? "var(--sage)" : r.ref === ANCHOR_REF ? "var(--honey)" : "var(--line)"}"></span>
    <div class="main"><span class="title" style="text-decoration:none;color:var(--ink)"><b>${esc(tc(r.ref))}</b>${r.ref === c.reading ? ` <span class="pill ok">${t("今晚")}</span>` : ""}${r.ref === ANCHOR_REF && c.anchor ? ` <span class="pill lv">${t("每晚先读")}</span>` : ""}</span>${show(r)}<span class="meta">${esc(tc(r.lead))}${r.ask ? ` · ${t("问")}：${esc(tc(r.ask))}` : ""}</span></div>
    <span class="acts" style="flex-direction:column">${r.ref === c.reading ? "" : `<button class="chip" data-act="bt-read-use" data-ref="${esc(r.ref)}">${t("今晚读这段")}</button>`}${r.custom ? `<button class="chip" data-act="bt-read-edit" data-ref="${esc(r.ref)}">${t("编辑")}</button>` : ""}</span></div>`;
  return `${h2(t("睡前经文"), t("今晚：{ref}", { ref: esc(tc(c.reading)) }))}
  ${offlineHTML()}
  <div class="btns" style="margin-top:0"><button class="btn primary" data-act="bt-read-add">＋ ${t("加一段")}</button><button class="btn" data-act="bt-read-prefetch">${t("把全部经文抓到这台设备")}</button><button class="btn" data-act="bt-read-next">${t("换下一段")}</button></div>
  <p class="small muted" style="margin-top:8px">${t("爸爸妈妈读给孩子听。诗篇 4:8 是每晚的锚点（可在设置里关掉），下面再选一段今晚的。正文按设置里的抓取译本取（中文 {zh}、英文 {en}），抓过一次就存在这台设备上。", { zh: esc(fetchVersions().zh), en: esc(fetchVersions().en) })}</p>
  <div class="panel"><div class="tasks">${list.map(row).join("")}</div></div>`;
}
const readFields = [{ k: "ref", label: "出处", type: "text", ph: "诗篇 23:1-4" }, { k: "lead", label: "给父母的一句引导", type: "text", ph: "害怕黑暗、需要安全感时读" }, { k: "ask", label: "可以问孩子的一句（可空）", type: "text" }];

/* ---- 记录 ---- */
function viewLogs(){
  const today = dayKey(Date.now()), week = nightsIn(dayKey(Date.now() - 6 * D), today), month = nightsIn(dayKey(Date.now() - 29 * D), today);
  const avg = l => l.length ? Math.round(l.reduce((a, x) => a + (+x.actual_min || 0), 0) / l.length) : 0;
  const over = month.filter(x => x.planned_min && x.actual_min > x.planned_min + 5).length;
  const row = l => `<div class="task"><span class="bar" style="background:${l.actual_min > (l.planned_min || 0) + 5 ? "var(--honey)" : "var(--sage)"}"></span>
    <button class="main" data-act="bt-log-edit" data-id="${esc(l.id)}"><span class="title">${esc(l.date)} · ${t("{n} 分钟", { n: l.actual_min })}${l.planned_min ? ` <span class="small muted">/ ${t("计划 {n}", { n: l.planned_min })}</span>` : ""}</span><span class="meta">${(l.children || []).map(kidName).join("、") || t("没记孩子")}${l.led_by ? ` · ${esc(l.led_by)}${t("带")}` : ""}${l.passage ? ` · ${esc(tc(l.passage))}` : ""}${l.songs && l.songs.length ? ` · ♪ ${esc(l.songs.join("、"))}` : ""}${l.version ? ` · ${esc(l.version)}` : ""}${sidesLine(l)}${l.note ? `<br>${esc(l.note)}` : ""}</span></button><span></span></div>`;
  return `${h2(t("记录"))}
  ${S.bt.missing ? migrateHTML() : ""}
  <div class="panel"><div class="stats"><div class="stat"><div class="v">${week.length}<small>/7</small></div><div class="k">${t("本周")}</div></div><div class="stat"><div class="v">${month.length}<small>/30</small></div><div class="k">${t("近 30 天")}</div></div><div class="stat"><div class="v">${avg(month)}<small>${t("分")}</small></div><div class="k">${t("平均时长")}</div></div><div class="stat"><div class="v">${over}</div><div class="k">${t("拖长的晚上")}</div></div></div>
    <p class="small muted" style="margin:8px 0 0">${t("看的不只是有没有做：睡前争执是否减少、孩子是否更愿意认错、被纠正后能否重新连接。入睡时间在小月亮的睡眠记录里对照。")}</p></div>
  <div class="btns"><button class="btn" data-act="bt-log-add">＋ ${t("补记一晚")}</button></div>
  ${recordsHTML("bt-log", S.bt.logs, row, null, t("还没有记录。做完一次睡前流程，这里就有了。"))}
  ${S.bt.pending.length ? `<p class="small muted" style="margin-top:8px">${t("还有 {n} 条离线记录等着联网补传。", { n: S.bt.pending.length })}</p>` : ""}`;
}
const logFields = () => [
  { k: "date", label: "哪一晚", type: "date" }, { k: "actual_min", label: "实际几分钟", type: "num" },
  { k: "children", label: "谁参加了", type: "multi", raw: true, opts: kids().map(k => [k.id, k.name || t("宝宝")]) },
  { k: "led_by", label: "谁带的", type: "seg", raw: true, opts: [...new Set([...members(), "爸爸", "妈妈"])].map(m => [m, m]) },
  { k: "passage", label: "读了哪段（可空）", type: "text" },
  { k: "child_state", label: "孩子今晚的状态", type: "seg", opts: SIDES.night.child.map(x => [x, x]) }, { k: "parent_state", label: "大人今晚的状态", type: "seg", opts: SIDES.night.parent.map(x => [x, x]) },
  { k: "note", label: "一句备注（今天处理了什么、孩子说了什么）", type: "area" }];

/* ============ 事件 ============ */
async function btAct(act, btn){
  const d = btn.dataset;
  if (act.startsWith("btp-")) { await playAct(act, btn); return; }
  const c = cfg();
  switch (act) {
    case "bt-start": { if (!activeSteps(c).length) { toast(t("流程里没有步骤")); break; } stopPreview(); await openPlayer({ cfg: c, flow: { id: c.flow, name: c.flowName, kind: c.flowKind }, text: currentText(c), kids: kids(), members: members(), readings: allReadings(c), situations: allSituations(c), principles: PRINCIPLES, outcomes: OUTCOMES, songFor, songBlob, verseText, verseError, ensureVerse, saveLog, saveEvent, parentLine }); break; }
    case "bt-flow-sel": selectFlow(d.id); render(); break;
    case "bt-flow-new": openForm("新建流程", [{ k: "name", label: "流程名称", type: "text", ph: "午睡 / 晚觉 / 出门前" }, { k: "tpl", label: "从哪个模板开始", type: "seg", raw: true, opts: [...Object.entries(FLOW_TEMPLATES).map(([k, tp]) => [k, tc(tp.name)]), ["blank", t("空白")]] }], { name: "", tpl: "nap" },
      async f => { const tp = FLOW_TEMPLATES[f.tpl], name = (f.name || (tp && tp.flowName) || "").trim(); if (!name) { toast(t("请填流程名称")); return; }
        const nf = { id: "f" + newId(), name: name.slice(0, 20), kind: tp ? tp.kind : "night", steps: tp ? withIds(tp.steps) : [] }; await saveFlows([...c.flows, nf]); selectFlow(nf.id); closeSheet(); toast(t("已新建，可以改步骤了")); }); break;
    case "bt-flow-copy": { const cur = c.flows.find(x => x.id === c.flow); if (!cur) break;
      openForm("另存为新流程", [{ k: "name", label: "新流程的名字", type: "text", ph: "例如：晚觉 #2" }], { name: `${cur.name} #${c.flows.length + 1}` },
        async f => { const name = (f.name || "").trim(); if (!name) { toast(t("请填流程名称")); return; }
          const nf = { id: "f" + newId(), name: name.slice(0, 20), kind: cur.kind, steps: cur.steps.map(x => ({ ...x, id: stepId() })) };
          await saveFlows([...c.flows, nf]); selectFlow(nf.id); closeSheet(); toast(t("已另存为「{name}」，现在选中的是它", { name: nf.name })); }); break; }
    case "bt-flow-rename": openForm("流程名称", [{ k: "name", label: "流程名称", type: "text" }], { name: c.flowName }, async f => { if (!f.name) { toast(t("请填流程名称")); return; } await saveFlows(c.flows.map(x => x.id === c.flow ? { ...x, name: f.name.slice(0, 20) } : x)); closeSheet(); }); break;
    case "bt-flow-del": { if (c.flows.length < 2 || !confirm(t("删除流程「{name}」和它的步骤？", { name: c.flowName }))) break; const left = c.flows.filter(x => x.id !== c.flow); selectFlow(left[0].id); await saveFlows(left); render(); break; }
    /* 歌单：加到流程 / 话题的推荐歌曲 */
    case "bt-song-addto": { const sid = songForm && songForm.id; if (sid) openAddToFlow(sid); break; }
    case "bt-pick-step": { const sid = d.song, f = c.flows.find(x => x.id === d.flow), st = f && f.steps.find(x => x.id === d.step); if (!st) break; await saveFlows(c.flows.map(x => x.id === f.id ? { ...x, steps: x.steps.map(y => y.id === st.id ? { ...y, song: y.song === sid ? "" : sid } : y) } : x)); openAddToFlow(sid); break; }
    case "bt-pick-topic": { await toggleTopicSong(d.topic, d.song); openAddToFlow(d.song); break; }
    case "bt-pin-song": { await toggleTopicSong(d.topic, d.song, d.off ? false : undefined); if ($("#sheet").open && pickCtx) openPickSongsForTopic(pickCtx.id, pickCtx.name); else render(); break; }
    case "bt-cap": await saveCfg({ cap: +d.v }); render(); break;
    case "bt-lang": await saveCfg({ lang: d.v }); render(); break;
    case "bt-anchor": await saveCfg({ anchor: !c.anchor }); render(); break;
    case "bt-mirror": await saveCfg({ mirror: !c.mirror }); render(); break;
    /* 流程 */
    case "bt-flow-tpl": { const tp = FLOW_TEMPLATES[d.tpl]; if (!tp) break; if (c.steps.length && !confirm(t("用「{name}」替换「{cur}」现有的步骤？替换后原来的步骤就没了；想保留请先「另存为新流程」。", { name: tc(tp.name), cur: c.flowName }))) break; await saveFlows(c.flows.map(f => f.id === c.flow ? { ...f, kind: tp.kind || "night", steps: withIds(tp.steps) } : f)); S.tab = "bt-flow"; render(); toast(t("已套用")); break; }
    case "bt-step-add": openForm("添加步骤", stepFields(), { name: "", minutes: 3, text: "", song: "", hint: "", loop: false, skip: false }, async f => { if (!f.name) { toast(t("请填名字")); return; } await saveSteps([...c.steps, { id: stepId(), ...f, minutes: +f.minutes || 0 }], ""); closeSheet(); }); break;
    case "bt-step-edit": { const s = c.steps.find(x => x.id === d.id); if (!s) break;
      openForm("这一步", stepFields(), s, async f => { await saveSteps(c.steps.map(x => x.id === s.id ? { ...x, ...f, minutes: +f.minutes || 0 } : x), ""); closeSheet(); }, async () => { if (confirm(t("删除这一步？"))) { await saveSteps(c.steps.filter(x => x.id !== s.id), ""); closeSheet(); } }); break; }
    case "bt-step-move": { const i = c.steps.findIndex(x => x.id === d.id), j = i + (+d.d); if (i < 0 || j < 0 || j >= c.steps.length) break; const st = [...c.steps]; [st[i], st[j]] = [st[j], st[i]]; await saveSteps(st, ""); render(); break; }
    /* 歌单 */
    case "bt-song-add": openSongForm(null); break;
    case "bt-song-edit": { const s = song(d.id); if (s) openSongForm(s); break; }
    case "bt-song-tag": { readSongForm(); const tg = songForm.draft.tags; songForm.draft.tags = tg.includes(d.v) ? tg.filter(x => x !== d.v) : [...tg, d.v]; drawSongForm(); break; }
    case "bt-song-ai": await aiLyrics(); break;
    case "bt-song-save": await saveSongForm(btn); break;
    case "bt-song-delete": { const s = song(songForm.id); if (s && confirm(t("删除「{t}」和它的音频？流程里用到它的步骤改为不放歌。", { t: s.title }))) { await deleteSong(s); closeSheet(); } break; }
    case "bt-song-play": await togglePreview(d.id); break;
    case "bt-cache-all": { btn.disabled = true; btn.textContent = t("下载中…"); const n = await cacheAll(); render(); toast(t("已下载 {n} 首", { n })); break; }
    /* 带领词 */
    case "bt-ver-new": openForm("新建版本", [verFields[0]], { name: c.versions.length ? "" : TEXT_TEMPLATE.name }, async f => { const v = newVersion(TEXT_TEMPLATE, f.name || TEXT_TEMPLATE.name); await saveVersions([...c.versions, v], v.id); closeSheet(); toast(t("已新建，可以改了")); }); break;
    case "bt-ver-copy": { const cur = currentText(c); openForm("复制当前版", [verFields[0]], { name: cur.name + " 2" }, async f => { const v = newVersion(cur, f.name || cur.name + " 2"); await saveVersions([...c.versions, v], v.id); closeSheet(); }); break; }
    case "bt-ver-use": await saveVersions(c.versions, d.id); render(); toast(t("今晚用这版")); break;
    case "bt-ver-edit": { const v = c.versions.find(x => x.id === d.id); if (!v) break; openForm("修改带领词", verFields, v, async f => { await saveVersions(c.versions.map(x => x.id === v.id ? { ...x, ...f, ...stamp() } : x)); closeSheet(); }); break; }
    case "bt-ver-reset": { const v = c.versions.find(x => x.id === d.id); if (!v || !confirm(t("把「{name}」的全部文字恢复成内置模板？", { name: v.name }))) break; await saveVersions(c.versions.map(x => x.id === v.id ? { ...newVersion(TEXT_TEMPLATE, v.name), id: v.id } : x)); render(); break; }
    case "bt-ver-del": { const v = c.versions.find(x => x.id === d.id); if (!v || c.versions.length < 2 || !confirm(t("删除「{name}」？", { name: v.name }))) break; const left = c.versions.filter(x => x.id !== v.id); await saveVersions(left, left[0].id); render(); break; }
    /* 状况模板与记录 */
    case "bt-sit-add": openForm("加一种状况", sitFields, { when: "", age: "", stepsText: "", say: "", avoid: "", verse: "" }, async f => { if (!f.when) { toast(t("请填情况")); return; } await saveSituations([...c.situations, { id: "c" + newId(), when: f.when, age: f.age, steps: f.stepsText.split(/\r?\n/).map(x => x.trim()).filter(Boolean), say: f.say, avoid: f.avoid, verse: f.verse }]); closeSheet(); }); break;
    case "bt-sit-edit": { const s = situation(d.id, c); if (!s) break;
      openForm("改模板", sitFields, { ...s, stepsText: (s.steps || []).join("\n") }, async f => { if (!f.when) { toast(t("请填情况")); return; } const row = { id: s.id, when: f.when, age: f.age, steps: f.stepsText.split(/\r?\n/).map(x => x.trim()).filter(Boolean), say: f.say, avoid: f.avoid, verse: f.verse }; await saveSituations(c.situations.some(x => x.id === s.id) ? c.situations.map(x => x.id === s.id ? row : x) : [...c.situations, row]); closeSheet(); },
        s.custom ? async () => { if (confirm(t("删除这种状况？已有的记录保留。"))) { await saveSituations(c.situations.filter(x => x.id !== s.id)); closeSheet(); } } : undefined); break; }
    case "bt-sit-reset": await saveSituations(c.situations.filter(x => x.id !== d.id)); render(); break;
    case "bt-ev-add": openForm("记一笔", evFields(c), { situation: d.sit || (allSituations(c)[0] || {}).id || "custom", title: "", date: dayKey(Date.now()), children: kids().length === 1 ? [kids()[0].id] : [], approach: "", minutes: null, outcome: "calm", keep: false, note: "" },
      async f => { await saveEvent({ situation: f.situation, title: f.situation === "custom" ? f.title : "", date: f.date || dayKey(Date.now()), children: f.children || [], approach: f.approach || "", minutes: f.minutes == null ? null : +f.minutes, outcome: f.outcome || "", keep: !!f.keep, note: f.note || "" }); closeSheet(); }); break;
    case "bt-ev-edit": { const e = S.bt.events.find(x => x.id === d.id); if (!e) break;
      openForm("这一笔", evFields(c), e, async f => { await saveEvent({ ...e, ...f, title: f.situation === "custom" ? f.title : "", children: f.children || [], minutes: f.minutes == null ? null : +f.minutes, keep: !!f.keep }); closeSheet(); }, async () => { if (confirm(t("删除这条记录？"))) { await deleteEvent(e.id); closeSheet(); } }); break; }
    case "bt-ev-keep": { const e = S.bt.events.find(x => x.id === d.id); if (!e) break; await saveEvent({ ...e, keep: !e.keep }); render(); break; }
    /* 经文 */
    case "bt-read-use": await saveCfg({ reading: d.ref }); prefetchTonight().then(scheduleRender); render(); break;
    case "bt-read-retry": retryVerse(d.ref); render(); break;
    case "bt-read-next": { const list = allReadings(c).filter(r => r.ref !== ANCHOR_REF || !c.anchor), i = list.findIndex(r => r.ref === c.reading); const nx = list[(i + 1) % list.length]; if (nx) { await saveCfg({ reading: nx.ref }); prefetchTonight().catch(() => {}); render(); } break; }
    case "bt-read-add": openForm("加一段睡前经文", readFields, { ref: "", lead: "", ask: "" }, async f => { if (!parseRef(f.ref)) { toast(t("看不懂这个出处，写成「诗篇 23:1-4」这样")); return; } if (allReadings(c).some(r => r.ref === f.ref)) { toast(t("已经有这段了")); return; } await saveCfg({ readings: [...c.readings, f] }); closeSheet(); ensureVerse(f.ref, "zh"); ensureVerse(f.ref, "en"); }); break;
    case "bt-read-edit": { const r = c.readings.find(x => x.ref === d.ref); if (!r) break; openForm("这段经文", readFields, r, async f => { await saveCfg({ readings: c.readings.map(x => x.ref === r.ref ? f : x), ...(c.reading === r.ref ? { reading: f.ref } : {}) }); closeSheet(); }, async () => { await saveCfg({ readings: c.readings.filter(x => x.ref !== r.ref), ...(c.reading === r.ref ? { reading: READINGS[1].ref } : {}) }); closeSheet(); }); break; }
    case "bt-read-prefetch": { btn.disabled = true; btn.textContent = t("抓取中…"); await prefetchAll(c); render(); toast(t("经文已存到这台设备")); break; }
    /* 记录 */
    case "bt-log-add": openForm("补记一晚", logFields(), { date: dayKey(Date.now()), actual_min: totalMin(c), children: kids().map(k => k.id), led_by: S.user ? memberName(S.user.id) : "", passage: c.reading, note: "" }, async f => { if (!f.date) { toast(t("请填日期")); return; } await saveLog({ date: f.date, started_at: new Date(f.date + "T20:30:00").toISOString(), planned_min: totalMin(c), actual_min: +f.actual_min || 0, children: f.children || [], led_by: f.led_by || "", version: currentText(c).name, passage: f.passage || "", songs: [], steps: [], note: f.note || "" }); closeSheet(); }); break;
    case "bt-log-edit": { const l = S.bt.logs.find(x => x.id === d.id); if (!l) break; openForm("这一晚", logFields(), l, async f => { await saveLog({ ...l, ...f, actual_min: +f.actual_min || 0, children: f.children || [] }); closeSheet(); }, async () => { if (confirm(t("删除这条记录？"))) { await deleteLog(l.id); closeSheet(); } }); break; }
  }
}
/* 文件选择（歌曲表单）与播放页里的输入 */
function btChange(ev){
  const el = ev.target; if (!el) return false;
  if (el.id === "btFlowSel") { selectFlow(el.value); render(); return true; }   // 今天页「睡前」的流程下拉框
  if (el.id === "btFile" && songForm) { songForm.file = el.files && el.files[0] ? el.files[0] : null; readSongForm(); drawSongForm(); return true; }
  return playChange(ev);
}

/* ---- 加到流程：歌单行左滑 / 编辑页按钮打开。睡前流程的某一步放一首歌；冲突 / 情绪话题可以放多首推荐歌 ---- */
let pickCtx = null;
const topicList = c => [...CONFLICTS, ...c.situations.filter(x => String(x.id).startsWith("cf-") && !CONFLICTS.some(y => y.id === x.id))].map(x => ({ id: x.id, name: x.when, kind: "cf" })).concat(EMOTIONS.map(x => ({ id: x.id, name: x.when, kind: "em" })));
async function toggleTopicSong(topicId, songId, on){
  const c = cfg(), cur = new Set(c.topicSongs[topicId] || []), want = on === undefined ? !cur.has(songId) : on;
  if (want) cur.add(songId); else cur.delete(songId);
  await saveCfg({ topicSongs: { ...c.topicSongs, [topicId]: [...cur] } });
}
const topicSongsOf = (id, c = cfg()) => c.topicSongs[id] || [];
function openAddToFlow(songId){
  const c = cfg(), s = song(songId); if (!s) return; pickCtx = null;
  const tl = topicList(c), btn = (x, kind) => `<button type="button" data-act="bt-pick-topic" data-topic="${esc(x.id)}" data-song="${esc(songId)}" aria-pressed="${(c.topicSongs[x.id] || []).includes(songId)}">${esc(tc(x.name))}</button>`;
  $("#sheetIn").innerHTML = `${head(esc(t("加到流程")))}
  <p class="small"><b>♪ ${esc(s.title)}</b><br><span class="muted">${t("点一下加进去，再点一下取消。睡前流程的一步只放一首歌（会换掉原来那首）；冲突 / 情绪话题可以放多首推荐歌。")}</span></p>
  <h2>${t("睡前安然")}</h2>
  ${c.flows.map(f => `<div class="panel" style="margin-top:8px"><b>${f.kind === "nap" ? "☀" : "🌙"} ${esc(f.name)}</b> <span class="small muted">${t("约 {n} 分钟", { n: flowMin(f) })}</span>
    <div class="seg" style="margin-top:6px">${f.steps.map(st => { const cur = st.song && st.song !== songId ? songLabel(st.song) : ""; return `<button type="button" data-act="bt-pick-step" data-song="${esc(songId)}" data-flow="${esc(f.id)}" data-step="${esc(st.id)}" aria-pressed="${st.song === songId}">${esc(st.name)}${cur ? ` <small class="muted">♪${esc(cur)}</small>` : ""}</button>`; }).join("") || `<span class="small muted">${t("这个流程还没有步骤")}</span>`}</div></div>`).join("")}
  <h2>${t("冲突管理 · 推荐歌曲")}</h2><div class="seg">${tl.filter(x => x.kind === "cf").map(btn).join("")}</div>
  <h2>${t("情绪管理 · 推荐歌曲")}</h2><div class="seg">${tl.filter(x => x.kind === "em").map(btn).join("")}</div>
  <div class="btns"><button class="btn primary" data-act="close">${t("完成")}</button></div>`;
  showSheet();
}
/* 反过来：从话题卡上选歌 */
function openPickSongsForTopic(topicId, name){
  const c = cfg(), list = songs().filter(s => s.path); pickCtx = { id: topicId, name };
  $("#sheetIn").innerHTML = `${head(esc(t("推荐歌曲")))}
  <p class="small"><b>${esc(tc(name))}</b><br><span class="muted">${t("点一下加进这个话题的推荐歌曲，再点一下取消。")}</span></p>
  ${list.length ? `<div class="seg" style="flex-direction:column;align-items:stretch">${list.map(s => `<button type="button" data-act="bt-pin-song" data-topic="${esc(topicId)}" data-song="${esc(s.id)}" aria-pressed="${(c.topicSongs[topicId] || []).includes(s.id)}">♪ ${esc(s.title)} <small class="muted">${(s.tags || []).map(k => t(SONG_TAGS[k] || k)).join("、")}</small></button>`).join("")}</div>` : `<div class="empty">${t("歌单里还没有歌。先到「睡前安然 → 歌单」添加。")}</div>`}
  <div class="btns"><button class="btn primary" data-act="close">${t("完成")}</button></div>`;
  showSheet();
}
const previewing = id => previewId === id;
async function reorderSongs(ids){ for (let i = 0; i < ids.length; i++) { const s = song(ids[i]); if (s && s.sort !== i) await upsertSong({ ...s, sort: i }); } }
initSongRows({
  onDelete: async (id, kind) => { if (kind === "step") { const c = cfg(), st = c.steps.find(x => x.id === id); if (st && confirm(t("删除这一步？"))) { try { await saveSteps(c.steps.filter(x => x.id !== id)); } catch (e) { /* 已 toast */ } } render(); return; } const s = song(id); if (!s) return; if (!confirm(t("删除「{t}」和它的音频？流程里用到它的步骤改为不放歌。", { t: s.title }))) return; try { await deleteSong(s); toast(t("已删除")); } catch (e) { /* 已 toast */ } render(); },
  onAdd: id => openAddToFlow(id),
  onReorder: async (ids, movedId, kind) => { try { if (kind === "step") { const c = cfg(), by = new Map(c.steps.map(x => [x.id, x])); await saveSteps(ids.map(i => by.get(i)).filter(Boolean)); } else await reorderSongs(ids); } catch (e) { /* 已 toast */ } render(); const h = document.querySelector(`.song-row[data-id="${movedId}"] .song-handle`); if (h) h.focus(); }
});

export { openPickSongsForTopic, topicSongsOf, songs, previewing, flowOfLog, isNapLog, isEm, verseText, verseError, ensureVerse, retryVerse, scheduleRender, sidesLine, sidesHint, cfg, saveCfg, kids, kidName, online, offlineHTML, migrateHTML, h2, saveEvent, deleteEvent, outcomeLabel, sitStats, isCf, lastLog, totalMin, activeSteps, BT_TABS, loadBedtime, attachBedtimeRealtime, cacheReady, bedtimeRowHTML, viewBedtime, viewFlow, viewSongs, viewTexts, viewReadings, viewLogs, viewCases, btAct, btChange, stopPreview, cfg as bedtimeCfg, nightsIn, playerOpen };
