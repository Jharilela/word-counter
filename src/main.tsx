import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Google Analytics setup
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
console.log('Environment check - VITE_GA_MEASUREMENT_ID:', gaMeasurementId);
console.log('All environment variables:', import.meta.env);

if (gaMeasurementId) {
  console.log('Google Analytics: Initializing with measurement ID:', gaMeasurementId);
  
  // Initialize dataLayer
  (window as any).dataLayer = (window as any).dataLayer || [];
  
  // Define gtag function
  (window as any).gtag = function (...args: any[]) { 
    (window as any).dataLayer.push(arguments); 
  };
  
  // Set default consent to 'denied'
  (window as any).gtag('consent', 'default', {
    'analytics_storage': 'denied'
  });
  
  // Inject GA script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
  
  // Wait for script to load before sending initial config
  script.onload = () => {
    console.log('Google Analytics: Script loaded successfully');
    (window as any).gtag('js', new Date());
    // Send initial config without a pageview, as it will be handled by the App component
    (window as any).gtag('config', gaMeasurementId, {
      'send_page_view': false 
    });
    console.log('Google Analytics: Initial configuration complete (page view deferred)');
  };
  
  script.onerror = () => {
    console.error('Google Analytics: Failed to load script');
  };
  
  document.head.appendChild(script);
} else {
  console.warn('Google Analytics measurement ID (VITE_GA_MEASUREMENT_ID) not provided. Analytics is disabled.');
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
