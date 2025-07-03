import { useEffect } from 'react';
import { trackEvent, trackPageView } from '@/lib/utils';

export const GoogleAnalyticsDebug = () => {
  useEffect(() => {
    // Debug information
    console.log('=== Google Analytics Debug ===');
    console.log('Environment variable:', import.meta.env.VITE_GA_MEASUREMENT_ID);
    console.log('Window gtag available:', typeof window !== 'undefined' && !!window.gtag);
    console.log('Window dataLayer available:', typeof window !== 'undefined' && !!window.dataLayer);
    
    // Test tracking functions
    if (typeof window !== 'undefined' && window.gtag) {
      console.log('Testing gtag function...');
      window.gtag('event', 'debug_test', {
        event_category: 'debug',
        event_label: 'component_mounted'
      });
      
      // Test our utility functions
      trackEvent('debug_test', 'debug', 'utility_function_test');
      trackPageView('Debug Page', window.location.href);
    } else {
      console.warn('Google Analytics not available in window object');
    }
  }, []);

  return null; // This component doesn't render anything
}; 