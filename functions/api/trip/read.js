// POST /api/trip/read {image} — 「拍一下看懂」: a menu, sign, notice or price list photographed in Thailand.
// 百炼 qwen3-vl-plus only copies the text it sees (free-form vision summaries invent dishes); qwen3.8-flash then
// explains just that text line by line, with readings for Thai, and flags pricing traps.
import { chat, chatJSON, fixRom, guard, json, lexicon, ROM_RULE } from "../../_lib/bailian.js";

const clip = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  const blocked = await guard(request, env, "read");
  if (blocked) return blocked;
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "请求格式不对" }, 400); }
  const image = typeof b.image === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(b.image) && b.image.length < 2.8e6 ? b.image : null;
  if (!image) return json({ error: "先拍一张或选一张照片" }, 400);

  try {
    const r = await chat(env, {
      model: "qwen3-vl-plus", temperature: 0, max_tokens: 1500,
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: image } },
        { type: "text", text: "先用一句话说这是什么（菜单/路牌/告示/价目表/收据/其他）。然后逐行照抄图里的全部文字（泰文、英文、中文都照抄），价格和数字保留。不要翻译、不要解释、看不清的字不要猜。格式：\n类型：…\n文字：\n…" },
      ] }],
    });
    const ocr = r.text.trim().slice(0, 3000);
    if (!/文字/.test(ocr) || ocr.replace(/类型：.*\n?/, "").replace("文字：", "").trim().length < 2) {
      return json({ error: "照片里没认出文字，靠近一点、对准再拍一次" }, 422);
    }
    const { j } = await chatJSON(env, {
      model: "qwen3.8-flash", temperature: 0.2, max_tokens: 2200,
      messages: [
        { role: "system", content: `你帮第一次来泰国的中国游客看懂照片里的文字。只根据下面照抄出来的文字解释，照抄里没有的菜、地点、价格一律不写。
输出 JSON：{"kind":"菜单|路牌|告示|价目表|收据|其他","summary":"这是什么、最要紧的一句，≤40字","items":[{"orig":"原文（一道菜或一行字）","rom":"原文是泰文才写读音，否则空","zh":"中文意思","note":"辣、含猪肉/牛肉/海鲜、要排队之类的提醒，没有就空，≤16字","price":"原文里的价格，没有就空"}],"warn":"要注意的事（按两/按重量计价、另收服务费、只收现金、禁止拍照等），照抄里没有就空"}
规则：菜单每道菜一项；路牌告示每行一项；最多 15 项；同一道菜的泰文和英文合成一项，orig 用泰文。读音：${ROM_RULE} 词与词之间用空格。` },
        { role: "user", content: ocr },
      ],
    });
    const lex = await lexicon(env, request);
    // Course spelling for any word we already know; whole-line Thai stays as the model wrote it otherwise.
    const romFix = (orig, rom) => {
      if (!rom) return "";
      if (lex.has(orig)) return lex.get(orig);
      return fixRom(rom);
    };
    const items = (Array.isArray(j.items) ? j.items : []).slice(0, 15).map(it => ({
      orig: clip(it.orig, 80), rom: clip(romFix(clip(it.orig, 80), it.rom), 120), zh: clip(it.zh, 60), note: clip(it.note, 24), price: clip(it.price, 20),
    })).filter(it => it.orig && it.zh);
    if (!items.length) return json({ error: "没看出能解释的内容，换个角度再拍一次" }, 422);
    return json({
      kind: clip(j.kind, 6) || "其他", summary: clip(j.summary, 60), warn: clip(j.warn, 80), items, ocr: ocr.slice(0, 800),
    });
  } catch (e) {
    return json({ error: e.message || "没看懂，再试一次" }, 502);
  }
}
