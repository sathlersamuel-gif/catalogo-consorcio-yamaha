# Catálogo / Consórcio Yamaha

Catálogo público e painel administrativo para gerenciar categorias, motos, galeria de fotos, planos, configurações e leads.

## Recursos

- Categorias totalmente editáveis, com ícone ou imagem, ordem e status.
- Motos editáveis, com categoria, ano/modelo, descrição, destaque e status.
- Upload múltiplo de fotos no Supabase Storage.
- Definição da foto principal, exclusão individual e organização da galeria.
- Planos editáveis, ocultáveis, excluíveis e reordenáveis.
- Destaque automático da menor parcela e etiqueta comercial opcional.
- WhatsApp com mensagem pronta e número configurável.
- Leads centralizados no painel administrativo.
- Login administrativo pelo Supabase Auth.
- Layout responsivo para celular, tablet e computador.

## Configuração do Supabase

1. Crie um projeto gratuito no Supabase.
2. Abra o SQL Editor e execute todo o arquivo `supabase-schema.sql`.
3. Em **Authentication > Users**, crie um usuário com o e-mail definido em `config.js` e uma senha de pelo menos 6 caracteres.
4. Em **Project Settings > API**, copie a URL do projeto e a chave pública `publishable`.
5. Preencha `supabaseUrl` e `supabasePublishableKey` no arquivo `config.js`.
6. Troque o WhatsApp de exemplo no painel antes de divulgar o catálogo.

A chave `publishable` é pública por definição. A proteção dos dados é feita pelas políticas RLS incluídas no SQL. Nunca coloque uma chave `secret` ou `service_role` no site.

## Publicação

O workflow `.github/workflows/pages.yml` publica automaticamente a branch `main` no GitHub Pages.
