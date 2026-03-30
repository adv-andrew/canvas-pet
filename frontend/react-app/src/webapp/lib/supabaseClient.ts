import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Standard Supabase client for the web app.
// Uses the default localStorage session storage — no Chrome dependencies.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
