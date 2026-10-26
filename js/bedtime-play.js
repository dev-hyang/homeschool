import { t, tc, tb } from "./core/i18n.js";
import { S } from "./core/state.js";
import { $, dayKey, esc, toast } from "./core/util.js";
import { ANCHOR_REF } from "./data/bedtime.js";
import { SIDES } from "./data/flows.js";
import { ANGER, V } from "./data/principle.js";
import { memberName } from "./core/auth.js";
import { render } from "./views.js";

/* ============ 睡前安然 · 播放页 ============
   整页深色、字大、只有一个「下一步」。不显示封面、不滚歌词、不动画：灯调暗后，屏幕上没有任何吸引孩子的东西。
   每步一个软计时：细进度条 + 「约 n 分钟」，到时只震一下、进度条变色，不响铃、不自动跳步；最后一步到时音乐淡出，进入「今晚完成」。
   音频用一个 <audio>，源是本机缓存的 Blob；Media Session 让锁屏后能继续放、能在锁屏上暂停 / 下一步。
   父母要念的话（带领词 / 经文 / 祷告）用暗灰色显示，可以一键收起；歌词和「遇到状况」默认收着。 */
let P = null;
const playerOpen = () => !!P;
const nap = () => !!(P && P.flow && P.flow.kind === "nap");   // 午睡：不说「今晚」「晚安」
const now = () => Date.now();
const secs = () => P ? Math.floor((now() - P.stepStart) / 1000) : 0;
const step = () => P && P.steps[P.i];
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const plannedSecs = st => P.ext ? P.ext : (+st.minutes || 0) * 60;   // 「再放 5 分钟」时只按加的时间算

async function openPlayer(api){
  if (P) closePlayer();
  const c = api.cfg;
  P = { api, c, flow: api.flow || { name: "", kind: "night" }, text: api.text, steps: c.steps.filter(s => !s.skip).map(s => ({ ...s })), i: 0, startedAt: now(), stepStart: now(), actual: [], offset: {}, played: new Set(),
    audio: null, url: null, textOn: true, lyricsOn: false, casesOn: false, flagged: false, fading: false, ext: 0, done: false, timer: null, blocked: false, loading: false,
    readIdx: Math.max(0, api.readings.findIndex(r => r.ref === c.reading)), kids: new Set(api.preKids || api.kids.map(k => k.id)), led: S.user ? memberName(S.user.id) : (api.members[0] || ""), note: "", childSt: "", parentSt: "", saving: false };
  const host = document.createElement("div"); host.id = "btplay"; host.className = "btp"; document.body.appendChild(host);
  document.body.classList.add("bt-playing");
  P.timer = setInterval(tick, 1000);
  for (const l of (c.lang === "both" ? ["zh", "en"] : [c.lang])) api.ensureVerse(c.reading, l).then(ok => { if (ok && P && !P.done) draw(); });
  draw();
  await startStep(0);
}
function closePlayer(){
  if (!P) return;
  clearInterval(P.timer); stopAudio();
  try { if ("mediaSession" in navigator) { navigator.mediaSession.metadata = null; for (const a of ["play", "pause", "nexttrack", "previoustrack"]) navigator.mediaSession.setActionHandler(a, null); } } catch (e) {}
  const host = $("#btplay"); if (host) host.remove();
  document.body.classList.remove("bt-playing");
  P = null;
}

