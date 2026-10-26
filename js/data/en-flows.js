/* ============ 冲突管理 / 情绪管理的英文内容 ============
   结构和 data/flows.js 的 CONFLICTS、data/emotions.js 的 EMOTIONS 一一对应（按 id、按字段、按数组下标），
   由 data/content-en.js 递归对齐，登记成「中文原文 → 英文」，英文界面下 tc() / tb() 会自动换成这里的英文。
   新增或改动中文内容时，在这里同步改英文；没有英文的字段会照原样显示中文。 */
const CONFLICTS_EN = {
  "cf-fear": {
    when: "Fear", short: "Afraid of the dark, noises, animals, or of being apart from you",
    why: {
      baby: "Separation anxiety and stranger anxiety peak between about 8 and 18 months: he knows you and depends on you, so he is frightened when you leave. Sudden noises and unfamiliar faces can scare him too. This is attachment developing normally, not spoiling.",
      toddler: "Imagination is growing but he cannot yet tell imagination from reality, so he fears the dark, monsters and animals, and fears being apart from you. At this age the fear is real, not an act.",
      prek: "Imagination is vivid and fears become specific: monsters, nightmares, thunder, the dark. Most ease as thinking matures, and a calm, steady adult is the best medicine.",
      early: "Fear of the dark and of nightmares is still common, and real-world fears begin: shots, being criticised, being laughed at, things in the news. Most of it is still normal development.",
      mid: "Worries turn to school performance, being accepted by classmates, family safety and disasters in the news. Some children hide fear because they feel “too big to be scared”. Asking works better than waiting for them to tell you.",
      teen: "Worries centre on grades, appearance, friends and the future. Moods swing and they may not volunteer what is wrong. For ongoing worry, see “Emotion care → Anxiety”."
    },
    steps: ["Acknowledge the feeling first; do not mock it or say “there’s nothing to be afraid of”", "Stay close and approach in small steps: do not force facing it; first look from far away, then a little nearer", "Give a tool they can use alone: a night light, a teddy, a song, a Bible verse", "Preview changes (going out, a new place, how long you will be away) and keep your word", "Pray together and hand the fear over to God"],
    say: "I know you’re scared, and that’s normal. Mum and Dad are right here, and God is watching over you too. Shall we move a little closer and have a look?",
    avoid: "Mocking, “boys shouldn’t be scared”, forcing them to face it, or scaring them with monsters or “if you’re naughty we won’t want you”.",
    byBand: {
      early: { steps: ["Ask what exactly they fear and let them say it themselves; do not say it for them", "Acknowledge the feeling: “I was scared of that when I was little too”", "Make a small plan together: a night light, the door ajar, Psalm 121 before bed", "Use a “fear thermometer” from 1 to 10 and praise it when the number drops", "Pray together and give the fear to God"], say: "You said you’re a bit scared, and I heard you. What number is it? Let’s think of something together; God is here too." },
      teen: { steps: ["Set a time with no interruptions and listen first; do not try to fix", "Do not rush to say “don’t worry”; ask “which part worries you most?”", "Separate what they can do from what they cannot, and turn what they can do into a next step", "Keep sleep and exercise regular", "Invite them to pray together but respect their pace; see a counsellor or doctor if needed"], say: "I’m not going to rush to give you answers. I’d like to listen first, as much or as little as you want to say." }
    },
    flag: "If it lasts several weeks and clearly affects eating, sleeping or school, or comes with frequent nightmares, stomach aches or headaches, talk with a paediatrician or a child-psychology professional."
  },
  "cf-shy": {
    when: "Shyness, avoiding people", short: "Hides behind adults, won’t join in, won’t speak",
    why: {
      baby: "Stranger anxiety starts around 6–9 months and usually eases by about age 2. He is checking whether this person is safe; he is not being rude.",
      toddler: "Hiding behind an adult in new places or with strangers is very common. A temperamentally introverted child is “slow to warm up”: they need longer to observe and will relax once familiar.",
      prek: "Being willing to watch but not to join in, and speaking little, is a common “watch first” pattern. Give time and do not push.",
      early: "Slow warm-up is common when starting school, a new class or new friends. Introverted children are often at ease in small groups and do not need to be turned into extroverts.",
      mid: "They start to care what classmates think. Tell introversion (recharges alone, one or two good friends are enough) from social anxiety (wants friends but fears being judged; avoids, gets stomach aches or headaches).",
      teen: "Peers matter a great deal. Wanting friends but being unable to approach them, or avoiding social life for a long time, deserves real attention; plain introversion needs no “treatment”."
    },
    steps: ["Do not label them “shy” or “timid”, especially in front of others", "Tell them beforehand where you are going, who they will meet and roughly how long", "Stay beside them to observe first, then take small steps: say hello → play one-to-one → small group", "Praise each brave “small step”, and never compare", "Rehearse greetings and joining a game at home with toys"],
    say: "Let’s watch from here for a bit, and go over when you’re ready. You don’t have to talk; a nod or a wave is fine.",
    avoid: "“Say hello!”, “why are you so timid?”, pushing them into a crowd, or judging them in front of others.",
    byBand: {
      early: { steps: ["Do not answer for them or label them", "Arrange one-to-one playdates; they are easier than big groups", "Practise greetings and ways of joining a game at home", "Praise brave small steps", "Work with the teacher to give them a regular small role"], say: "You can watch them play for a while, then say, “Can I play too?” Let’s practise at home first." },
      teen: { steps: ["Respect an introverted temperament and do not push them to be extroverted", "Help find a small group with shared interests (church youth group, a club)", "Small goal: start a conversation once a week", "Talk about fear of being judged, using “what’s the worst that could happen?”", "Seek professional help for persistent avoidance or physical symptoms"], say: "I don’t want you to become someone else. I’d like to help you find ways that feel more comfortable." }
    },
    flag: "If, after starting school, they keep avoiding school or social life, have repeated headaches or stomach aches or crying, or get clearly worse over several months, consult a child-psychology professional."
  },
  "cf-share": {
    when: "Not wanting to share", short: "“It’s mine”, won’t let others play with it",
    why: {
      baby: "Before 2 there is no concept of sharing, only “I want”. What is in the hand is theirs.",
      toddler: "Ages 2–3 are when self and ownership are forming: “mine” is how they come to know themselves. Not sharing is normal development, not selfishness. Stable sharing appears around age 4.",
      prek: "They can understand turns, but still struggle when emotions run high. Teaching “wait and your turn will come” works better than “you must share”.",
      early: "They understand fairness and also keep score. Sharing problems often become fairness problems: who is first, who has more, who decides.",
      mid: "It is rarely plain “won’t share”; it is more about fairness, friendship and boundaries. Personal belongings should be respected and shared things need agreements.",
      teen: "Uncommon. It is mostly about personal space and boundaries, which need respect, while learning to negotiate over shared things."
    },
    steps: ["Say “turns” instead of “share”: when you’re done, it’s your brother’s turn; use a sand timer to make waiting visible", "Before guests come, let them put away special toys first; the rest are for turns", "Do not force or demand a public apology; when they share by choice, praise it specifically", "Model it yourself: “I’ll finish first, then it’s yours”", "Keep enough of the same toys to reduce needless conflict"],
    say: "You’re playing with this now. When you’re done, it’s your brother’s turn. Let’s count it down with the little sand timer.",
    avoid: "“Give it to him right now!”, “if you don’t share I won’t love you”, calling them selfish in front of others.",
    byBand: {
      early: { steps: ["Use rules rather than orders: who goes first, how long, how to swap", "Let the children suggest the arrangement and act as referee", "Allow them to keep “special things” and share the rest", "Praise the moments they share voluntarily, naming exactly what they did"], say: "You both want it, so let’s work something out: who goes first, for how long, and how you swap. You decide." },
      mid: { steps: ["Accept that personal belongings need boundaries, and teach agreements for shared things", "Separate “shared” from “mine” at home and write it down", "Fair does not mean identical; explain why", "With friends, teach them to look at the other person’s feelings"], say: "This is yours and you can say no. But for shared things, let’s agree together how to use them." }
    },
    flag: "If, at school age, they are still extremely possessive and cannot get along with peers, together with other social difficulties, talk with the teacher or a professional."
  },
  "cf-grab": {
    when: "Grabbing", short: "Snatching toys from others, pushing in first",
    why: {
      baby: "He does not understand turns yet and takes what he sees. This is exploring and impulse, not ill will.",
      toddler: "At 2–3 children mostly play side by side; a sense of ownership is just emerging and impulse control is immature. When words fail, they use actions to say “me too”.",
      prek: "They can understand rules, but still grab when excited or angry. Teaching “use your mouth” works better than “don’t grab”.",
      early: "Occasional grabbing when excited or a poor loser, but they should be able to use words. If it happens often, look at impulse control or peer relationships.",
      mid: "Grabbing is rare from about 9. If it is frequent, look at impulse control, emotions or peer relationships.",
      teen: "No longer about grabbing toys. If they take others’ things, talk seriously: is it impulse, wanting attention, or something else?"
    },
    steps: ["Stop the action first and calmly hand the item back to the owner, or put it in the middle", "Say what happened: “You really wanted that”, so their feeling is seen first", "Teach alternative words and ways: “Can I play with it?”, “I’ll wait until you’re done”", "Help them repair it: return the item, look at the other child, say a word", "Prevent: preview, have two of the same, and give each child some time to play alone"],
    say: "You really want that, I can see. Grabbing makes your brother sad. We can say, “Can I play with it?” For now let’s wait, and I’ll stay with you.",
    avoid: "Only punishing the grabber, scolding in public, helping the grabber “win”, or telling the child who was grabbed from to “just let it go”.",
    byBand: {
      early: { steps: ["Let both children calm down first", "Have the grabber say what they want in words", "Give it back and say, “Sorry, I was too hasty”", "Agree what to do next time: ask, wait your turn", "Praise the time they held back afterwards"], say: "You really wanted it, I saw. Grabbing upsets the other person. Let’s say: “Can I use it?”" }
    },
    flag: "If grabbing comes with clear aggression or injury, or at school age they still cannot keep to turns, seek a professional assessment."
  },
  "cf-hit": {
    when: "Hitting", short: "Hitting a sibling, an adult or another child",
    why: {
      baby: "Swatting at 1–2 is mostly exploring and expressing; he does not yet know it hurts. Teach “gentle touch”, not punishment.",
      toddler: "At 2–3 language lags behind emotion, so hitting is often anger, frustration or a bid for attention. The part of the brain that restrains impulse is very immature; it is not deliberate defiance.",
      prek: "They should be able to use words, but still hit when angry, tired, hungry or when something is grabbed. It is more likely around bedtime and before meals.",
      early: "Hitting is no longer common; it happens when extremely angry, provoked, or bullied and wanting to hit back. Ask: are they protecting themselves, or controlling someone?",
      mid: "Fights are often linked to being bullied, teased, protecting a friend, or imitating violence in films and games. Find out the cause seriously and make sure they are safe at school.",
      teen: "Physical conflict must be taken seriously, for the safety of everyone, including themselves. Anger, humiliation and pressure are often behind it; also watch for bullying and any thoughts of self-harm."
    },
    steps: ["Stop the harm first and protect the child who was hit", "Calm and firm, one sentence: “No hitting”; do not lecture", "Take them somewhere quiet to calm down: stay with them rather than shut them away in shame", "After calming, name the feeling (“you’re very angry”) and teach words or actions: stamp, hit a pillow, deep breaths", "Complete the necessary repair: check on the other child, help with an ice pack, say sorry; deeper teaching waits until tomorrow"],
    say: "I won’t let you hit. You can be angry, but you may not hurt anyone. You’re very angry now, and I’m here with you.",
    avoid: "Hitting back (physical punishment will not teach “don’t hit”), shouting and shaming, long bedtime lectures, forcing an instant apology.",
    byBand: {
      early: { steps: ["Stop it, protect the other child, and separate them to calm down", "After calming, ask “what happened?” and listen to all of it before judging", "Separate “being angry is okay” from “hitting is not okay”", "Think together what to do next time they are angry: walk away, tell an adult, breathe deeply", "A logical consequence and repair: apologise, help, pause the related activity; no shaming and no fighting force with force"], say: "I won’t let you hit. Being angry is okay, but you need another way. Tell me what happened just now." },
      mid: { steps: ["Make sure everyone is safe first, then talk about the cause: were they bullied or provoked?", "Separate self-defence from attack; if bullied, tell an adult rather than hitting back out of control", "State the family bottom line (no hurting people) and the consequence, in advance", "Repair: apologise and make amends", "Contact the teacher or school if needed to deal with what lies behind it"], say: "I want to know what happened first. Being angry is okay; hurting people is not. If someone is bullying you, tell us." },
      teen: { steps: ["Make sure everyone is safe, separate to cool down if needed, and steady yourself first", "Talk privately once calm, not in public and not raking up the past", "Look for where the anger comes from: humiliation? pressure? bullying?", "Make the bottom line and consequence clear (age-appropriate, stated in advance) and arrange repair", "For repeated violence or any thought of hurting others or themselves, see a professional promptly"], say: "I’m not here to interrogate you; I want to understand why you’re so angry. Hurting people is not okay, but I do want to hear your anger." }
    },
    gender: { m: "On average, boys have somewhat more physical conflicts. Teach them to put their strength into sport and teamwork, and do not shame them with “that’s not how a boy behaves”.", f: "On average, girls hit less but use more verbal attacks and exclusion. Do not overlook a girl’s anger because she is a girl, and do not feel it is “unlike a girl” when she does hit." },
    flag: "If it is frequent, severe, causes clear injury, comes with other regression or emotional problems, or persists at school age, ask a paediatrician or child-psychology professional for an assessment."
  },
  "cf-bite": {
    when: "Biting", short: "Biting peers, adults or siblings",
    why: {
      baby: "Teething, exploring with the mouth, overexcitement, or wanting to say something without the words: biting is common and mostly fades clearly before age 3.",
      toddler: "At 2–3 language falls short, and frustration, quarrels, tiredness and hunger can lead to biting; sometimes it is just wanting attention.",
      prek: "If biting continues after 3, look harder for the cause: stress, changes, sensory needs. It is mostly emotion with no outlet.",
      early: "Biting is rare after 5. If it continues, assess the cause (sensory needs, emotion, imitation, stress) and consult a paediatrician or professional.",
      mid: "Almost unheard of. If it appears, treat it as a signal that needs careful assessment (emotion, safety, bullying).",
      teen: "Almost unheard of. If it appears, talk to a professional soon and check their safety and emotional state."
    },
    steps: ["Separate them at once; look after the bitten child first: wash, cool and watch (follow medical advice for broken skin or bleeding)", "Be brief and firm with the biter: “Biting hurts. No biting”, without making a fuss over them", "Find the trigger: teething, tiredness, hunger, crowding, being grabbed from; watch the signs before it happens and step in early", "Offer an alternative: a teether or a cold wet cloth to chew, and teach “I want” and “no”", "Afterwards, go together to care for the bitten child"],
    say: "Biting hurts. No biting. If you want that, say “I want it”. Come, let’s go and see whether he’s hurt.",
    avoid: "Biting back, putting chilli or soap on their mouth (risk of harm), shaming in public, hitting.",
    byBand: { early: { steps: ["Make sure everyone is safe and treat the wound", "No scolding; calmly say “biting is not okay”", "Find the trigger and discuss it with a paediatrician or professional", "Teach alternatives: use words, chew a chewing aid, walk away"], say: "Biting is not okay; it hurts people. When you’re angry, tell me and we’ll work something out." } },
    flag: "If biting is still frequent after 3, bites leave clear injuries, or there are other developmental concerns, ask a paediatrician to assess."
  },
  "cf-tantrum": {
    when: "Tantrums, shouting", short: "Crying on the floor, screaming, shouting at siblings",
    why: {
      baby: "He cannot yet use words, so crying is his only way: hunger, tiredness, discomfort and being refused are all said by crying.",
      toddler: "He wants to decide for himself but lacks the ability, and feelings overwhelm him. This is normal; the adult’s job is to stay with him through it, not to reason at the peak.",
      prek: "They are learning to name feelings, but still erupt when tired, hungry, interrupted or when it is unfair. Being able to say “I’m angry” is progress.",
      early: "Outbursts lessen, but crying and shouting still happen when tired, a poor loser or refused. Emotion regulation is still being practised and needs adults to model and accompany.",
      mid: "Door-slamming and shouting are mostly about wanting respect and autonomy; children starting puberty are also more sensitive.",
      teen: "Moods swing and they are easily provoked. Anger often stands for pressure, humiliation, exhaustion or not being understood."
    },
    steps: ["Steady yourself first: lower your voice and slow down; hand over to the other parent if needed", "Keep them safe and stay near; do not reward the tantrum with attention", "Speak once the peak has passed: hug first, then name the feeling, then the rule", "Offer limited choices: “red shoes or blue shoes?”", "Do not reopen a battle at bedtime; deal with it tomorrow"],
    say: "I know you’re very angry. I’m here. When you’re ready, we’ll talk.",
    avoid: "Shouting back in public, “if you cry again I won’t want you”, using love as leverage, reasoning at the peak.",
    byBand: {
      early: { steps: ["Lower your own voice first", "Give a calm space (a calm corner, music, a pillow to hit) and agree to talk afterwards", "After calming: name the feeling, state the rule and think together what to do next time", "Do not reopen the fight"], say: "You’re angry, I understand. Let’s each calm down for five minutes, then talk." },
      mid: { steps: ["Use “I” words about your own feelings: “when I hear shouting I feel sad”", "Agree a calm-down signal and a calm-down time", "After calming, hear their reasons first, then the family rule", "Make consequences logical and stated in advance", "When you lose your own temper, model an apology"], say: "I want to hear you, but we both need to calm down first. You can say loudly “I need to calm down”, and I won’t chase you." },
      teen: { steps: ["Do not argue yet; wait until both are calm", "Talk privately, not in front of siblings", "Listen to what they want to say and acknowledge what is fair", "Keep the bottom lines clear: no shaming, no breaking things, no hurting people", "Find ways to release feelings together: sport, journalling, prayer, music"], say: "I’m a bit worked up too, so let’s wait a little and then talk. I will really listen to what you say." }
    },
    flag: "If outbursts are frequent, last very long (over 25 minutes), involve hurting themselves, or at school age happen almost every day, talk with a paediatrician or child-psychology professional."
  },
  "cf-defy": {
    when: "Talking back, defiance", short: "Saying “no”, bargaining, answering back to your face",
    why: {
      baby: "Too young for this to apply; his “no” is mostly exploring and not yet being able to express himself.",
      toddler: "“No” is the start of independence, not rebellion. Offering limited choices works better than a head-on clash.",
      prek: "They test boundaries to see whether adults mean what they say. Consistency matters more than severity.",
      early: "They test the rules, bargain and ask “why?” endlessly; they are learning boundaries and also learning to be respected.",
      mid: "They start to want reasons and may answer back to be respected; they are very sensitive to “unfair”.",
      teen: "They are pushing for independence and will challenge authority. They need clear bottom lines, and also choices and respect; commands alone only push them away."
    },
    steps: ["Few, clear rules, said once", "Offer two choices you can both accept", "Follow through, gently and firmly", "Say what you want in positive words (“please come here”)", "Praise the moments of cooperation"],
    say: "It’s time to tidy up the toys. Would you like to put the blocks away first, or the cars?",
    avoid: "Threatening as you speak, saying it and not doing it, shouting, making “obedience” the only goal.",
    byBand: {
      early: { steps: ["State the rules and consequences in advance", "Use “first… then…”: homework first, then play", "Do not argue; repeat once", "Make the consequence logical and apply it straight away", "Repair the relationship afterwards and say “I still love you”"], say: "I said tidy up first, then play. I won’t argue; when you’re ready we’ll carry on." },
      teen: { steps: ["Keep a few important bottom lines and let go of the rest", "Give them choices and room to decide", "Use questions: “what do you think would work better?”", "Talk once calm and explain the values (God’s word), rather than “because I said so”", "Admit your own mistakes and model repentance"], say: "I want to hear what you think. But I can’t give on this line, and I’ll tell you why." }
    },
    flag: "If the defiance is intense and persistent, with lying, stealing or truancy, low mood or thoughts of self-harm, seek a professional assessment."
  },
  "cf-exclude": {
    when: "Exclusion, gossip, silent treatment", short: "“I won’t play with you”, cliques, talking behind backs, the silent treatment",
    why: {
      baby: "Too young for this to apply.",
      toddler: "Too young for this to apply; at this age “you can’t have it” is about ownership, not exclusion.",
      prek: "“You can’t play with me” is a common test; what to teach is inclusion and kindness, not punishment.",
      early: "Small groups start to form, with “I won’t play with you” and children left outside. Teach empathy and inclusion.",
      mid: "Cliques, gossip and the silent treatment become more obvious. On average, relational harm (exclusion, spreading talk) is more common among girls, while boys also exclude and tease; also watch for the child being isolated.",
      teen: "Social media and group chats amplify exclusion, gossip and bullying. Pay special attention to a child who is isolated, and work with the school if needed."
    },
    steps: ["Ask what happened first: are they being excluded, or excluding someone else?", "Acknowledge the feeling and do not rush to fix it", "Teach the words: “I don’t like that”, “can I join?”", "If they are the one excluding: empathise with the other child, apologise, repair", "For bullying or cyberbullying: keep evidence and contact the school"],
    say: "Being left out hurts, I understand. Would you like to tell me what happened? Let’s think together about what to do.",
    avoid: "“Just put up with it”, “you must be partly to blame” before hearing everything, shaming in public, going to the other child yourself.",
    byBand: { teen: { steps: ["Hear them out first without judging right and wrong", "Tell a one-off quarrel from persistent isolation or online bullying", "Think together how to respond and how to find a new circle (church, interest groups)", "If they are the one excluding: talk about empathy and encourage repair", "Cyberbullying: keep screenshots, contact the school and the platform, and report if necessary"], say: "I’d like to hear you out first. Whatever happens, at home you are loved." } },
    gender: { f: "On average, girls more often meet relational harm (exclusion, gossip, silent treatment). Do not treat it as “just girls’ stuff”.", m: "Boys also exclude and are excluded, but often through teasing and roughhousing, so it is easily overlooked." },
    flag: "If they are persistently isolated, do not want to go to school, are low in mood or have thoughts of self-harm, see the teacher and a professional promptly."
  }
};

