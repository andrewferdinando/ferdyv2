/**
 * AI utilities for Ferdy Edge Functions
 * Handles content generation for social media posts
 */

export interface BrandInfo {
  name: string;
  tone_default?: string;
  timezone: string;
}

export interface RuleInfo {
  tone?: string;
  hashtag_rule?: any;
  channels: string[];
}

export interface SubcategoryInfo {
  name: string;
  detail?: string;
  url?: string;
  default_hashtags?: string[];
}

export interface ContentPreferences {
  tone_default?: string;
  hashtag_strategy?: any;
}

export interface GeneratedContent {
  copy: string;
  hashtags: string[];
}

/**
 * Generate social media caption based on brand, rule, and subcategory
 */
export async function generateCaption(params: {
  brand: BrandInfo;
  rule: RuleInfo;
  subcategory: SubcategoryInfo;
  prefs: ContentPreferences;
}): Promise<GeneratedContent> {
  const { brand, rule, subcategory, prefs } = params;

  try {
    // Build prompt based on available information
    const prompt = buildPrompt(brand, rule, subcategory, prefs);
    
    // TODO: Integrate with actual AI service (OpenAI, Anthropic, etc.)
    // For now, return generated content based on template
    
    const copy = generateTemplateCopy(brand, rule, subcategory);
    const hashtags = generateHashtags(rule, subcategory, prefs);
    
    return {
      copy,
      hashtags
    };
  } catch (error) {
    console.error('Error generating caption:', error);
    
    // Fallback content
    return {
      copy: generateFallbackCopy(subcategory),
      hashtags: subcategory.default_hashtags || ['#content', '#social']
    };
  }
}

/**
 * Build AI prompt from available data
 */
function buildPrompt(
  brand: BrandInfo,
  rule: RuleInfo,
  subcategory: SubcategoryInfo,
  prefs: ContentPreferences
): string {
  const tone = rule.tone || prefs.tone_default || brand.tone_default || 'friendly and professional';
  
  let prompt = `Generate a social media post for ${brand.name}`;
  
  if (subcategory.name) {
    prompt += ` about ${subcategory.name}`;
  }
  
  if (subcategory.detail) {
    prompt += `. Details: ${subcategory.detail}`;
  }
  
  prompt += `. Tone should be ${tone}.`;
  
  if (rule.channels && rule.channels.length > 0) {
    prompt += ` Target platforms: ${rule.channels.join(', ')}.`;
  }
  
  if (subcategory.default_hashtags && subcategory.default_hashtags.length > 0) {
    prompt += ` Include these hashtags: ${subcategory.default_hashtags.join(', ')}.`;
  }
  
  return prompt;
}

/**
 * Generate template-based copy (placeholder for AI integration)
 */
function generateTemplateCopy(
  brand: BrandInfo,
  rule: RuleInfo,
  subcategory: SubcategoryInfo
): string {
  const templates = [
    `Check out ${subcategory.name} at ${brand.name}! ${subcategory.detail || ''}`,
    `Discover ${subcategory.name} - ${subcategory.detail || 'Amazing experience awaits!'}`,
    `Experience ${subcategory.name} at ${brand.name}. ${subcategory.detail || 'Book now!'}`,
    `${subcategory.name} is now available! ${subcategory.detail || 'Don\'t miss out!'}`,
    `Join us for ${subcategory.name}. ${subcategory.detail || 'See you there!'}`
  ];
  
  const tone = rule.tone?.toLowerCase() || 'friendly';
  
  let selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  // Adjust template based on tone
  if (tone.includes('professional')) {
    selectedTemplate = selectedTemplate.replace('!', '.');
  } else if (tone.includes('casual')) {
    selectedTemplate = selectedTemplate.replace('.', '!');
  }
  
  return selectedTemplate;
}

/**
 * Generate hashtags based on rules and preferences
 */
function generateHashtags(
  rule: RuleInfo,
  subcategory: SubcategoryInfo,
  prefs: ContentPreferences
): string[] {
  const hashtags: string[] = [];
  
  // Add default hashtags from subcategory
  if (subcategory.default_hashtags) {
    hashtags.push(...subcategory.default_hashtags);
  }
  
  // Add hashtags from rule
  if (rule.hashtag_rule) {
    if (rule.hashtag_rule.use_default !== false && subcategory.default_hashtags) {
      hashtags.push(...subcategory.default_hashtags);
    }
    
    if (rule.hashtag_rule.extra) {
      hashtags.push(...rule.hashtag_rule.extra);
    }
  }
  
  // Add strategy-based hashtags
  if (prefs.hashtag_strategy) {
    // TODO: Implement hashtag strategy logic
    hashtags.push('#socialmedia', '#content');
  }
  
  // Remove duplicates and limit to reasonable number
  const uniqueHashtags = [...new Set(hashtags)];
  return uniqueHashtags.slice(0, 10); // Max 10 hashtags
}

/**
 * Generate fallback copy when AI fails
 */
function generateFallbackCopy(subcategory: SubcategoryInfo): string {
  if (subcategory.detail) {
    return subcategory.detail;
  }
  
  return `Check out ${subcategory.name}!`;
}

/**
 * Validate generated content
 */
export function validateGeneratedContent(content: GeneratedContent): boolean {
  // Basic validation
  if (!content.copy || content.copy.trim().length === 0) {
    return false;
  }
  
  if (content.copy.length > 280) { // Twitter character limit
    return false;
  }
  
  if (!content.hashtags || content.hashtags.length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Optimize content for specific platform
 */
export function optimizeForPlatform(
  content: GeneratedContent,
  platform: string
): GeneratedContent {
  let optimizedCopy = content.copy;
  let optimizedHashtags = [...content.hashtags];
  
  switch (platform.toLowerCase()) {
    case 'twitter':
    case 'x':
      // Twitter character limit
      if (optimizedCopy.length > 280) {
        optimizedCopy = optimizedCopy.substring(0, 277) + '...';
      }
      // Limit hashtags for Twitter
      optimizedHashtags = optimizedHashtags.slice(0, 3);
      break;
      
    case 'instagram':
      // Instagram allows more hashtags
      optimizedHashtags = optimizedHashtags.slice(0, 30);
      break;
      
    case 'facebook':
      // Facebook is more flexible
      optimizedHashtags = optimizedHashtags.slice(0, 10);
      break;
      
    case 'linkedin':
      // LinkedIn is professional
      optimizedHashtags = optimizedHashtags.slice(0, 5);
      break;
      
    case 'tiktok':
      // TikTok allows many hashtags
      optimizedHashtags = optimizedHashtags.slice(0, 100);
      break;
  }
  
  return {
    copy: optimizedCopy,
    hashtags: optimizedHashtags
  };
}
