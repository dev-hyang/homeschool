/* ============ 成长页签的分层：第 1 层是成长首页（三大块，每块几行入口），第 2 层是每个主题一页，第 3 层是一条记录（点开改 / 删） ============
   这里只放纯数据（不 import 任何东西）：views.js 用它注册页面和面包屑，growth.js / growth-body.js 用它画页面。
   每个主题页都是同一个版式：时间范围 → 记一笔 → 指标卡 → 走势图 → 记录列表（身体与健康几页按各自的内容，但结构一样）。
   metrics = growth.js 里 METRICS 的键；types = 记一笔格子的 id（behavior = 小月亮 / 冲突管理记的情绪行为）；add = 这一页能直接记的格子。 */
const SECTIONS = [
  { id: "body", icon: "🩺", label: "身体与健康", desc: "身高体重、体检、疫苗、化验、病史" },
  { id: "mind", icon: "🌱", label: "习惯与情绪", desc: "睡眠、吃饭、户外与屏幕、情绪、陪伴" },
  { id: "learn", icon: "📚", label: "学习与培训", desc: "如厕和夜间训练、阅读与语言、课外班、课程和经文" }
];
const TOPICS = {
  "gr-size":    { sec: "body", icon: "📏", label: "身高体重" },
  "gr-visits":  { sec: "body", icon: "🩺", label: "体检与就诊" },
  "gr-vax":     { sec: "body", icon: "💉", label: "疫苗" },
  "gr-labs":    { sec: "body", icon: "🧪", label: "化验" },
  "gr-history": { sec: "body", icon: "📋", label: "病史 / 过敏 / 用药" },
  sleep:        { sec: "mind", icon: "🌙", label: "睡眠", external: true },   // 原来的睡眠页（js/sleep.js），面包屑同样回到成长
  "gr-meals":   { sec: "mind", icon: "🍚", label: "吃饭", metrics: ["meals", "mealMin"], types: ["meal"], add: ["meal"] },
  "gr-play":    { sec: "mind", icon: "🌳", label: "户外与屏幕", metrics: ["outdoor", "screen", "music"], types: ["outdoor", "screen", "music"], add: ["outdoor", "screen", "music"] },
  "gr-mood":    { sec: "mind", icon: "🌤", label: "情绪", metrics: ["mood", "tantrum"], types: ["mood", "behavior"], add: ["mood"] },
  "gr-social":  { sec: "mind", icon: "🤗", label: "陪伴与社交", metrics: ["companion", "social"], types: ["companion", "social"], add: ["companion", "social"] },
  "gr-potty":   { sec: "learn", icon: "🚽", label: "如厕训练", metrics: ["potty", "accident"], types: ["potty"], add: ["potty"], ages: [18, 84] },
  "gr-night":   { sec: "learn", icon: "🩲", label: "夜间干爽", metrics: ["dry"], types: ["night"], add: ["night"], ages: [24, 96] },
  "gr-read":    { sec: "learn", icon: "📖", label: "阅读与语言", metrics: ["read", "words"], types: ["read", "speech"], add: ["read", "speech"] },
  "gr-class":   { sec: "learn", icon: "🎹", label: "课外班", metrics: ["class"], types: ["class"], add: ["class"] }
};
/** 成长首页「学习与培训」里另外两行：直接去已有的页面 */
const LINKS = { learn: [{ id: "course", icon: "📘", label: "课程进度", attr: 'data-tab="course"' }, { id: "scr", icon: "📜", label: "经文背诵", attr: 'data-act="scriptures" data-from="growth"' }] };
const TOPIC_IDS = Object.keys(TOPICS).filter(k => !TOPICS[k].external);

export { SECTIONS, TOPICS, LINKS, TOPIC_IDS };
