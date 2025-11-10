/**
 * LRU (Least Recently Used) rotation utilities for Ferdy
 * Ensures assets are rotated fairly across subcategories
 */

import { MediaType } from './channelSupport.ts';

export interface AssetUsage {
  asset_id: string;
  asset_type?: MediaType;
  subcategory_id: string;
  last_used_at: Date;
  usage_count: number;
}

/**
 * Simple LRU cache for asset rotation
 */
export class AssetLRUCache {
  private cache: Map<string, AssetUsage[]> = new Map();
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  /**
   * Get the key for cache storage
   */
  private getKey(brandId: string, subcategoryId: string): string {
    return `${brandId}:${subcategoryId}`;
  }

  /**
   * Record asset usage
   */
  recordUsage(
    brandId: string,
    subcategoryId: string,
    assetId: string,
    assetType: MediaType = 'image',
  ): void {
    const key = this.getKey(brandId, subcategoryId);
    const usage = this.cache.get(key) || [];

    // Update existing usage or add new
    const existingIndex = usage.findIndex((u) => u.asset_id === assetId);
    if (existingIndex >= 0) {
      usage[existingIndex].last_used_at = new Date();
      usage[existingIndex].usage_count += 1;
      usage[existingIndex].asset_type = usage[existingIndex].asset_type || assetType;
    } else {
      usage.push({
        asset_id: assetId,
        asset_type: assetType,
        subcategory_id: subcategoryId,
        last_used_at: new Date(),
        usage_count: 1,
      });
    }

    // Sort by last used (oldest first for LRU)
    usage.sort((a, b) => a.last_used_at.getTime() - b.last_used_at.getTime());
    
    // Keep only recent history
    if (usage.length > this.maxHistory) {
      usage.splice(this.maxHistory);
    }

    this.cache.set(key, usage);
  }

  /**
   * Get the least recently used asset from available assets
   */
  selectLeastUsed(
    brandId: string, 
    subcategoryId: string, 
    availableAssets: string[]
  ): string | null {
    if (availableAssets.length === 0) return null;
    
    const key = this.getKey(brandId, subcategoryId);
    const usage = this.cache.get(key) || [];
    
    // Filter usage to only include available assets
    const availableUsage = usage.filter(u => availableAssets.includes(u.asset_id));
    
    // If no usage history, return random asset
    if (availableUsage.length === 0) {
      return availableAssets[Math.floor(Math.random() * availableAssets.length)];
    }
    
    // Return the least recently used asset
    return availableUsage[0].asset_id;
  }

  /**
   * Get usage statistics for debugging
   */
  getUsageStats(brandId: string, subcategoryId: string): AssetUsage[] {
    const key = this.getKey(brandId, subcategoryId);
    return this.cache.get(key) || [];
  }

  /**
   * Clear cache for a brand/subcategory
   */
  clear(brandId: string, subcategoryId: string): void {
    const key = this.getKey(brandId, subcategoryId);
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }
}

/**
 * Global LRU cache instance
 */
export const assetLRU = new AssetLRUCache();

/**
 * Load asset usage from database
 */
export async function loadAssetUsageFromDB(
  supabase: any,
  brandId: string,
  subcategoryId: string
): Promise<AssetUsage[]> {
  try {
    // Get recent asset usage from drafts and publishes
    const { data: drafts, error: draftsError } = await supabase
      .from('drafts')
      .select('asset_ids, created_at')
      .eq('brand_id', brandId)
      .eq('subcategory_id', subcategoryId)
      .not('asset_ids', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (draftsError) throw draftsError;

    const { data: publishes, error: publishesError } = await supabase
      .from('publishes')
      .select('draft_id, published_at')
      .eq('brand_id', brandId)
      .gte('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .limit(50);

    if (publishesError) throw publishesError;

    // Process usage data
    const usageMap = new Map<string, AssetUsage>();
    
    // Process drafts
    drafts?.forEach((draft: any) => {
      draft.asset_ids?.forEach((assetId: string) => {
        const existing = usageMap.get(assetId);
        if (existing) {
          existing.usage_count += 1;
          if (new Date(draft.created_at) > existing.last_used_at) {
            existing.last_used_at = new Date(draft.created_at);
          }
        } else {
          usageMap.set(assetId, {
            asset_id: assetId,
            asset_type: 'image',
            subcategory_id: subcategoryId,
            last_used_at: new Date(draft.created_at),
            usage_count: 1,
          });
        }
      });
    });

    // Process publishes
    publishes?.forEach((publish: any) => {
      // TODO: Get asset_ids from related draft
      // This would require joining with drafts table
    });

    return Array.from(usageMap.values()).sort(
      (a, b) => a.last_used_at.getTime() - b.last_used_at.getTime()
    );
  } catch (error) {
    console.error('Error loading asset usage from DB:', error);
    return [];
  }
}

/**
 * Save asset usage to database (for persistence)
 */
export async function saveAssetUsageToDB(
  supabase: any,
  brandId: string,
  subcategoryId: string,
  usage: AssetUsage[]
): Promise<void> {
  try {
    // TODO: Implement asset usage tracking table
    // For now, we'll rely on the in-memory cache
    // In production, you might want to store usage statistics in a separate table
    
    console.log(`Saving ${usage.length} asset usage records for ${brandId}:${subcategoryId}`);
  } catch (error) {
    console.error('Error saving asset usage to DB:', error);
  }
}
