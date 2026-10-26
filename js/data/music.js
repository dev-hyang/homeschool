/* ============ 冲突 / 情绪话题的推荐歌曲 ============
   按情况推荐是哪一类：经文类（神的话语，word）、被爱与安慰类（loved）、舒缓的纯音乐 BGM（rest）。
   不内置音频；ideas 是可以去找的歌或主题（没把握的不写具体曲名，只写「以某某经文为词的诗歌」）。
   页面上每张卡会列出：歌单里已加到这个话题的歌（在歌单里左滑「加到流程」，或卡上「从歌单加」）+ 歌单里带有推荐类别标签的歌（最多三首）。
   原则：事发当时（冲突里）优先舒缓、不说教的音乐帮助冷静；经文歌、被爱的歌放在平时和修复关系的时候。 */
const REC = {
  "cf-fear": { tags: ["word", "rest"], why: "害怕时，先用经文歌把神的话放进心里（「神与你同在」），再用舒缓的纯音乐帮身体慢下来。", ideas: ["The Lord Is My Shepherd 耶和华是我的牧者（诗 23）", "Be Still and Know 你们要安静（诗 46:10）"] },
  "cf-shy": { tags: ["loved"], why: "选「被爱、被接纳」的歌，让孩子知道不用表现也被爱；出门前在家听一听、一起唱，增加熟悉感和勇气。", ideas: ["Jesus Loves Me 耶稣爱我", "My Beloved Child（Sarah Kroger）"] },
  "cf-share": { tags: ["loved"], why: "平时一起唱关于爱与同在的儿童诗歌，比事发当时说教更能浸润价值。", ideas: ["Jesus Loves the Little Children 耶稣爱小孩", "以「爱是恒久忍耐」（林前 13）为词的儿童诗歌"] },
  "cf-grab": { tags: ["rest"], why: "事发当时先放舒缓的纯音乐帮助双方冷静，再谈规则；不要在冲突里放有歌词的诗歌，孩子会觉得被说教。", ideas: ["钢琴 / 竖琴纯音乐敬拜"] },
  "cf-hit": { tags: ["rest", "loved"], why: "先用舒缓的纯音乐让情绪降下来（冷静阶段）；修复关系时再一起唱一首「被爱」的歌。", ideas: ["钢琴 / 竖琴纯音乐敬拜", "Jesus Loves Me 耶稣爱我"] },
  "cf-bite": { tags: ["rest"], why: "事发当时不放歌，处理完再用舒缓的纯音乐陪着安静下来。", ideas: ["钢琴 / 竖琴纯音乐敬拜"] },
  "cf-tantrum": { tags: ["rest"], why: "情绪高峰时不放歌；等风暴稍过，放音量很低的舒缓纯音乐陪伴，不要求他停下。", ideas: ["钢琴 / 竖琴纯音乐敬拜"] },
  "cf-defy": { tags: ["word"], why: "平时一起唱箴言、歌罗西书的经文歌，把神的话放进日常，比当场争论更有力量。", ideas: ["以弗 6:1-4、西 3:20 谱成的儿童诗歌", "Hidden in My Heart 经文歌系列"] },
  "cf-exclude": { tags: ["loved", "word"], why: "选关于接纳、友爱的歌（弗 4:32、约 13:34），和孩子一起唱，再谈怎么对待朋友。", ideas: ["Jesus Loves the Little Children 耶稣爱小孩", "以弗所书 4:32 的经文歌"] },
  "em-jealous": { tags: ["loved"], why: "被爱的歌让孩子确认自己在爸爸妈妈和神心里的位置；每个孩子可以各选一首「我的歌」。", ideas: ["My Beloved Child（Sarah Kroger）", "Jesus Loves Me 耶稣爱我"] },
  "em-anxious": { tags: ["word", "rest"], why: "担心时：用经文歌（腓 4:6-7、诗 4:8）帮孩子把担心交给神；睡前配合慢呼吸，放舒缓的纯音乐。", ideas: ["Peaceful Lullaby（诗篇 4:8）", "Be Still and Know", "The Peace of God"] },
  "em-school": { tags: ["rest"], why: "学习或功课时放没有歌词的轻音乐帮助专注（音量低，不抢注意力）；学习前后唱一首经文歌，提醒为谁而学（西 3:23）。", ideas: ["钢琴 / 轻音乐（无歌词）", "歌罗西书 3:23 的经文歌"] },
  "em-screen": { tags: ["loved"], why: "用一段全家一起听、一起唱的诗歌时间代替屏幕：做饭时、饭后、睡前。音乐比画面更不抢注意力。", ideas: ["全家喜欢的儿童敬拜诗歌", "固定的睡前歌单"] },
  "em-addict": { tags: ["word"], why: "选「自由与节制」主题的经文歌（林前 6:12），陪他一起听，不当作惩罚，把「不受辖制」放在心里。", ideas: ["哥林多前书 6:12 的经文歌", "It Is Well with My Soul 我心灵得安宁"] },
  "em-news": { tags: ["word", "rest"], why: "有坏消息的日子：先一起听一首「神掌权」的歌（诗 46），再用舒缓的纯音乐一起安静祷告。", ideas: ["以诗篇 46 为词的诗歌", "It Is Well with My Soul 我心灵得安宁"] },
  "em-puberty-f": { tags: ["word", "loved"], why: "诗篇 139:14「我受造，奇妙可畏」相关的歌，帮她把身体的变化和神的创造连起来；爸爸妈妈可以一起放给她听。", ideas: ["以诗篇 139 为词的诗歌", "My Beloved Child（Sarah Kroger）"] },
  "em-puberty-m": { tags: ["word"], why: "箴言 4:23、诗篇 139 主题的歌，爸爸陪他一起听，再聊聊歌词的意思。", ideas: ["以箴言 4:23 为词的诗歌", "以诗篇 139 为词的诗歌"] }
};
const DEFAULT_REC = { tags: ["rest"], why: "先用舒缓的音乐帮助身体和情绪平静下来，再谈事情。", ideas: ["钢琴 / 竖琴纯音乐敬拜"] };
const recOf = id => REC[id] || DEFAULT_REC;

export { recOf };
