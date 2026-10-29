/* ============ 歌单逻辑（纯函数，不碰界面和数据库；有测试 tests/music-lists.test.mjs） ============
   歌曲本身在 hs_bedtime_songs（见 bedtime.js），歌单只记「哪些歌的 id、什么顺序」，存在家庭设置 hs_family.settings.music 里，
   不需要新的数据库迁移：
     settings.music = {
       playlists:  [{ id, name, songs: [歌 id…] }],          // 自定义歌单：随时加歌 / 删歌 / 调顺序
       tilePick:   { 孩子 id: 歌单 id },                      // 今天页「音乐」格点开放哪个歌单
       routineList:{ 例行 id: 歌单 id | "none" }              // 周例行任务上「学歌」按钮用哪个歌单（没设 = 自动）
     }
   歌单 id 有三种：
     "all"       全部歌曲（默认）
     "tag:word"  默认歌单：按歌的标签（被爱与安慰 / 神的话语 / 放下与休息 / 轻柔唤醒）自动归类，歌单里加歌、改标签后自动更新
     "pl:<id>"   自定义歌单 */

const TAG_ORDER = ["word", "loved", "rest", "wake"];
const ALL = "all", TAG = "tag:", PL = "pl:";
const MAX_NAME = 30;

const byPos = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
const playable = list => list.filter(s => s && s.path);

/** 默认歌单（按标签）：空的不列出 */
function tagLists(songs, tagNames){
  return TAG_ORDER.filter(k => tagNames[k]).map(k => ({ id: TAG + k, kind: "tag", tag: k, name: tagNames[k], songs: [...songs].filter(s => (s.tags || []).includes(k)).sort(byPos) })).filter(l => l.songs.length);
}
/** 自定义歌单：歌已被删除的从里面自动去掉 */
function customLists(songs, custom){
  const by = new Map(songs.map(s => [s.id, s]));
  return (custom || []).map(p => ({ id: PL + p.id, kind: "custom", rawId: p.id, name: p.name, songs: (p.songs || []).map(id => by.get(id)).filter(Boolean) }));
}
/** 全部歌单：全部歌曲 → 默认（按标签）→ 自定义 */
function allLists(songs, custom, tagNames, allName = "全部歌曲"){
  return [{ id: ALL, kind: "all", name: allName, songs: [...songs].sort(byPos) }, ...tagLists(songs, tagNames), ...customLists(songs, custom)];
}
const findList = (lists, id) => lists.find(l => l.id === id) || null;
/** 引用的歌单还在就用它，已经被删 / 标签空了就退回「全部歌曲」 */
const validListId = (lists, id) => (findList(lists, id) ? id : ALL);

/* ---------- 自定义歌单：增删改（返回新数组，不改原来的） ---------- */
const cleanName = s => String(s || "").trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();
function createList(custom, name, id){
  const n = cleanName(name);
  if (!n) return { ok: false, error: "empty" };
  if ((custom || []).some(p => sameName(p.name, n))) return { ok: false, error: "dup" };
  return { ok: true, id, playlists: [...(custom || []), { id, name: n, songs: [] }] };
}
function renameList(custom, id, name){
  const n = cleanName(name);
  if (!n) return { ok: false, error: "empty" };
  if (custom.some(p => p.id !== id && sameName(p.name, n))) return { ok: false, error: "dup" };
  return { ok: true, playlists: custom.map(p => (p.id === id ? { ...p, name: n } : p)) };
}
const deleteList = (custom, id) => custom.filter(p => p.id !== id);
const patchList = (custom, id, fn) => custom.map(p => (p.id === id ? { ...p, songs: fn(p.songs || []) } : p));
/** 加歌：已经在里面的不重复加；新加的排在最后 */
const addSongs = (custom, id, songIds) => patchList(custom, id, a => [...a, ...songIds.filter((x, i) => !a.includes(x) && songIds.indexOf(x) === i)]);
const removeSong = (custom, id, songId) => patchList(custom, id, a => a.filter(x => x !== songId));
function moveSong(custom, id, songId, dir){
  return patchList(custom, id, a => { const i = a.indexOf(songId), j = i + dir; if (i < 0 || j < 0 || j >= a.length) return a; const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b; });
}
/** 歌单里有没有这首歌（给「加到歌单」选择页打勾用） */
const inList = (custom, id, songId) => !!(custom.find(p => p.id === id)?.songs || []).includes(songId);

/* ---------- 各处引用 ---------- */
const musicOf = settings => ({ playlists: [], tilePick: {}, routineList: {}, ...((settings || {}).music || {}) });
/** 今天页「音乐」格给这个孩子放哪个歌单 */
const tilePickOf = (music, childId, lists) => validListId(lists, (music.tilePick || {})[childId]);
const MUSIC_WORDS = /音乐|诗歌|赞美|敬拜|唱诗|歌/;
/** 周例行任务上的「学歌」按钮：明确选过歌单就用它（"none" = 不显示）；没选过，标题像音乐 / 敬拜的例行自动用这个孩子音乐格的歌单；其它不显示。返回歌单 id 或 "" */
function routineListOf(music, routine, childId, lists){
  if (!routine) return "";
  const pick = (music.routineList || {})[routine.id];
  if (pick === "none") return "";
  if (pick) return findList(lists, pick) ? pick : "";
  if (!MUSIC_WORDS.test(routine.title || "")) return "";
  const id = tilePickOf(music, childId, lists);
  return (findList(lists, id)?.songs || []).some(s => s.path) ? id : "";
}

/** 播放顺序里的下一首：loop = "list" 播完回到第一首，"one" 单曲循环，"off" 播完停；返回下标，-1 = 结束 */
function nextIndex(i, len, loop = "list"){
  if (!len) return -1;
  if (loop === "one") return i;
  return i + 1 < len ? i + 1 : loop === "list" ? 0 : -1;
}
const prevIndex = (i, len) => (len ? (i - 1 + len) % len : -1);

export { TAG_ORDER, ALL, TAG, PL, MAX_NAME, playable, tagLists, customLists, allLists, findList, validListId, cleanName, createList, renameList, deleteList, addSongs, removeSong, moveSong, inList, musicOf, tilePickOf, routineListOf, nextIndex, prevIndex };
