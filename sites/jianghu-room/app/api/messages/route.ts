import { getDb } from "../../../db";
import { messages } from "../../../db/schema";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "请求来源不正确。" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "留言格式不正确。" }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const contact = typeof payload.contact === "string" ? payload.contact.trim() : "";
  const requestId = typeof payload.requestId === "string" ? payload.requestId.trim() : "";
  const website = typeof payload.website === "string" ? payload.website.trim() : "";

  if (website) return Response.json({ ok: true }, { status: 201 });
  if (body.length < 3 || body.length > 1000 || name.length > 40 || contact.length > 120) {
    return Response.json({ error: "留言需为 3–1000 字；称呼和回信方式也请简短填写。" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return Response.json({ error: "请刷新后再试。" }, { status: 400 });
  }

  try {
    await getDb().insert(messages).values({
      requestId,
      name: name || null,
      contact: contact || null,
      body,
    }).onConflictDoNothing();
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "留言暂时未送达，请稍后再试。" }, { status: 503 });
  }
}
