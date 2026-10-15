// POST /api/trip/plan {text} — one sentence about a Thailand trip → a day-by-day plan built only from real
// Fliggy items (data/trip/<city>.json snapshot). Two 百炼 calls: parse the request, then arrange the days.
import { chatJSON, guard, json } from "../../_lib/bailian.js";

const CITIES = { bkk: "曼谷", cnx: "清迈", hkt: "普吉", pty: "芭提雅", kbv: "甲米", usm: "苏梅岛" };
const TYPES = ["airport", "hotel", "temple", "market", "food", "transport", "boat", "island", "tour", "massage", "night", "elephant", "sight", "depart"];
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };

async function loadCity(env, request, c) {
  const r = await env.ASSETS.fetch(new URL(`/data/trip/${c}.json`, request.url));
  return r.ok ? r.json() : null;
}

// Compact candidate list for the model: ids + the few words it needs to choose well.
function candidates(d) {
  const hotels = d.hotels.slice(0, 30).map(h => `${h.id}|${clip(h.name, 24)}|${clip(h.area, 12)}|${h.star || ""}`);
  const pois = d.pois.filter(p => !/射击/.test(p.name)).slice(0, 45).map(p => `${p.id}|${clip(p.name, 16)}|${p.cat || ""}`);
  const products = d.products.slice(0, 40).map(p => `${p.id}|${p.kind}|${clip(p.title, 28)}`);
  return `【${d.cityZh}·酒店】\n${hotels.join("\n")}\n【${d.cityZh}·景点】\n${pois.join("\n")}\n【${d.cityZh}·可订服务（kind: transfer 接送机, sim 电话卡, tour 一日游, cooking 烹饪课, massage 按摩, ticket 门票, boat 游船, diving 潜水, elephant 大象营）】\n${products.join("\n")}`;
}

