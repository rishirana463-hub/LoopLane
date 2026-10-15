import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canUseAnalytics, sanitizeAnalyticsEvent } from '../src/lib/analytics.js';

test('analytics runs only for production and respects browser privacy signals', () => {
  const live = { production: true, hostname: 'looplane-jogger.vercel.app' };
  assert.equal(canUseAnalytics(live), true);
  for (const override of [{ production: false }, { hostname: 'localhost' }, { hostname: 'preview-jogger.vercel.app' }, { doNotTrack: '1' }, { doNotTrack: 'yes' }, { globalPrivacyControl: true }]) {
    assert.equal(canUseAnalytics({ ...live, ...override }), false);
  }
});

test('analytics removes authentication query strings and fragments without mutating the event', () => {
  const event = { type: 'pageview', url: 'https://looplane-jogger.vercel.app/?code=private-code&email=person%40example.com#access_token=private-token', data: { answer: 'private-answer', code: 'private-code' } };
  assert.deepEqual(sanitizeAnalyticsEvent(event), { type: 'pageview', url: 'https://looplane-jogger.vercel.app/' });
  assert.ok(event.url.includes('access_token'));
  assert.deepEqual(sanitizeAnalyticsEvent({ type: 'pageview', url: 'https://looplane-jogger.vercel.app/privacy?user=private#secret' }), { type: 'pageview', url: 'https://looplane-jogger.vercel.app/privacy' });
});

test('external referrer parameters cannot bypass page-view privacy filtering', () => {
  const live = { production: true, hostname: 'looplane-jogger.vercel.app' };
  for (const referrer of ['https://example.com/?email=person%40example.com', 'https://example.com/#private', 'https://user:secret@example.com/', 'invalid']) {
    assert.equal(canUseAnalytics({ ...live, referrer }), false);
  }
  for (const referrer of ['', 'https://example.com/article', 'https://looplane-jogger.vercel.app/?code=private']) {
    assert.equal(canUseAnalytics({ ...live, referrer }), true);
  }
});

test('analytics excludes custom events, unknown paths and untrusted origins', () => {
  for (const event of [null, {}, { type: 'event', url: 'https://looplane-jogger.vercel.app/', name: 'answer' }, ...['not a URL', 'http://looplane-jogger.vercel.app/', 'https://looplane-jogger.vercel.app.evil.test/', 'https://private:secret@looplane-jogger.vercel.app/', 'https://looplane-jogger.vercel.app:1234/', 'https://looplane-jogger.vercel.app/account', 'https://looplane-jogger.vercel.app/auth/callback?code=private'].map(url => ({ type: 'pageview', url }))]) {
    assert.equal(sanitizeAnalyticsEvent(event), null);
  }
});

test('document policy prevents same-origin analytics requests carrying OAuth queries in referrer headers', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="referrer" content="strict-origin"\s*\/>/);
  const deployment = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const globalHeaders = deployment.headers.find(rule => rule.source === '/(.*)').headers;
  assert.ok(globalHeaders.some(header => header.key === 'Referrer-Policy' && header.value === 'strict-origin'));
});
