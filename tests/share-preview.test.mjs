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

for (const [id, name] of [
  ['2ce221a6-c6ae-4a90-a536-6439b971360a', 'FZ25 CONNECTED'],
  ['c38aff53-47f4-4718-8816-68ea45734887', 'MT-03 CONNECTED'],
  ['bbfa54bb-c0ea-480a-9919-0440ade9981c', 'YZF-R15 ABS'],
  ['e08f54bf-184f-4c60-8be3-130df0757c1f', 'MT-07 CONNECTED'],
  ['ba422fba-6642-4f14-8f1f-be00ae87b97c', 'XTZ CROSSER 150 ABS'],
  ['b5f75169-0baa-48c0-aa36-445e502eb066', 'FZ15 ABS CONNECTED'],
  ['66c58e1d-b945-4ea2-8097-e65431e2afa2', 'TRACER 700 Cc'],
  ['8d7ccb0f-ff3e-4835-8a21-bfbebbc9201b', 'YZF-R3 CONNECTED'],
]) {
  test(`prévia otimizada de ${name}`, async () => {
    const html = await readFile(new URL(`share/moto/${id}/index.html`, root), 'utf8');
    assert.match(meta(html, 'og:title'), new RegExp(name));
    assert.equal(meta(html, 'og:image'), `https://sathlersamuel-gif.github.io/catalogo-consorcio-yamaha/share/moto/${id}/preview.jpg`);
    assert.equal(meta(html, 'og:image:type'), 'image/jpeg');
    assert.match(html, new RegExp(`\\?moto=${id}`));
    const image = await readFile(new URL(`share/moto/${id}/preview.jpg`, root));
    assert.deepEqual([...image.subarray(0, 3)], [0xff, 0xd8, 0xff]);
    assert.ok(image.byteLength < 500_000);
  });
}

test('prévia da XMAX converte a foto WebP principal para JPEG compatível', async () => {
  const id = 'e3016c81-372e-45c8-870d-6306cd002749';
  const html = await readFile(new URL(`share/moto/${id}/index.html`, root), 'utf8');
  assert.match(meta(html, 'og:title'), /XMAX 300 CONNECTED/);
  assert.equal(meta(html, 'og:image'), `https://sathlersamuel-gif.github.io/catalogo-consorcio-yamaha/share/moto/${id}/preview.jpg`);
  assert.equal(meta(html, 'og:image:type'), 'image/jpeg');
  const image = await readFile(new URL(`share/moto/${id}/preview.jpg`, root));
  assert.deepEqual([...image.subarray(0, 3)], [0xff, 0xd8, 0xff]);
});
