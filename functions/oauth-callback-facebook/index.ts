/**
 * OAuth Callback - Facebook - Ferdy Edge Function
 * Handles OAuth redirect from Facebook and stores encrypted tokens
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface ResponseData {
  success: boolean;
  error?: string;
  redirect_url?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    const result: ResponseData = { success: false };

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      result.error = `OAuth error: ${error} - ${errorDescription}`;
      
      // Redirect to frontend with error
      const redirectUrl = new URL('/dashboard/integrations', Deno.env.get('FRONTEND_URL') || 'http://localhost:3000');
      redirectUrl.searchParams.set('error', error);
      redirectUrl.searchParams.set('error_description', errorDescription || '');
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl.toString()
        }
      });
    }

    if (!code || !state) {
      result.error = 'Missing required OAuth parameters';
      
      const redirectUrl = new URL('/dashboard/integrations', Deno.env.get('FRONTEND_URL') || 'http://localhost:3000');
      redirectUrl.searchParams.set('error', 'missing_parameters');
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl.toString()
        }
      });
    }

    try {
      // Parse state to get brand_id and user_id
      const stateData = JSON.parse(decodeURIComponent(state));
      const { brand_id, user_id } = stateData;

      if (!brand_id || !user_id) {
        throw new Error('Invalid state data');
      }

      // Exchange code for access token
      const tokenResponse = await exchangeCodeForToken(code);
      
      if (!tokenResponse.success) {
        throw new Error(tokenResponse.error || 'Failed to exchange code for token');
      }

      // Get Facebook page information
      const pageInfo = await getFacebookPageInfo(tokenResponse.data!.access_token);
      
      if (!pageInfo.success) {
        throw new Error(pageInfo.error || 'Failed to get Facebook page info');
      }

      // Encrypt tokens
      const encryptedToken = await encryptToken(tokenResponse.data!.access_token);
      const encryptedRefreshToken = tokenResponse.data!.refresh_token 
        ? await encryptToken(tokenResponse.data!.refresh_token)
        : null;

      // Calculate token expiry
      const expiresAt = tokenResponse.data!.expires_in 
        ? new Date(Date.now() + tokenResponse.data!.expires_in * 1000)
        : null;

      // Store or update social account
      const { data: socialAccount, error: upsertError } = await supabase
        .from('social_accounts')
        .upsert({
          brand_id,
          provider: 'facebook',
          account_id: pageInfo.data!.id,
          handle: pageInfo.data!.name,
          token_encrypted: encryptedToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt?.toISOString(),
          status: 'connected',
          connected_by_user_id: user_id,
          last_refreshed_at: new Date().toISOString()
        }, {
          onConflict: 'brand_id,provider,account_id'
        })
        .select()
        .single();

      if (upsertError) {
        throw new Error(`Failed to store social account: ${upsertError.message}`);
      }

      result.success = true;

      // Redirect to success page
      const redirectUrl = new URL('/dashboard/integrations', Deno.env.get('FRONTEND_URL') || 'http://localhost:3000');
      redirectUrl.searchParams.set('success', 'true');
      redirectUrl.searchParams.set('provider', 'facebook');
      redirectUrl.searchParams.set('account', pageInfo.data!.name);
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl.toString()
        }
      });

    } catch (error) {
      console.error('Error in OAuth callback:', error);
      result.error = error.message;

      const redirectUrl = new URL('/dashboard/integrations', Deno.env.get('FRONTEND_URL') || 'http://localhost:3000');
      redirectUrl.searchParams.set('error', 'oauth_failed');
      redirectUrl.searchParams.set('error_description', error.message);
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl.toString()
        }
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    
    const redirectUrl = new URL('/dashboard/integrations', Deno.env.get('FRONTEND_URL') || 'http://localhost:3000');
    redirectUrl.searchParams.set('error', 'internal_error');
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl.toString()
      }
    });
  }
});

/**
 * Exchange OAuth code for access token
 */
async function exchangeCodeForToken(code: string) {
  try {
    const clientId = Deno.env.get('FACEBOOK_APP_ID');
    const clientSecret = Deno.env.get('FACEBOOK_APP_SECRET');
    const redirectUri = Deno.env.get('FACEBOOK_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Facebook OAuth configuration');
    }

    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const response = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
    }

    const data: OAuthResponse = await response.json();

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get Facebook page information
 */
async function getFacebookPageInfo(accessToken: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`);
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get page info: ${response.status} ${errorData}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        id: data.id,
        name: data.name
      }
    };
  } catch (error) {
    console.error('Error getting Facebook page info:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Encrypt token for storage
 */
async function encryptToken(token: string): Promise<string> {
  try {
    // TODO: Implement proper encryption using Web Crypto API
    // For now, return base64 encoded token (NOT SECURE - replace with proper encryption)
    return btoa(token);
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt token from storage
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // TODO: Implement proper decryption using Web Crypto API
    // For now, decode base64 (NOT SECURE - replace with proper decryption)
    return atob(encryptedToken);
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw new Error('Failed to decrypt token');
  }
}
