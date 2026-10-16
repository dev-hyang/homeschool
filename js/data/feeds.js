/* ============ 每日新鲜点子：直接读博客的 WordPress 公开接口 ============
   这些站都开着 WordPress REST API（/wp-json/wp/v2/posts），并对任何来源返回 Access-Control-Allow-Origin，
   所以和 getBible 一样，浏览器直接取，不经过中间服务器，也不需要密钥。每条点子都链接到原文。 */
const FEEDS = [
  { id: "kab", name: "Kids Activities Blog", host: "kidsactivitiesblog.com", lang: "en", cats: ["craft", "outdoor", "chore"] },
  { id: "hoawg", name: "Hands On As We Grow", host: "handsonaswegrow.com", lang: "en", cats: ["craft", "outdoor", "chore"] },
  { id: "ap", name: "The Artful Parent", host: "artfulparent.com", lang: "en", cats: ["craft"] },
  { id: "pkp", name: "Pre-K Pages", host: "www.pre-kpages.com", lang: "en", cats: ["craft", "outdoor", "chore"] },
  { id: "ptr", name: "Play Teach Repeat", host: "www.playteachrepeat.com", lang: "en", cats: ["craft", "outdoor"] },
  { id: "tr", name: "吹號者 Trumpeter", host: "trumpeter.blog", lang: "zh", cats: ["craft", "outdoor", "chore"] }
  // 2026-10 核对过但没收：Happy Hooligans、The Imagination Tree、How Wee Learn、Fun-A-Day、No Time for Flashcards 的接口把跨域头发了两份，浏览器会拒绝；
  // Busy Toddler 的接口要登录；1000 Hours Outside、Wild + Free 不是 WordPress。
];
// 搜索词按类别和年龄段；中文站只有一个，词更宽
const QUERIES = {
  en: {
    craft: { b2: ["toddler craft", "toddler art", "process art toddlers"], b4: ["preschool craft", "preschool art", "paper plate craft"], b6: ["kids craft", "art project kids", "sewing kids"] },
    outdoor: { b2: ["toddler outdoor", "nature toddlers", "sensory outdoor"], b4: ["preschool outdoor", "nature activity preschool", "backyard"], b6: ["outdoor kids", "nature study", "scavenger hunt"] },
    chore: { b2: ["toddler chores", "toddler help kitchen", "practical life"], b4: ["preschool chores", "chore chart", "kids cooking"], b6: ["chores kids", "chore chart", "life skills kids"] }
  },
  zh: { craft: ["手工", "復活節"], outdoor: ["戶外", "大自然"], chore: ["家務", "親子"] }
};

const dec = (() => { const ta = document.createElement("textarea"); return s => { ta.innerHTML = String(s || ""); return ta.value; }; })();
const strip = s => dec(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").replace(/\[…\]|\[&hellip;\]|…\s*$/g, "").trim();

async function fetchFeed(feed, q, page = 1){
  const u = `https://${feed.host}/wp-json/wp/v2/posts?per_page=12&page=${page}&search=${encodeURIComponent(q)}&_fields=id,title,link,excerpt,date`;
  let r = await fetch(u);
  if (r.status === 400 && page > 1) r = await fetch(u.replace(`page=${page}`, "page=1")); // 页码超出就回第一页
  if (!r.ok) throw new Error(`${feed.name} ${r.status}`);
  const j = await r.json();
  return (Array.isArray(j) ? j : []).map(p => ({ title: strip(p.title && p.title.rendered), url: p.link, excerpt: strip(p.excerpt && p.excerpt.rendered).slice(0, 140), source: feed.name, host: feed.host, date: (p.date || "").slice(0, 10) }))
    .filter(x => x.title && x.url);
}

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
function shuffle(arr, h){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* 今天这一组：按日期 + seed 决定用哪两个站、哪个词、哪一页；同一天同一 seed 结果固定，“换一批”才变。
   返回 { items, errors }。items 最多 6 条。 */
async function dailyPicks({ band, cat, lang = "en", seed = 0, day = new Date().toISOString().slice(0, 10) }){
  const key = `${day}|${band}|${cat}|${lang}|${seed}`, h = hash(key);
  const feeds = shuffle(FEEDS.filter(f => f.lang === lang && f.cats.includes(cat)), h).slice(0, lang === "zh" ? 1 : 2);
  const qs = lang === "zh" ? QUERIES.zh[cat] : QUERIES.en[cat][band] || QUERIES.en[cat].b4;
  const errors = [];
  const results = await Promise.all(feeds.map(async (f, i) => {
    const q = qs[(h + i) % qs.length], page = 1 + ((h >>> (4 * (i + 1))) % (lang === "zh" ? 1 : 6)); // >>> 保证非负，否则会算出 page=0
    try { return await fetchFeed(f, q, page); } catch (e) { errors.push(e.message); return []; }
  }));
  const seen = new Set(), items = [];
  for (const it of shuffle(results.flat(), h ^ 0x9e3779b9)) { if (seen.has(it.url)) continue; seen.add(it.url); items.push(it); if (items.length >= 6) break; }
  return { items, errors, feeds: feeds.map(f => f.name) };
}

export { FEEDS, QUERIES, fetchFeed, dailyPicks };
