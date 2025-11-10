'use client';

import { useEffect } from 'react';

export default function InviteHashRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const { hash, pathname } = window.location;

    if (!hash || !hash.includes('access_token=')) {
      return;
    }

    if (
      pathname.startsWith('/auth/callback') ||
      pathname.startsWith('/auth/set-password') ||
      pathname.startsWith('/auth/existing-invite')
    ) {
      return;
    }

    try {
      const params = new URLSearchParams(hash.slice(1));
      const callbackUrl = new URL('/auth/callback', window.location.origin);

      const brandId = params.get('brand_id');
      if (brandId) {
        callbackUrl.searchParams.set('brand_id', brandId);
      }

      const source =
        params.get('type') ||
        params.get('src') ||
        callbackUrl.searchParams.get('src') ||
        'invite_hash';
      callbackUrl.searchParams.set('src', source);

      callbackUrl.hash = hash.slice(1);

      window.location.replace(callbackUrl.toString());
    } catch (error) {
      console.error('InviteHashRedirect: failed to redirect invite hash', error);
    }
  }, []);

  return null;
}


