'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Brand {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      if (!supabase) {
        console.log('useBrands: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;

        setBrands(data || []);
        console.log('useBrands: Fetched brands:', data?.length || 0, 'items');
      } catch (err) {
        console.error('useBrands: Error fetching brands:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const refetch = async () => {
    if (!supabase) {
      console.log('useBrands: Supabase client not available for refetch');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setBrands(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  };

  return {
    brands,
    loading,
    error,
    refetch
  };
}
