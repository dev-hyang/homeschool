/* ============ 起步数据：经文卡与周例行模板 ============
   都是"按一下导入"的种子，不会自动写入；导入后属于家庭，随意增删。
   中文为和合本（公有领域）；英文为 ESV（短句引用，注明出处）。要理问答为新城要理问答儿童版简答，中文为参考译文，
   官方简体中文版见 newcitycatechism.com/translations/chinese-simplified.html。 */
const SEED_SCRIPTURES = [
  { kind: "verse", ref: "创世记 1:1", zh: "起初，神创造天地。", en: "In the beginning, God created the heavens and the earth." },
  { kind: "verse", ref: "诗篇 23:1", zh: "耶和华是我的牧者，我必不致缺乏。", en: "The Lord is my shepherd; I shall not want." },
  { kind: "verse", ref: "诗篇 56:3", zh: "我惧怕的时候要倚靠你。", en: "When I am afraid, I put my trust in you." },
  { kind: "verse", ref: "诗篇 119:105", zh: "你的话是我脚前的灯，是我路上的光。", en: "Your word is a lamp to my feet and a light to my path." },
  { kind: "verse", ref: "诗篇 139:14", zh: "我要称谢你，因我受造奇妙可畏。", en: "I praise you, for I am fearfully and wonderfully made." },
  { kind: "verse", ref: "箴言 3:5", zh: "你要专心仰赖耶和华，不可倚靠自己的聪明。", en: "Trust in the Lord with all your heart, and do not lean on your own understanding." },
  { kind: "verse", ref: "马太福音 22:37", zh: "你要尽心、尽性、尽意爱主你的神。", en: "You shall love the Lord your God with all your heart and with all your soul and with all your mind." },
  { kind: "verse", ref: "马太福音 22:39", zh: "要爱人如己。", en: "You shall love your neighbor as yourself." },
  { kind: "verse", ref: "马可福音 10:14", zh: "让小孩子到我这里来，不要禁止他们。", en: "Let the children come to me; do not hinder them." },
  { kind: "verse", ref: "约翰福音 3:16", zh: "神爱世人，甚至将他的独生子赐给他们，叫一切信他的，不致灭亡，反得永生。", en: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life." },
  { kind: "verse", ref: "约翰福音 14:6", zh: "我就是道路、真理、生命。", en: "I am the way, and the truth, and the life." },
  { kind: "verse", ref: "罗马书 3:23", zh: "世人都犯了罪，亏缺了神的荣耀。", en: "For all have sinned and fall short of the glory of God." },
  { kind: "verse", ref: "加拉太书 5:22-23", zh: "圣灵所结的果子，就是仁爱、喜乐、和平、忍耐、恩慈、良善、信实、温柔、节制。", en: "The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control." },
  { kind: "verse", ref: "以弗所书 4:32", zh: "并要以恩慈相待，存怜悯的心，彼此饶恕。", en: "Be kind to one another, tenderhearted, forgiving one another." },
  { kind: "verse", ref: "以弗所书 6:1", zh: "你们作儿女的，要在主里听从父母，这是理所当然的。", en: "Children, obey your parents in the Lord, for this is right." },
  { kind: "verse", ref: "腓立比书 4:13", zh: "我靠着那加给我力量的，凡事都能做。", en: "I can do all things through him who strengthens me." },
  { kind: "verse", ref: "歌罗西书 3:20", zh: "你们作儿女的，要凡事听从父母，因为这是主所喜悦的。", en: "Children, obey your parents in everything, for this pleases the Lord." },
  { kind: "verse", ref: "帖撒罗尼迦前书 5:16-18", zh: "要常常喜乐，不住地祷告，凡事谢恩。", en: "Rejoice always, pray without ceasing, give thanks in all circumstances." },
  { kind: "verse", ref: "约翰一书 4:19", zh: "我们爱，因为神先爱我们。", en: "We love because he first loved us." },
  { kind: "verse", ref: "约书亚记 1:9", zh: "你当刚强壮胆！不要惧怕，也不要惊惶，因为你无论往哪里去，耶和华你的神必与你同在。", en: "Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go." },
  { kind: "catechism", ref: "新城要理问答 问 1", zh: "问：我们在生与死中唯一的盼望是什么？答：我们不属于自己，乃是属于神。", en: "Q: What is our only hope in life and death? A: That we are not our own but belong to God.", source: "New City Catechism（儿童版简答；中文为参考译文）" },
  { kind: "catechism", ref: "新城要理问答 问 2", zh: "问：神是谁？答：神是万有的创造者和维系者。", en: "Q: What is God? A: God is the creator of everyone and everything.", source: "New City Catechism（儿童版简答；中文为参考译文）" },
  { kind: "catechism", ref: "新城要理问答 问 3", zh: "问：神有几个位格？答：三个位格，一位神：圣父、圣子、圣灵。", en: "Q: How many persons are there in God? A: There are three persons in one God: the Father, the Son, and the Holy Spirit.", source: "New City Catechism（儿童版简答；中文为参考译文）" }
].map((s, i) => ({ ...s, sort: i, source: s.source || "和合本 / ESV" }));

/* 周例行模板：套用到一个孩子。family=true 的行是全家项，child_id 为空。 */
const ROUTINE_TEMPLATES = {
  toddler: { name: "2–3 岁 · 节奏", rows: [
    { title: "家庭敬拜：一首诗歌、一个故事、一句经文、一个祷告", subject: "bible", weekdays: [1, 2, 3, 4, 5, 6], start: "09:00", minutes: 15, family: true },
    { title: "绘本共读：中文一本、英文一本", subject: "language", weekdays: [1, 2, 3, 4, 5], start: "09:30", minutes: 20 },
    { title: "户外", subject: "science", weekdays: [1, 2, 3, 4, 5], start: "10:00", minutes: 60 },
    { title: "家务一件", subject: "life", weekdays: [1, 2, 3, 4, 5], start: "11:30", minutes: 10 },
    { title: "感官 / 精细动作游戏", subject: "arts", weekdays: [1, 3, 5], start: "15:00", minutes: 20 }
  ] },
  prek: { name: "3–5 岁 · Pre-K 周例行", rows: [
    { title: "敬拜与背诵：读经、诗歌、经文", subject: "bible", weekdays: [1, 2, 3, 4, 5], start: "09:00", minutes: 15, family: true },
    { title: "英文拼读", subject: "language", weekdays: [1, 2, 3, 4, 5], start: "09:15", minutes: 15 },
    { title: "中文识字", subject: "language", weekdays: [1, 2, 3, 4, 5], start: "09:30", minutes: 15 },
    { title: "数学", subject: "math", weekdays: [1, 2, 3, 4, 5], start: "09:45", minutes: 15 },
    { title: "历史：圣经故事与家族故事", subject: "history", weekdays: [1], start: "10:00", minutes: 25 },
    { title: "科学：自然观察", subject: "science", weekdays: [2, 4], start: "10:00", minutes: 25 },
    { title: "艺术：名画或手工", subject: "arts", weekdays: [3], start: "10:00", minutes: 25 },
    { title: "音乐：本月赞美诗", subject: "arts", weekdays: [5], start: "10:00", minutes: 20 },
    { title: "品格与家务", subject: "life", weekdays: [1, 2, 3, 4, 5], start: "10:30", minutes: 5 }
  ] }
};

/* Pre-K 起步课程：每个领域一个单元、几节课时，每课时带一句信仰连接与经文。套用后随意改。 */
const COURSE_TEMPLATES = {
  prek: { name: "Pre-K 起步课程", units: [
    { subject: "bible", title: "从创造到挪亚（故事圣经 1–4）", lessons: [
      ["神创造天地", "万物都是神说有就有的，我也是", "创世记 1"], ["伊甸园里的亚当夏娃", "神把人放在美好的家里", "创世记 2"],
      ["人离开了神", "不听话带来分离，神却应许拯救", "创世记 3"], ["挪亚与方舟", "神守约，彩虹是记号", "创世记 6–9"] ] },
    { subject: "language", title: "英文：字母与音 A–F", lessons: [
      ["A a 和它的音", "A 是 Adam，神造的第一个人", "创世记 2:7"], ["B b 和它的音", "B 是 Bible，神的话", "诗篇 119:105"],
      ["C c 和它的音", "C 是 Creation", "创世记 1:1"], ["D d 和它的音", "D 是 David，牧羊的小孩", "撒母耳记上 16"],
      ["E e 和它的音", "E 是 Eden", "创世记 2:8"], ["F f 和它的音", "F 是 Faith", "希伯来书 11:1"] ] },
    { subject: "language", title: "中文识字：三字经远古篇 1–4 课", lessons: [
      ["第 1 课", "起初神造天地", "创世记 1:1"], ["第 2 课", "神造人，有神的形象", "创世记 1:27"], ["第 3 课", "人犯罪", "创世记 3"], ["第 4 课", "挪亚", "创世记 6"] ] },
    { subject: "math", title: "数到 10", lessons: [
      ["认识 1、2、3", "一位神，三个位格", "申命记 6:4"], ["认识 4、5、6", "创造的第四到第六天", "创世记 1:14-31"],
      ["认识 7 到 10", "第七天安息", "创世记 2:2-3"], ["比多少、比大小", "神看一切都甚好", "创世记 1:31"],
      ["圆形、三角形、方形", "神是有秩序的", "哥林多前书 14:33"], ["规律 ABAB", "季节昼夜有规律是神的应许", "创世记 8:22"] ] },
    { subject: "history", title: "我们家与圣经的时间线", lessons: [
      ["我们家的故事：爸爸妈妈从哪里来", "神把我们放在这个家", "诗篇 68:6"], ["时间线第一站：创造", "历史从神开始", "创世记 1"],
      ["亚伯拉罕的旅程（看地图）", "神呼召人出发", "创世记 12"], ["出埃及的路", "神带领他的百姓", "出埃及记 14"] ] },
    { subject: "science", title: "秋天的自然观察", lessons: [
      ["树叶为什么变色", "诸天述说神的荣耀", "诗篇 19:1"], ["捡种子、种种子", "一粒种子里有生命", "马可福音 4:30-32"],
      ["记录一周天气", "神掌管风雨", "马可福音 4:39"], ["月亮的样子", "神造两个大光", "创世记 1:16"] ] },
    { subject: "arts", title: "本月赞美诗与一幅画", lessons: [
      ["学唱本月诗歌", "用诗歌赞美神", "诗篇 100"], ["看一幅画：梵高《星夜》", "画家看见的天空", "诗篇 8:3"],
      ["手工：创造的六日转盘", "用手重述创造", "创世记 1"], ["用身体打节拍", "欢呼跳跃赞美", "诗篇 150"] ] },
    { subject: "life", title: "品格：听从与感恩", lessons: [
      ["听从爸爸妈妈", "", "以弗所书 6:1"], ["说谢谢：凡事谢恩", "", "帖撒罗尼迦前书 5:18"], ["收拾自己的玩具", "各按其时成为美好", "传道书 3:11"], ["分享一样东西给别人", "施比受更为有福", "使徒行传 20:35"] ] }
  ] }
};

/* 学前目标清单（起步建议，按孩子调整） */
const GOAL_TEMPLATES = {
  prek: { name: "Pre-K 目标", goals: [
    ["bible", "能背 20 节经文"], ["bible", "能用自己的话讲 10 个圣经故事"], ["arts", "会唱 10 首诗歌"],
    ["language", "认全英文字母及其音"], ["language", "认读约 200–300 个中文字"], ["language", "能自己翻书从头读到尾（看图讲）"],
    ["math", "能数到 20，再到 100"], ["math", "认识常见形状和简单规律"],
    ["science", "能描述四季和一周天气"], ["history", "能说出自己家族三代人的名字和来处"],
    ["life", "每天自己收拾玩具、穿脱衣服"], ["life", "会为别人祷告"] ] }
};

/* 资源库起步数据：设计方案里核对过的中英文资源 */
const SEED_RESOURCES = [
  { title: "吹号者 · 在家教育", url: "https://trumpeter.blog/homeschool/", type: "org", lang: "zh", source: "吹号者", tags: ["理念", "社群"], note: "华人基督徒在家教育的起步路径、讲座与 Telegram 群" },
  { title: "如何開始在家教育（吹号者）", url: "https://trumpeter.blog/2022/06/07/%e5%a6%82%e4%bd%95%e9%96%8b%e5%a7%8b%e5%9c%a8%e5%ae%b6%e6%95%99%e8%82%b2/", type: "link", lang: "zh", source: "吹号者", tags: ["理念"], note: "从全家一起敬拜神开始的六步" },
  { title: "在家教育常用教材和网站（吹号者）", url: "https://trumpeter.blog/2021/05/14/%e5%9c%a8%e5%ae%b6%e6%95%99%e8%82%b2%e5%b8%b8%e7%94%a8%e6%95%99%e6%9d%90%e5%92%8c%e7%bd%91%e7%ab%99/", type: "link", lang: "zh", source: "吹号者", tags: ["教材清单"], note: "2021 年整理的英文课程清单与选教材建议" },
  { title: "用中文教导圣经 TBIC《基督教新编三字经》", url: "https://tbic.cc/", type: "course", subject: "language", lang: "zh", age_min: 4, source: "TBIC", tags: ["识字", "圣经"], note: "三字韵文讲救恩史，边识字边学圣经，有家庭教育版" },
  { title: "新城要理问答 · 简体中文", url: "https://newcitycatechism.com/translations/chinese-simplified.html", type: "link", subject: "bible", lang: "bi", age_min: 4, source: "The Gospel Coalition", tags: ["要理问答"], note: "52 问官方简体译本；App 免费含儿童歌曲" },
  { title: "华人基督教教材推荐（含华恩儿童教理问答）", url: "https://chinachristianedu.wordpress.com/%E5%8D%8E%E4%BA%BA%E5%9F%BA%E7%9D%A3%E6%95%99%E4%B8%AD%E5%B0%8F%E5%AD%A6%E6%95%99%E8%82%B2%E6%95%99%E6%9D%90%E6%8E%A8%E8%8D%90/", type: "link", lang: "zh", source: "华人青少年基督教教育网", tags: ["主日学", "教理问答", "诗歌"], note: "中文主日学、儿童圣经故事、诗歌与书店的大清单，部分链接已失效" },
  { title: "AmblesideOnline Year 0", url: "https://www.amblesideonline.org/ao-y0", type: "course", lang: "en", age_max: 6, source: "AmblesideOnline", tags: ["夏洛特·梅森", "免费"], note: "6 岁前不上正式课：户外、家务、共读、自然观察" },
  { title: "All About Reading Pre-reading", url: "https://www.allaboutlearningpress.com/all-about-reading/", type: "course", subject: "language", lang: "en", age_min: 3, age_max: 6, source: "All About Learning Press", tags: ["拼读"], note: "每天 20 分钟，轻脚本；Pre-reading 约 $120" },
  { title: "Math-U-See Primer", url: "https://mathusee.com/curriculum/primer/", type: "course", subject: "math", lang: "en", age_min: 4, source: "Math-U-See", tags: ["数学", "教具"], note: "掌握式进度，教具加视频" },
  { title: "Abeka Preschool（K4 / K5）", url: "https://www.abeka.com/preschool/", type: "course", lang: "en", age_min: 2, age_max: 6, source: "Abeka", tags: ["全科", "拼读", "圣经"], note: "传统教材式，K5 每个字母配一节经文" },
  { title: "BJU Press Footsteps for Fours", url: "https://www.bjupresshomeschool.com/category/preschool/5637160358.c", type: "course", lang: "en", age_min: 4, age_max: 5, source: "BJU Press", tags: ["拼读", "前阅读"], note: "圣经课 Bible Truths K4 单独购买" },
  { title: "Sonlight Preschool / Pre-K", url: "https://www.sonlight.com/pages/all-subjects-packages?sku=1MSP", type: "course", lang: "en", age_min: 3, age_max: 5, source: "Sonlight", tags: ["共读", "书单"], note: "以文学为本，书单可作阅读参考" },
  { title: "My Father's World 早期课程", url: "https://www.mfwbooks.com/", type: "course", lang: "en", age_min: 2, age_max: 6, source: "My Father's World", tags: ["单元主题", "全科"], note: "2–3 岁、Pre-K、K 各有整年包" },
  { title: "Memoria Press Junior Kindergarten", url: "https://www.memoriapress.com/curriculum/junior-kindergarten/", type: "course", lang: "en", age_min: 4, age_max: 5, source: "Memoria Press", tags: ["古典", "绘本"], note: "绘本清单质量高" },
  { title: "Easy Peasy All-in-One Homeschool", url: "https://allinonehomeschool.com/", type: "course", lang: "en", age_min: 3, source: "Easy Peasy", tags: ["免费", "在线"], note: "免费 180 天课程，学前为 Getting Ready 1" },
  { title: "Apologia Young Explorers 适用年龄", url: "https://support.apologia.com/kb/article/390-what-ages-can-use-the-young-explorer-series/", type: "link", subject: "science", lang: "en", age_min: 5, age_max: 11, source: "Apologia", tags: ["科学", "创造论"], note: "K–6；学前用配套绘本单" },
  { title: "The Jesus Storybook Bible", url: "https://www.sonlight.com/PMSP.html", type: "book", subject: "bible", lang: "en", age_min: 3, source: "Sally Lloyd-Jones", tags: ["故事圣经"], note: "44 个故事，每个指向基督；有中英双语版" },
  { title: "HSLDA Illinois", url: "https://hslda.org/legal/illinois", type: "org", lang: "en", source: "HSLDA", tags: ["法规"], note: "州法概览与法案通知" },
  { title: "ICHE 伊利诺伊基督徒在家教育者协会", url: "https://iche.org/", type: "org", lang: "en", source: "ICHE", tags: ["社群", "法规"], note: "法律更新、支持小组、年会" },
  { title: "北卡 DNPE 在家教育", url: "https://www.doa.nc.gov/divisions/non-public-education/home-schools", type: "org", lang: "en", source: "NC DNPE", tags: ["法规"], note: "备案与测试要求（参考）" }
];

export { SEED_SCRIPTURES, ROUTINE_TEMPLATES, COURSE_TEMPLATES, GOAL_TEMPLATES, SEED_RESOURCES };
