/* ============ 应用自带内容的英文（周例行模板、读经计划、大原则、睡前安然、姊妹应用）============
   结构和各数据文件里的对应对象一一对应，由 data/content-en.js 对齐成「中文原文 → 英文」。
   没有英文的字段照原样显示中文；新增中文内容时在这里补英文。 */
const ROUTINES_EN = {
  toddler: { name: "Ages 2–3 · Rhythm", rows: [
    { title: "Family worship: a hymn, a story, a verse, a prayer" }, { title: "Picture-book reading: one Chinese, one English" }, { title: "Outdoors" }, { title: "One chore" }, { title: "Sensory / fine-motor play" }
  ] },
  prek: { name: "Ages 3–5 · Pre-K weekly routine", rows: [
    { title: "Worship & memory work: reading, hymn, verse" }, { title: "English phonics" }, { title: "Chinese characters" }, { title: "Math" }, { title: "History: Bible stories and family stories" },
    { title: "Science: nature observation" }, { title: "Art: a famous painting or a craft" }, { title: "Music: this month’s hymn" }, { title: "Character & chores" }
  ] }
};

const PLANS_EN = {
  story: { name: "Story order (toddlers can join)", desc: "55 passages in the order of the story of salvation; one or two a week finishes in about a year. Pairs with The Jesus Storybook Bible or any children’s story Bible.",
    notes: ["God creates heaven and earth", "The Garden of Eden", "People turn away from God", "Noah and the ark", "The Tower of Babel", "God calls Abraham", "Isaac is born and offered", "Jacob’s ladder", "Joseph’s coat", "Joseph in Egypt", "Joseph forgives his brothers", "Moses is born",
      "The burning bush", "The ten plagues and the Passover", "Crossing the Red Sea", "Manna", "The Ten Commandments", "The twelve spies", "Be strong and courageous", "The walls of Jericho",
      "Gideon", "Ruth", "Samuel hears God", "God chooses David", "David and Goliath", "David and Jonathan", "The Lord is my shepherd", "Solomon asks for wisdom",
      "Elijah on Mount Carmel", "Naaman is healed", "Jonah", "Three friends in the fiery furnace", "The lions’ den", "Esther", "Rebuilding the wall", "A child is born for us",
      "The angel’s announcement", "Jesus is born", "The wise men come", "The boy Jesus in the temple", "Jesus is baptised", "Calming the storm", "Five loaves and two fish", "The lost sheep, lost coin and lost son",
      "The good Samaritan", "Jesus loves the little children", "Zacchaeus", "Lazarus", "Entering Jerusalem", "Foot washing and the Last Supper", "The cross", "He is risen",
      "The ascension and Pentecost", "Paul comes to Christ", "A new heaven and a new earth"] },
  books: { name: "By book: one passage per book (children’s edition)", desc: "One passage from each of the 66 books that suits children best, to get a sense of the whole Bible. One round takes two to three months.",
    notes: { 1: "The Ten Commandments", 2: "Love your neighbour as yourself", 3: "The blessing", 4: "Love God with all your heart and soul", 39: "The Beatitudes", 47: "The fruit of the Spirit" } }
};

const SISTER_EN = ["Baby records: feeds, sleep, diapers and growth curves. Your children’s names and birthdays are kept here.", "Homeschooling: daily worship, memory verses, courses, tasks and reports.", "Household inventory and shopping lists, meal ideas from what you have, and house maintenance and gear lists.", "Your own body, mind and spirit: Bible, prayer, exercise, eating, screen time, medication and supplements."];

