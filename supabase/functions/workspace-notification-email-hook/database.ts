import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.3";

export type NotificationDb = ReturnType<SupabaseClient["schema"]>;
