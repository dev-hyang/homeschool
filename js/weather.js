import { LS_PREFIX } from "./core/config.js";
import { H, loadJSON, saveJSON } from "./core/util.js";

/* ============ 睡眠卡的天气场景 ============
   白天孩子醒着时，睡眠卡里的卡通宝宝按天气换活动：下雪坐雪橇、冷天溜冰、下雨跳水坑、热天游泳、有风放风筝、晴天骑车踢球。
   天气来自 Open-Meteo（免费、不要 key），只有用户在睡眠卡上点「用当地天气」并允许定位之后才会请求；
   位置只存在这台设备的 localStorage（取到小数点后两位，约 1 公里），请求里只带这两个坐标。
   没开定位、没网或取不到时，按月份和钟点估一个季节场景（按北半球），不报错。 */
const LOC_KEY = LS_PREFIX + ".wxloc";
const FRESH = 30 * 60e3;
let cur = null, at = 0, inflight = false, failedAt = 0;

const loc = () => { const l = loadJSON(LOC_KEY, null); return l && isFinite(l.lat) && isFinite(l.lon) ? l : null; };
const hasLoc = () => !!loc();

/** 每种场景：天空色 sky、跑来跑去的主角 run、点缀 deco（[表情, 横向位置 %, fall 飘落 / sway 轻晃, 延迟秒]）、说明 cap（中文原文，界面里走 t()） */
const SCENES = {
  snow:   { sky: "snow", run: "👶🛷", deco: [["❄️", 8, "fall", 0], ["❄️", 30, "fall", 2], ["❄️", 52, "fall", 1], ["❄️", 74, "fall", 3.2], ["⛄", 88, "ground", 0]], cap: "下雪啦：宝宝坐雪橇冲下山坡" },
  skate:  { sky: "cold", run: "👶⛸️", deco: [["🧣", 86, "ground", 0], ["❄️", 22, "fall", 1], ["❄️", 62, "fall", 3]], cap: "天气冷冷的：宝宝去溜冰" },
  rain:   { sky: "rain", run: "👶☔", deco: [["🌧️", 14, "sway", 0], ["💧", 34, "fall", 0.5], ["💧", 58, "fall", 1.8], ["🐸", 88, "ground", 0]], cap: "下雨天：宝宝撑着伞跳水坑" },
  swim:   { sky: "hot", run: "👶🏊", deco: [["☀️", 86, "sway", 0], ["🌊", 12, "ground", 0.4], ["🐠", 48, "sway", 1.2]], cap: "天气热：宝宝下水游泳" },
  kite:   { sky: "mild", run: "👶🪁", deco: [["☁️", 18, "sway", 0], ["☁️", 62, "sway", 1.5], ["🌤️", 88, "sway", 0.6]], cap: "有点云、有点风：宝宝放风筝" },
  play:   { sky: "sun", run: "👶🚴", deco: [["🌳", 8, "ground", 0], ["⚽", 50, "ground", 0.8], ["☀️", 88, "sway", 0.3]], cap: "大晴天：宝宝骑车踢球" },
  leaves: { sky: "fall", run: "👶🍂", deco: [["🍁", 12, "fall", 0], ["🍂", 38, "fall", 1.6], ["🍁", 64, "fall", 3], ["🌳", 90, "ground", 0]], cap: "秋天：宝宝踩落叶" },
  night:  { sky: "night", run: "👶🥱", deco: [["⭐", 14, "sway", 0], ["⭐", 44, "sway", 1], ["⭐", 70, "sway", 2], ["🌙", 88, "sway", 0]], cap: "夜深了：宝宝打哈欠，该睡觉啦" }
};

/** 现在该演哪一幕 */
function sceneNow(now = new Date()){
  const w = hasLoc() && cur && Date.now() - at < 3 * H ? cur : null, month = now.getMonth(), hr = now.getHours();
  if (w ? !w.day : hr >= 19 || hr < 6) return SCENES.night;
  if (w) {
    const c = w.code, tmp = w.temp;
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return SCENES.snow;
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return SCENES.rain;
    if (tmp >= 28) return SCENES.swim;
    if (tmp <= 3) return SCENES.skate;
    if (c >= 1 && c <= 48) return SCENES.kite;
    return SCENES.play;
  }
  if (month === 11 || month <= 1) return SCENES.snow;
  if (month >= 5 && month <= 7) return SCENES.swim;
  if (month >= 2 && month <= 4) return SCENES.kite;
  return SCENES.leaves;
}

/** 有位置时取一次天气（30 分钟内不重复；失败 10 分钟后才再试）。取到后调 onDone 让页面重画 */
async function ensureWeather(onDone, force = false){
  const l = loc();
  if (!l || inflight || !navigator.onLine) return;
  if (!force && ((cur && Date.now() - at < FRESH) || Date.now() - failedAt < 10 * 60e3)) return;
  inflight = true;
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const c = (await r.json()).current || {};
    if (!isFinite(+c.temperature_2m)) throw new Error("no data");
    cur = { temp: +c.temperature_2m, code: +c.weather_code || 0, day: +c.is_day === 1 }; at = Date.now(); failedAt = 0;
    if (onDone) onDone();
  } catch (e) { failedAt = Date.now(); console.warn("weather", e.message || e); }
  inflight = false;
}

/** 点「用当地天气」：请求定位（浏览器会弹授权），存到本机，然后取天气。成功返回 true */
function askLocation(onDone){
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(false); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      saveJSON(LOC_KEY, { lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2) });
      await ensureWeather(onDone, true); resolve(true);
    }, () => resolve(false), { timeout: 8000, maximumAge: 3600e3 });
  });
}
function clearLocation(){ try { localStorage.removeItem(LOC_KEY); } catch (e) {} cur = null; at = 0; }

export { sceneNow, ensureWeather, askLocation, clearLocation, hasLoc };
