/* ============ 发布日志的数据（我的 → 发布日志；今天页顶上的「新版本」提示） ============
   每次推送：改 js/core/config.js 的 APP_VERSION，并在最上面加一条同版本号的记录（最新在前）。
   写给家长看：一句话简介 + 1–4 条短要点，不写技术词。k：new 新功能 / better 改进 / fix 修复。 */
export const RELEASES = [
  { v: "2026-11-08.4", title: { zh: "新增「发布日志」：每次更新了什么一看就知道", en: "New Release notes: see what changed in each update" }, items: [
    { k: "new", zh: "我的 → 发布日志：按类型、时间筛选，列表或时间线查看", en: "Me → Release notes: filter by type or time, view as a list or timeline" },
    { k: "new", zh: "有新版本时，今天页顶上会提示几次，点开就能看", en: "After an update, Today shows a short notice a few times; tap to read it" },
    { k: "better", zh: "顶栏的版本号可以点，直接打开发布日志", en: "Tap the version number in the header to open the release notes" }
  ] },
  { v: "2026-11-08.3", title: { zh: "成长记录换了新样子，筛选和趋势更好用", en: "Growth log redesigned: easier filters and trends" }, items: [
    { k: "better", zh: "成长记录：电脑上用标签、手机上用下拉切换各部分", en: "Growth log: tabs on a laptop, a dropdown on a phone to switch sections" },
    { k: "new", zh: "一个筛选搞定时间、类型和排序，点趋势图也能筛下面的记录", en: "One filter for time, type and order; tap a trend tile or bar to filter the records" },
    { k: "new", zh: "记录可以按列表或时间线查看", en: "View records as a list or a timeline" },
    { k: "better", zh: "今天页顶上的滑动卡加了 ‹ › 按钮", en: "Today's top cards get ‹ › buttons" }
  ] },
  { v: "2026-11-08.2", title: { zh: "音乐卡的下拉框更好认", en: "Music card dropdowns are easier to spot" }, items: [
    { k: "better", zh: "音乐卡的下拉框有边框和箭头，一看就知道能选，字也小一点", en: "Music card dropdowns now have a border and arrow, with smaller text" }
  ] },
  { v: "2026-11-08.1", title: { zh: "今天页顶上的卡片自动轮播", en: "Today's top cards now rotate on their own" }, items: [
    { k: "new", zh: "顶上的卡片每 10 秒自动换一张，可以改快慢或关掉", en: "The top cards change every 10 seconds; adjust the timing or turn it off" },
    { k: "better", zh: "手指按住或鼠标停在上面时暂停", en: "Pauses while you touch or hover over it" },
    { k: "better", zh: "音乐卡和其他卡一样高", en: "The music card is now the same height as the others" }
  ] },
  { v: "2026-11-07.2", title: { zh: "音乐卡可以选歌单或单曲", en: "Music card: pick a playlist or a single song" }, items: [
    { k: "new", zh: "音乐卡可以选歌单，也可以只放一首歌", en: "Choose a playlist or just one song on the music card" },
    { k: "fix", zh: "深色主题下播放按钮不再白底白字看不清", en: "Play button no longer disappears in dark mode" },
    { k: "better", zh: "播放按钮排得更整齐", en: "Tidier player controls" }
  ] },
  { v: "2026-11-07.1", title: { zh: "音乐换页也不停，今天页多了音乐卡", en: "Music keeps playing across pages; new music card on Today" }, items: [
    { k: "new", zh: "换页面音乐照样播放；今天页顶上可以滑到 🎵 音乐卡", en: "Music keeps playing when you switch pages; swipe to the 🎵 card on Today" },
    { k: "new", zh: "进度条、循环（整个歌单 / 单曲）、上一首下一首、音量", en: "Progress bar, repeat playlist or song, previous/next and volume" },
    { k: "better", zh: "睡前安然：某一步超时会振动，倒数 10 秒进下一步", en: "Bedtime: an overrunning step vibrates and counts down 10 s to the next one" }
  ] },
  { v: "2026-11-06.3", title: { zh: "新增成长记录页：2 岁以上孩子的记录和趋势", en: "New Growth log page for kids 2 and up" }, items: [
    { k: "new", zh: "快速记录里的如厕、吃饭、户外、情绪等都能在一页看到", en: "See potty, meals, outdoor time, moods and more from Quick log in one place" },
    { k: "new", zh: "从快速记录或「我的」都能进入", en: "Open it from Quick log or from Me" }
  ] },
  { v: "2026-11-06.2", title: { zh: "新增夜间干爽记录", en: "New dry-nights tracking" }, items: [
    { k: "new", zh: "快速记录多了「夜间干爽」，一点就记", en: "New Dry night tile in Quick log" },
    { k: "new", zh: "连续干爽几晚后，提示可以试试穿内裤睡", en: "After a run of dry nights, a hint suggests trying underwear" },
    { k: "new", zh: "趋势里能看到干爽的天数变化", en: "See dry nights over time in the trends" }
  ] },
  { v: "2026-11-06.1", title: { zh: "直接打印今天页更干净", en: "Cleaner printout of the Today page" }, items: [
    { k: "better", zh: "浏览器直接打印今天页时只留今日敬拜、经文背诵和今日任务", en: "Printing Today from the browser keeps only worship, verse memory and tasks" }
  ] },
  { v: "2026-11-04.1", title: { zh: "新增睡眠页：2 岁以上孩子的睡眠记录和趋势", en: "New Sleep page for kids 2 and up" }, items: [
    { k: "new", zh: "睡眠卡 → 睡眠记录与趋势：近两个月的睡眠，点开可改或删", en: "Sleep card → Sleep log & trends: the last two months, tap to edit or delete" },
    { k: "new", zh: "每天睡多久、几点睡几点起，和同龄建议对比", en: "Hours per day, bedtime and wake time compared with age guidelines" },
    { k: "better", zh: "夜间睡眠和午睡分开记、分开算", en: "Night sleep and naps are recorded and counted separately" }
  ] },
  { v: "2026-11-03.1", title: { zh: "备份更完整，更新后自动用上新版本", en: "Fuller backups, and updates load properly" }, items: [
    { k: "better", zh: "备份更完整：睡前安然的歌曲和记录也会备份", en: "Fuller backups: bedtime songs and logs are included" },
    { k: "fix", zh: "更新后偶尔还停在旧版本的问题已修好", en: "Fixed the app sometimes staying on the old version after an update" }
  ] },
  { v: "2026-10-29.1", title: { zh: "新增音乐页和歌单，长列表打开更快", en: "New Music page and playlists; long lists open faster" }, items: [
    { k: "new", zh: "资源 → 音乐：自动分好的歌单，也能自己建歌单", en: "Resources → Music: ready-made playlists, or make your own" },
    { k: "new", zh: "周例行里的唱歌任务多了「学唱」，大字歌词跟着唱", en: "Singing tasks get a Learn button with big lyrics to sing along" },
    { k: "better", zh: "长列表分批显示，打开更快；每批几条可在设置里改", en: "Long lists load in batches and open faster; set the batch size in Settings" },
    { k: "fix", zh: "记录很多时，备份和趋势不再漏掉一部分", en: "Backups and trends no longer miss records when there are many" }
  ] }
];
