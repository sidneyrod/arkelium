// Supabase client wrapper to ensure correct project credentials
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Use the correct Supabase project credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://uynvypfkwwkoxchaghui.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bnZ5cGZrd3drb3hjaGFnaHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNzAwNDIsImV4cCI6MjA4MDY0NjA0Mn0._7oVSv07VXvnTDsyYCsVQprP5lwue8w4HE2iiIp0rU4";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
