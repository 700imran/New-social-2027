import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient(env, jwt) {
  const url = env.SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration: SUPABASE_URL or SUPABASE_ANON_KEY')
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    },
  })
}

export function getSupabaseAuth(supabase, token) {
  if (!token) return null
  
  return {
    access_token: token,
    token_type: 'bearer',
  }
}
