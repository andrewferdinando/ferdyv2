'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';

export interface Brand {
  id: string;
  name: string;
  website_url?: string | null;
  country_code?: string | null;
  timezone: string;
  default_post_time?: string | null; // TIME format (HH:MM:SS)
  ai_summary?: string | null;
  ai_summary_last_generated_at?: string | null;
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

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Fetch brands where user has membership
        const { data, error } = await supabase
          .from('brand_memberships')
          .select(`
            brand_id,
            brands (
              id,
              name,
              website_url,
              country_code,
              timezone,
              default_post_time,
              ai_summary,
              ai_summary_last_generated_at,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('brands.status', 'active');

        if (error) throw error;

        // Extract brands from the joined data
        const brandsData = data
          ?.map((membership: any) => membership.brands)
          .filter((brand: any) => brand !== null)
          .sort((a: any, b: any) => a.name.localeCompare(b.name)) || [];

        setBrands(brandsData);
        console.log('useBrands: Fetched brands for user:', brandsData.length, 'items');
      } catch (err) {
        console.error('useBrands: Error fetching brands:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const refetch = useCallback(async () => {
    if (!supabase) {
      console.log('useBrands: Supabase client not available for refetch');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch brands where user has membership
      const { data, error } = await supabase
        .from('brand_memberships')
        .select(`
          brand_id,
          brands (
            id,
            name,
            website_url,
            country_code,
            timezone,
            default_post_time,
            ai_summary,
            ai_summary_last_generated_at,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('brands.status', 'active');

      if (error) throw error;

      // Extract brands from the joined data
      const brandsData = data
        ?.map((membership: any) => membership.brands)
        .filter((brand: any) => brand !== null)
        .sort((a: any, b: any) => a.name.localeCompare(b.name)) || [];

      setBrands(brandsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    brands,
    loading,
    error,
    refetch
  };
}