const PRINCIPLE_EN = {
  CORE: {
    line: "To discipline with kindness by God’s grace, teaching the Bible’s values fully to the next generation, so that they walk in the way God has for them and do not turn aside to the right or the left.",
    mini: "Disciplining in grace, teaching biblical values, so children walk the way God has for them",
    points: [
      { h: "Discipline in grace, not punishment in anger", t: "Discipline comes from love and helps a child learn right behaviour; comfort restores a child’s sense of safety. Comfort over punishment is not no discipline. Do not provoke your children, and do not give up responsibility." },
      { h: "Teach them the Bible in full", t: "Not just rules, but knowing God, loving God and loving others. Talk about God’s word at home, on the road, lying down and getting up; live it out yourself first." },
      { h: "So they walk the way they should, turning neither right nor left", t: "The goal is not obedience but a heart toward God and a lifetime on the path he shows. Hold the big things firmly and let the small things go; be consistent, gentle and firm." },
      { h: "Children are an inheritance from God, so we need not be anxious", t: "They are first of all God’s, and we are stewards. Do what we should and leave the rest to God; when anxiety comes, turn it into prayer." }
    ]
  },
  ANGER: { title: "When anger comes (adult or child)", steps: ["Stop first: do not speak, discipline or decide in anger", "Breathe deeply and lower your voice; if needed let the other parent take over, or step away for a few minutes", "Pray quietly: “Lord, give me wisdom and peace”", "Talk once calm: repair the relationship first, then deal with the behaviour; if we were wrong, apologise to the child", "A child’s anger is the same: stay with them while they calm down, and reason only after the storm has passed"] },
  HARD: { title: "When something is hard and thorny", text: "First fast and pray, seeking God’s will; talk only after you have calmed down. Do not rush to a conclusion, and do not act in anger or fear.", note: "Fasting varies by person: if you are pregnant, nursing, have a chronic illness or take medication, ask your doctor first, or instead skip one meal or put down your phone; the point is to use the time you free up for prayer. Never ask children to fast." }
};

