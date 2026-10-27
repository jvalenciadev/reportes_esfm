import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Configure corporate/network proxy if defined in environment
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ProxyAgent, setGlobalDispatcher } = require("undici");
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  } catch {
    // Ignore if running in environments where undici isn't applicable
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
};
