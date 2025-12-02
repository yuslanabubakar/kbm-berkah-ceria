import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ClientType = ReturnType<typeof createClient>;

export const getSupabaseBrowser = (): ClientType => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser env belum lengkap");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

export const getSupabaseServer = (): ClientType => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server env belum lengkap");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
};