const BEDTIME_EN = {
  FLOW_TEMPLATES: {
    full: { flowName: "Night sleep", name: "Full · about 20 min", desc: "Tidy and transition → hug and worship → read Psalm 4:8 → repair and prayer → music and sleep. Five steps, each editable.", steps: [
      { name: "Tidy and transition", hint: "Put toys away, toilet, brush teeth, put on pyjamas. Say beforehand: “Five more minutes of play, then we start our quiet evening time.”" },
      { name: "Hug and worship", hint: "Play a song, hold your child, and ask: what made you happy today? What made you sad? Not every child has to answer." },
      { name: "Read Psalm 4:8", hint: "Read it slowly once and have your child say it after you. Then ask: what can we give to God tonight?" },
      { name: "Repair and prayer", hint: "If there was quarrelling, hitting or disobedience today, deal briefly with the necessary responsibility and repair; if your child is already tired, do not lecture again. Then pray together." },
      { name: "Music and sleep", hint: "Dim the lights and play instrumental music; no more reasoning or asking about today’s behaviour. Say good night and leave quietly." }
    ] },
    starter: { flowName: "Starter", name: "Starter · about 8 min", desc: "For the first three days: one song, one reading, one minute of prayer; doing that counts as done. No need for perfection.", steps: [
      { name: "One song", hint: "Hold your child and listen to one song through." },
      { name: "Read Psalm 4:8", hint: "Read it once and have your child say it once." },
      { name: "Prayer and good night", hint: "A one-minute prayer, then say good night." }
    ] },
    nap: { flowName: "Nap", name: "Nap · about 8 min", desc: "For daytime naps: relax and transition → a song and a hug → a verse and a prayer → sleep music. Four steps, shorter than the night routine.", steps: [
      { name: "Relax and transition", hint: "Draw the curtains, toilet, pick up a teddy or blanket, and say softly: “It’s quiet nap time now.”" },
      { name: "A song and a hug", hint: "Hug them and sing softly or play a song; no reasoning." },
      { name: "A verse and a prayer", hint: "Read one line of Psalm 4:8, pray briefly, and say “see you when you wake up”." },
      { name: "Sleep music", hint: "Dim the light, play instrumental music and leave quietly." }
    ] }
  },
  TEXT_TEMPLATE: {
    name: "Family default",
    open: `Dear children, the day is over.

Whether there were many happy things today or some things we did not do well, we can now quiet down and come before God.

God’s word tells us: “In peace I will both lie down and sleep; for you alone, O Lord, make me dwell in safety.”

We do not need to carry everything from today into our dreams. If we did wrong, we can admit it; if we hurt someone, we can learn to say sorry and make it right; if we feel sad, we can tell Mum and Dad, and we can pray to God.`,
    reading: `Mum or Dad reads it slowly once, then invites the child to say it after you:

“In peace I will both lie down and sleep; for you alone, O Lord, make me dwell in safety.”

Then ask: “What can we give to God tonight?”

Three messages for the child to take to bed: God watches over me; I can start again; now I can rest in peace.`,
    prayer: `Lord, thank you for loving us.

Help us to admit our mistakes, to learn to forgive others, and to do better tomorrow.

Give us hearts at peace, so we sleep well tonight.

In Jesus’ name we pray, amen.`,
    close: `The day is over. We have prayed to God.

God’s love does not come to us because we were perfect today. He calls us to learn obedience, honesty and love, and gives us grace to grow through our mistakes.

Now let us give our worries to God and quiet our hearts. May the Lord watch over you and give you peaceful sleep. When you wake tomorrow, we have a new chance to love God and others and to learn to do what is right.

Good night, children. Mum and Dad love you.`
  },
  NAP_TEXT: {
    open: `Dear child, we have been playing for a while, and now your body is tired and needs a rest.

God loves you, and he watches over you while you sleep too. You can close your eyes without worry.`,
    reading: `Mum or Dad reads it slowly once, then invites the child to say it after you:

“In peace I will both lie down and sleep; for you alone, O Lord, make me dwell in safety.”

Then say: “Now we can rest in peace; God is watching over us.”`,
    prayer: `Lord, thank you that we had a happy time.

Now we are going to rest. Keep us safe as we sleep, and let us wake refreshed and with peaceful hearts.

In Jesus’ name we pray, amen.`,
    close: `It is quiet resting time. Close your eyes and let your body relax.

When you wake, we’ll play together again. May the Lord watch over you. Good afternoon.`
  },
  PRINCIPLES: {
    core: "Comfort over punishment is not no discipline. Comfort is to restore a child’s sense of safety; discipline is to help a child learn right behaviour. Both can exist together, but calm need not be made by punishment.",
    verses: [{ zh: "Whoever spares the rod hates his son, but he who loves him is diligent to discipline him." }, { zh: "Fathers, do not provoke your children to anger, but bring them up in the discipline and instruction of the Lord." }],
    boundary: "When safety, ongoing harm to others, or a serious breach of family rules is involved, do not pretend nothing happened because it is bedtime: stop the danger first, give an age-appropriate consequence and arrange the necessary repair. But do not discipline by withdrawing love, shaming the child, threatening that God will punish them, or deliberately creating fear.",
    notEvery: "Nor need every night become a confession session. If there is nothing special to deal with today, just sing, give thanks, pray and sleep. Bedtime worship is first of all drawing near to God, not checking whether the child has done wrong today."
  },
  SITUATIONS: [
    { when: "Keeps getting out of bed", age: "Most common around age 2", steps: ["Preview five minutes ahead: “Five more minutes of play, then it’s quiet time”", "Say it once, gently and firmly, giving two limited choices (hug the teddy / listen to a song)", "If they get up again, calmly take them back to bed: no reasoning, no bargaining, no extra attention, and no punishment", "Same words, same actions, repeated until they stay in bed"],
      say: "I know you still want to play, but it’s bedtime now. You can choose to hold your teddy or to listen to a song. We won’t start any new games.", avoid: "Making every trip out of bed a new argument; buying quiet with scares or “if you get up again we won’t want you”." },
    { when: "Hitting, grabbing toys, shouting at siblings", steps: ["Stop the harm first and protect the child who was hit", "Then help the child who did wrong to calm down: being angry is okay, hurting people is not", "Complete the necessary repair: say sorry, care for the other child, fix together what was broken", "If the child is exhausted, do only the necessary repair and leave deeper teaching until tomorrow"],
      say: "I won’t let you hit. You can be angry, but you may not hurt anyone.", avoid: "Long bedtime lectures; forcing an instant “sorry” without real care and repair." },
    { when: "After doing wrong, cries that they are bad, and that Jesus and Mum and Dad don’t love them", steps: ["Separate the behaviour from the identity: what you did was wrong, but that doesn’t make you bad", "Hug first, then talk: do not make comfort wait until they stop crying and behave", "Admit the mistake together, accept discipline, and ask God’s help to change", "Read Psalm 4:8 again or sing a song about being loved"],
      say: "What you did just now was wrong, but that doesn’t mean you’re a bad child. Mum and Dad love you, and Jesus loves you too. We can admit mistakes, accept discipline, and learn to change with God’s help.", avoid: "Words like “if you keep this up nobody will like you”, which tie love to performance." },
    { when: "A parent lost their temper", steps: ["Stop, breathe deeply, and hand over to the other parent if needed", "Model repentance: apologise for your volume and attitude, not for the discipline itself", "Make it clear: your behaviour still needs correcting, but I should not have spoken to you like that", "Pray yourself too, asking for forgiveness and patience"],
      say: "Just now Mum / Dad spoke too loudly, which is something I need to change. I’m sorry. What you did still needs correcting, but I should not have spoken to you that way.", avoid: "Pretending it did not happen; or dropping a reasonable demand out of guilt." },
    { when: "Stalling: one more sip of water, one more toilet trip, one more story", steps: ["Put drinking and the toilet in the first step of the routine and do them all at once", "Warn “the last one” and keep to it", "Answer later requests with the same sentence and add nothing new"],
      say: "You’ve had your water and been to the toilet. Now it’s time to lie down. I’ll stay with you for one minute, then turn off the light.", avoid: "Half-agreeing to every request, so the child learns that “asking once more works”." },
    { when: "Afraid of the dark, of being alone, nightmares", steps: ["Acknowledge that the fear is real; do not mock it or say “there’s nothing to be scared of”", "Leave a small night light and the door ajar, and promise to check back in a few minutes and do it", "Read Psalm 121 or 91, and tell them God never slumbers or sleeps", "Pray together about what frightens them"],
      say: "It’s a bit scary in the dark, I know. God watches over you and he doesn’t sleep. Mum and Dad are next door, and I’ll check on you again in five minutes.", avoid: "Scaring them with something worse: “if you don’t sleep the monster will come”." },
    { when: "Siblings disturbing each other, talking and playing instead of sleeping", steps: ["Separate them for a few minutes to be quiet, rather than finding out who started it", "Listen to the last piece of instrumental music together; whoever is quiet first gets the good-night hug first", "If needed, temporarily separate rooms or stagger bedtimes"],
      say: "You both want to play, I understand. Now it’s quiet time. Lie down, and I’ll give each of you a good-night hug.", avoid: "Comparing in front of the other: “look how well your brother behaves”." },
    { when: "Safety, ongoing harm, or a serious breach of family rules", steps: ["Stop the danger first", "Give an age-appropriate consequence and state it clearly that night, not “later”", "Arrange the necessary repair, even if it is just an apology first with the rest tomorrow", "Do not withdraw love, shame, threaten that God will punish them, or create fear"],
      say: "This is serious, and we can’t pretend it didn’t happen. Tonight we will first… and tomorrow morning we’ll put… right together. But know that Mum and Dad love you no matter what.", avoid: "Pretending nothing happened because it is bedtime; or using threats to buy a quiet night." }
  ],
  READINGS: [
    { lead: "The spiritual anchor for the whole family at bedtime: God watches over me, so I can lie down in peace.", ask: "What can we give to God tonight?" },
    { lead: "Read when afraid of the dark or needing to feel safe: when the shepherd is there, there is nothing to fear.", ask: "How does a shepherd look after his sheep? How does God look after you?" },
    { lead: "The God who protects us never slumbers or sleeps, so we can sleep.", ask: "While you are asleep, who stays awake watching over you?" },
    { lead: "Sleep is a gift God gives to those he loves, not wasted time.", ask: "Why did God make us need to sleep?" },
    { lead: "Lie down without fear and sleep sweetly.", ask: "Was there anything scary today? Let’s give it to God together." },
    { lead: "God says: do not fear, I am with you.", ask: "What does God hold you up with? (his righteous right hand)" },
    { lead: "Those who are weary and burdened can come to Jesus for rest.", ask: "Are you tired today? Give your tiredness to Jesus." },
    { lead: "Turn worry into prayer, and God’s peace will guard our hearts.", ask: "What can we turn into a prayer tonight?" },
    { lead: "God goes ahead of you and will not leave or forsake you.", ask: "Where will God be tomorrow? (ahead of you)" },
    { lead: "The peace Jesus leaves is not like the peace the world gives.", ask: "How is the peace Jesus gives different from the happiness of “having played enough”?" },
    { lead: "Dwelling in the shelter of the Most High, like a chick under wings.", ask: "What does it feel like for a chick under its mother’s wings?" },
    { lead: "Read on a night siblings have quarrelled: love is patient.", ask: "Which line was hardest to do today? Which will you try first tomorrow?" }
  ],
  PARENT_LINES: [
    "Comfort restores a child’s sense of safety; discipline helps a child learn right behaviour. Both can exist together, but calm need not be made by punishment.",
    "Separate the behaviour from the child’s identity: doing something wrong does not make them a bad child.",
    "Parents need not “get children to submit” every night to count as responsible; within firm boundaries you can give comfort, company and a chance to start again.",
    "Not every night has to become a confession session. If there is nothing special to deal with today, just sing, give thanks, pray and sleep.",
    "Parents can model repentance too. Admitting you spoke too loudly is not giving up authority; it lets children see grace.",
    "Let what stays with the child at the end not be how much they were rebuked today, but this: I can repent to God, make peace with my family, and lie down safely in God’s care.",
    "Consistency matters more than variety: using the same three or four songs for two or three weeks helps children settle more easily.",
    "Ephesians 6:4: do not provoke your children to anger, but bring them up in the discipline and instruction of the Lord.",
    "The point of Psalm 4:8 is not to guarantee children no fear each night, but to lead them to learn to trust in God’s presence.",
    "Keep the volume low and the screens off. Put your phone face down on the table, so body and emotions slow down together."
  ],
  GUIDE: [
    { title: "Days 1–3 · Build a fixed routine", text: "Aim for imperfect. Even one song, one reading and one minute of prayer counts as done. Using the starter version first is suggested." },
    { title: "Days 4–7 · Add sharing feelings", text: "At the hug step, ask about one happy and one sad thing from the day; do brief relationship repair if needed, so the child knows it is safe to express feelings at bedtime." },
    { title: "Week 2 · Let the child take part", text: "Gradually let the child choose one of two songs, take turns reading Psalm 4:8, or say in one sentence something they are thankful to God for." },
    { title: "After two weeks · Observe", text: "Look not only at whether they fall asleep faster but at: fewer bedtime quarrels, more willingness to admit mistakes, reconnecting after correction, and siblings more ready to make up." }
  ],
  SONG_IDEAS: [
    ["", "", "", "Uses Psalm 4:8 directly as its lyrics; good as the family’s fixed bedtime theme song"],
    ["Jesus Loves Me", "Traditional hymn", "", "When a young child needs comfort and to be sure they are loved"],
    ["", "", "", "When a child is easily upset after doing wrong or fears being scolded"],
    ["", "", "", "When moving from play to quiet"],
    ["The Lord Is My Shepherd", "", "", "When afraid of the dark or needing to feel safe"],
    ["It Is Well with My Soul", "Traditional hymn", "", "For a parent to sing softly to an older child"],
    ["Jesus Loves the Little Children", "Traditional hymn", "", "For the whole family to sing together as part of the hug"],
    ["Piano / harp instrumental worship", "Any", "", "For looping in the last step: slow, gentle, no sudden drums or high notes"]
  ]
};


