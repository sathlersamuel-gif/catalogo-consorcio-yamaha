import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);
const source = async (name) => readFile(new URL(name, root), 'utf8');

function prepareWindow(window) {
  window.structuredClone = globalThis.structuredClone;
  window.crypto = globalThis.crypto;
  window.scrollTo = () => {};
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
  window.confirm = () => true;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

test('catálogo público mostra categorias, motos, detalhes, galeria e planos', async () => {
  const dom = new JSDOM(await source('index.html'), { url: 'https://example.test/index.html', runScripts: 'outside-only' });
  prepareWindow(dom.window);
  dom.window.open = (url) => { dom.window.__openedUrl = url; };
  dom.window.eval(await source('config.js'));
  dom.window.CATALOG_CONFIG = {
    supabaseUrl: '',
    supabasePublishableKey: '',
    supabaseAnonKey: '',
    adminEmail: 'admin@samuel-yamaha.com.br',
    storageBucket: 'motorcycle-images',
  };
  dom.window.eval(await source('seed.js'));
  dom.window.CATALOG_SEED.photos.push({ id: 'photo-1', moto_id: 'm1', url: 'https://example.test/lander.jpg', path: 'motos/m1/lander.jpg', is_primary: true, sort_order: 1 });
  dom.window.eval(await source('api.js'));
  dom.window.eval(await source('client.js'));
  await flush();

  assert.equal(dom.window.document.querySelectorAll('[data-category-id]').length, 5);
  assert.equal(dom.window.document.querySelectorAll('.moto-card').length, 5);
  assert.match(dom.window.document.body.textContent, /Encontre a Yamaha ideal/);
  assert.ok(dom.window.document.querySelector('a[href="admin.html"]'));

  dom.window.document.querySelector('[data-moto-id="m1"]').click();
  assert.match(dom.window.document.body.textContent, /Lander 250/);
  assert.equal(dom.window.document.querySelectorAll('.plan-card').length, 5);
  assert.equal(dom.window.document.querySelectorAll('.plan-card.best').length, 1);
  assert.match(dom.window.document.querySelector('.plan-card.best').textContent, /Menor parcela/);

  dom.window.document.querySelector('[data-action="open-gallery"]').click();
  assert.ok(dom.window.document.querySelector('.gallery-viewer'));
  dom.window.document.querySelector('[data-action="close-modal"]').click();
  assert.equal(dom.window.document.querySelector('.gallery-viewer'), null);

  dom.window.document.querySelector('[data-interest-plan="p5"]').click();
  assert.match(dom.window.__openedUrl, /^https:\/\/wa\.me\/5569999999999/);
  assert.match(decodeURIComponent(dom.window.__openedUrl), /80x de R\$\s+469,90/);
});

test('painel sem banco conectado bloqueia edição local e explica a configuração', async () => {
  const dom = new JSDOM(await source('admin.html'), { url: 'https://example.test/admin.html', runScripts: 'outside-only' });
  prepareWindow(dom.window);
  dom.window.eval(await source('config.js'));
  dom.window.CATALOG_CONFIG = {
    supabaseUrl: '',
    supabasePublishableKey: '',
    supabaseAnonKey: '',
    adminEmail: 'admin@samuel-yamaha.com.br',
    storageBucket: 'motorcycle-images',
  };
  dom.window.eval(await source('api.js'));
  dom.window.eval(await source('admin.js'));
  await flush();

  assert.match(dom.window.document.body.textContent, /Banco online aguardando configuração/);
  assert.match(dom.window.document.body.textContent, /Leads recebidos no seu painel/);
});

test('login remoto abre dashboard e todas as áreas administrativas', async () => {
  const dom = new JSDOM(await source('admin.html'), { url: 'https://example.test/admin.html', runScripts: 'outside-only' });
  prepareWindow(dom.window);
  dom.window.CATALOG_CONFIG = {
    supabaseUrl: 'https://teste.supabase.co',
    supabasePublishableKey: `sb_publishable_${'a'.repeat(48)}`,
    supabaseAnonKey: '',
    adminEmail: 'admin@samuel-yamaha.com.br',
    storageBucket: 'motorcycle-images',
  };
  const fixtures = {
    catalog_settings: [{ id: 1, seller_name: 'Samuel Yamaha', whatsapp: '5569999999999' }],
    categories: [{ id: 'c1', name: 'Trail', description: 'Aventura', icon: '🏍️', image_url: '', image_path: '', active: true, sort_order: 1 }],
    motos: [{ id: 'm1', category_id: 'c1', name: 'Lander 250', year_model: '2026', description: 'Moto trail', active: true, featured: true, sort_order: 1 }],
    moto_photos: [],
    plans: [{ id: 'p1', moto_id: 'm1', installments: 80, installment_value: 469.9, label: '', active: true, sort_order: 1 }],
    leads: [],
  };
  dom.window.fetch = async (url) => {
    if (String(url).includes('/auth/v1/token')) return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200, headers: { 'content-type': 'application/json' } });
    const table = Object.keys(fixtures).find((name) => String(url).includes(`/rest/v1/${name}?`));
    return new Response(JSON.stringify(fixtures[table] || []), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  dom.window.eval(await source('api.js'));
  dom.window.eval(await source('admin.js'));
  await flush();

  const password = dom.window.document.querySelector('[name="password"]');
  password.value = '123456';
  dom.window.document.getElementById('loginForm').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await flush();
  assert.match(dom.window.document.body.textContent, /Dashboard/);
  assert.match(dom.window.document.body.textContent, /Samuel Yamaha/);

  dom.window.document.querySelector('[data-tab="categories"]').click();
  dom.window.document.querySelector('[data-action="new-category"]').click();
  assert.ok(dom.window.document.getElementById('categoryForm'));
  assert.ok(dom.window.document.querySelector('#categoryForm [name="image"][accept*="image"]'));
  dom.window.document.querySelector('#categoryForm [data-action="close-modal"]').click();

  dom.window.document.querySelector('[data-tab="motos"]').click();
  dom.window.document.querySelector('[data-edit-moto="m1"]').click();
  assert.ok(dom.window.document.querySelector('#motoPhotoInput[multiple]'));
  assert.equal(dom.window.document.querySelectorAll('[data-plan-index]').length, 1);
  dom.window.document.querySelector('[data-action="add-plan"]').click();
  assert.equal(dom.window.document.querySelectorAll('[data-plan-index]').length, 2);
  dom.window.document.querySelector('[data-plan-remove="1"]').click();
  assert.equal(dom.window.document.querySelectorAll('[data-plan-index]').length, 1);
  dom.window.document.querySelector('#motoForm [data-action="close-modal"]').click();

  for (const tab of ['plans', 'leads', 'settings']) {
    dom.window.document.querySelector(`[data-tab="${tab}"]`).click();
    assert.equal(dom.window.document.querySelector('.side-button.active')?.dataset.tab, tab);
  }
  assert.equal(dom.window.document.querySelector('#settingsForm [name="password"]').minLength, 6);
  assert.ok(dom.window.document.querySelector('a[href="index.html"][target="_blank"]'));
});
