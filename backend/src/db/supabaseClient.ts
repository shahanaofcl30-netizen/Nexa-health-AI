import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';

export const isSupabaseConfigured = Boolean(
  ENV.SUPABASE_URL && (ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_SERVICE_ROLE_KEY)
);

export const supabase = isSupabaseConfigured
  ? createClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  : null;
