'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ContentPreferences {
  id: string;
  brand_id: string;
  default_aspect_ratio: '1:1' | '4:5' | '1.91:1';
  allowed_aspect_ratios: string[];
  tone_default: string;
  hashtag_strategy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useContentPrefs(brandId: string) {
  const [prefs, setPrefs] = useState<ContentPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const fetchPrefs = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('content_preferences')
          .select('*')
          .eq('brand_id', brandId)
          .single();

        if (error && error.code !== 'PGRST116') { // Not found error
          throw error;
        }

        setPrefs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch content preferences');
      } finally {
        setLoading(false);
      }
    };

    fetchPrefs();
  }, [brandId]);

  const updatePrefs = async (updates: Partial<ContentPreferences>) => {
    try {
      if (prefs) {
        // Update existing preferences
        const { data, error } = await supabase
          .from('content_preferences')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', prefs.id)
          .select()
          .single();

        if (error) throw error;
        setPrefs(data);
      } else {
        // Create new preferences
        const { data, error } = await supabase
          .from('content_preferences')
          .insert({
            brand_id: brandId,
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
        setPrefs(data);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update content preferences');
      throw err;
    }
  };

  return {
    prefs,
    loading,
    error,
    updatePrefs
  };
}
