(function createAdminPasswordRecovery() {
  const config = window.CATALOG_CONFIG || {};
  const root = document.getElementById('adminRoot');
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  const adminEmail = String(config.adminEmail || '');
  if (!root || !baseUrl || !publishableKey || !adminEmail) return;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[char]));
  }

  async function readResponse(response) {
    const type = response.headers?.get?.('content-type') || '';
    const body = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = body?.msg || body?.message || body?.error_description || body?.error || String(body || 'Não foi possível concluir a solicitação.');
      throw new Error(message);
    }
    return body;
  }

  function recoveryRedirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  async function requestRecovery(button, status) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Enviando…';
    status.textContent = '';
    try {
      const redirectTo = recoveryRedirectUrl();
      const response = await fetch(`${baseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: adminEmail }),
      });
      await readResponse(response);
      status.textContent = 'Link de recuperação enviado para o e-mail do administrador.';
      status.style.color = '#147a3d';
    } catch (error) {
      console.error('Falha ao solicitar recuperação de senha:', error);
      status.textContent = 'Não foi possível enviar o link agora. Tente novamente.';
      status.style.color = '#b42318';
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function addForgotPasswordAction() {
    const form = document.getElementById('loginForm');
    if (!form || form.querySelector('[data-forgot-password]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn ghost full';
    button.dataset.forgotPassword = 'true';
    button.textContent = 'Esqueci minha senha';
    button.style.marginTop = '10px';

    const status = document.createElement('small');
    status.dataset.recoveryStatus = 'true';
    status.setAttribute('role', 'status');
    status.style.display = 'block';
    status.style.marginTop = '9px';
    status.style.lineHeight = '1.4';

    button.addEventListener('click', () => requestRecovery(button, status));
    form.append(button, status);
  }

  function renderRecoveryForm(accessToken) {
    root.innerHTML = `<main class="login-page">
      <section class="login-visual">
        <span class="eyebrow">RECUPERAÇÃO DE ACESSO</span>
        <h1>Crie uma nova senha.</h1>
        <p>Use letras, números e outros caracteres para deixar sua senha segura.</p>
      </section>
      <section class="card login-card">
        <div class="login-mark mark">Y</div>
        <h2>Redefinir senha</h2>
        <p class="muted">Digite a nova senha duas vezes para confirmar.</p>
        <form id="recoveryPasswordForm">
          <label class="field"><span>Nova senha</span><input name="password" type="password" minlength="6" autocomplete="new-password" autocapitalize="none" spellcheck="false" placeholder="Nova senha" required></label>
          <label class="field"><span>Confirmar nova senha</span><input name="confirm_password" type="password" minlength="6" autocomplete="new-password" autocapitalize="none" spellcheck="false" placeholder="Repita a nova senha" required></label>
          <button class="btn primary full" type="submit">Salvar nova senha</button>
          <small id="recoveryPasswordStatus" role="status" style="display:block;margin-top:10px;line-height:1.4"></small>
        </form>
      </section>
    </main>`;

    const form = document.getElementById('recoveryPasswordForm');
    const status = document.getElementById('recoveryPasswordStatus');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = String(new FormData(form).get('password') || '');
      const confirmation = String(new FormData(form).get('confirm_password') || '');
      if (password.length < 6) {
        status.textContent = 'A senha precisa ter pelo menos 6 caracteres.';
        status.style.color = '#b42318';
        return;
      }
      if (password !== confirmation) {
        status.textContent = 'As duas senhas precisam ser iguais.';
        status.style.color = '#b42318';
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Salvando…';
      status.textContent = '';
      try {
        const response = await fetch(`${baseUrl}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });
        await readResponse(response);
        history.replaceState({}, document.title, window.location.pathname);
        root.innerHTML = `<main class="wrap setup-page"><section class="card setup-card">
          <span class="setup-icon">✓</span>
          <h1>Senha alterada com sucesso</h1>
          <p>Sua nova senha já pode ser usada para entrar no painel.</p>
          <a class="btn primary" href="admin.html">Voltar para entrar</a>
        </section></main>`;
      } catch (error) {
        console.error('Falha ao redefinir senha:', error);
        status.textContent = 'O link pode ter expirado ou já ter sido usado. Solicite um novo link.';
        status.style.color = '#b42318';
        submit.disabled = false;
        submit.textContent = 'Salvar nova senha';
      }
    });
  }

  function renderRecoveryError(message) {
    history.replaceState({}, document.title, window.location.pathname);
    root.innerHTML = `<main class="wrap setup-page"><section class="card setup-card">
      <span class="setup-icon">!</span>
      <h1>Link de recuperação inválido</h1>
      <p>${escapeHtml(message || 'Esse link expirou ou não pôde ser validado.')}</p>
      <a class="btn primary" href="admin.html">Voltar para o login</a>
    </section></main>`;
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const recoveryType = hash.get('type');
  const recoveryError = hash.get('error_description') || hash.get('error');

  if (recoveryError) {
    renderRecoveryError(recoveryError);
    return;
  }

  if (accessToken && recoveryType === 'recovery') {
    renderRecoveryForm(accessToken);
    return;
  }

  addForgotPasswordAction();
  const observer = new MutationObserver(addForgotPasswordAction);
  observer.observe(root, { childList: true, subtree: true });
})();