/* ---- 音频 ---- */
function stopAudio(){ if (P && P.audio) { try { P.audio.pause(); P.audio.src = ""; } catch (e) {} if (P.url) URL.revokeObjectURL(P.url); P.audio = null; P.url = null; } }
async function playSong(s){
  stopAudio(); if (!P) return;
  const st = step(); P.song = s;
  if (!s) { mediaMeta(); draw(); return; }
  P.loading = true; P.blocked = false; draw();
  try {
    const blob = await P.api.songBlob(s); if (!P || step() !== st) return;
    const a = new Audio(); P.url = URL.createObjectURL(blob); a.src = P.url; a.loop = !!st.loop; a.volume = P.volume == null ? 0.6 : P.volume; a.preload = "auto"; P.audio = a;
    a.onended = () => { if (P && !a.loop) draw(); };
    a.onplay = () => { P.played.add(s.title); mediaMeta(); draw(); };
    a.onpause = () => { if (P) draw(); };
    await a.play();
  } catch (e) { if (!P) return; P.blocked = !!(e && /NotAllowed|interact|gesture/i.test(e.name + e.message)); if (!P.blocked) toast(e.message || t("播放失败")); }
  finally { if (P) { P.loading = false; draw(); } }
}
function mediaMeta(){
  if (!("mediaSession" in navigator)) return;
  try {
    const st = step(); navigator.mediaSession.metadata = new MediaMetadata({ title: st ? st.name : t("睡前安然"), artist: P.song ? P.song.title : t("睡前安然"), album: t("睡前安然") });
    navigator.mediaSession.setActionHandler("play", () => { if (P && P.audio) P.audio.play().catch(() => {}); });
    navigator.mediaSession.setActionHandler("pause", () => { if (P && P.audio) P.audio.pause(); });
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
  } catch (e) {}
}
function fadeOut(then){
  if (!P || P.fading) return; P.fading = true;
  const a = P.audio; if (!a) { P.fading = false; then(); return; }
  const v0 = a.volume, t0 = now(), dur = 10000;
  const iv = setInterval(() => { if (!P || P.audio !== a) { clearInterval(iv); return; } const k = Math.min(1, (now() - t0) / dur); a.volume = v0 * (1 - k); if (k >= 1) { clearInterval(iv); a.pause(); P.fading = false; then(); } }, 250);
}

/* ---- 步骤 ---- */
async function startStep(i){
  const st = P.steps[i]; P.i = i; P.stepStart = now(); P.flagged = false; P.fading = false; P.ext = 0; P.lyricsOn = false;
  if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
  draw();
  await playSong(st.song ? P.api.songFor(st, P.offset[st.id] || 0) : null);
}
function recordActual(){ const st = step(); if (st) P.actual[P.i] = (P.actual[P.i] || 0) + Math.round((now() - P.stepStart) / 6000) / 10; }   // 单位：分钟（精确到 0.1）
async function next(){ if (!P || P.done) return; if (P.i + 1 >= P.steps.length) goFinish(); else { recordActual(); await startStep(P.i + 1); } }
async function prev(){ if (!P || P.done || P.i === 0) return; recordActual(); await startStep(P.i - 1); }
function goFinish(){
  if (!P || P.done) return;
  recordActual();
  P.done = true; P.endedAt = now();
  if (!P.keepMusic) stopAudio();
  draw();
}
function tick(){
  if (!P || P.done) return;
  const st = step(), el = secs(), planned = plannedSecs(st);
  const bar = $("#btplay .btp-bar span"), time = $("#btplay .btp-time");
  if (bar) bar.style.width = `${planned ? Math.min(100, el / planned * 100) : 0}%`;
  if (time) time.innerHTML = timeHTML(st, el, planned);
  if (planned && el >= planned && !P.flagged) { P.flagged = true; if (navigator.vibrate) { try { navigator.vibrate([150, 80, 150]); } catch (e) {} } const host = $("#btplay"); if (host) host.classList.add("over"); }
  if (st.loop && planned && el >= planned && P.audio && !P.audio.paused && !P.fading) fadeOut(() => { if (P && !P.done) goFinish(); });
  const tot = $("#btplay .btp-total"); if (tot) tot.textContent = t("已用 {m}", { m: fmt(Math.floor((now() - P.startedAt) / 1000)) });
}
const timeHTML = (st, el, planned) => `${P.ext ? t("再放 {n} 分钟", { n: Math.round(P.ext / 60) }) : t("约 {n} 分钟", { n: st.minutes })} · ${fmt(el)}${planned && el > planned ? ` <b class="over">+${Math.ceil((el - planned) / 60)} ${t("分")}</b>` : ""}`;