/* 冲突 / 情绪话题的推荐歌曲（data/music.js 的 REC，按 id 对齐）*/
const MUSIC_EN = {
  "cf-fear": { why: "When afraid, first use a scripture song to put God’s word in the heart (“God is with you”), then gentle instrumental music to slow the body down.", ideas: ["The Lord Is My Shepherd (Ps 23)", "Be Still and Know (Ps 46:10)"] },
  "cf-shy": { why: "Choose songs about being loved and accepted, so the child knows they are loved without having to perform; listen and sing together at home before going out to build familiarity and courage.", ideas: ["Jesus Loves Me", "My Beloved Child (Sarah Kroger)"] },
  "cf-share": { why: "Sing children’s songs about love and togetherness at ordinary times; it soaks in values better than lecturing in the moment.", ideas: ["Jesus Loves the Little Children", "Children’s songs based on “love is patient” (1 Cor 13)"] },
  "cf-grab": { why: "In the moment play gentle instrumental music to help both calm down, then talk about the rules; do not play songs with words during the conflict, or the child will feel lectured.", ideas: ["Piano / harp instrumental worship"] },
  "cf-hit": { why: "First use gentle instrumental music to bring the emotion down (the calming stage); when repairing the relationship, sing a song about being loved together.", ideas: ["Piano / harp instrumental worship", "Jesus Loves Me"] },
  "cf-bite": { why: "Play nothing in the moment; once it is dealt with, use gentle instrumental music to settle down together.", ideas: ["Piano / harp instrumental worship"] },
  "cf-tantrum": { why: "Do not play songs at the peak; once the storm eases, play very quiet instrumental music to keep them company, without asking them to stop.", ideas: ["Piano / harp instrumental worship"] },
  "cf-defy": { why: "At ordinary times sing scripture songs from Proverbs and Colossians together, to put God’s word into daily life; it is more powerful than arguing in the moment.", ideas: ["Children’s songs set to Eph 6:1-4 and Col 3:20", "The Hidden in My Heart scripture songs"] },
  "cf-exclude": { why: "Choose songs about acceptance and friendship (Eph 4:32, John 13:34), sing them with the child, then talk about how to treat friends.", ideas: ["Jesus Loves the Little Children", "A scripture song for Ephesians 4:32"] },
  "em-jealous": { why: "Songs about being loved help a child be sure of their place in Mum and Dad’s hearts and God’s; each child can choose a “my song”.", ideas: ["My Beloved Child (Sarah Kroger)", "Jesus Loves Me"] },
  "em-anxious": { why: "When worried: scripture songs (Phil 4:6-7, Ps 4:8) help the child give the worry to God; at bedtime play gentle instrumental music with slow breathing.", ideas: ["Peaceful Lullaby (Ps 4:8)", "Be Still and Know", "The Peace of God"] },
  "em-school": { why: "While studying or doing homework, play lyric-free soft music to help focus (low volume, not competing for attention); sing a scripture song before and after to remember who we learn for (Col 3:23).", ideas: ["Piano / soft music (no lyrics)", "A scripture song for Colossians 3:23"] },
  "em-screen": { why: "Replace screens with a time of songs the whole family listens to and sings together: while cooking, after meals, at bedtime. Music competes for attention far less than pictures do.", ideas: ["Children’s worship songs the family likes", "A fixed bedtime playlist"] },
  "em-addict": { why: "Choose scripture songs on freedom and self-control (1 Cor 6:12) and listen with them, not as a punishment, to keep “not being mastered” in the heart.", ideas: ["A scripture song for 1 Corinthians 6:12", "It Is Well with My Soul"] },
  "em-news": { why: "On days with bad news: first listen together to a song about God reigning (Ps 46), then use gentle instrumental music for a quiet time of prayer together.", ideas: ["Songs based on Psalm 46", "It Is Well with My Soul"] },
  "em-puberty-f": { why: "Songs on Psalm 139:14, “fearfully and wonderfully made”, help her link her body’s changes to God’s creation; Mum and Dad can play them for her together.", ideas: ["Songs based on Psalm 139", "My Beloved Child (Sarah Kroger)"] },
  "em-puberty-m": { why: "Songs on Proverbs 4:23 and Psalm 139; Dad listens with him, then they talk about what the words mean.", ideas: ["Songs based on Proverbs 4:23", "Songs based on Psalm 139"] }
};

export { MUSIC_EN, ROUTINES_EN, PLANS_EN, SISTER_EN, PRINCIPLE_EN, BEDTIME_EN };
