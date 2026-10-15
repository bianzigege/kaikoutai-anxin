// POST /api/trip/check {text?, image?} — 「这靠谱吗？」 A screenshot, photo or pasted text is judged against the
// scam patterns Chinese visitors to Thailand actually meet. 百炼 qwen3-vl-plus copies the text out of images,
// then qwen3.8-flash rates the risk. Output is advice, never a guarantee.
import { chat, chatJSON, guard, json } from "../../_lib/bailian.js";

const SAY_ZH = {
  no_thanks: "不用了，谢谢", go_myself: "我自己去就行", not_buy: "不买，谢谢", meter: "请打表（出租车）",
  howmuch: "多少钱？（买东西、吃饭）", howmuch_here: "去这里多少钱？（打车、嘟嘟车问价）", show_id: "请给我看一下证件",
  tourist_police: "我要打电话给旅游警察", police: "请帮我报警", photo_first: "我先拍个照（租车、水上摩托前）",
};
const SAY = Object.keys(SAY_ZH);

const KB = `泰国常见风险（来自中国驻泰使馆提醒、各国外交部提醒和在泰华人经验）：
A. 高风险——境外务工/人身安全：
- 「高薪招聘」「月入几万」「包机票包吃住」「不需要经验」，尤其是客服、主播、打字员、游戏陪玩、翻译等岗位；让人免签先入境、到了再办签证（按中泰免签协定，工作必须提前办工作签证）。
- 工作地点在泰缅边境（如湄索 Mae Sot）或要「过境转车」去缅甸、柬埔寨、老挝。
- 刚认识的网友、网恋对象、「朋友」热情邀请来泰国玩，承担机票，要去边境或偏远地方，让你别告诉家人。
- 只用微信/Telegram 联系，不给公司全称和地址、不签合同，催促尽快出发，先收护照。
B. 中风险——旅游消费：
- 「零元团」「低价团」：团费远低于市场价，到当地强制购物；无资质的导游。
- 大皇宫、景点门口有人说「今天关门」，要带你去别处；嘟嘟车超低价「一日游」中途带去宝石店/西装店；「宝石可以回国转卖赚钱」。
- 出租车不打表、开口高价；码头/海滩拉客包船要高价。
- 租水上摩托/摩托车，还车时说你弄坏了索赔；要求押护照。
- 自称警察要当场罚现金、查看钱包。
- 陌生人私下换钱（微信转账换泰铢）、帮你代买电话卡/代办入境卡（TDAC 官网免费）。
- 酒吧未标价、账单远高于预期。
C. 低风险：正规平台（如飞猪）的明码标价商品、景区官方售票处、明码标价的餐厅和按摩店；市场里正常讨价还价。`;

export async function onRequestPost({ request, env }) {
  const blocked = await guard(request, env, "check");
  if (blocked) return blocked;
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: "请求格式不对" }, 400); }
  let text = String(b.text || "").slice(0, 1500).trim();
  const image = typeof b.image === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(b.image) && b.image.length < 2.8e6 ? b.image : null;
  if (!text && !image) return json({ error: "贴一段文字或上传一张截图" }, 400);

  try {
    let ocr = "";
    if (image) {
      const r = await chat(env, {
        model: "qwen3-vl-plus", temperature: 0, max_tokens: 1200,
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: image } },
          { type: "text", text: "先用一句话说这是什么图（聊天截图/招聘海报/菜单/价目表/行程单/其他）。然后逐字抄写图里的全部文字，保持原样，不要翻译、不要解释、不要补全看不清的字。格式：\n类型：…\n文字：\n…" },
        ] }],
      });
      ocr = r.text.trim().slice(0, 2500);
    }
    const material = [ocr && `【图片内容】\n${ocr}`, text && `【用户补充】\n${text}`].filter(Boolean).join("\n\n");
    const { j } = await chatJSON(env, {
      model: "qwen3.8-flash", temperature: 0.2, max_tokens: 900,
      messages: [
        { role: "system", content: `你是在泰国生活多年的华人，帮来泰国的中国游客判断一件事靠不靠谱。依据下面的风险清单，只根据材料里实际出现的信息判断，不脑补；信息不够就说不够。
${KB}
输出 JSON：{"level":"high|mid|low|unknown","kind":"招聘|交友|低价团|景点搭讪|交通|租车|换钱|价格|其他","title":"一句话结论，≤24字","reasons":["材料里出现的具体信号，≤3条，每条≤30字"],"advice":["现在该怎么做，≤3条，每条≤30字"],"say":["从下面的泰语句子里选 0–2 个当场真用得上的，填 id"]}
可选句子：${SAY.map(k => `${k}=${SAY_ZH[k]}`).join("；")}
level：high=涉及境外务工、人身安全、要你去边境或交出护照；mid=可能多花钱或被骗消费；low=看起来是正常的旅游消费；unknown=材料看不出来。` },
        { role: "user", content: material },
      ],
    });
    const level = ["high", "mid", "low", "unknown"].includes(j.level) ? j.level : "unknown";
    const list = (x, n) => (Array.isArray(x) ? x : []).map(s => String(s).slice(0, 60)).filter(Boolean).slice(0, n);
    return json({
      level,
      kind: String(j.kind || "其他").slice(0, 8),
      title: String(j.title || "").slice(0, 40),
      reasons: list(j.reasons, 3),
      advice: list(j.advice, 3),
      say: (Array.isArray(j.say) ? j.say : []).filter(s => SAY.includes(s)).slice(0, 2),
      ocr: ocr ? ocr.slice(0, 600) : null,
    });
  } catch (e) {
    return json({ error: e.message || "判断失败，请再试一次" }, 502);
  }
}
