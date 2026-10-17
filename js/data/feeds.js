/* ============ 每日新鲜点子：直接读博客的 WordPress 公开接口 ============
   这些站都开着 WordPress REST API（/wp-json/wp/v2/posts），并对任何来源返回 Access-Control-Allow-Origin，
   所以和 getBible 一样，浏览器直接取，不经过中间服务器，也不需要密钥。每条点子都链接到原文。 */
const FEEDS = [
  { id: "kab", name: "Kids Activities Blog", host: "kidsactivitiesblog.com", lang: "en", cats: ["craft", "outdoor", "chore"] },
  { id: "hoawg", name: "Hands On As We Grow", host: "handsonaswegrow.com", lang: "en", cats: ["craft", "outdoor", "chore"] },
  { id: "ap", name: "The Artful Parent", host: "artfulparent.com", lang: "en", cats: ["craft"] },
  { id: "pkp", name: "Pre-K Pages", host: "www.pre-kpages.com", lang: "en", cats: ["craft", "outdoor", "chore"] },
  { id: "ptr", name: "Play Teach Repeat", host: "www.playteachrepeat.com", lang: "en", cats: ["craft", "outdoor"] },
  // 中文：基督徒在家教育与亲子事工。站少、词宽，所以每个站自带一组搜索词（q），没有的用 QUERIES.zh
  { id: "tr", name: "吹號者 Trumpeter", host: "trumpeter.blog", lang: "zh", cats: ["craft", "outdoor", "chore"], q: { craft: ["手工", "復活節", "聖誕"], outdoor: ["戶外", "大自然", "營"], chore: ["家務", "親子", "家庭"] } },
  { id: "hic", name: "在基督裡自學 Homeschooling in Christ", host: "homeschoolinginchrist.net", api: "wpcom", lang: "zh", cats: ["craft", "outdoor", "chore"], q: { craft: ["手作", "聖誕", "資源", "英文"], outdoor: ["大自然", "地理", "植物", "天文"], chore: ["家事", "家庭文化", "生活", "品格"] } },
  { id: "oc", name: "舉目 Behold（海外校園）", host: "behold.oc.org", lang: "zh", cats: ["craft", "outdoor", "chore"], q: { craft: ["親子", "孩子 閱讀", "兒童"], outdoor: ["孩子 冒險", "大自然", "旅行 孩子"], chore: ["教養", "父母", "家庭"] } }
  // 2026-10 核对过但没收：Happy Hooligans、The Imagination Tree、How Wee Learn、Fun-A-Day、No Time for Flashcards 的接口把跨域头发了两份，浏览器会拒绝；
  // Busy Toddler 的接口要登录；1000 Hours Outside、Wild + Free 不是 WordPress；eddyemma.com 超时；愛家 family.org.tw、彩虹愛家 关掉了 REST；靈命日糧 traditional-odb.org 能读但是灵修不是活动。
];
// 搜索词按类别和年龄段；中文站的词在各自的 q 里，这里是兜底
const QUERIES = {
  en: {
    craft: { b2: ["toddler craft", "toddler art", "process art toddlers"], b4: ["preschool craft", "preschool art", "paper plate craft"], b6: ["kids craft", "art project kids", "sewing kids"] },
    outdoor: { b2: ["toddler outdoor", "nature toddlers", "sensory outdoor"], b4: ["preschool outdoor", "nature activity preschool", "backyard"], b6: ["outdoor kids", "nature study", "scavenger hunt"] },
    chore: { b2: ["toddler chores", "toddler help kitchen", "practical life"], b4: ["preschool chores", "chore chart", "kids cooking"], b6: ["chores kids", "chore chart", "life skills kids"] }
  },
  zh: { craft: ["手工", "親子"], outdoor: ["戶外", "大自然"], chore: ["家務", "教養"] }
};
// 站点接口地址：自架 WordPress 用 /wp-json；WordPress.com 托管的要走 public-api.wordpress.com（它的 CORS 也开放）
const postsUrl = (feed, params) => feed.api === "wpcom" ? `https://public-api.wordpress.com/wp/v2/sites/${feed.host}/posts?${params}` : `https://${feed.host}/wp-json/wp/v2/posts?${params}`;

const dec = (() => { const ta = document.createElement("textarea"); return s => { ta.innerHTML = String(s || ""); return ta.value; }; })();
const strip = s => dec(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").replace(/\[…\]|\[&hellip;\]|…\s*$/g, "").trim();

async function fetchFeed(feed, q, page = 1){
  const u = postsUrl(feed, `per_page=12&page=${page}&search=${encodeURIComponent(q)}&_fields=id,title,link,excerpt,date`);
  let r = await fetch(u);
  if (r.status === 400 && page > 1) r = await fetch(u.replace(`&page=${page}&`, "&page=1&")); // 页码超出就回第一页
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
  const feeds = shuffle(FEEDS.filter(f => f.lang === lang && f.cats.includes(cat)), h).slice(0, 2);
  const errors = [];
  const results = await Promise.all(feeds.map(async (f, i) => {
    const qs = (f.q && f.q[cat]) || (lang === "zh" ? QUERIES.zh[cat] : QUERIES.en[cat][band] || QUERIES.en[cat].b4);
    const q = qs[(h + i) % qs.length], page = 1 + ((h >>> (4 * (i + 1))) % (lang === "zh" ? 2 : 6)); // >>> 保证非负，否则会算出 page=0；中文站帖子少，最多翻到第 2 页
    try { return await fetchFeed(f, q, page); } catch (e) { errors.push(e.message); return []; }
  }));
  const seen = new Set(), items = [];
  for (const it of shuffle(results.flat(), h ^ 0x9e3779b9)) { if (seen.has(it.url)) continue; seen.add(it.url); items.push(it); if (items.length >= 6) break; }
  return { items, errors, feeds: feeds.map(f => f.name) };
}

export { FEEDS, QUERIES, fetchFeed, dailyPicks };
