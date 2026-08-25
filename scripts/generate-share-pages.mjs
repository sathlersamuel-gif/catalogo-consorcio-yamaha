import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configSource = await readFile(join(root, 'config.js'), 'utf8');
const supabaseUrl = configSource.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
const publishableKey = configSource.match(/supabasePublishableKey:\s*'([^']+)'/)?.[1];
const catalogUrl = 'https://sathlersamuel-gif.github.io/catalogo-consorcio-yamaha/';
const outputRoot = join(root, 'share', 'moto');
const forcedLocalPreviewIds = new Set([
  'b5f75169-0baa-48c0-aa36-445e502eb066',
  '2ce221a6-c6ae-4a90-a536-6439b971360a',
  'c38aff53-47f4-4718-8816-68ea45734887',
  'e08f54bf-184f-4c60-8be3-130df0757c1f',
  '66c58e1d-b945-4ea2-8097-e65431e2afa2',
  'ba422fba-6642-4f14-8f1f-be00ae87b97c',
  'bbfa54bb-c0ea-480a-9919-0440ade9981c',
  '8d7ccb0f-ff3e-4835-8a21-bfbebbc9201b',
]);

if (!supabaseUrl || !publishableKey) throw new Error('Configuração pública do catálogo não encontrada.');

const headers = { apikey: publishableKey };
async function fetchWithRetry(url, options = {}, attempts = 3) {
  let response;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    response = await fetch(url, options);
    if (response.ok || response.status < 500 || attempt === attempts) return response;
    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
  return response;
}

async function table(name, query) {
  const response = await fetchWithRetry(`${supabaseUrl}/rest/v1/${name}?${query}`, { headers });
  if (!response.ok) throw new Error(`Falha ao carregar ${name}: ${response.status}`);
  return response.json();
}

const [motos, photos] = await Promise.all([
  table('motos', 'select=id,name,year_model,description,active&active=eq.true&order=name.asc'),
  table('moto_photos', 'select=moto_id,url,is_primary,sort_order&order=sort_order.asc'),
]);

const previousManifest = await readFile(join(outputRoot, 'manifest.json'), 'utf8')
  .then((content) => JSON.parse(content).motos || [])
  .catch(() => []);
const previousMotoIds = new Set(previousManifest.map(({ id }) => id));
const previousLocalPreviewIds = new Set();
await Promise.all(previousManifest.map(async ({ id }) => {
  await access(join(outputRoot, id, 'preview.jpg'))
    .then(() => previousLocalPreviewIds.add(id))
    .catch(() => {});
}));

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[char]));

function descriptionFor(moto) {
  const clean = String(moto.description || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const detail = clean ? ` ${clean}` : '';
  return `Consórcio Yamaha da ${String(moto.name).trim()}: veja fotos, detalhes e planos disponíveis.${detail}`.slice(0, 190).trim();
}

function primaryPhoto(motoId) {
  return photos
    .filter((photo) => photo.moto_id === motoId)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.sort_order) - Number(b.sort_order))[0]?.url;
}

async function previewImageFor(moto, directory) {
  const source = primaryPhoto(moto.id);
  if (!source) return { url: `${catalogUrl}assets/consorcio-yamaha-share.jpg`, type: 'image/jpeg' };
  const needsLocalPreview = /\.(?:webp|avif)(?:$|\?)/i.test(source)
    || forcedLocalPreviewIds.has(moto.id)
    || previousLocalPreviewIds.has(moto.id)
    || !previousMotoIds.has(moto.id);
  if (!needsLocalPreview) {
    return { url: source, type: /\.png(?:$|\?)/i.test(source) ? 'image/png' : 'image/jpeg' };
  }

  const response = await fetchWithRetry(source);
  if (!response.ok) throw new Error(`Falha ao preparar a foto de ${moto.name}: ${response.status}`);
  await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(1200, 630, { fit: 'contain', background: '#ffffff' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(join(directory, 'preview.jpg'));
  return {
    url: `${catalogUrl}share/moto/${encodeURIComponent(moto.id)}/preview.jpg`,
    type: 'image/jpeg',
  };
}

function pageFor(moto, image) {
  const name = String(moto.name).trim();
  const title = `${name}${moto.year_model ? ` ${moto.year_model}` : ''} | Consórcio Yamaha`;
  const description = descriptionFor(moto);
  const canonical = `${catalogUrl}share/moto/${encodeURIComponent(moto.id)}/`;
  const destination = `${catalogUrl}?moto=${encodeURIComponent(moto.id)}`;
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Consórcio Yamaha • Samuel">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image.url)}">
<meta property="og:image:secure_url" content="${escapeHtml(image.url)}"><meta property="og:image:type" content="${image.type}"><meta property="og:image:alt" content="${escapeHtml(name)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image.url)}">
<link rel="canonical" href="${escapeHtml(canonical)}"><meta http-equiv="refresh" content="0;url=${escapeHtml(destination)}">
<script>location.replace(${JSON.stringify(destination)});</script>
</head><body><p>Abrindo ${escapeHtml(name)} no Catálogo Consórcio Yamaha…</p><a href="${escapeHtml(destination)}">Continuar</a></body></html>\n`;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
for (const moto of motos) {
  const directory = join(outputRoot, moto.id);
  await mkdir(directory, { recursive: true });
  const image = await previewImageFor(moto, directory);
  await writeFile(join(directory, 'index.html'), pageFor(moto, image));
}
await writeFile(join(outputRoot, 'manifest.json'), `${JSON.stringify({ motos: motos.map(({ id, name }) => ({ id, name })) }, null, 2)}\n`);
console.log(`${motos.length} prévias de motos geradas.`);