/* ---- 画面 ---- */
function verseBlock(ref, extra = ""){
  const c = P.c, parts = [];
  for (const l of (c.lang === "both" ? ["zh", "en"] : [c.lang])) { const v = P.api.verseText(ref, l);
    if (v) { parts.push(`<p class="btp-verse">${esc(v.text)}</p>`); continue; }
    const err = P.api.verseError(ref, l);
    if (err) parts.push(`<p class="btp-verse muted small">${t("没抓到")}：${esc(err)}</p>`);
    else { parts.push(`<p class="btp-verse muted">${navigator.onLine ? t("正在抓取经文…") : t("离线，还没抓到这段")}</p>`); P.api.ensureVerse(ref, l).then(ok => { if (ok && P && !P.done) draw(); }); } }
  return `<div class="btp-ref">${esc(tc(ref))}${extra}</div>${parts.join("")}`;
}
function textHTML(st){
  const T = P.text, k = st.text, out = [];
  if (st.hint) out.push(`<p class="btp-hint">${esc(tc(st.hint))}</p>`);
  if (k === "open") out.push(`<div class="btp-pre">${esc(tc(T.open))}</div>`);
  else if (k === "reading") {
    const r = P.api.readings[P.readIdx] || P.api.readings[0];
    if (P.c.anchor && r.ref !== ANCHOR_REF) out.push(verseBlock(ANCHOR_REF));
    out.push(verseBlock(r.ref, `<span class="btp-nav"><button data-act="btp-read-prev" aria-label="${t("上一段")}">‹</button><button data-act="btp-read-next" aria-label="${t("下一段")}">›</button></span>`));
    const night = /今晚|睡前|晚上/;   // 午睡时不显示带「今晚 / 睡前」字样的引导
    if (r.lead && !(nap() && night.test(r.lead))) out.push(`<p class="btp-hint">${esc(tc(r.lead))}</p>`);
    if (r.ask && !(nap() && night.test(r.ask))) out.push(`<p class="btp-ask">${t("问")}：${esc(tc(r.ask))}</p>`);
    out.push(`<div class="btp-pre small">${esc(tc(T.reading))}</div>`);
  }
  else if (k === "prayer") out.push(`<div class="btp-pre">${esc(tc(T.prayer))}</div>`);
  else if (k === "close") out.push(`<div class="btp-pre">${esc(tc(T.close))}</div>`);
  return out.join("");
}
function draw(){
  const host = $("#btplay"); if (!host || !P) return;
  if (P.done) { host.innerHTML = finishHTML(); return; }
  const st = step(), el = secs(), planned = plannedSecs(st), s = P.song, playing = P.audio && !P.audio.paused && !P.audio.ended;
  host.classList.toggle("over", !!(planned && el >= planned));
  host.innerHTML = `
  <div class="btp-top"><span>${t("第 {i} 步 / {n}", { i: P.i + 1, n: P.steps.length })} · <span class="btp-total">${t("已用 {m}", { m: fmt(Math.floor((now() - P.startedAt) / 1000)) })}</span></span><button class="btp-x" data-act="btp-exit">${t("结束")}</button></div>
  <h1 class="btp-name">${esc(tb(st.name))}</h1>
  <div class="btp-bar"><span style="width:${planned ? Math.min(100, el / planned * 100) : 0}%"></span></div>
  <div class="btp-time">${timeHTML(st, el, planned)}</div>
  ${st.song ? `<div class="btp-song">${P.loading ? `<span class="muted">${t("正在加载音乐…")}</span>` : s ? `<span>♪ ${esc(s.title)}${s.artist ? ` <span class="muted">· ${esc(s.artist)}</span>` : ""}</span>
      <span class="btp-song-acts">${P.blocked ? `<button data-act="btp-play">▶ ${t("点一下开始播放")}</button>` : `<button data-act="btp-play" aria-label="${playing ? t("暂停") : t("播放")}">${playing ? "❚❚" : "▶"}</button>`}${st.song.startsWith("tag:") ? `<button data-act="btp-swap">${t("换一首")}</button>` : ""}${s.lyrics ? `<button data-act="btp-lyrics" aria-pressed="${P.lyricsOn}">${t("歌词")}</button>` : ""}</span>` : `<span class="muted">${t("这类标签下还没有歌")}</span>`}</div>
    ${P.lyricsOn && s && s.lyrics ? `<div class="btp-pre btp-lyrics">${esc(s.lyrics)}</div>` : ""}` : ""}
  <div class="btp-body ${P.textOn ? "" : "hide"}">${textHTML(st)}</div>
  ${P.casesOn ? casesHTML() : ""}
  <div class="btp-acts"><button class="btp-next" data-act="btp-next">${P.i + 1 >= P.steps.length ? (nap() ? t("完成") : t("今晚完成")) : t("下一步")} ›</button></div>
  <div class="btp-tools"><button data-act="btp-prev" ${P.i === 0 ? "disabled" : ""}>‹ ${t("上一步")}</button><button data-act="btp-text" aria-pressed="${P.textOn}">${P.textOn ? t("收起文字") : t("显示文字")}</button><button data-act="btp-cases" aria-pressed="${P.casesOn}">${t("遇到状况")}</button><label class="btp-vol">${t("音量")} <input id="btpVol" type="range" min="0" max="1" step="0.05" value="${P.volume == null ? 0.6 : P.volume}"></label></div>`;
}
/* 「遇到状况」：原则一句 + 每种状况的做法 / 话 + 「记一笔」内联小表单（谁、结果、几分钟、一句话），存了就回到列表 */
function casesHTML(){
  const pr = P.api.principles, ev = P.ev;
  const one = s => `<div class="btp-case"><b>${esc(tc(s.when))}</b>${(s.steps || []).length ? `<ol>${s.steps.map(x => `<li>${esc(tc(x))}</li>`).join("")}</ol>` : ""}${s.say ? `<p>「${esc(tc(s.say))}」</p>` : ""}${s.avoid ? `<p class="muted">${t("不要")}：${esc(tc(s.avoid))}</p>` : ""}
    ${ev && ev.sit === s.id ? `<div class="btp-ev">
      <div class="lab">${t("谁")}</div><div class="seg">${P.api.kids.map(k => `<button data-act="btp-ev-kid" data-id="${esc(k.id)}" aria-pressed="${ev.kids.has(k.id)}">${esc(k.name || t("宝宝"))}</button>`).join("")}</div>
      <div class="lab">${t("结果")}</div><div class="seg">${P.api.outcomes.map(([k, l]) => `<button data-act="btp-ev-out" data-v="${k}" aria-pressed="${ev.outcome === k}">${t(l)}</button>`).join("")}</div>
      <div class="lab">${t("花了几分钟")}</div><div class="seg">${[1, 3, 5, 10, 20].map(m => `<button data-act="btp-ev-min" data-v="${m}" aria-pressed="${ev.minutes === m}">${m}</button>`).join("")}</div>
      <div class="lab">${t("怎么处理的（一句话，可空）")}</div><textarea id="btpEvNote" rows="2">${esc(ev.note)}</textarea>
      <div class="btp-ev-acts"><button data-act="btp-ev-save" ${ev.saving ? "disabled" : ""}>${ev.saving ? t("保存中…") : t("记下")}</button><button data-act="btp-ev-cancel">${t("取消")}</button></div></div>`
    : `<button class="btp-ev-open" data-act="btp-ev-open" data-sit="${esc(s.id)}">${t("记一笔")}</button>`}</div>`;
  return `<div class="btp-cases"><p class="btp-anger"><b>${esc(tc(ANGER.title))}</b><br>${ANGER.verses.map(r => `${esc(tc(r))}：${esc(tc(V[r] || ""))}`).join("<br>")}<br><span class="muted">${esc(tc(ANGER.steps[0]))}；${esc(tc(ANGER.steps[3]))}</span></p><p class="btp-principle">${esc(tc(pr.core))}<br><span class="muted">${pr.verses.map(v => `${esc(tc(v.ref))}：${esc(tc(v.zh))}`).join("　")}</span></p>${P.api.situations.map(one).join("")}<p class="muted small">${esc(tc(pr.notEvery))}</p></div>`;
}
function finishHTML(){
  const total = Math.round((P.endedAt - P.startedAt) / 60000), planned = P.steps.reduce((a, s) => a + (+s.minutes || 0), 0);
  const rows = P.steps.map((s, i) => `<tr><td>${esc(tb(s.name))}</td><td class="num">${s.minutes}</td><td class="num">${P.actual[i] == null ? "–" : Math.round(P.actual[i])}</td></tr>`).join("");
  const leds = [...new Set([...P.api.members, "爸爸", "妈妈"])];
  return `
  <div class="btp-top"><span>${nap() ? t("完成") : t("今晚完成")}</span><button class="btp-x" data-act="btp-close">${t("不记录，关闭")}</button></div>
  <h1 class="btp-name">${nap() ? t("午安") : t("晚安")}</h1>
  <p class="btp-parent">${esc(tc(P.api.parentLine()))}</p>
  <div class="btp-sum"><table><thead><tr><th>${t("步骤")}</th><th class="num">${t("计划")}</th><th class="num">${t("实际")}</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>${t("合计（分钟）")}</th><th class="num">${planned}</th><th class="num">${total}</th></tr></tfoot></table></div>
  <div class="btp-form">
    <div class="lab">${t("谁参加了")}</div><div class="seg">${P.api.kids.map(k => `<button data-act="btp-kid" data-id="${esc(k.id)}" aria-pressed="${P.kids.has(k.id)}">${esc(k.name || t("宝宝"))}</button>`).join("")}</div>
    <div class="lab">${t("谁带的")}</div><div class="seg">${leds.map(m => `<button data-act="btp-led" data-v="${esc(m)}" aria-pressed="${P.led === m}">${esc(m)}</button>`).join("")}</div>
    <div class="lab">${nap() ? t("孩子这次的状态") : t("孩子今晚的状态")}</div><div class="seg">${(nap() ? SIDES.nap : SIDES.night).child.map(x => `<button data-act="btp-cs" data-v="${esc(x)}" aria-pressed="${P.childSt === x}">${t(x)}</button>`).join("")}</div>
    <div class="lab">${nap() ? t("大人这次的状态") : t("大人今晚的状态")}</div><div class="seg">${(nap() ? SIDES.nap : SIDES.night).parent.map(x => `<button data-act="btp-ps" data-v="${esc(x)}" aria-pressed="${P.parentSt === x}">${t(x)}</button>`).join("")}</div>
    <div class="lab">${t("一句备注（可空）：今天处理了什么、孩子说了什么感恩的事")}</div><textarea id="btpNote" rows="2">${esc(P.note)}</textarea>
  </div>
  <div class="btp-acts"><button class="btp-next" data-act="btp-save" ${P.saving ? "disabled" : ""}>${P.saving ? t("保存中…") : (nap() ? t("记下这次 ✓") : t("记下今晚 ✓"))}</button></div>
  <div class="btp-tools">${P.song && !P.keepMusic ? `<button data-act="btp-extend">${t("再放 5 分钟")}</button>` : ""}<button data-act="btp-close">${t("不记录，关闭")}</button></div>`;
}

