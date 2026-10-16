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

export { SEED_SCRIPTURES, ROUTINE_TEMPLATES };
