import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Google Analytics utility functions
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
    console.log('Google Analytics: Event tracked', { action, category, label, value });
  } else {
    console.warn('Google Analytics: gtag not available for event tracking');
  }
};

export const trackPageView = (page_title?: string, page_location?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_title: page_title || document.title,
      page_location: page_location || window.location.href
    });
    console.log('Google Analytics: Page view tracked', { page_title, page_location });
  } else {
    console.warn('Google Analytics: gtag not available for page view tracking');
  }
};
