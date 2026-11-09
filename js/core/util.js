/* ============ helpers（与小月亮 js/util.js 一致） ============ */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const H = 3600e3, D = 86400e3;
const pad = n => String(n).padStart(2, "0");
const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
function weekday(ts){ return "周" + "日一二三四五六"[new Date(ts).getDay()]; }
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("on"), 2400); }
const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch (e) { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

/* ============ 重画时保住正在填的内容（11-09） ============
   后台的重画（实时同步、定时刷新、拉完数据、音频事件……）会用 innerHTML 把整块换掉，表单按已保存的数据重新生成，
   刚打的字就没了。keepFields(host, paint)：换之前记下 host 里每个“改过还没保存”的输入框（value ≠ defaultValue、
   checked ≠ defaultChecked、下拉框选的不是默认项）和焦点、光标位置，paint() 画完再填回去。
   只在“底稿没变”时填回：新画出来的框默认值和原来一样 = 这次重画与这个框无关；默认值变了（比如点了一个预设问题、
   刚保存过）就以新画的为准，所以用户点按钮引起的重画照旧。文件框没法填回，range（进度条、音量）不算表单，不管。 */
const FIELD_SEL = "input, textarea, select";
function fieldKey(el, i){
  if (el.id) return "#" + el.id;
  const f = el.form && el.form.id ? el.form.id : "";
  if (el.name) return `${f}|n:${el.name}|${el.type === "checkbox" || el.type === "radio" ? el.value : ""}`;
  const da = [...el.attributes].find(a => a.name.startsWith("data-"));
  if (da) return `${f}|${da.name}=${da.value}`;
  return `${el.tagName}|i:${i}`;   // 实在没有标识：按出现顺序
}
function fieldState(el){
  if (el.type === "checkbox" || el.type === "radio") return { base: String(el.defaultChecked), cur: el.checked, dirty: el.checked !== el.defaultChecked };
  if (el.tagName === "SELECT") { const o = [...el.options]; return { base: o.map(x => `${x.value}:${x.defaultSelected ? 1 : 0}`).join("|"), cur: o.map(x => x.selected), dirty: o.some(x => x.selected !== x.defaultSelected) && !(o.every(x => !x.defaultSelected) && el.selectedIndex === 0) }; }
  return { base: el.defaultValue, cur: el.value, dirty: el.value !== el.defaultValue };
}
function keepFields(host, paint, { scroll = false } = {}){
  if (!host) { paint(); return; }
  const y = window.scrollY, act = document.activeElement, saved = new Map();
  let focus = null;
  host.querySelectorAll(FIELD_SEL).forEach((el, i) => {
    if (el.type === "file" || el.type === "range" || el.type === "hidden") return;
    const k = fieldKey(el, i), st = fieldState(el), isAct = el === act;
    if (isAct) { focus = { k, a: null, b: null, top: el.scrollTop }; try { focus.a = el.selectionStart; focus.b = el.selectionEnd; } catch (e) {} }
    if (st.dirty && !saved.has(k)) saved.set(k, { ...st, type: el.type });
  });
  paint();
  if (!saved.size && !focus) return;
  const now = new Map();
  host.querySelectorAll(FIELD_SEL).forEach((el, i) => { const k = fieldKey(el, i); if (!now.has(k)) now.set(k, el); });
  for (const [k, v] of saved) {
    const el = now.get(k); if (!el || el.type !== v.type) continue;
    const st = fieldState(el); if (st.base !== v.base) continue;   // 底稿变了：以新画的为准
    if (el.type === "checkbox" || el.type === "radio") el.checked = v.cur;
    else if (el.tagName === "SELECT") [...el.options].forEach((o, j) => { if (j < v.cur.length) o.selected = v.cur[j]; });
    else el.value = v.cur;
  }
  // 焦点原来在这块里的输入框上，而 paint() 没把焦点挪到别处：放回同一个框、同一个光标位置
  const cur = document.activeElement;
  if (focus && (!cur || cur === document.body || !document.contains(act)) && now.has(focus.k)) {
    const el = now.get(focus.k);
    try { el.focus({ preventScroll: true }); if (focus.a != null) el.setSelectionRange(focus.a, focus.b); } catch (e) {}
    el.scrollTop = focus.top;
  }
  if (scroll && window.scrollY !== y) window.scrollTo(0, y);
}

export { keepFields, $, esc, newId, H, D, pad, hm, dayKey, startOfDay, weekday, toast, loadJSON, saveJSON };
