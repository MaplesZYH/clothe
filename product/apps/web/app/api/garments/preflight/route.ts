import { getEnv } from "@outfit/config";
import { validateUploadBatch } from "@outfit/domain/upload";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "INVALID_JSON", message: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const validation = validateUploadBatch(body);
  if (!validation.ok) {
    return Response.json(
      { code: "INVALID_UPLOAD_BATCH", reasons: validation.reasons },
      { status: 400 }
    );
  }

  const env = getEnv();
  return Response.json({
    accepted: validation.data.files.map(({ name, mimeType, byteSize }) => ({ name, mimeType, byteSize })),
    uploadReady: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    next: env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? "request-upload-plan"
      : "configure-supabase-env"
  });
}
