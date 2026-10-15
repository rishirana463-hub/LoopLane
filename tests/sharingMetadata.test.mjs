import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const project = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', project), 'utf8');
const tags = [...html.matchAll(/<(?:meta|link)\b[^>]*>/g)].map(([tag]) => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]),
));
const meta = name => tags.find(tag => tag.property === name || tag.name === name)?.content;
const origin = 'https://looplane-jogger.vercel.app/';

test('sharing descriptions reflect the complete shipped curriculum', async () => {
  const filenames = (await readdir(new URL('src/data/', project))).filter(name => name.endsWith('.json'));
  const courses = await Promise.all(filenames.map(async name => JSON.parse(await readFile(new URL(`src/data/${name}`, project), 'utf8')).course));
  const lessonCount = courses.reduce((sum, course) => sum + course.units.reduce((total, unit) => total + unit.lessons.length, 0), 0);
  for (const description of ['description', 'og:description', 'twitter:description'].map(meta)) {
    assert.ok(description?.includes(String(lessonCount)), `Description should use ${lessonCount} actual lessons`);
    for (const language of ['JavaScript', 'Python', 'Java', 'C++']) assert.ok(description.includes(language));
  }
});

test('share cards reference the canonical public PNG with correct dimensions and accessible text', async () => {
  assert.equal(tags.find(tag => tag.rel === 'canonical')?.href, origin);
  assert.equal(meta('og:url'), origin);
  assert.equal(meta('og:type'), 'website');
  assert.equal(meta('og:site_name'), 'Looplane');
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(meta('og:title'), meta('twitter:title'));
  assert.equal(meta('og:image'), `${origin}social-card.png`);
  assert.equal(meta('twitter:image'), meta('og:image'));
  assert.ok(meta('og:image:alt')?.length > 20);
  assert.equal(meta('twitter:image:alt'), meta('og:image:alt'));
  const png = await readFile(new URL('public/social-card.png', project));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), Number(meta('og:image:width')));
  assert.equal(png.readUInt32BE(20), Number(meta('og:image:height')));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('the browser chrome uses the original purple canvas theme', () => {
  assert.equal(meta('theme-color'), '#19172e');
});
