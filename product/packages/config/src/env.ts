import { z } from "zod";

const optionalUrl = z.string().url().optional();
const optionalSecret = z.string().min(1).optional();

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalSecret,
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  ANONYMOUS_SESSION_SECRET: z.string().min(16).default("local-development-secret-change-me"),
  DATABASE_URL: optionalUrl,
  AI_PROVIDER: z.string().min(1).default("stub"),
  AI_ENDPOINT: optionalUrl,
  AI_API_KEY: optionalSecret,
  AI_MODEL: z.string().min(1).default("gpt-5.6-terra"),
  GARMENT_PROCESSING_CREDITS: z.coerce.number().int().positive().default(1),
  STYLING_ADVICE_CREDITS: z.coerce.number().int().positive().default(1)
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export function requireSupabaseEnv(source: NodeJS.ProcessEnv = process.env): {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
} {
  const env = getEnv(source);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment."
    );
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ...(env.SUPABASE_SERVICE_ROLE_KEY ? { serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY } : {})
  };
}
