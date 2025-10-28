/**
 * Utility functions for hashtag normalization and handling
 */

/**
 * Normalizes a single hashtag by:
 * - Trimming whitespace
 * - Ensuring it starts with #
 * - Removing duplicate # symbols
 * - Converting to lowercase (optional, set normalizeCase to false to preserve)
 */
export function normalizeHashtag(tag: string, normalizeCase: boolean = false): string {
  if (!tag || typeof tag !== 'string') {
    return '';
  }
  
  let normalized = tag.trim();
  
  // Remove all # symbols first
  normalized = normalized.replace(/#/g, '');
  
  // Add single # prefix
  normalized = normalized ? `#${normalized}` : '';
  
  // Optionally normalize case
  if (normalizeCase) {
    normalized = normalized.toLowerCase();
  }
  
  return normalized;
}

/**
 * Normalizes an array of hashtags by:
 * - Removing empty strings
 * - Trimming whitespace
 * - Removing duplicates
 * - Ensuring proper # prefix format
 * - Preserving original order of first occurrence
 */
export function normalizeHashtags(
  hashtags: string[] | null | undefined,
  normalizeCase: boolean = false
): string[] {
  if (!hashtags || !Array.isArray(hashtags)) {
    return [];
  }
  
  const normalized: string[] = [];
  const seen = new Set<string>();
  
  for (const tag of hashtags) {
    const normalizedTag = normalizeHashtag(tag, normalizeCase);
    
    // Skip empty tags
    if (!normalizedTag || normalizedTag === '#') {
      continue;
    }
    
    // Use lowercase for comparison if case normalization is enabled
    const comparisonKey = normalizeCase 
      ? normalizedTag.toLowerCase() 
      : normalizedTag;
    
    // Only add if we haven't seen it before
    if (!seen.has(comparisonKey)) {
      seen.add(comparisonKey);
      normalized.push(normalizedTag);
    }
  }
  
  return normalized;
}

/**
 * Parses a comma-separated string of hashtags into an array
 */
export function parseHashtags(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  // Split by comma, space, or both
  const parts = input.split(/[,\s]+/).filter(part => part.trim());
  
  return normalizeHashtags(parts, false);
}

