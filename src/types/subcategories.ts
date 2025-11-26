/**
 * Subcategory type definitions
 * 
 * This file defines the shared types for subcategories across the application.
 * It includes the SubcategoryType union and base subcategory interface structure.
 */

export type SubcategoryType =
  | 'unspecified'
  | 'event_series'
  | 'service_or_programme'
  | 'promo_or_offer'
  | 'dynamic_schedule'
  | 'content_series'
  | 'other';

/**
 * Base subcategory interface structure.
 * This represents the shape of a subcategory as it appears in our domain layer.
 * 
 * Note: Different parts of the application may extend this with additional fields
 * (e.g., hashtags array mapped from default_hashtags, channels array).
 */
export interface BaseSubcategory {
  id: string;
  brand_id: string;
  category_id: string;
  name: string;
  detail?: string | null;
  url?: string | null;
  subcategory_type: SubcategoryType;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}






