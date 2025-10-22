import { supabase } from '@/lib/supabase-browser'

export function getPublicUrl(path: string): string {
  // Use the public URL approach which doesn't require signed URLs
  const { data } = supabase.storage
    .from('ferdy_assets')
    .getPublicUrl(path)
  
  return data.publicUrl
}