const EMOTIONS_EN = {
  "em-jealous": {
    when: "Jealousy", short: "Comparing with siblings or peers, “you play favourites”",
    why: {
      baby: "When a sibling arrives or adults give attention to someone else, he cries and clings to say “me too”.",
      toddler: "Most typical with a new baby: they may slip back to baby ways, cling, and feel both love and annoyance toward the little one. They are asking “do I still matter?”",
      prek: "They compare openly: who has more, who goes first, who is praised. They are checking their place in your heart.",
      early: "They start comparing grades, abilities and who teachers and adults like better. Behind jealousy is often “am I good enough, am I loved enough?”",
      mid: "Comparison with peers (grades, looks, friends, possessions) is stronger, and “you play favourites” is common.",
      teen: "Social media amplifies comparison; jealousy often disguises itself as disdain, coldness or criticising others."
    },
    steps: ["Acknowledge the feeling without denying it: “You wish Mum and Dad could spend more time with you, don’t you?”", "Give each child their own time every day, even 10–15 minutes, without interruption", "Do not compare (“look how well your sister…”); praise each child’s own strengths", "Involve them rather than demanding they “give way”: give the older child a small job", "Check yourself first: are you really giving more heart to one child?"],
    say: "I know you wish I would spend a bit more time with you. We have ten minutes right now, and it’s your special time.",
    avoid: "“You’re so big, why be jealous?”, comparing children, telling them to “be mature and give way” without seeing how they feel.",
    byBand: { mid: { steps: ["Listen without rushing to lecture", "Admit when it genuinely was unfair, and apologise if needed", "Give each child their own time and special responsibility", "Teach them to be thankful for others’ good things and to bring envy to God", "Watch for comparison on social media and agree limits on use"], say: "I hear that you feel I play favourites. I’d like to hear what exactly happened." } },
    flag: "If strong jealousy is long-lasting and comes with aggression, withdrawal or low mood, or badly harms sibling relationships, talk with a professional."
  },
  "em-anxious": {
    when: "Anxiety", short: "Worries a lot, asks “what if”, stomach aches and headaches, afraid to try",
    why: {
      baby: "Shows mainly as separation anxiety and stranger anxiety; see “Conflict care → Fear”.",
      toddler: "Shows mainly as separation anxiety and fear of new places; see “Conflict care → Fear”.",
      prek: "They repeatedly ask “what if…”, fear separation and new places. Mostly temporary; a steady routine and previews help.",
      early: "They worry about criticism, mistakes and what classmates think, think a lot at bedtime, and have stomach aches or headaches with no medical cause.",
      mid: "They worry about grades, friends, family safety and world events; some are perfectionist and afraid to try.",
      teen: "Worries are more complex (grades, looks, friends, the future) and may show as irritability, poor sleep or avoidance."
    },
    steps: ["Help name the worry: “This is a worry, not something that has happened”", "Teach body tools: slow breathing (in for 4, out for 6), relaxed shoulders, a drink of water", "Give worries a time: 10 minutes of “worry time” a day, and set them aside the rest of the day", "Face things in small steps, neither avoiding everything nor protecting from everything: one small step at a time and praise it", "Keep sleep, exercise and routine steady; no frightening content before bed", "Pray together: say the worry to God and read Philippians 4:6-7"],
    say: "I hear that you’re worried. Worry makes the body feel unwell, and that’s normal. Let’s breathe slowly together, then think of one small step we can do, and give it to God as well.",
    avoid: "“Don’t think so much”, reassuring again and again that “nothing will happen” (it makes them depend on reassurance), shielding them from everything that worries them, mocking.",
    byBand: {
      early: { steps: ["Draw or talk about what the worry looks like and give it a name", "Teach slow breathing and a “fear thermometer”", "A steady bedtime routine and a preview of tomorrow", "Face things in small steps and praise each one", "Pray together and give the worry to God"], say: "That’s the worry showing up. Let’s give it a name and make it smaller together." },
      teen: { steps: ["Listen first; do not fix, and do not rush to say “don’t worry”", "Separate “what I can do” from “what I cannot”, and only manage the former", "Keep sleep and exercise, and cut caffeine and too much screen time", "Teach them to write the worry down, with the worst and the most likely outcome", "Invite them to pray and write it down and give it to God, at their own pace", "If it lasts two weeks and affects life, see a doctor or counsellor"], say: "I want to listen first, without hurrying to give an answer. What worries you most?" }
    },
    flag: "If worry lasts several weeks and clearly affects sleep, eating or school, or there are panic attacks, school refusal, repeated physical symptoms or any thought of self-harm, see a paediatrician or child-psychology professional promptly."
  },
  "em-school": {
    when: "School reluctance", short: "Dawdling, resisting homework, saying “I don’t want to learn”",
    why: {
      baby: "Does not apply yet.",
      toddler: "Does not apply yet; at this age it is play and exploring, not “lessons”.",
      prek: "Not sitting still and not wanting table activities are typical of the age. Keep lessons short, move around and learn through play.",
      early: "There are many causes: too hard or too easy, not sitting still, not liking this way of learning, tiredness, being compared, fear of mistakes, difficulty with reading or maths. Find the cause before talking about attitude.",
      mid: "Doubts about why learn, the pull of peers and screens, fear from perfectionism, being bullied or anxiety can all show up as “I don’t want to learn”.",
      teen: "Motivation, direction, pressure, lack of sleep and low mood all play a part. Persistent avoidance or low mood needs to be taken seriously and not written off as laziness."
    },
    steps: ["Find the cause first: ask “which part do you least want to do?”, watch when resistance is strongest, and rule out lack of sleep, hunger, bullying and learning difficulties", "Adjust the pace: shorter lessons, easy before hard, give a choice (maths first or reading first)", "Let them taste success: start from what they can do, and affirm effort in particular, not only results", "Link learning to their interests and to God’s creation; let them know what they learn for (Colossians 3:23)", "Do not use love as a bargaining chip, compare with others or shame", "Homeschool: rest days and holidays must be real rest; adjust the curriculum if needed"],
    say: "I can see you really don’t want to do this today. Which part is hardest? Let’s start with five minutes of the easiest bit.",
    avoid: "“How can you be so lazy?”, comparing with other children, using love as leverage, piling on more, dragging on until late at night.",
    byBand: { teen: { steps: ["Talk first and do not lecture: how do they see their learning and the future?", "Tell tiredness, mood, difficulty and loss of direction apart", "Set goals and pace together, with them taking part", "Protect sleep and exercise, and limit screens squeezing out study", "For persistent avoidance, low mood or a sudden drop in grades, see the teacher, a doctor or a counsellor"], say: "I don’t want to just push you. I’d like to know how you’re thinking about it now, and we’ll see together how to adjust." } },
    flag: "If they keep refusing school, are low in mood, have repeated physical symptoms or a sudden drop in grades, or you suspect a learning difficulty (reading, maths, attention), see the teacher, a paediatrician or a learning-assessment professional."
  },
  "em-screen": {
    when: "Screens (rules for use)", short: "How long, when, what, and how Mum and Dad stay united",
    table: { head: ["Age", "General advice (AAP and others)"], rows: [
      ["Under 2", "Avoid screens as far as possible, except video calls; from 18–24 months, if used, choose high-quality content and watch and talk about it together"],
      ["2–5", "About 1 hour a day or less of high-quality content, watched together; none at meals and the hour before bed"],
      ["From 6", "Stop only counting minutes: make a “family media plan” together so that sleep, exercise, homework and face-to-face time with family and friends are not squeezed out"],
      ["Teens", "Clear screen-free times and places (the table, the bedroom, before bed), with the phone charging in a set place at night; talk more than monitor, with parental controls as a bottom line"]
    ] },
    why: {
      baby: "What a child needs is interaction with people, touch and talk; screens cannot replace that. Putting your phone down beside them is itself teaching.",
      toddler: "They are easily drawn in and easily upset when it is switched off. Screens are not forbidden, but need a warning, a time limit, content and an adult beside them.",
      prek: "They begin to imitate adults’ screen use. Warning them before it ends and fixing when and where it is used works better than banning on the spot.",
      early: "They start to have favourite games and videos. The point is building habits: what first, what next, how long, and where.",
      mid: "Tablets, games, videos and classmates’ chats. The family needs to set the rules together and explain the values behind them, not just say “no”.",
      teen: "The phone becomes the centre of social life. Rules need to be agreed together with them, with conversation, trust and clear bottom lines."
    },
    steps: [
      "Mum and Dad first talk it over when the children are not there and write a one-page “family screen agreement”; announce it only when you both agree, and keep any disagreement between the two of you, not in front of the children",
      "Lead by example: keep the same rules yourself at the table, when with the children and before bed; do not scroll while asking them to put theirs down",
      "Set screen-free times and places: meals, the hour before bed, the bedroom; at night phones charge in a set place",
      "Guard content: watch before giving; little ones watch with an adult, older ones regularly watch with you what they watch; set parental controls, but ongoing conversation matters more",
      "Explain with values, not just “no”: time is God’s gift and should be redeemed; what we watch and hear should help us love God and others (Philippians 4:8, Ephesians 5:15-16)",
      "Do not use screens as a babysitter, a reward or a punishment; warn before it ends, use a timer, and keep your word",
      "Review together once a month: are the rules right, do they need adjusting; affirm specifically when they keep them"
    ],
    say: "Five minutes of screen time left. When the time is up we’ll switch off together, then go outside for a walk. Our family can use screens; we just want them to help us rather than take us over.",
    avoid: "Scrolling your own phone all the time; using a screen to soothe crying; confiscating suddenly without explanation; one parent lax and one strict so the child plays one against the other; using screens as reward or punishment.",
    byBand: {
      early: { steps: ["Mum and Dad first talk it over and write the family screen agreement, then announce it together", "Fix when and where it is used (for example weekend afternoons, in the living room), with none at other times by default", "Do what matters first (homework, tidying, outdoors), then screens", "Warn five minutes before the end, use a timer, and keep to it", "Guard content: watch before giving, watch together, and talk afterwards", "Keep the rules yourselves too: no phones at the table or before bed"], say: "Our rule is: finish homework first, then half an hour. When time’s up we switch off together, OK?" },
      teen: { steps: ["Parents first agree a common position, then work out the rules with the child; having a say makes rules easier to keep", "Make the bottom lines clear: phones in a set place at bedtime and overnight, no screens at the table, no sharing of private or inappropriate content", "Use conversation instead of monitoring: what are they watching, what are classmates talking about, is anything making them uncomfortable?", "Teach them to tell what helps from what drains, what to delete and what to tell an adult", "Watch sleep, mood, grades and friends: if screens are squeezing them out, go back to talking about the rules", "Use parental controls as a bottom line, not the whole answer; if needed, do a few days of “screen fast” as a family to recalibrate"], say: "I’m not trying to control you; I want to help you use your phone so that it helps you. Let’s agree on rules we can all keep, and Mum and Dad will follow them too." }
    },
    flag: "If sleep is clearly affected, grades or mood drop, or stopping brings fierce tantrums or lying, see “Addiction”; seek professional help if needed."
  },
  "em-addict": {
    when: "Addiction vs hobby", short: "Phone, games, or one particular passion: love of it, or hooked?",
    table: { head: ["What to look at", "Hobby / passion", "Possibly hooked"], rows: [
      ["Can they stop", "Can stop as agreed; unhappy for a while, then recovers", "Almost cannot; irritable, angry or tearful as soon as it stops"],
      ["Its place", "A part of life, with other friends and interests", "Takes up more and more; other interests and friends fall away"],
      ["Time", "Steady, not growing", "Growing; needs longer to feel satisfied"],
      ["Effect on life", "Sleep, meals, study and family relationships are normal", "Sleep, homework, meals and family relationships suffer"],
      ["Honesty", "Willing to say how long and what they did", "Hides it, lies, uses it in secret"],
      ["Knowing it harms", "Listens to advice and adjusts", "Carries on despite knowing the harm, cannot be moved"],
      ["Mood", "Happy while doing it, calm afterwards", "Numb or high while doing it, empty and irritable when stopped"]
    ] },
    why: {
      baby: "Does not apply.",
      toddler: "Does not apply.",
      prek: "Does not apply. At this age what is needed is rules for screen use; see “Screens”.",
      early: "Liking a certain game or video is common. What matters is whether they can stop as agreed and whether it is squeezing out sleep and other activities, not only how long.",
      mid: "Absorption often starts from escaping stress, peer relationships or lack of achievement. “Loss of control, rising priority, continuing despite harm and clear impact on life” is a fairly established yardstick (the WHO’s description of gaming disorder, usually requiring about 12 months before diagnosis); at home you need not wait that long, just look at the trend.",
      teen: "Phones, games, social media, pornography and other substances can all become an escape. Telling “passion” from “being mastered” is about freedom: can they still say no?"
    },
    steps: ["Do not ban first; look clearly first: compare against the table above and observe for a week or two, using Little Moon to log screen time and sleep", "Ask how they feel first: what does it give them? friends, achievement, escape from stress, or boredom?", "Make the rules together: time, place and order, rather than confiscating on your own", "Fill the gap with something else: sport, outdoors, friends, chores, interests; the freed time needs something to take its place", "Reduce gradually rather than stopping all at once (unless the content is harmful); lead by example", "Tell them what it means “not to be mastered”: all things are lawful, but not all are helpful, and I will not be mastered by anything (1 Corinthians 6:12)", "If several “possibly hooked” signs match and persist, see a paediatrician or child-psychology professional and do it together"],
    say: "I can see you really love this. I’m not trying to take it away. I’d like us to look together at what it gives you, and how to make it help you rather than hold on to you.",
    avoid: "Confiscating suddenly without explanation, shaming in public, using love as leverage, being hooked yourself while demanding they quit.",
    byBand: { mid: { steps: ["First compare against the table above, observe for a week or two, and log screens and sleep", "Listen to what it gives them", "Set rules and alternative activities together, and cut back gradually", "Watch for changes in friends, mood, sleep and grades", "If several “possibly hooked” signs match and persist, see a professional"], say: "I’d like us to work out together whether this is something you really love or whether you can’t stop it." } },
    flag: "If there are clear withdrawal reactions (extreme irritability or rage), lying and secret use, clearly worse sleep and study, low mood or any thought of self-harm, see a paediatrician or child-psychology professional promptly."
  },
  "em-news": {
    when: "Current events (news, disasters, controversies)", short: "A child hears or sees bad news, war, disasters, social controversy",
    why: {
      baby: "Does not apply; keep news images away from them.",
      toddler: "Does not apply; they can sense an adult’s emotion and tone, so adults should steady themselves first.",
      prek: "Fragments they hear can frighten them and they imagine worse. Few images and short, safe words are enough.",
      early: "They hear classmates and adults talk and ask very concrete questions (“Will it come here?”). They need honest, brief, reassuring answers.",
      mid: "They can understand more, see a lot of information and also worry. They need to learn to separate fact from opinion and to judge sources.",
      teen: "They have their own views, are drawn to controversy and may also be overwhelmed. They need conversation, not only prohibition."
    },
    steps: ["Ask first: “What did you hear? What do you think?” Listen first, then answer", "Age-appropriate, honest and brief: do not lie, and do not give every detail at once; stress “you are safe, and the grown-ups are looking after you”", "Limit repeated exposure to images, especially disasters and violence; turn off the news when they are there", "Bring the fear to God: he reigns and cares; pray together for those who suffer", "Give them something to do: pray, give, write a card, so they know they can love their neighbour", "Older children: separate fact from opinion, read different sources, view it through biblical values, welcome questions and do not fear their doubts", "Steady your own emotions first; do not spread fear or hatred, and model respect when you discuss others"],
    say: "I know something very bad has happened and you’re a bit worried. You are safe, and Mum and Dad are here. God is in charge too, and we can pray together for the people who are suffering.",
    avoid: "Telling them nothing (they will hear it elsewhere), lying, saying too much at once, showing fear in front of them, hating a group, or letting them keep watching repeated disaster footage.",
    byBand: { teen: { steps: ["Listen to how they see it first and do not rush to correct", "Read different sources together and tell fact, opinion and emotive headlines apart", "Talk in terms of biblical values: justice, mercy, truth, loving enemies; allow unresolved questions", "Watch whether they are overwhelmed, and limit time spent refreshing the news", "Act together: pray, serve, give", "Respect different views; home should be a place where questions can be asked"], say: "I’d like to know how you see it. You can ask anything, and we’ll look for answers together in God’s word; where we can’t find them, we’ll honestly say “we don’t understand yet”." } },
    flag: "If there is persistent fear, nightmares, avoidance of school or going out, or repeated mention of death or harm, see a paediatrician or child-psychology professional."
  },
  "em-puberty-f": {
    when: "Girls’ physical development (puberty)", short: "Body changes, periods, privacy, and what Dad can do",
    why: {
      baby: "Not needed yet, but you can teach the correct names for body parts and that “what underwear covers is private”.",
      toddler: "Not needed yet, but teach the correct names for body parts and body boundaries.",
      prek: "Not needed yet; keep using correct names and teach body boundaries: they can say no, and tell an adult if anything feels wrong.",
      early: "Some girls begin to show body changes at 8–9 (the usual range is about 8–13), so it is good to begin gently at 7–9: talking before the changes happen is better than after.",
      mid: "Most girls enter puberty; the average first period is around 12 (usually 10–15). Moods swing, they care about how they look and about peers. Many girls value privacy more, and the way they interact with Dad changes too; this is common, though not everyone, and it is not aimed at Dad.",
      teen: "Many body changes have happened; self-image, friendships, emotions and future relationships become the focus, and they need a steady, accepting home."
    },
    steps: ["Mum (or a trusted woman) leads: breast development, body hair, periods, hygiene products; use correct names, answer honestly, and do not let her pick it up from classmates or online", "Dad’s role: stay close and affirming; do not comment on her body or joke; knock and respect privacy; affirm her character and effort, not only her looks", "Dad’s mental preparation: for a while she may prefer to talk to Mum and not want long hugs. Do not feel hurt and do not press; say “I’m always here”, and keep being there in daily life (walks, drives, shared hobbies)", "Have supplies ready, and an emergency pouch in her school bag; teach her how to track her cycle", "A warm “blessing” moment can help: Mum and Dad pray a blessing, so she knows this is a wonderful part of God’s creation; whether to have a ceremony is her choice", "Talk with her about friendships, body boundaries, comparison and inappropriate content on her phone, and how to say no; let her know she can tell you anything"],
    say: "You’re growing up, and I’m so glad. Your body is God’s wonderful creation. I’m here whenever you want to talk.",
    avoid: "Commenting on her figure, joking that “you’ve put on weight now you’re growing up”, forcing hugs, discussing her development with others, or making her feel that periods are shameful.",
    byBand: {
      mid: { steps: ["Mum (or a trusted woman) leads: breast development, body hair, periods, hygiene products; use correct names, answer honestly, and do not let her pick it up from classmates or online", "Dad’s role: stay close and affirming; do not comment on her body or joke; knock and respect privacy; affirm her character and effort, not only her looks", "Dad’s mental preparation: for a while she may prefer to talk to Mum and not want long hugs. Do not feel hurt and do not press; say “I’m always here”, and keep being there in daily life (walks, drives, shared hobbies)", "Have supplies ready, and an emergency pouch in her school bag; teach her how to track her cycle", "A warm “blessing” moment can help: Mum and Dad pray a blessing, so she knows this is a wonderful part of God’s creation; whether to have a ceremony is her choice", "Talk with her about friendships, body boundaries, comparison and inappropriate content on her phone, and how to say no; let her know she can tell you anything"], say: "You’re growing up, and I’m so glad. Your body is God’s wonderful creation. I’m here whenever you want to talk." },
      early: { steps: ["Start before the changes: Mum explains in simple words how the body will change", "Use correct names, answer honestly, a little at a time", "Dad stays close, knocks, respects privacy and does not comment on her body", "Have supplies ready and teach her how to use them", "Pray for her, so she knows growing up is part of God’s good plan"], say: "Your body will slowly grow up, which is God’s wonderful creation. Mum will tell you what changes to expect, and you can ask us anything." }
    },
    flag: "If breast development or body hair appears before 8, or there is still no period at 15 (or about 3 years after breast development begins), or periods are very painful or heavy, see a paediatrician or gynaecologist (a general guide)."
  },
  "em-puberty-m": {
    when: "Boys’ physical development (puberty)", short: "Voice change, growth spurt, nocturnal emissions, moods and curiosity about sex",
    why: {
      baby: "Not needed yet, but teach correct names for body parts and boundaries.",
      toddler: "Not needed yet; teach correct names for body parts and boundaries.",
      prek: "Not needed yet; keep teaching body boundaries.",
      early: "Most boys have no obvious changes yet; you can give a simple heads-up: “Your body will slowly change later on, as God designed.”",
      mid: "Boys usually start puberty a year or two later than girls (commonly about 9–14): growth spurt, voice change, body hair, nocturnal emissions, mood swings. Curiosity about sex is common, and they may meet inappropriate content online.",
      teen: "Body and emotions change a lot; they need a steady male role model (Dad or a trusted man), clear values, and a home where they can ask freely."
    },
    steps: ["Dad (or a trusted man) leads, and talks before the changes arrive: growth, voice change, body hair and nocturnal emissions are all normal", "Answer honestly without shaming; let him know he can ask at any time", "Talk clearly about inappropriate content online: how to avoid it and what to do if they come across it (tell an adult, and they will not be blamed)", "Screen rules (see “Screens”): no devices in the bedroom overnight, filters on, agreed together", "Talk about respect: for girls, for their own body, and the beauty and boundaries of sex in the Bible", "Watch moods: irritability, withdrawal or falling grades deserve an extra question; give space and company (exercise, doing things together)"],
    say: "Your body is growing, which is God’s design, and every boy goes through it. You can ask me anything; I won’t laugh at you or be angry.",
    avoid: "Shaming, avoiding the topic, telling everything at once, frightening them instead of teaching, joking about his body.",
    byBand: { mid: { steps: ["Dad leads and talks early: growth, voice change, body hair and nocturnal emissions are all normal", "Answer honestly without shaming; let him know he can ask at any time", "Talk clearly about inappropriate content online and what to do about it", "Agree screen rules together; no devices in the bedroom overnight", "Talk while doing things together, such as exercise"], say: "You’re about to reach the age when the body changes. I want to tell you first what will happen, so you won’t be surprised or afraid." } },
    flag: "If testicular enlargement or body hair appears before 9, or there are no changes at all by 14, see a paediatrician (a general guide); if mood stays low or there are thoughts of self-harm, see a professional promptly."
  }
};

export { CONFLICTS_EN, EMOTIONS_EN };
