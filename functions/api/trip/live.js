// GET /api/trip/live?to=th|zh (WebSocket) — relay to 百炼 qwen3.8 live translation.
// Browsers cannot put the API key on a WebSocket, so this function opens the upstream socket with it and
// pipes events both ways. The model detects the spoken language itself; `to` picks the output language:
// th = the traveller speaks Chinese, Thai text + Thai speech come out; zh = the local speaks Thai, Chinese text.
import { guard } from "../../_lib/bailian.js";

const MODEL = "qwen3.8-livetranslate-flash-realtime";
const MAX_MS = 3 * 60 * 1000; // one listening turn; the page reconnects for the next one

export async function onRequestGet({ request, env }) {
  if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") return new Response("需要 WebSocket", { status: 426 });
  const blocked = await guard(request, env, "live");
  if (blocked) return blocked;
  const to = new URL(request.url).searchParams.get("to") === "zh" ? "zh" : "th";

  const host = env.DASHSCOPE_BASE.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const up = await fetch(`https://${host}/api-ws/v1/realtime?model=${MODEL}`, {
    headers: { Upgrade: "websocket", Authorization: "Bearer " + env.DASHSCOPE_API_KEY },
  });
  const upstream = up.webSocket;
  if (!upstream) return new Response("同传服务连不上：" + up.status, { status: 502 });
  upstream.accept();

  const [client, server] = Object.values(new WebSocketPair());
  server.accept();
  let ready = false;
  const early = [];
  const closeBoth = (code = 1000, reason = "") => {
    try { server.close(code, reason); } catch (e) {}
    try { upstream.close(code, reason); } catch (e) {}
  };
  const timer = setTimeout(() => closeBoth(1000, "time"), MAX_MS);

  upstream.addEventListener("message", ev => {
    let j = null;
    try { j = JSON.parse(ev.data); } catch (e) {}
    if (j && j.type === "session.created") {
      upstream.send(JSON.stringify({
        type: "session.update",
        session: { output_modalities: to === "th" ? ["text", "audio"] : ["text"], translation: { language: to } },
      }));
      return;
    }
    if (j && j.type === "session.updated") {
      ready = true;
      for (const m of early.splice(0)) upstream.send(m);
    }
    try { server.send(ev.data); } catch (e) {}
  });
  // Only audio and the closing events go upstream; the session settings stay server-side.
  server.addEventListener("message", ev => {
    let j = null;
    try { j = JSON.parse(ev.data); } catch (e) { return; }
    if (!j || !["input_audio_buffer.append", "session.finish"].includes(j.type)) return;
    const m = JSON.stringify(j.type === "session.finish" ? { type: "session.finish" } : { type: j.type, audio: String(j.audio || "").slice(0, 200000) });
    if (ready) upstream.send(m); else if (early.length < 50) early.push(m);
  });
  upstream.addEventListener("close", ev => { clearTimeout(timer); try { server.close(1000, ev.reason || ""); } catch (e) {} });
  upstream.addEventListener("error", () => { clearTimeout(timer); closeBoth(1011, "upstream"); });
  server.addEventListener("close", () => { clearTimeout(timer); try { upstream.close(1000, "client"); } catch (e) {} });

  return new Response(null, { status: 101, webSocket: client });
}
