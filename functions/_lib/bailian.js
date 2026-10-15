// Alibaba Cloud Model Studio (百炼) helpers for the 安心游 trip API.
// Key and workspace endpoint come from Pages secrets DASHSCOPE_API_KEY / DASHSCOPE_BASE; nothing reaches the browser.

export const ROM_RULE = "罗马音只用 a–z 字母加声调符号：中平调不标，低调 à，降调 â，高调 á，升调 ǎ。元音写法：แ = ae，อ = aw，เออ = oe，อึ/อือ = ue，เอีย = ia，อัว = ua，ไ/ใ = ai，เอา = ao，อำ = am；长元音双写（aa、ii、uu、ee、oo）；ง 写 ng。不要用 ə、ɛ、ɔ、ŋ、ʉ、ɯ 这类音标符号。一个词里的音节用 - 连接。例：ขอ = khǎw，แพง = phaeng，เจอ = joe，ถึง = thǔeng，ครับ = khráp，พาสปอร์ต = pháat-sà-pàwt。";

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const parseJSON = s => { const a = s.indexOf("{"), b = s.lastIndexOf("}"); return JSON.parse(s.slice(a, b + 1)); };

// One chat completion (OpenAI-compatible endpoint). Thinking is off: it multiplies latency for no gain here.
export async function chat(env, { model = "qwen3.8-flash", messages, json: asJSON = false, temperature = 0.4, max_tokens = 2000, timeout = 60000 }) {
  const body = { model, messages, temperature, max_tokens, enable_thinking: false };
  if (asJSON) body.response_format = { type: "json_object" };
  const res = await fetch(env.DASHSCOPE_BASE.replace(/\/$/, "") + "/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.DASHSCOPE_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("百炼 " + res.status + ": " + ((j.error && j.error.message) || "请求失败"));
  return { text: (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "", usage: j.usage || null };
}

// JSON-mode call with one retry: models occasionally return malformed JSON.
export async function chatJSON(env, opts) {
  for (let i = 0; ; i++) {
    const { text, usage } = await chat(env, Object.assign({ json: true }, opts));
    try { return { j: parseJSON(text), usage }; } catch (e) { if (i >= 1) throw new Error("AI 返回格式不对，请再试一次"); }
  }
}

// Map stray IPA vowels to the course's spelling (same rule as the main app's fixRom).
export const fixRom = x => String(x || "").normalize("NFD")
  .replace(/ɛ([̀-ͯ]?)ɛ?/g, "a$1e")
  .replace(/ɔ([̀-ͯ]?)ɔ?/g, "a$1w")
  .replace(/ə([̀-ͯ]?)ə?/g, "o$1e")
  .replace(/[ʉɯ]([̀-ͯ]?)[ʉɯ]?/g, "u$1e")
  .replace(/ŋ/g, "ng").normalize("NFC");

// Romanisation checked against the course: every word already in data/scenes.json keeps the course's
// spelling, so the model's tone mistakes on common words (ค่ะ, ขอบคุณ …) never reach the page.
let LEX = null;
export async function lexicon(env, request) {
  if (LEX) return LEX;
  const m = new Map([["ครับ", "khráp"], ["ค่ะ", "khâ"], ["คะ", "khá"]]);
  try {
    const d = await env.ASSETS.fetch(new URL("/data/scenes.json", request.url)).then(r => r.json());
    for (const s of Object.values(d.scenes)) {
      for (const l of s.lines) for (const t of l.t) if (t.length === 3 && !m.has(t[0])) m.set(t[0], t[1]);
      for (const w of s.words || []) if (w.th && (w.rom || w.r) && !m.has(w.th)) m.set(w.th, w.rom || w.r);
    }
  } catch (e) { /* fall back to the model's romanisation */ }
  return (LEX = m);
}

export const cleanToks = t => (Array.isArray(t) ? t : []).filter(x => Array.isArray(x) && x[0]).slice(0, 14)
  .map(x => [String(x[0]).slice(0, 40), fixRom(x[1]).slice(0, 60), String(x[2] || "").slice(0, 30)]);

// Same-site guard plus a per-IP hourly budget kept in D1, so a scraper cannot drain the free quota.
const LIMITS = { plan: 12, check: 30, say: 40, live: 40, read: 30 };
export async function guard(request, env, kind) {
  const origin = request.headers.get("Origin") || "";
  if (origin && !/^https:\/\/([a-z0-9-]+\.)?bianzithai\.pages\.dev$/.test(origin) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return json({ error: "不支持的来源" }, 403);
  }
  if (!env.DASHSCOPE_API_KEY || !env.DASHSCOPE_BASE) return json({ error: "服务还没配置好" }, 503);
  if (!env.DB) return null;
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const now = Date.now();
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM trip_calls WHERE ip = ? AND k = ? AND ts > ?").bind(ip, kind, now - 3600e3).first();
    if (r && r.n >= LIMITS[kind]) return json({ error: "用得有点多了，休息一下，一小时后再试" }, 429);
    const all = await env.DB.prepare("SELECT COUNT(*) AS n FROM trip_calls WHERE ts > ?").bind(now - 86400e3).first();
    if (all && all.n >= 5000) return json({ error: "今天的免费额度用完了，明天再来" }, 429);
    await env.DB.prepare("INSERT INTO trip_calls (ts, ip, k) VALUES (?, ?, ?)").bind(now, ip, kind).run();
  } catch (e) { /* the table is optional: never block a user because the counter failed */ }
  return null;
}
