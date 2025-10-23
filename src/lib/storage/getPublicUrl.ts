import { supabase } from '@/lib/supabase-browser'

export function getPublicUrl(path: string): string {
  // Use the correct bucket name: ferdy-assets (with hyphen)
  const { data } = supabase.storage
    .from('ferdy-assets')
    .getPublicUrl(path)
  
  console.log('Generated public URL:', data.publicUrl);
  return data.publicUrl;
}
