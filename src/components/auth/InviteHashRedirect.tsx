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
      const type = (params.get('type') || '').toLowerCase();

      let pathname = '/auth/callback';
      if (type === 'invite') {
        pathname = '/auth/set-password';
      } else if (type === 'magiclink') {
        pathname = '/auth/existing-invite';
      }

      const callbackUrl = new URL(pathname, window.location.origin);

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

      const email = params.get('email');
      if (email) {
        callbackUrl.searchParams.set('email', email);
      }

      callbackUrl.hash = hash.slice(1);

      window.location.replace(callbackUrl.toString());
    } catch (error) {
      console.error('InviteHashRedirect: failed to redirect invite hash', error);
    }
  }, []);

  return null;
}