/* ---- 事件 ---- */
async function playAct(act, btn){
  if (!P) return;
  const d = btn.dataset;
  switch (act) {
    case "btp-next": await next(); break;
    case "btp-prev": await prev(); break;
    case "btp-exit": if ((P.i === 0 && secs() < 60) || confirm(t("提前结束，去记录这一晚？"))) goFinish(); break;
    case "btp-play": if (P.audio) { if (P.audio.paused) { try { await P.audio.play(); P.blocked = false; } catch (e) { toast(e.message); } } else P.audio.pause(); draw(); } else if (P.song) await playSong(P.song); break;
    case "btp-swap": { const st = step(); P.offset[st.id] = (P.offset[st.id] || 0) + 1; await playSong(P.api.songFor(st, P.offset[st.id])); break; }
    case "btp-lyrics": P.lyricsOn = !P.lyricsOn; draw(); break;
    case "btp-text": P.textOn = !P.textOn; draw(); break;
    case "btp-cases": P.casesOn = !P.casesOn; draw(); break;
    case "btp-ev-open": P.ev = { sit: d.sit, kids: new Set(P.api.kids.length === 1 ? [P.api.kids[0].id] : []), outcome: "calm", minutes: null, note: "", saving: false }; draw(); break;
    case "btp-ev-cancel": P.ev = null; draw(); break;
    case "btp-ev-kid": if (P.ev) { P.ev.kids.has(d.id) ? P.ev.kids.delete(d.id) : P.ev.kids.add(d.id); readEv(); draw(); } break;
    case "btp-ev-out": if (P.ev) { P.ev.outcome = d.v; readEv(); draw(); } break;
    case "btp-ev-min": if (P.ev) { P.ev.minutes = P.ev.minutes === +d.v ? null : +d.v; readEv(); draw(); } break;
    case "btp-ev-save": { if (!P.ev) break; readEv(); P.ev.saving = true; draw();
      try { await P.api.saveEvent({ situation: P.ev.sit, title: "", date: dayKey(P.startedAt), children: [...P.ev.kids], approach: P.ev.note, minutes: P.ev.minutes, outcome: P.ev.outcome, keep: false, note: "" }); P.ev = null; toast(t("记下了")); } catch (e) { P.ev.saving = false; }
      draw(); break; }
    case "btp-read-prev": P.readIdx = (P.readIdx - 1 + P.api.readings.length) % P.api.readings.length; draw(); break;
    case "btp-read-next": P.readIdx = (P.readIdx + 1) % P.api.readings.length; draw(); break;
    case "btp-kid": P.kids.has(d.id) ? P.kids.delete(d.id) : P.kids.add(d.id); readNote(); draw(); break;
    case "btp-led": P.led = d.v; readNote(); draw(); break;
    case "btp-cs": P.childSt = P.childSt === d.v ? "" : d.v; readNote(); draw(); break;
    case "btp-ps": P.parentSt = P.parentSt === d.v ? "" : d.v; readNote(); draw(); break;
    case "btp-extend": { // 回到最后一步，音乐再放 5 分钟
      readNote(); P.done = false; P.keepMusic = false; const i = P.steps.length - 1; P.i = i; P.stepStart = now(); P.ext = 300; P.flagged = false; P.fading = false; draw();
      if (P.audio) { P.audio.volume = P.volume == null ? 0.6 : P.volume; P.audio.play().catch(() => {}); } else await playSong(P.song); break; }
    case "btp-save": { readNote(); P.saving = true; draw();
      const r = P.api.readings[P.readIdx] || {}, log = { date: dayKey(P.startedAt), started_at: new Date(P.startedAt).toISOString(), ended_at: new Date(P.endedAt).toISOString(),
        planned_min: P.steps.reduce((a, s) => a + (+s.minutes || 0), 0), actual_min: Math.max(1, Math.round((P.endedAt - P.startedAt) / 60000)), children: [...P.kids], led_by: P.led || "",
        version: P.text.name, passage: r.ref || "", child_state: P.childSt, parent_state: P.parentSt, songs: [...P.played], steps: P.steps.map((s, i) => ({ name: s.name, planned: +s.minutes || 0, actual: P.actual[i] == null ? null : Math.round(P.actual[i]), flow: P.flow.name, kind: P.flow.kind })), note: P.note };
      try { await P.api.saveLog(log); closePlayer(); toast(nap() ? t("记下了。午安。") : t("记下了。晚安。")); render(); } catch (e) { P.saving = false; draw(); }
      break; }
    case "btp-close": closePlayer(); render(); break;
  }
}
function readNote(){ const el = $("#btpNote"); if (el) P.note = el.value.trim(); }
function readEv(){ const el = $("#btpEvNote"); if (el && P.ev) P.ev.note = el.value.trim(); }
function playChange(ev){
  if (!P) return false;
  if (ev.target && ev.target.id === "btpVol") { P.volume = +ev.target.value; if (P.audio) P.audio.volume = P.volume; return true; }
  if (ev.target && ev.target.id === "btpNote") { P.note = ev.target.value.trim(); return true; }
  if (ev.target && ev.target.id === "btpEvNote") { if (P.ev) P.ev.note = ev.target.value.trim(); return true; }
  return false;
}

export { openPlayer, closePlayer, playAct, playChange, playerOpen };
