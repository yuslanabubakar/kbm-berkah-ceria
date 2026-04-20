import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const getSupabaseBrowser = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build/SSR env vars are not available in client components.
    // Return a dummy client that won't be used (component won't render on server).
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
