// node --test tests/music-lists.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../js/music-lists.js";

const TAGS = { loved: "被爱与安慰", word: "神的话语", rest: "放下与休息", wake: "轻柔唤醒" };
const song = (id, tags = [], extra = {}) => ({ id, title: id, tags, path: id + ".mp3", sort: +id.replace(/\D/g, "") || 0, ...extra });
const SONGS = [song("s1", ["word"]), song("s2", ["word", "rest"]), song("s3", ["loved"]), song("s4", []), song("s5", ["wake"], { path: null })];

test("默认歌单：按标签自动归类，空标签不列出；一首歌可以在多个歌单里；顺序跟歌单页的顺序", () => {
  const lists = M.allLists(SONGS, [], TAGS);
  assert.deepEqual(lists.map(l => l.id), ["all", "tag:word", "tag:loved", "tag:rest", "tag:wake"]);
  assert.deepEqual(lists.find(l => l.id === "tag:word").songs.map(s => s.id), ["s1", "s2"]);
  assert.deepEqual(lists.find(l => l.id === "tag:rest").songs.map(s => s.id), ["s2"]);
  assert.equal(lists[0].songs.length, 5);   // 没标签的 s4 只在「全部」里
  assert.deepEqual(M.allLists(SONGS.filter(s => s.id !== "s5"), [], TAGS).map(l => l.id), ["all", "tag:word", "tag:loved", "tag:rest"]);   // 没有唤醒歌就不列这个歌单
});

test("自定义歌单：新建、重名拒绝、空名拒绝；名字去掉多余空格并限长", () => {
  const r = M.createList([], "  早晨  唱的歌 ", "a"); assert.ok(r.ok); assert.equal(r.playlists[0].name, "早晨 唱的歌");
  assert.equal(M.createList(r.playlists, "早晨 唱的歌", "b").error, "dup");
  assert.equal(M.createList(r.playlists, "   ", "b").error, "empty");
  assert.equal(M.createList([], "x".repeat(80), "c").playlists[0].name.length, M.MAX_NAME);
  const re = M.renameList(r.playlists, "a", "晚上"); assert.equal(re.playlists[0].name, "晚上");
  assert.equal(M.renameList([...r.playlists, { id: "b", name: "别的", songs: [] }], "b", "早晨 唱的歌").error, "dup");
  assert.deepEqual(M.deleteList(r.playlists, "a"), []);
});

test("加歌 / 删歌 / 调顺序：加歌不重复、新加的排在最后；越界不动；不改原数组", () => {
  const base = [{ id: "a", name: "A", songs: ["s1"] }, { id: "b", name: "B", songs: [] }];
  const c = M.addSongs(base, "a", ["s2", "s1", "s3", "s3"]); assert.deepEqual(c[0].songs, ["s1", "s2", "s3"]);
  assert.deepEqual(base[0].songs, ["s1"]); assert.deepEqual(c[1], base[1]);
  assert.deepEqual(M.removeSong(c, "a", "s2")[0].songs, ["s1", "s3"]);
  assert.deepEqual(M.moveSong(c, "a", "s3", -1)[0].songs, ["s1", "s3", "s2"]);
  assert.deepEqual(M.moveSong(c, "a", "s1", -1)[0].songs, ["s1", "s2", "s3"]);   // 已在最前
  assert.deepEqual(M.moveSong(c, "a", "s3", 1)[0].songs, ["s1", "s2", "s3"]);    // 已在最后
  assert.equal(M.inList(c, "a", "s2"), true); assert.equal(M.inList(c, "b", "s2"), false);
});

test("自定义歌单里已被删除的歌自动消失，不影响其它；歌单 id 带 pl: 前缀", () => {
  const custom = [{ id: "a", name: "A", songs: ["s3", "gone", "s1"] }];
  const l = M.findList(M.allLists(SONGS, custom, TAGS), "pl:a");
  assert.deepEqual(l.songs.map(s => s.id), ["s3", "s1"]); assert.equal(l.kind, "custom");
});

test("引用的歌单被删了 / 标签空了，退回「全部歌曲」，不会指到空处", () => {
  const lists = M.allLists(SONGS, [], TAGS);
  assert.equal(M.validListId(lists, "tag:word"), "tag:word"); assert.equal(M.validListId(lists, "pl:gone"), "all"); assert.equal(M.validListId(lists, undefined), "all");
  const music = M.musicOf({ music: { tilePick: { k1: "tag:loved", k2: "pl:gone" } } });
  assert.equal(M.tilePickOf(music, "k1", lists), "tag:loved"); assert.equal(M.tilePickOf(music, "k2", lists), "all"); assert.equal(M.tilePickOf(music, "k3", lists), "all");
  assert.deepEqual(M.musicOf(undefined), { playlists: [], tilePick: {}, routineList: {} });
});

test("周例行的「学歌」按钮：明确选的优先；none 不显示；没选时标题像音乐 / 敬拜才自动出现，用这个孩子音乐格的歌单；歌单里没有可播的歌就不出现", () => {
  const lists = M.allLists(SONGS, [], TAGS), mk = rl => M.musicOf({ music: { tilePick: { k1: "tag:word" }, routineList: rl } });
  const worship = { id: "r1", title: "家庭敬拜：一首诗歌、一个故事" }, math = { id: "r2", title: "数学" };
  assert.equal(M.routineListOf(mk({}), worship, "k1", lists), "tag:word");     // 自动：用孩子音乐格的歌单
  assert.equal(M.routineListOf(mk({}), math, "k1", lists), "");                 // 不像音乐的例行不出现
  assert.equal(M.routineListOf(mk({ r2: "tag:loved" }), math, "k1", lists), "tag:loved");   // 明确关联优先，哪怕标题不像音乐
  assert.equal(M.routineListOf(mk({ r1: "none" }), worship, "k1", lists), "");  // 明确关闭
  assert.equal(M.routineListOf(mk({ r1: "pl:gone" }), worship, "k1", lists), "");           // 关联的歌单没了：不出现，不乱指
  assert.equal(M.routineListOf(M.musicOf({}), { id: "r3", title: "音乐：本月赞美诗" }, "k1", M.allLists([], [], TAGS)), "");   // 没有歌：不出现
  assert.equal(M.routineListOf(mk({}), null, "k1", lists), "");
});

test("播放顺序：列表循环 / 单曲循环 / 播完停；上一首绕回末尾", () => {
  assert.deepEqual([0, 1, 2].map(i => M.nextIndex(i, 3, "list")), [1, 2, 0]);
  assert.deepEqual([0, 1, 2].map(i => M.nextIndex(i, 3, "off")), [1, 2, -1]);
  assert.equal(M.nextIndex(1, 3, "one"), 1); assert.equal(M.nextIndex(0, 0), -1);
  assert.equal(M.prevIndex(0, 3), 2); assert.equal(M.prevIndex(2, 3), 1); assert.equal(M.prevIndex(0, 0), -1);
});

test("playable：没有音频文件的歌不进播放队列", () => {
  assert.deepEqual(M.playable(SONGS).map(s => s.id), ["s1", "s2", "s3", "s4"]);
});
