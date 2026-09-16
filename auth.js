(() => {
  const authScreen = document.getElementById('auth-screen');
  const onboardingScreen = document.getElementById('onboarding-screen');
  const appShell = document.querySelector('.app-shell');
  const form = document.getElementById('admin-login-form');
  const error = document.getElementById('auth-error');
  const loginButton = document.getElementById('admin-login-button');
  const toggleLink = document.getElementById('auth-toggle');
  const loginTitle = document.getElementById('login-title');
  const loginIntro = document.getElementById('login-intro');
  const authTabs = document.querySelectorAll('[data-auth-mode]');

  const accountStorageKey = 'samacaisse_compte';
  const readStoredAccount = () => { try { return JSON.parse(localStorage.getItem(accountStorageKey) || 'null'); } catch { return null; } };
  const saveStoredAccount = session => localStorage.setItem(accountStorageKey, JSON.stringify(session));
  const clearStoredAccount = () => localStorage.removeItem(accountStorageKey);
  const readStoredPersonnel = () => { try { return JSON.parse(sessionStorage.getItem('solma_personnel_session') || 'null'); } catch { return null; } };

  const api = async (path, options = {}) => {
    const response = await fetch(path, options);
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  };

  let authMode = 'compte';
  let registerMode = false;

  const showScreen = id => {
    [authScreen, onboardingScreen].forEach(screen => screen.classList.toggle('hidden', screen.id !== id));
    appShell.classList.add('locked');
    document.body.classList.remove('seller-mode');
  };

  const showAuth = () => {
    showScreen('auth-screen');
    form.reset();
    error.textContent = '';
  };

  const showOnboarding = compte => {
    document.getElementById('onboarding-account-name').textContent = compte.nom || compte.email;
    showScreen('onboarding-screen');
  };

  const showAppShell = () => {
    onboardingScreen.classList.add('hidden');
    authScreen.classList.add('hidden');
    appShell.classList.remove('locked');
    document.body.classList.toggle('seller-mode', Boolean(window.solmaPersonnelSession?.token));
    window.dispatchEvent(new CustomEvent('solma-auth-ready'));
  };

  const syncProfile = () => {
    const profile = window.solmaCompteSession?.compte || window.solmaPersonnelSession?.personnel;
    if (!profile) return;
    const name = profile.nom || profile.email || 'Compte propriétaire';
    const roleLabel = profile.role === 'vendeur' ? 'Vendeur' : 'Propriétaire';
    const storeLabel = window.solmaPersonnelSession?.personnel?.magasin_nom;
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-role').textContent = storeLabel ? `${roleLabel} · ${storeLabel}` : roleLabel;
    const avatar = document.getElementById('profile-avatar');
    if (avatar) avatar.textContent = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  };

  const routeAfterCompteLogin = async token => {
    const { response, payload } = await api('/api/account/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      clearStoredAccount();
      window.solmaCompteSession = null;
      window.solmaCompteData = null;
      showAuth();
      return;
    }
    window.solmaCompteData = payload;
    if (!payload.entreprises?.length) showOnboarding(payload.compte);
    else showAppShell();
  };

  const defaultButtonText = () => (authMode === 'personnel' ? 'Ouvrir ma session' : registerMode ? 'Créer mon espace' : 'Se connecter');

  authTabs.forEach(button => button.addEventListener('click', () => {
    authMode = button.dataset.authMode;
    authTabs.forEach(item => item.classList.toggle('active', item === button));
    document.querySelectorAll('.admin-field').forEach(item => {
      item.classList.toggle('hidden-field', authMode !== 'compte');
    });
    document.querySelectorAll('.personnel-field').forEach(item => {
      item.classList.toggle('hidden-field', authMode !== 'personnel');
    });
    if (authMode === 'personnel') registerMode = false;
    document.querySelectorAll('.register-field').forEach(item => item.classList.toggle('hidden-field', authMode !== 'compte' || !registerMode));
    loginButton.textContent = defaultButtonText();
  }));

  toggleLink.addEventListener('click', event => {
    event.preventDefault();
    registerMode = !registerMode;
    document.querySelectorAll('.register-field').forEach(item => item.classList.toggle('hidden-field', !registerMode));
    loginTitle.textContent = registerMode ? 'Créez votre espace.' : 'Bienvenue dans votre espace.';
    loginIntro.textContent = registerMode
      ? 'Renseignez vos informations pour commencer.'
      : 'Connectez-vous pour gérer vos magasins.';
    toggleLink.textContent = registerMode ? "J'ai déjà un compte" : 'Créer mon espace';
    error.textContent = '';
    form.reset();
    loginButton.textContent = defaultButtonText();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    loginButton.disabled = true;
    loginButton.textContent = 'Veuillez patienter...';
    try {
      if (authMode === 'compte') {
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;

        if (registerMode) {
          const nom = document.getElementById('register-name').value.trim();
          const confirmation = document.getElementById('register-confirm').value;
          if (!nom || password !== confirmation) {
            error.textContent = 'Champs incomplets ou mots de passe différents.';
            return;
          }
          const { response, payload } = await api('/api/account/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, email, password })
          });
          if (!response.ok) { error.textContent = payload.error || 'Impossible de créer le compte.'; return; }
          window.solmaCompteSession = payload;
          saveStoredAccount(payload);
          showOnboarding(payload.compte);
          return;
        }

        const { response, payload } = await api('/api/account/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!response.ok) { error.textContent = payload.error || 'Connexion impossible.'; return; }
        window.solmaCompteSession = payload;
        saveStoredAccount(payload);
        await routeAfterCompteLogin(payload.token);
        return;
      }

      const telephone = document.getElementById('personnel-phone').value.trim();
      const pin = document.getElementById('personnel-pin').value;
      clearStoredAccount();
      window.solmaCompteSession = null;
      const { response, payload } = await api('/api/personnel-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone, pin })
      });
      if (!response.ok) { error.textContent = 'Téléphone ou code incorrect.'; return; }
      sessionStorage.setItem('solma_personnel_session', JSON.stringify(payload));
      window.solmaPersonnelSession = payload;
      syncProfile();
      showAppShell();
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = defaultButtonText();
    }
  });

  const onboardingForm = document.getElementById('onboarding-form');
  const onboardingError = document.getElementById('onboarding-error');
  const onboardingButton = document.getElementById('onboarding-button');
  onboardingForm.addEventListener('submit', async event => {
    event.preventDefault();
    onboardingError.textContent = '';
    onboardingButton.disabled = true;
    onboardingButton.textContent = 'Création en cours...';
    try {
      const token = window.solmaCompteSession?.token;
      if (!token) { clearStoredAccount(); showAuth(); return; }
      const { response, payload } = await api('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entreprise_nom: document.getElementById('onboarding-nom').value.trim(),
          devise: document.getElementById('onboarding-devise').value.trim(),
          magasin_nom: document.getElementById('onboarding-magasin').value.trim()
        })
      });
      if (!response.ok) { onboardingError.textContent = payload.error || 'Impossible de créer votre espace.'; return; }
      const me = await api('/api/account/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!me.response.ok) { clearStoredAccount(); showAuth(); return; }
      window.solmaCompteData = me.payload;
      showAppShell();
    } finally {
      onboardingButton.disabled = false;
      onboardingButton.textContent = 'Créer mon espace';
    }
  });

  document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', async () => {
    clearStoredAccount();
    sessionStorage.removeItem('solma_personnel_session');
    window.solmaCompteSession = null;
    window.solmaCompteData = null;
    window.solmaPersonnelSession = null;
    if (window.solmaSupabase) await window.solmaSupabase.auth.signOut().catch(() => {});
    showAuth();
  }));

  const start = async () => {
    const personnel = readStoredPersonnel();
    if (personnel?.token) {
      window.solmaPersonnelSession = personnel;
      syncProfile();
      showAppShell();
      return;
    }
    const account = readStoredAccount();
    if (account?.token) {
      window.solmaCompteSession = account;
      await routeAfterCompteLogin(account.token);
      return;
    }
    showAuth();
  };

  const configReady = window.SOLMA_SUPABASE_URL && window.SOLMA_SUPABASE_ANON_KEY && !window.SOLMA_SUPABASE_ANON_KEY.startsWith('A_REMPLACER');
  if (configReady && window.supabase?.createClient) {
    window.solmaSupabase = window.supabase.createClient(window.SOLMA_SUPABASE_URL, window.SOLMA_SUPABASE_ANON_KEY);
  } else {
    console.warn('SamaCaisse : config.js absent ou incomplète — les comptes propriétaires fonctionnent quand même.');
  }

  start();
})();