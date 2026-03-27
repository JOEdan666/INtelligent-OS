'use client'

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    // Exclude tracking for admin and API routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      return;
    }

    try {
      fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: pathname }),
        keepalive: true, // Ensure the request is sent even if the user navigates away
      });
    } catch (error) {
      console.error('Failed to track visit:', error);
    }
  }, [pathname]);

  return null;
}
