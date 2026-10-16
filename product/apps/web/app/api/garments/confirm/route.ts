import { getEnv } from "@outfit/config";
import { createDatabase, createGarmentBatchAndJob } from "@outfit/db";
import { z } from "zod";

import { ownerCookieHeader, resolveOwnerContext } from "../../../../lib/owner-context";

export const runtime = "nodejs";

const requestSchema = z.object({
  operationKey: z.string().min(16).max(200),
  sources: z.array(z.object({
    objectKey: z.string().min(1),
    sourceHash: z.string().min(16).max(128),
    mimeType: z.enum(["image/jpeg", "image/png"])
  })).min(2).max(5)
});

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  const context = resolveOwnerContext(request, env.ANONYMOUS_SESSION_SECRET);
  if (!env.DATABASE_URL) {
    return Response.json({ code: "DATABASE_NOT_CONFIGURED", message: "DATABASE_URL 尚未配置。" }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "INVALID_JSON", message: "请求内容不是有效 JSON。" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ code: "INVALID_CONFIRMATION", issues: parsed.error.issues }, { status: 400 });

  const database = createDatabase(env.DATABASE_URL);
  try {
    const result = await createGarmentBatchAndJob(database.sql, {
      ownerId: context.ownerId,
      operationKey: parsed.data.operationKey,
      processingCredits: env.GARMENT_PROCESSING_CREDITS,
      sources: parsed.data.sources
    });
    const response = Response.json({ ...result, state: "queued" }, { status: 202 });
    if (context.isNew) response.headers.set("set-cookie", ownerCookieHeader(context.token, env.NODE_ENV === "production"));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return Response.json({ code: "INSUFFICIENT_CREDITS", message: "积分不足，请先购买积分包。" }, { status: 402 });
    }
    throw error;
  } finally {
    await database.close();
  }
}
