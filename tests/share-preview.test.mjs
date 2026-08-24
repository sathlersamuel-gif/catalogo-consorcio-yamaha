import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

function meta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<meta property="${escaped}" content="([^"]*)">`))?.[1] || '';
}

test('catálogo geral possui Open Graph próprio', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.equal(meta(html, 'og:title'), 'Catálogo Consórcio Yamaha');
  assert.match(meta(html, 'og:image'), /consorcio-yamaha-share\.jpg$/);
  assert.equal(meta(html, 'og:url'), 'https://sathlersamuel-gif.github.io/catalogo-consorcio-yamaha/');
});

for (const [id, name] of [
  ['8d7ccb0f-ff3e-4835-8a21-bfbebbc9201b', 'YZF-R3 CONNECTED'],
  ['bbfa54bb-c0ea-480a-9919-0440ade9981c', 'YZF-R15 ABS'],
  ['3871601b-a98f-4e5b-9e81-602004c33dfe', 'LANDER 250 CONNECTED'],
]) {
  test(`prévia individual de ${name}`, async () => {
    const html = await readFile(new URL(`share/moto/${id}/index.html`, root), 'utf8');
    assert.match(meta(html, 'og:title'), new RegExp(name));
    assert.match(meta(html, 'og:description'), /Consórcio Yamaha/);
    assert.match(meta(html, 'og:image'), new RegExp(`/motorcycle-images/${id}/`));
    assert.equal(meta(html, 'og:url'), `https://sathlersamuel-gif.github.io/catalogo-consorcio-yamaha/share/moto/${id}/`);
    assert.match(html, new RegExp(`\\?moto=${id}`));
  });
}
