// POST /api/trip/say {title, type, note, g} — a few extra Thai sentences for one stop of the trip, beyond the
// checked phrase library. Marked as AI-written in the page.
import { chatJSON, cleanToks, guard, json, lexicon, ROM_RULE } from "../../_lib/bailian.js";

export async function onRequestPost({ request, env }) {
  const blocked = await guard(request, env, "say");
  if (blocked) return blocked;
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "请求格式不对" }, 400); }
  const title = String(b.title || "").slice(0, 30), note = String(b.note || "").slice(0, 60), type = String(b.type || "").slice(0, 12);
  const g = b.g === "f" ? "f" : "m";
  if (!title) return json({ error: "缺少地点" }, 400);
  try {
    const { j } = await chatJSON(env, {
      model: "qwen3.8-flash", temperature: 0.4, max_tokens: 1200,
      messages: [
        { role: "system", content: `你是泰语口语老师。中国游客第一次来泰国，马上要去「${title}」（类型：${type}${note ? "，提醒：" + note : ""}）。
给 4 句在这里最可能用到、最短、泰国人日常真会说的泰语，按实际使用顺序排列。说话人是${g === "f" ? "女性，句尾用 ค่ะ（陈述）/ คะ（疑问）" : "男性，句尾用 ครับ"}。不要用 ผม/ฉัน，能省略主语就省略。
所有泰语都切分成词，每个词写成 ["泰文","罗马音","中文意思"]。${ROM_RULE}
输出 JSON：{"say":[{"zh":"中文意思","t":[["泰文","罗马音","中文"]]}]}` },
        { role: "user", content: title },
      ],
    });
    const lex = await lexicon(env, request);
    const say = (Array.isArray(j.say) ? j.say : []).slice(0, 5)
      .map(s => ({ zh: String(s.zh || "").slice(0, 30), t: cleanToks(s.t).map(t => lex.has(t[0]) ? [t[0], lex.get(t[0]), t[2]] : t) }))
      .filter(s => s.zh && s.t.length);
    if (!say.length) return json({ error: "没生成出来，再试一次" }, 502);
    return json({ say });
  } catch (e) {
    return json({ error: e.message || "生成失败" }, 502);
  }
}
