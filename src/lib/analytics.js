const PRODUCTION_HOST = 'looplane-jogger.vercel.app';

/** Keep local/preview visits and browser privacy opt-outs out of traffic counts. */
export function canUseAnalytics({ production, hostname, doNotTrack, globalPrivacyControl, referrer = '' } = {}) {
  if (production !== true || hostname !== PRODUCTION_HOST || doNotTrack === '1' || doNotTrack === 'yes' || globalPrivacyControl === true) return false;
  // The collection script adds external referrers outside beforeSend. Skip
  // visits with referrer parameters rather than risk including private values.
  if (referrer) {
    try {
      const source = new URL(referrer);
      if (source.hostname !== PRODUCTION_HOST && (source.search || source.hash || source.username || source.password)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Only public page views; authentication query strings/fragments never leave. */
export function sanitizeAnalyticsEvent(event) {
  if (event?.type !== 'pageview' || typeof event.url !== 'string') return null;
  try {
    const url = new URL(event.url);
    if (url.origin !== `https://${PRODUCTION_HOST}` || url.username || url.password || !['/', '/privacy'].includes(url.pathname)) return null;
    url.search = '';
    url.hash = '';
    return { type: 'pageview', url: url.href };
  } catch {
    return null;
  }
}