export async function onRequestPost({ request, env }) {
  const blocked = await guard(request, env, "plan");
  if (blocked) return blocked;
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "请求格式不对" }, 400); }
  const text = clip(b.text, 300);
  if (text.length < 4) return json({ error: "多说一点：去哪、几天、几个人" }, 400);
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // Bangkok date

  try {
    // 1) Understand the request.
    const { j: intent } = await chatJSON(env, {
      model: "qwen3.8-flash", temperature: 0.1, max_tokens: 500,
      messages: [
        { role: "system", content: `你把用户对泰国旅行的描述解析成 JSON。今天是 ${today}。只支持六个目的地：bkk=曼谷，cnx=清迈，hkt=普吉（芭东、卡伦等普吉岛上的地方），pty=芭提雅（芭堤雅、格兰岛、中天），kbv=甲米（奥南、皮皮岛、四岛、攀牙湾），usm=苏梅岛（查汶、帕岸岛、涛岛）。
输出：{"cities":[{"c":"bkk","nights":3}],"start":"YYYY-MM-DD 或 null","from":"出发城市或 null","people":数字或 null,"party":"独自|情侣|朋友|亲子|带老人|null","likes":["用户提到的兴趣，最多5个"],"pace":"轻松|适中|紧凑","other":"不在这三个城市的目的地，没有就 null"}
规则：
- 用户提到的目的地不在这六个里（如东京、首尔、华欣、大城、清莱），不要把它换成曼谷：cities 里只放真提到的代码，other 写那个目的地。只提到其他地方时 cities 为 []。
- 完全没提目的地才默认曼谷；没说天数默认 4 晚；总晚数不超过 10；"下个月20号"这类相对日期按今天换算，没说日期就 null。` },
        { role: "user", content: text },
      ],
    });
    let stay = (Array.isArray(intent.cities) ? intent.cities : []).filter(x => CITIES[x.c]).map(x => ({ c: x.c, nights: Math.max(1, Math.min(7, parseInt(x.nights, 10) || 3)) }));
    if (!stay.length) {
      if (intent.other) return json({ error: `目前支持曼谷、清迈、普吉、芭提雅、甲米、苏梅岛，「${clip(intent.other, 20)}」还没有数据` }, 400);
      stay = [{ c: "bkk", nights: 4 }];
    }
    stay = stay.slice(0, 3);
    const nights = stay.reduce((s, x) => s + x.nights, 0);
    if (nights > 10) stay = stay.map(x => ({ c: x.c, nights: Math.max(1, Math.round(x.nights * 10 / nights)) }));

    // 2) Arrange the days from real items only.
    const data = {};
    for (const s of stay) data[s.c] = data[s.c] || await loadCity(env, request, s.c);
    const days = stay.reduce((s, x) => s + x.nights, 0) + 1;
    const route = stay.map(s => `${CITIES[s.c]} ${s.nights} 晚`).join(" → ");
    const { j: plan } = await chatJSON(env, {
      model: "qwen3.8-flash", temperature: 0.5, max_tokens: 3500, timeout: 90000,
      messages: [
        { role: "system", content: `你是住在曼谷的华人旅行规划师，帮第一次来泰国的中国游客排行程。只能从下面的飞猪真实商品里挑选，用它们的 id 填 ref；列表里没有的东西 ref 写 null，绝不编造店名、价格、航班号。

${Object.values(data).map(candidates).join("\n\n")}

输出 JSON：
{"title":"行程标题，≤16字","summary":"一句话概括，≤40字","hotels":{"城市代码":"酒店 id"},"days":[{"d":1,"city":"bkk","theme":"当天主题，≤10字","items":[{"time":"HH:MM","type":"类型","ref":"id 或 null","title":"≤14字","note":"实用提醒，≤30字"}]}]}
type 只能是：airport 落地机场, hotel 酒店入住, temple 寺庙/大皇宫, market 市场夜市, food 吃饭, transport 打车/嘟嘟车/城市间移动, boat 坐船, island 海岛水上, tour 一日游/体验课, massage 按摩, night 酒吧夜生活, elephant 大象营, sight 其他景点, depart 返程。
规则：
- 一共 ${days} 天，路线：${route}。标题和概括只写这条路线里的城市，用户提到但不在路线里的地方不要写进去。每座城市选 1 家酒店写进 hotels，入住那天加一个 hotel 项，ref 填这家酒店。
- 第 1 天先 airport（ref 优先填该城市的 transfer 接送机商品），再 hotel 入住；最后一天以 depart 结束。
- 换城市那天加一个 transport 项，note 写「飞猪查国内航班/火车」，不写航班号。
- 每天 3–5 项，按时间排序，同一天的地点尽量顺路；节奏：${intent.pace || "适中"}。
- 用户情况：${intent.party || "未说明"}，${intent.people || "?"} 人，兴趣：${(intent.likes || []).join("、") || "未说明"}。
- note 只写到了现场真用得上、不会错的通用提醒：着装、早点去避开人多、先问价、备现金、防晒补水、看好随身物品、提前出发避开堵车。
- note 里不要写开放时间、闭馆日、票价、具体距离和车程，也不要推荐「中文导游」「找人带路」这类中间人服务；不确定的事不写。` },
        { role: "user", content: text },
      ],
    });

    // 3) Keep only real references and known types.
    const ids = new Set();
    for (const d of Object.values(data)) for (const k of ["hotels", "pois", "products"]) for (const it of d[k]) ids.add(it.id);
    const outDays = (Array.isArray(plan.days) ? plan.days : []).slice(0, 12).map((d, i) => ({
      d: i + 1,
      city: CITIES[d.city] ? d.city : stay[0].c,
      theme: clip(d.theme, 12),
      items: (Array.isArray(d.items) ? d.items : []).slice(0, 7).map(it => ({
        time: /^\d{1,2}:\d{2}$/.test(it.time) ? it.time.padStart(5, "0") : "",
        type: TYPES.includes(it.type) ? it.type : "sight",
        ref: ids.has(it.ref) ? it.ref : null,
        title: clip(it.title, 16),
        note: clip(it.note, 40),
      })).filter(it => it.title),
    })).filter(d => d.items.length);
    if (!outDays.length) return json({ error: "这次没排出来，换个说法再试一次" }, 502);

    // The model's own city labels are unreliable on transfer days: a day belongs to the city its real items
    // come from, falling back to the stay schedule. Hotels come from the check-in stops when the map is missing.
    const idCity = new Map();
    for (const [c, d] of Object.entries(data)) for (const k of ["hotels", "pois", "products"]) for (const it of d[k]) idCity.set(it.id, c);
    const expected = stay.flatMap(s => Array(s.nights).fill(s.c));
    outDays.forEach((d, i) => {
      const votes = {};
      for (const it of d.items) { const c = idCity.get(it.ref); if (c) votes[c] = (votes[c] || 0) + (it.type === "hotel" ? 2 : 1); }
      const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
      d.city = best ? best[0] : expected[Math.min(i, expected.length - 1)] || stay[0].c;
    });
    const hotels = {};
    for (const [c, id] of Object.entries(plan.hotels || {})) if (CITIES[c] && ids.has(id) && idCity.get(id) === c) hotels[c] = id;
    for (const d of outDays) for (const it of d.items) if (it.type === "hotel" && it.ref && it.ref[0] === "h") { const c = idCity.get(it.ref); if (c && !hotels[c]) hotels[c] = it.ref; }

    return json({
      notice: intent.other ? `「${clip(intent.other, 20)}」还没有飞猪数据，这次只排了${stay.map(s => CITIES[s.c]).join("、")}` : null,
      plan: { title: clip(plan.title, 18) || route, summary: clip(plan.summary, 50), hotels, days: outDays },
      intent: { stay, start: /^\d{4}-\d{2}-\d{2}$/.test(intent.start || "") ? intent.start : null, people: intent.people || null, party: intent.party || null, from: intent.from || null },
      data: { fetchedAt: Object.values(data)[0].fetchedAt, source: Object.values(data)[0].source },
    });
  } catch (e) {
    return json({ error: e.message || "生成失败，请再试一次" }, 502);
  }
}
