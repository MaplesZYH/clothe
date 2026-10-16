import { randomUUID } from "node:crypto";

import { getEnv } from "@outfit/config";
import { validateUploadBatch } from "@outfit/domain/upload";

import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { ownerCookieHeader, resolveOwnerContext } from "../../../../lib/owner-context";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  const context = resolveOwnerContext(request, env.ANONYMOUS_SESSION_SECRET);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "INVALID_JSON", message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const validation = validateUploadBatch(body);
  if (!validation.ok) {
    return Response.json({ code: "INVALID_UPLOAD_BATCH", reasons: validation.reasons }, { status: 400 });
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      { code: "SUPABASE_NOT_CONFIGURED", message: "上传服务尚未配置，请先填写 Supabase env。" },
      { status: 503 }
    );
  }

  const batchId = randomUUID();
  const storage = createSupabaseAdminClient().storage.from("outfit-sources");
  const uploadUrls = await Promise.all(validation.data.files.map(async (file, index) => {
    const objectKey = `${context.ownerId}/${batchId}/${index}-${randomUUID()}-${file.name}`;
    const result = await storage.createSignedUploadUrl(objectKey);
    if (result.error || !result.data) throw new Error(`Unable to create upload URL: ${result.error?.message ?? "unknown error"}`);
    return { name: file.name, objectKey, token: result.data.token, signedUrl: result.data.signedUrl };
  }));

  const response = Response.json({ batchId, uploadUrls }, { status: 201 });
  if (context.isNew) response.headers.set("set-cookie", ownerCookieHeader(context.token, env.NODE_ENV === "production"));
  return response;
}
