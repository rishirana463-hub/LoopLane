import { Analytics } from '@vercel/analytics/react';
import { canUseAnalytics, sanitizeAnalyticsEvent } from '../lib/analytics.js';

export default function WebAnalytics() {
  const enabled = canUseAnalytics({
    production: import.meta.env.PROD,
    hostname: window.location.hostname,
    doNotTrack: navigator.doNotTrack || window.doNotTrack,
    globalPrivacyControl: navigator.globalPrivacyControl,
    referrer: document.referrer,
  });
  return enabled ? <Analytics mode="production" beforeSend={sanitizeAnalyticsEvent}
    scriptSrc="/_vercel/insights/script.js" viewEndpoint="/_vercel/insights/view"
    eventEndpoint="/_vercel/insights/event" sessionEndpoint="/_vercel/insights/session"/> : null;
}
