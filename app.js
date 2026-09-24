(() => {
  const page = document.querySelector('#page-content');
  const ICONS = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    trendingUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    trendingDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 7 9 13 13 9 21 17"/><polyline points="14 17 21 17 21 10"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M18 12h.01"/><path d="M3 9h13"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M9 21v-6h6v6"/></svg>',
    printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'
  };
  const icon = (name, size = 16) => `<span class="icon" style="width:${size}px;height:${size}px">${ICONS[name] || ''}</span>`;

  const state = {
    isPersonnel: false,
    token: '',
    entreprise_id: '',
    entreprise: { nom: '', devise: 'FCFA' },
    magasins: [],
    produits: [],
    ventes: [],
    depenses: [],
    dettes: [],
    versements: [],
    caisses: [],
    personnel: [],
    store: 'all',
    loading: true,
    error: '',
    currentView: 'dashboard',
    search: { produits: '', ventes: '', depenses: '', dettes: '' },
    filters: { salesSeller: 'all', salesPayment: 'all', expSeller: 'all', detteStatut: 'all' },
    period: 'today'
  };

  function syncAuthState() {
    const personnel = window.solmaPersonnelSession;
    const compte = window.solmaCompteSession;
    state.isPersonnel = Boolean(personnel?.token);
    state.token = personnel?.token || compte?.token || '';
    state.entreprise_id = personnel?.personnel?.entreprise_id || window.solmaCompteData?.entreprises?.[0]?.id || '';
    if (state.isPersonnel) state.store = personnel.personnel?.magasin_id || 'all';
  }

  const money = (value, devise = state.entreprise.devise || 'FCFA') => new Intl.NumberFormat('fr-FR').format(Math.round(Number(value) || 0)) + ' ' + devise;
  const toTime = value => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const initials = name => String(name || '?').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const showToast = message => { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); };
  const isToday = timestamp => { const d = new Date(timestamp); const t = new Date(); return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate(); };
  const isSameDay = (a, b) => (new Date(a)).getFullYear() === (new Date(b)).getFullYear() && (new Date(a)).getMonth() === (new Date(b)).getMonth() && (new Date(a)).getDate() === (new Date(b)).getDate();
  const API = async (path, options = {}) => {
    options.headers = { ...(options.headers || {}), ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) };
    if (options.body && typeof options.body !== 'string') options.body = JSON.stringify(options.body);
    const response = await fetch(path, options);
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  };

  const t = (key, fallback) => window.SamaCaisseI18n ? window.SamaCaisseI18n.t(key) : fallback;

  const LAST_STORE_KEY = 'samacaisse_last_store';
  const readLastStore = () => { try { return localStorage.getItem(LAST_STORE_KEY) || ''; } catch { return ''; } };
  const saveLastStore = id => { try { if (id) localStorage.setItem(LAST_STORE_KEY, id); } catch {} };
  const storeName = magasinId => state.magasins.find(magasin => magasin.id === magasinId)?.nom || t('store_all', 'Toutes les boutiques');
  const scopeMatches = item => state.store === 'all' || item.magasin_id === state.store || (item.magasin_id === null && state.store === 'all');
  const filtered = (items) => items.filter(scopeMatches);
  const periodRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (state.period === 'today') return { start, end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
    if (state.period === '7d') return { start: new Date(start.getTime() - 6 * 86400000), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
    if (state.period === '30d') return { start: new Date(start.getTime() - 29 * 86400000), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
    return null;
  };
  const inPeriod = timestamp => {
    const range = periodRange();
    if (!range) return true;
    const date = new Date(timestamp);
    return date >= range.start && date <= range.end;
  };

  async function loadData() {
    state.loading = true;
    state.error = '';
    render();
    const { response, payload } = await API(`/api/business-data?entreprise_id=${encodeURIComponent(state.entreprise_id)}`);
    if (!response.ok) {
      state.error = payload.error || 'Impossible de charger les données.';
      state.loading = false;
      render();
      return;
    }
    state.entreprise = payload.entreprise || { nom: '', devise: 'FCFA' };
    state.magasins = payload.magasins || [];
    state.produits = payload.produits || [];
    state.ventes = payload.ventes || [];
    state.depenses = payload.depenses || [];
    state.dettes = payload.dettes || [];
    state.versements = payload.versements || [];
    state.caisses = payload.caisses || [];
    state.personnel = payload.personnel || [];
    state.loading = false;
    syncEnterpriseBadge();
    render();
    maybeStartTour();
  }

  const pageTitle = () => ({ dashboard: t('nav_dashboard', 'Tableau de bord'), sales: t('nav_sales', 'Ventes'), cash: t('nav_cash', 'Caisses'), expenses: t('nav_expenses', 'Dépenses'), debts: t('nav_debts', 'Dettes clients'), products: t('nav_products', 'Produits'), team: t('nav_team', 'Personnel'), reports: t('nav_reports', 'Rapports') }[state.currentView] || t('nav_dashboard', 'Tableau de bord'));

  function buildTrendSvg(sales) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const dayRange = state.store === 'all' ? days : days.filter(day => day.toString());
    const totals = dayRange.map(day => sales.filter(sale => !sale.annulee && isSameDay(new Date(sale.date_heure), day)).reduce((sum, sale) => sum + sale.montant, 0));
    const maxValue = Math.max(...totals, 1);
    const width = 700, topY = 30, bottomY = 195;
    const points = totals.map((value, index) => {
      const x = (width / (totals.length - 1)) * index;
      const y = bottomY - (value / maxValue) * (bottomY - topY);
      return { x, y, value, label: dayRange[index].toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) };
    });
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${width} 200 L0 200Z`;
    const lastPoint = points[points.length - 1];
    const shortMoney = v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`;
    const yTicks = [30, 87, 144].map(y => ({ y, value: maxValue * (1 - (y - topY) / (bottomY - topY)) }));
    return `<svg class="chart" viewBox="0 0 700 220" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#80bca0" stop-opacity=".30"/><stop offset="1" stop-color="#80bca0" stop-opacity="0"/></linearGradient></defs><line class="chart-grid" x1="0" y1="30" x2="700" y2="30"/><line class="chart-grid" x1="0" y1="87" x2="700" y2="87"/><line class="chart-grid" x1="0" y1="144" x2="700" y2="144"/><path class="chart-area" d="${areaPath}"/><path class="chart-line" d="${linePath}"/><circle class="chart-dot" cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="5"/>${points.map((point, index) => `<text class="axis-label" x="${point.x.toFixed(1)}" y="216" text-anchor="${index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}">${point.label}</text>`).join('')}${yTicks.map(tick => `<text class="axis-label" x="696" y="${(tick.y - 5).toFixed(1)}" text-anchor="end">${shortMoney(tick.value)}</text>`).join('')}</svg>`;
  }

  // Début de session : dernière clôture de la boutique (les ventes faites
  // caisse fermée sont rattachées à la session suivante, jamais perdues).
  function sessionStart(caisse) {
    const fermetures = state.caisses
      .filter(item => item.magasin_id === caisse.magasin_id && item.date_fermeture && item.id !== caisse.id && new Date(item.date_fermeture) < new Date(caisse.date_ouverture))
      .map(item => new Date(item.date_fermeture).getTime());
    return fermetures.length ? new Date(Math.max(...fermetures)) : null;
  }

  function cashExpectation(caisse) {
    if (!caisse) return 0;
    if (caisse.date_fermeture) return caisse.montant_fermeture || 0;
    const since = sessionStart(caisse);
    const inSession = timestamp => !since || new Date(timestamp) >= since;
    const sales = state.ventes.filter(v => v.magasin_id === caisse.magasin_id && !v.annulee && v.mode_paiement === 'liquide' && inSession(v.date_heure)).reduce((sum, v) => sum + v.montant, 0);
    const expenses = state.depenses.filter(d => d.magasin_id === caisse.magasin_id && !d.annulee && inSession(d.date_heure)).reduce((sum, d) => sum + d.montant, 0);
    return caisse.montant_ouverture + sales - expenses;
  }

  // Montant réel continu du tiroir : ouvertures + ventes liquide − dépenses
  // − fermetures (l'argent compté est retiré). Jamais zéro à tort.
  function cashReel(magasinId) {
    const caisses = state.caisses.filter(item => item.magasin_id === magasinId);
    const ouvertures = caisses.reduce((sum, item) => sum + (item.montant_ouverture || 0), 0);
    const fermetures = caisses.filter(item => item.date_fermeture).reduce((sum, item) => sum + (item.montant_fermeture || 0), 0);
    const sales = state.ventes.filter(v => v.magasin_id === magasinId && !v.annulee && v.mode_paiement === 'liquide').reduce((sum, v) => sum + v.montant, 0);
    const expenses = state.depenses.filter(d => d.magasin_id === magasinId && !d.annulee).reduce((sum, d) => sum + d.montant, 0);
    return ouvertures + sales - expenses - fermetures;
  }

  const todayKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const detteReste = dette => Math.max(0, (dette.montant_total || 0) - (dette.montant_paye || 0));
  const detteStatut = dette => {
    if (dette.annulee) return 'annulee';
    if (detteReste(dette) <= 0) return 'soldee';
    const echeance = String(dette.date_echeance || '').slice(0, 10);
    const aujourd = todayKey();
    if (echeance < aujourd) return 'retard';
    if (echeance === aujourd) return 'jour';
    return 'avenir';
  };
  const personnelOwnDettes = items => {
    if (!state.isPersonnel) return items;
    const pid = window.solmaPersonnelSession?.personnel?.id;
    if (!pid) return items;
    return items.filter(dette => dette.personnel_id === pid);
  };

  function csvCell(value) {
    const str = String(value ?? '');
    return /[";\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }
  function downloadCsv(filename, headers, rows) {
    const content = '\uFEFF' + [headers, ...rows].map(line => line.map(csvCell).join(';')).join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  const scopeLabel = () => (state.store === 'all' ? t('store_all', 'Toutes les boutiques') : storeName(state.store));
  function syncProfileUi() {
    const profile = window.solmaCompteSession?.compte || window.solmaPersonnelSession?.personnel;
    if (!profile) return;
    const name = profile.nom || profile.email || t('app_profile_owner', 'Compte propriétaire');
    document.getElementById('profile-name').textContent = name;
    const avatar = document.getElementById('profile-avatar');
    if (avatar) avatar.textContent = String(name).split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  function syncEnterpriseBadge() {
    const badge = document.getElementById('enterprise-name-badge');
    if (!badge) return;
    const name = state.entreprise.nom || '';
    badge.textContent = name;
    badge.classList.toggle('hidden', !name);
    const breadcrumb = document.getElementById('breadcrumb-current');
    if (breadcrumb) breadcrumb.textContent = pageTitle();
  }
  function reportSnapshot() {
    const sales = filtered(state.ventes).filter(v => !v.annulee && inPeriod(v.date_heure));
    const expenses = filtered(state.depenses).filter(d => !d.annulee && inPeriod(d.date_heure));
    const days = {};
    sales.forEach(sale => { const key = new Date(sale.date_heure).toISOString().slice(0, 10); days[key] = days[key] || { sales: 0, expenses: 0 }; days[key].sales += sale.montant; });
    expenses.forEach(depense => { const key = new Date(depense.date_heure).toISOString().slice(0, 10); days[key] = days[key] || { sales: 0, expenses: 0 }; days[key].expenses += depense.montant; });
    const daily = Object.keys(days).sort((a, b) => b.localeCompare(a)).slice(0, 60).map(key => ({
      date: new Date(key).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }),
      sales: days[key].sales,
      expenses: days[key].expenses
    }));
    const cashClosed = filtered(state.caisses).filter(item => item.date_fermeture).map(item => ({
      date: toTime(item.date_fermeture),
      store: storeName(item.magasin_id),
      opening: item.montant_ouverture || 0,
      theorique: item.solde_theorique ?? (item.montant_fermeture || 0) - (item.ecart || 0),
      closings: item.montant_fermeture || 0,
      difference: item.ecart || 0
    }));
    const salesTotal = sales.reduce((sum, sale) => sum + sale.montant, 0);
    const expensesTotal = expenses.reduce((sum, e) => sum + e.montant, 0);
    const productsSold = {};
    sales.forEach(sale => { productsSold[sale.nom_produit] = (productsSold[sale.nom_produit] || 0) + sale.montant; });
    return {
      daily,
      cashClosed,
      totals: { sales: salesTotal, expenses: expensesTotal, net: salesTotal - expensesTotal },
      topProducts: Object.entries(productsSold).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }
  function exportSalesCsv() {
    downloadCsv('ventes.csv', ['Produit', 'Vendeur', 'Boutique', 'Paiement', 'Quantité', 'Montant', 'Date', 'Statut'], personnelOwnSales(filtered(state.ventes)).filter(sale => matchesSearch(sale.nom_produit, 'ventes')).map(v => [v.nom_produit, v.personnel?.nom || v.admin_nom || t('app_owner', 'Propriétaire'), v.magasins?.nom || '', v.mode_paiement === 'liquide' ? t('app_pay_cash', 'Liquide') : t('app_pay_mobile', 'Mobile money'), v.quantite, v.montant, toTime(v.date_heure), v.annulee ? t('app_cancelled', 'Annulée') : 'Valide']));
  }
  function exportExpensesCsv() {
    downloadCsv('depenses.csv', ['Motif', 'Ajoutée par', 'Boutique', 'Montant', 'Date', 'Statut'], filtered(state.depenses).filter(d => matchesSearch(d.motif, 'depenses')).map(d => [d.motif, d.personnel?.nom || d.admin_nom || t('app_owner', 'Propriétaire'), d.magasins?.nom || '', d.montant, toTime(d.date_heure), d.annulee ? t('app_cancelled', 'Annulée') : 'Valide']));
  }
  function exportDailyCsv() {
    const { daily } = reportSnapshot();
    downloadCsv('rapport-journalier.csv', ['Jour', 'Ventes', 'Dépenses', 'Résultat'], daily.map(d => [d.date, d.sales, d.expenses, d.sales - d.expenses]));
  }
  function exportCashCsv() {
    const { cashClosed } = reportSnapshot();
    downloadCsv('historique-caisses.csv', ['Clôturée le', 'Boutique', 'Ouverture', 'Solde théorique', 'Solde réel', 'Écart'], cashClosed.map(c => [c.date, c.store, c.opening, c.theorique, c.closings, c.difference]));
  }
  function openPrintReport() {
    const { daily, cashClosed, totals, topProducts } = reportSnapshot();
    const devise = state.entreprise.devise || 'FCFA';
    const moneyRaw = value => new Intl.NumberFormat('fr-FR').format(Math.round(Number(value) || 0)) + ' ' + devise;
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const dailyRows = daily.length ? daily.map(d => `<tr><td>${d.date}</td><td>${moneyRaw(d.sales)}</td><td>− ${moneyRaw(d.expenses)}</td><td>${moneyRaw(d.sales - d.expenses)}</td></tr>`).join('') : '<tr><td colspan="4">' + t('app_print_none', 'Aucune vente ou dépense enregistrée.') + '</td></tr>';
    const cashRows = cashClosed.length ? cashClosed.slice(0, 60).map(c => `<tr><td>${c.date}</td><td>${escapeHtml(c.store)}</td><td>${moneyRaw(c.opening)}</td><td>${moneyRaw(c.theorique)}</td><td>${moneyRaw(c.closings)}</td><td>${moneyRaw(c.difference)}</td></tr>`).join('') : '<tr><td colspan="6">' + t('app_print_no_cash', 'Aucune caisse clôturée.') + '</td></tr>';
    const topRows = topProducts.length ? topProducts.map(([name, value]) => `<tr><td>${escapeHtml(name)}</td><td>${moneyRaw(value)}</td></tr>`).join('') : '';
    const container = document.querySelector('#print-report');
    container.innerHTML = `
      <h1>${escapeHtml(state.entreprise.nom || 'SamaCaisse')} — ${t('app_print_title', 'Rapport de gestion')}</h1>
      <p class="print-muted">${escapeHtml(scopeLabel())} · ${t('app_print_gen', 'Généré le')} ${today}</p>
      <h2>${t('app_print_total', 'Total de la période')}</h2>
      <table><tr><th>${t('app_th_sales', 'Ventes')}</th><th>${t('app_th_expenses', 'Dépenses')}</th><th>${t('app_print_net', 'Résultat net')}</th></tr><tr><td>${moneyRaw(totals.sales)}</td><td>− ${moneyRaw(totals.expenses)}</td><td>${moneyRaw(totals.net)}</td></tr></table>
      ${topRows ? `<h2>${t('app_print_best', 'Meilleurs produits')}</h2><table><tr><th>${t('app_th_product', 'Produit')}</th><th>${t('app_print_best_amount', 'Montant vendu')}</th></tr>${topRows}</table>` : ''}
      <h2>${t('app_print_daily', 'Jour par jour')}</h2>
      <table><tr><th>${t('app_th_day', 'Jour')}</th><th>${t('app_th_sales', 'Ventes')}</th><th>${t('app_th_expenses', 'Dépenses')}</th><th>${t('app_th_result', 'Résultat')}</th></tr>${dailyRows}</table>
      <h2>${t('app_print_cash', 'Historique des caisses')}</h2>
      <table><tr><th>${t('app_th_closed_at', 'Clôturée le')}</th><th>${t('app_th_store', 'Boutique')}</th><th>${t('app_th_opening', 'Ouverture')}</th><th>${t('app_th_theoretical', 'Solde théorique')}</th><th>${t('app_th_real', 'Solde réel')}</th><th>${t('app_th_gap', 'Écart')}</th></tr>${cashRows}</table>`;
    window.print();
  }

  function dashboardView() {
    if (state.loading) return `<div class="loading-state glass-card"><strong>${t('app_dash_loading', 'Chargement des données…')}</strong><span>${t('app_dash_loading_sub', 'Connexion en cours.')}</span></div>`;
    if (state.error) return `<div class="empty-state glass-card"><strong>${t('app_dash_error', 'Impossible de charger vos données.')}</strong><span>${escapeHtml(state.error)}</span><button class="btn btn-primary" data-action="retry">${t('app_retry', 'Réessayer')}</button></div>`;
    const range = periodRange();
    const sales = filtered(state.ventes).filter(sale => !sale.annulee && inPeriod(sale.date_heure));
    const periodExpenses = filtered(state.depenses).filter(depense => !depense.annulee && inPeriod(depense.date_heure));
    const totalSales = sales.reduce((sum, sale) => sum + sale.montant, 0);
    const totalExpenses = periodExpenses.reduce((sum, depense) => sum + depense.montant, 0);
    const chartSales = filtered(state.ventes).filter(sale => !sale.annulee);
    const openCash = filtered(state.caisses).filter(item => !item.date_fermeture);
    const storesInScope = state.store === 'all' ? state.magasins : state.magasins.filter(magasin => magasin.id === state.store);
    const cashTotal = storesInScope.reduce((sum, magasin) => sum + cashReel(magasin.id), 0);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTotal = filtered(state.ventes).filter(sale => !sale.annulee && isSameDay(new Date(sale.date_heure), yesterday)).reduce((sum, sale) => sum + sale.montant, 0);
    let trend;
    if (yesterdayTotal > 0) trend = `${((totalSales - yesterdayTotal) / yesterdayTotal * 100).toFixed(1).replace('.', ',') >= 0 ? '+' : ''}${((totalSales - yesterdayTotal) / yesterdayTotal * 100).toFixed(1).replace('.', ',')}%`;
    else if (totalSales > 0) trend = t('app_dash_new', 'Nouveau');
    else trend = '—';
    const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const sellerName = window.solmaPersonnelSession?.personnel?.nom || (state.entreprise.nom || t('app_your_store', 'Votre boutique'));
    const periodLabel = state.period === 'all' ? '' : `<span class="period-label"> · ${({ today: t('app_dash_today_full', 'Aujourd’hui'), '7d': t('app_period_map_7d', '7 derniers jours'), '30d': t('app_period_map_30d', '30 derniers jours') })[state.period]}</span>`;
    const cashCards = filtered(state.caisses).reduce((items, item) => {
      const key = item.magasin_id;
      if (items.some(entry => entry.magasin_id === key)) return items;
      const open = !item.date_fermeture;
      items.push({ key, name: storeName(item.magasin_id) || t('store_all', 'Toutes les boutiques'), magasin_id: item.magasin_id, open, opening: item.montant_ouverture, expected: cashExpectation(item), openedAt: toTime(item.date_ouverture) });
      return items;
    }, []);
    const latestSales = personnelOwnSales(filtered(state.ventes)).slice(0, 5);
    const isTodayPeriod = state.period === 'today';
    return `<div class="page-heading"><div><p class="eyebrow">${todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p><h1>${t('app_hello', 'Bonjour')} ${escapeHtml(sellerName)}</h1><p class="subtle">${t('app_dash_happening', 'Voici ce qui se passe aujourd’hui')}${periodLabel}.</p></div>${state.isPersonnel ? '' : `<div class="page-heading-actions">${periodSelector()}<button class="btn btn-primary" data-action="new-sale">${icon('plus', 14)} ${t('common_new_sale', 'Nouvelle vente')}</button></div>`}</div>
    ${duesBanner()}
    <section class="stats-grid">
      <article class="glass-card stat-card"><div class="stat-top"><span>${isTodayPeriod ? t('app_dash_sales_day', 'Ventes du jour') : t('app_dash_sales_period', 'Ventes de la période')}</span><span class="stat-symbol">${icon('trendingUp')}</span></div><h2>${money(totalSales)}</h2><div class="stat-foot ${yesterdayTotal > 0 ? '' : 'neutral'}"><b>${trend}</b> ${t('app_dash_vs_yesterday', 'vs. hier')}</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>${t('app_dash_transactions', 'Transactions')}</span><span class="stat-symbol">${icon('activity')}</span></div><h2>${sales.length}</h2><div class="stat-foot neutral">${isTodayPeriod ? t('app_dash_trans_today', 'Ventes enregistrées aujourd’hui') : t('app_dash_trans_period', 'Ventes enregistrées sur la période')}</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>${isTodayPeriod ? t('app_dash_expenses', 'Dépenses du jour') : t('app_dash_expenses_period', 'Dépenses de la période')}</span><span class="stat-symbol">${icon('trendingDown')}</span></div><h2>${money(totalExpenses)}</h2><div class="stat-foot neutral">${periodExpenses.length} ${t('app_dash_expense_unit', 'dépense')}${periodExpenses.length > 1 ? 's' : ''} ${isTodayPeriod ? t('app_dash_today_word', 'aujourd’hui') : t('app_dash_on_period', 'sur la période')}</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>${t('app_dash_cash', 'Caisse réelle')}</span><span class="stat-symbol">${icon('wallet')}</span></div><h2>${money(cashTotal)}</h2><div class="stat-foot ${openCash.length ? '' : 'neutral'}">${openCash.length ? t('app_dash_cash_open', 'Caisse ouverte') : t('app_dash_cash_none', 'Caisse non ouverte')}</div></article>
    </section>
    <section class="content-grid">
      <article class="glass-card panel"><div class="panel-header"><div><h3>${t('app_dash_perf', 'Performance des ventes')}</h3><p>${t('app_dash_perf_sub', 'Chiffre d’affaires des 7 derniers jours')}</p></div><button class="text-link" data-view-link="reports">${t('app_dash_see_report', 'Voir le rapport ↗')}</button></div><div class="chart-wrap">${buildTrendSvg(chartSales)}</div><div class="legend"><span><i></i> ${t('app_chart_total', 'Total des ventes')}</span></div></article>
      <article class="glass-card panel"><div class="panel-header"><div><h3>${t('app_dash_cash_state', 'État des caisses')}</h3><p>${t('app_dash_cash_sub', 'Suivi en temps réel')}</p></div><button class="text-link" data-view-link="cash">${t('app_dash_see_all', 'Tout voir')}</button></div><div class="cash-list">${cashCards.length ? cashCards.map(cash => `<div class="cash-item"><div class="store-icon">${icon('store', 18)}</div><div class="cash-info"><strong>${escapeHtml(cash.name)}</strong><span>${cash.open ? (cash.openedAt ? t('app_dash_opened_at', 'Ouverte à ') + cash.openedAt.split(', ')[1] : t('app_dash_open', 'Ouverte')) : t('app_dash_closed', 'Fermée')}</span></div><div class="cash-amount"><strong>${money(cash.expected)}</strong><span class="${cash.open ? '' : 'closed'}">${cash.open ? t('app_dash_ongoing', 'En cours') : t('app_dash_closed', 'Fermée')}</span></div><div class="cash-progress"><i class="${cash.open ? '' : 'closed'}"></i></div></div>`).join('') : '<div class="empty-state"><strong>' + t('app_dash_no_cash', 'Aucune caisse') + '</strong><span>' + t('app_dash_no_cash_sub', 'Ouvrez une caisse pour commencer le suivi.') + '</span></div>'}</div></article>
    </section>
    <section class="glass-card panel activity-panel"><div class="panel-header"><div><h3>${t('app_dash_latest', 'Dernières transactions')}</h3><p>${t('app_dash_latest_sub', 'Les ventes les plus récentes')}</p></div><button class="text-link" data-view-link="sales">${t('app_dash_all_sales', 'Voir toutes les ventes ↗')}</button></div>${salesTable(latestSales)}</section>`;
  }

  function salesTable(sales) {
    const rows = sales.length ? sales.map(sale => `<tr class="${sale.annulee ? 'cancelled-row' : ''}"><td><strong>${escapeHtml(sale.nom_produit)}</strong></td><td><div class="person"><span class="person-avatar">${initials(sale.personnel?.nom || sale.admin_nom || 'A')}</span>${escapeHtml(sale.personnel?.nom || sale.admin_nom || t('app_owner', 'Propriétaire'))}</div></td><td class="muted">${escapeHtml(sale.magasins?.nom || '—')}</td><td><span class="badge ${sale.mode_paiement === 'liquide' ? 'badge-cash' : 'badge-money'}">${sale.mode_paiement === 'liquide' ? t('app_pay_cash', 'Liquide') : t('app_pay_mobile', 'Mobile money')}</span></td><td><strong>${money(sale.montant)}</strong></td><td class="muted">${escapeHtml(toTime(sale.date_heure))}${sale.annulee ? ' · ' + t('app_cancelled', 'Annulée') : ''}</td>${state.isPersonnel ? '' : `<td>${sale.annulee ? '<span class="muted">' + t('app_cancelled', 'Annulée') + '</span>' : `<button class="text-link danger-link" data-cancel-sale="${sale.id}">${t('app_cancel', 'Annuler')}</button>`}</td>`}</tr>`).join('') : '<tr><td colspan="7"><div class="empty-state"><strong>' + t('app_no_sales', 'Aucune vente') + '</strong><span>' + t('app_no_sales_sub', 'Les ventes enregistrées apparaîtront ici.') + '</span></div></td></tr>';
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_product', 'Produit')}</th><th>${t('app_th_seller', 'Vendeur')}</th><th>${t('app_th_store', 'Boutique')}</th><th>${t('app_th_payment', 'Paiement')}</th><th>${t('app_th_amount', 'Montant')}</th><th>${t('app_th_datetime', 'Date et heure')}</th>${state.isPersonnel ? '' : '<th>' + t('app_th_action', 'Action') + '</th>'}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const genericHeader = (title, subtitle, action, actionLabel) => `<div class="page-heading"><div><p class="eyebrow">${t('app_eyebrow_ops', 'Gestion opérationnelle')}</p><h1>${title}</h1><p class="subtle">${subtitle}</p></div>${action ? `<button class="btn btn-primary" data-action="${action}">${icon('plus', 14)} ${actionLabel}</button>` : ''}</div>`;

  const searchInput = (key, placeholder) => `<input class="filter-input" data-search="${key}" placeholder="${placeholder}" value="${escapeHtml(state.search[key] || '')}" />`;
  const matchesSearch = (value, key) => {
    const needle = String(state.search[key] || '').trim().toLowerCase();
    if (!needle) return true;
    return String(value || '').toLowerCase().includes(needle);
  };
  const periodSelector = () => `
    <div class="period-switch" data-period-switch>
      <button type="button" class="${state.period === 'today' ? 'active' : ''}" data-period="today">${t('app_period_today', "Aujourd'hui")}</button>
      <button type="button" class="${state.period === '7d' ? 'active' : ''}" data-period="7d">${t('app_period_7d', '7 jours')}</button>
      <button type="button" class="${state.period === '30d' ? 'active' : ''}" data-period="30d">${t('app_period_30d', '30 jours')}</button>
      <button type="button" class="${state.period === 'all' ? 'active' : ''}" data-period="all">${t('app_period_all', 'Tout')}</button>
    </div>`;

  const personnelOwnSales = items => {
    if (!state.isPersonnel) return items;
    const pid = window.solmaPersonnelSession?.personnel?.id;
    if (!pid) return items;
    return items.filter(sale => sale.personnel_id === pid);
  };

  const sellerOptions = (current) => {
    const opts = [`<option value="all">${escapeHtml(t('app_filter_all_sellers', 'Tous les vendeurs'))}</option>`, `<option value="owner"${current === 'owner' ? ' selected' : ''}>${escapeHtml(t('app_owner', 'Propriétaire'))}</option>`];
    state.personnel.forEach(member => opts.push(`<option value="${member.id}"${current === member.id ? ' selected' : ''}>${escapeHtml(member.nom)}</option>`));
    return opts.join('');
  };
  const paymentOptions = (current) => [`<option value="all">${escapeHtml(t('app_filter_all_payments', 'Tous les paiements'))}</option>`, `<option value="liquide"${current === 'liquide' ? ' selected' : ''}>${escapeHtml(t('app_pay_cash', 'Liquide'))}</option>`, `<option value="mobile_money"${current === 'mobile_money' ? ' selected' : ''}>${escapeHtml(t('app_pay_mobile', 'Mobile money'))}</option>`].join('');
  const matchSeller = (item, filter) => {
    if (filter === 'all') return true;
    if (filter === 'owner') return !item.personnel_id;
    return item.personnel_id === filter;
  };
  const matchPayment = (item, filter) => filter === 'all' || item.mode_paiement === filter;

  function salesTableView() {
    const visible = personnelOwnSales(filtered(state.ventes).filter(sale => matchesSearch(sale.nom_produit, 'ventes')).filter(sale => matchSeller(sale, state.filters.salesSeller)).filter(sale => matchPayment(sale, state.filters.salesPayment)));
    return `<section class="glass-card view-card"><div class="filters">${searchInput('ventes', t('app_search_product', 'Rechercher un produit…'))}${state.isPersonnel ? '' : `<select class="filter-input" data-filter="salesSeller" aria-label="${escapeHtml(t('app_filter_all_sellers', 'Tous les vendeurs'))}">${sellerOptions(state.filters.salesSeller)}</select>`}<select class="filter-input" data-filter="salesPayment" aria-label="${escapeHtml(t('app_filter_all_payments', 'Tous les paiements'))}">${paymentOptions(state.filters.salesPayment)}</select><span class="muted">${visible.length} ${t('app_unit_sale', 'vente')}${visible.length > 1 ? 's' : ''}${state.store !== 'all' ? ' · ' + escapeHtml(scopeLabel()) : ''}</span><button class="btn btn-light" data-action="export-csv-sales">${t('app_export_csv', 'Exporter CSV ↗')}</button></div>${salesTable(visible)}</section>`;
  }

  function salesView() {
    return genericHeader(t('app_view_sales_title', 'Ventes'), state.isPersonnel ? t('app_view_sales_sub_staff', 'Les ventes enregistrées dans votre boutique.') : t('app_view_sales_sub_owner', 'Toutes les ventes enregistrées dans vos boutiques.'), 'new-sale', t('common_new_sale', 'Nouvelle vente')) +
      salesTableView();
  }

  function expensesView() {
    const visibleExpenses = filtered(state.depenses).filter(depense => matchesSearch(depense.motif, 'depenses')).filter(depense => matchSeller(depense, state.filters.expSeller));
    const rows = visibleExpenses.map(depense => `<tr class="${depense.annulee ? 'cancelled-row' : ''}"><td><strong>${escapeHtml(depense.motif)}</strong></td><td>${escapeHtml(depense.personnel?.nom || depense.admin_nom || t('app_owner', 'Propriétaire'))}</td><td class="muted">${escapeHtml(depense.magasins?.nom || '—')}</td><td class="negative"><strong>− ${money(depense.montant)}</strong></td><td class="muted">${escapeHtml(toTime(depense.date_heure))}${depense.annulee ? ' · ' + t('app_cancelled', 'Annulée') : ''}</td>${state.isPersonnel ? '' : `<td>${depense.annulee ? '<span class="muted">' + t('app_cancelled', 'Annulée') + '</span>' : `<button class="text-link danger-link" data-cancel-expense="${depense.id}">${t('app_cancel', 'Annuler')}</button>`}</td>`}</tr>`).join('');
    return genericHeader(t('app_view_exp_title', 'Dépenses'), t('app_view_exp_sub', 'Gardez une trace claire des sorties.'), 'new-expense', t('app_add_expense', 'Ajouter une dépense')) +
      `<section class="glass-card view-card"><div class="filters">${searchInput('depenses', t('app_search_reason', 'Rechercher un motif…'))}${state.isPersonnel ? '' : `<select class="filter-input" data-filter="expSeller" aria-label="${escapeHtml(t('app_filter_all_sellers', 'Tous les vendeurs'))}">${sellerOptions(state.filters.expSeller)}</select>`}<span class="muted">${visibleExpenses.length} ${t('app_unit_expense', 'dépense')}${visibleExpenses.length > 1 ? 's' : ''}${state.store !== 'all' ? ' · ' + escapeHtml(scopeLabel()) : ''}</span><button class="btn btn-light" data-action="export-csv-expenses">${t('app_export_csv', 'Exporter CSV ↗')}</button></div>${visibleExpenses.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_reason', 'Motif')}</th><th>${t('app_th_added_by', 'Ajoutée par')}</th><th>${t('app_th_store', 'Boutique')}</th><th>${t('app_th_amount', 'Montant')}</th><th>${t('app_th_date', 'Date')}</th>${state.isPersonnel ? '' : '<th>' + t('app_th_action', 'Action') + '</th>'}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_no_expense', 'Aucune dépense') + '</strong><span>' + t('app_no_expense_sub', 'Les dépenses ajoutées apparaîtront ici.') + '</span></div>'}</section>`;
  }

  function dettesView() {
    const statutLabel = s => ({
      retard: t('app_debt_late', 'En retard'),
      jour: t('app_debt_today', "Aujourd'hui"),
      avenir: t('app_debt_soon', 'À venir'),
      soldee: t('app_debt_sold', 'Soldée'),
      annulee: t('app_debt_cancelled', 'Annulée')
    }[s] || s);
    const visible = personnelOwnDettes(filtered(state.dettes))
      .filter(dette => matchesSearch((dette.client_nom || '') + ' ' + (dette.client_telephone || ''), 'dettes'))
      .filter(dette => {
        const f = state.filters.detteStatut;
        if (f === 'all') return true;
        if (f === 'ouvertes') return !dette.annulee && detteReste(dette) > 0;
        return detteStatut(dette) === f;
      })
      .sort((a, b) => String(a.date_echeance || '').localeCompare(String(b.date_echeance || '')));
    const rows = visible.map(dette => {
      const statut = detteStatut(dette);
      const reste = detteReste(dette);
      const echeance = dette.date_echeance ? new Date(dette.date_echeance + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      return `<tr><td><strong>${escapeHtml(dette.client_nom)}</strong><br><span class="muted">${escapeHtml(dette.client_telephone || '—')}</span></td><td><strong>${money(dette.montant_total)}</strong><br><span class="muted">${t('app_debt_paid', 'Déjà payé')} : ${money(dette.montant_paye || 0)}</span></td><td><strong class="${reste > 0 ? 'negative' : 'positive'}">${money(reste)}</strong></td><td>${escapeHtml(echeance)}<br><span class="badge ${statut === 'retard' ? 'badge-cash' : 'badge-money'}">${statutLabel(statut)}</span></td><td class="muted">${escapeHtml(storeName(dette.magasin_id))}</td><td>${!dette.annulee && reste > 0 ? `<button class="text-link" data-pay-dette="${dette.id}">${t('app_debt_pay', 'Encaisser')}</button>` : '<span class="muted">—</span>'}${state.isPersonnel ? '' : (dette.annulee ? '' : ` · <button class="text-link danger-link" data-cancel-dette="${dette.id}">${t('app_cancel', 'Annuler')}</button>`)}</td></tr>`;
    }).join('');
    return genericHeader(t('nav_debts', 'Dettes clients'), t('app_view_debts_sub', 'Crédits accordés et recouvrement, par ordre d’urgence.'), 'new-debt', t('app_new_debt', 'Nouvelle dette')) +
      `<section class="glass-card view-card"><div class="filters">${searchInput('dettes', t('app_search_client', 'Rechercher un client…'))}<select class="filter-input" data-filter="detteStatut" aria-label="Statut">${['all', 'ouvertes', 'retard', 'jour', 'avenir', 'soldee'].map(v => `<option value="${v}"${state.filters.detteStatut === v ? ' selected' : ''}>${v === 'all' ? t('app_filter_all_status', 'Tous les statuts') : v === 'ouvertes' ? t('app_debt_open', 'Non soldées') : statutLabel(v)}</option>`).join('')}</select><span class="muted">${visible.length} ${t('app_unit_debt', 'dette')}${visible.length > 1 ? 's' : ''}</span></div>${visible.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_debt_client', 'Client')}</th><th>${t('app_th_total', 'Total')}</th><th>${t('app_debt_left', 'Reste')}</th><th>${t('app_debt_due', 'Échéance')}</th><th>${t('app_th_store', 'Boutique')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_debt_none', 'Aucune dette') + '</strong><span>' + t('app_debt_none_sub', 'Les crédits accordés apparaîtront ici, triés par urgence.') + '</span></div>'}</section>`;
  }

  function duesBanner() {
    const open = personnelOwnDettes(filtered(state.dettes)).filter(dette => !dette.annulee && detteReste(dette) > 0);
    if (!open.length) return '';
    const late = open.filter(dette => detteStatut(dette) === 'retard');
    const total = open.reduce((sum, dette) => sum + detteReste(dette), 0);
    return `<button type="button" class="glass-card due-banner ${late.length ? 'due-late' : ''}" data-view-link="debts"><span class="due-icon">${icon('wallet', 18)}</span><span class="due-text"><strong>${money(total)} ${t('app_due_title', 'à recouvrer')}</strong><span>${late.length ? late.length + ' ' + t('app_due_late', 'en retard') : t('app_due_ok', 'échéances à venir')}</span></span><span class="due-go">↗</span></button>`;
  }

  function cashView() {
    const magasins = state.store === 'all' ? state.magasins : state.magasins.filter(magasin => magasin.id === state.store);
    const cards = magasins.map(magasin => {
      const caisse = filtered(state.caisses).find(item => item.magasin_id === magasin.id);
      const open = Boolean(caisse && !caisse.date_fermeture);
      return `<article class="glass-card view-card"><div class="panel-header"><div><h3>${t('app_cash_card', 'Caisse')} ${escapeHtml(magasin.nom)}</h3><p>${open ? t('app_dash_open', 'Ouverte') : t('app_dash_closed', 'Fermée')}${caisse ? ' · ' + escapeHtml(toTime(caisse.date_ouverture)) : ''}</p></div><span class="badge ${open ? 'badge-money' : 'badge-cash'}">${open ? t('app_dash_ongoing', 'En cours') : t('app_dash_closed', 'Fermée')}</span></div><div class="form-grid"><div><span class="muted">${t('app_cash_opening', 'Montant d’ouverture')}</span><h3>${money(caisse?.montant_ouverture || 0)}</h3></div><div><span class="muted">${t('app_cash_real', 'Montant réel')}</span><h3>${money(cashReel(magasin.id))}</h3></div>${open && caisse ? `<div><span class="muted">${t('app_cash_session', 'Attendu (session)')}</span><h3>${money(cashExpectation(caisse))}</h3></div>` : ''}</div><div class="form-actions"><button class="btn ${open ? 'btn-danger' : 'btn-primary'}" data-action="${open ? 'close-cash' : 'open-cash'}" data-store="${magasin.id}">${open ? t('app_cash_close_btn', 'Fermer la caisse') : t('app_cash_open_btn', 'Ouvrir la caisse')}</button></div></article>`;
    }).join('');
    const history = filtered(state.caisses).filter(item => item.date_fermeture).map(item => {
      const ecart = item.ecart || 0;
      return `<tr><td><strong>${escapeHtml(toTime(item.date_fermeture))}</strong></td><td class="muted">${escapeHtml(storeName(item.magasin_id))}</td><td>${money(item.montant_ouverture)}</td><td>${money(item.montant_fermeture)}</td><td class="${ecart >= 0 ? 'positive' : 'negative'}">${ecart >= 0 ? '+ ' : '− '}${money(Math.abs(ecart))}</td></tr>`;
    }).join('');
    return genericHeader(t('app_view_cash_title', 'Caisses'), t('app_view_cash_sub', 'Ouvertures, fermetures et écarts de caisse.'), null, '') +
      `<section class="cash-list">${cards}</section>` +
      `<section class="glass-card panel" style="margin-top:14px"><div class="panel-header"><div><h3>${t('app_cash_history', 'Historique des jours passés')}</h3><p>${t('app_cash_history_sub', 'Les caisses clôturées sont conservées')}</p></div></div>${history ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_closed_at', 'Clôturée le')}</th><th>${t('app_th_store', 'Boutique')}</th><th>${t('app_th_opening', 'Ouverture')}</th><th>${t('app_th_closing', 'Fermeture')}</th><th>${t('app_th_gap', 'Écart')}</th></tr></thead><tbody>${history}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_cash_no_history', 'Pas encore d’historique') + '</strong><span>' + t('app_cash_no_history_sub', 'Il apparaîtra ici après la première fermeture de caisse.') + '</span></div>'}</section>`;
  }

  function productsView() {
    const visibleProducts = filtered(state.produits).filter(product => matchesSearch(product.nom, 'produits') || matchesSearch(product.categorie, 'produits'));
    const rows = visibleProducts.map(product => {
      const stockLabel = product.stock <= 0 ? '<span class="badge badge-cash">' + t('app_stock_empty', 'Épuisé') + '</span>' : product.stock < 10 ? `<span class="badge badge-money">${t('app_stock_low', 'Stock faible')}</span>` : '<span class="badge badge-money">' + t('app_stock_ok', 'Disponible') + '</span>';
      return `<tr><td><strong>${escapeHtml(product.nom)}</strong></td><td class="muted">${escapeHtml(product.categorie || '—')}</td><td>${escapeHtml(storeName(product.magasin_id))}</td><td><strong>${money(product.prix)}</strong></td><td><strong>${product.stock}</strong> ${stockLabel}</td><td><button class="text-link" data-edit-product="${product.id}">${t('app_prod_edit', 'Modifier')}</button> · <button class="text-link ${product.actif ? 'danger-link' : ''}" data-toggle-product="${product.id}" data-active="${product.actif ? '1' : '0'}">${product.actif ? t('app_prod_deactivate', 'Désactiver') : t('app_prod_reactivate', 'Réactiver')}</button></td></tr>`;
    }).join('');
    return genericHeader(t('app_view_prod_title', 'Produits'), t('app_view_prod_sub', 'Votre catalogue : prix, catégories et stock par boutique.'), 'new-product', t('app_new_product', 'Nouveau produit')) +
      `<section class="glass-card view-card"><div class="filters">${searchInput('produits', t('app_search_product', 'Rechercher un produit…'))}<span class="muted">${visibleProducts.length} ${t('app_unit_product', 'produit')}${visibleProducts.length > 1 ? 's' : ''}</span></div>${visibleProducts.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_product', 'Produit')}</th><th>${t('app_th_category', 'Catégorie')}</th><th>${t('app_th_store', 'Boutique')}</th><th>${t('app_th_price', 'Prix de vente')}</th><th>${t('app_th_stock', 'Stock')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_no_product', 'Aucun produit') + '</strong><span>' + t('app_no_product_sub', 'Ajoutez des produits pour les vendre et suivre le stock.') + '</span></div>'}</section>`;
  }

  function teamView() {
    const rows = state.personnel.map(member => `<tr><td><div class="person"><span class="person-avatar">${initials(member.nom)}</span><strong>${escapeHtml(member.nom)}</strong></div></td><td class="muted">${member.role === 'admin' ? t('app_role_admin', 'Administrateur') : t('app_role_seller', 'Vendeur')}</td><td>${escapeHtml(member.telephone)}</td><td class="muted">${escapeHtml(storeName(member.magasin_id))}</td><td><span class="badge ${member.actif ? 'badge-money' : 'badge-cash'}">${member.actif ? t('app_access_on', 'Actif') : t('app_access_off', 'Inactif')}</span></td><td><button class="text-link" data-edit-personnel="${member.id}">${t('app_prod_edit', 'Modifier')}</button> · <button class="text-link danger-link" data-deactivate-personnel="${member.id}" data-active="${member.actif ? '1' : '0'}">${member.actif ? t('app_prod_deactivate', 'Désactiver') : t('app_prod_reactivate', 'Réactiver')}</button></td></tr>`).join('');
    return genericHeader(t('app_view_team_title', 'Personnel'), t('app_view_team_sub', 'Les personnes autorisées à enregistrer des opérations.'), 'new-team', t('app_add_person', 'Ajouter une personne')) +
      `<section class="glass-card view-card">${state.personnel.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_name', 'Nom')}</th><th>${t('app_th_role', 'Rôle')}</th><th>${t('app_th_phone', 'Téléphone')}</th><th>${t('app_th_store', 'Boutique')}</th><th>${t('app_th_access', 'Accès')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_no_member', 'Aucune personne') + '</strong><span>' + t('app_no_member_sub', 'Ajoutez vos premiers vendeurs pour qu’ils enregistrent des opérations.') + '</span></div>'}</section>`;
  }

  function reportsView() {
    const periodSales = filtered(state.ventes).filter(sale => !sale.annulee && inPeriod(sale.date_heure));
    const periodExpenses = filtered(state.depenses).filter(depense => !depense.annulee && inPeriod(depense.date_heure));
    const periodTotals = {
      sales: periodSales.reduce((sum, sale) => sum + sale.montant, 0),
      expenses: periodExpenses.reduce((sum, d) => sum + d.montant, 0)
    };
    periodTotals.net = periodTotals.sales - periodTotals.expenses;
    const scope = state.store !== 'all' ? ' · ' + escapeHtml(scopeLabel()) : '';
    const byProduct = {};
    periodSales.forEach(sale => { byProduct[sale.nom_produit] = byProduct[sale.nom_produit] || { quantite: 0, montant: 0 }; byProduct[sale.nom_produit].quantite += sale.quantite; byProduct[sale.nom_produit].montant += sale.montant; });
    const productRows = Object.entries(byProduct).sort((a, b) => b[1].montant - a[1].montant).map(([nom, stats]) => `<tr><td><strong>${escapeHtml(nom)}</strong></td><td>${stats.quantite}</td><td><strong>${money(stats.montant)}</strong></td></tr>`);
    const bySeller = {};
    periodSales.forEach(sale => { const seller = sale.personnel?.nom || sale.admin_nom || t('app_owner', 'Propriétaire'); bySeller[seller] = bySeller[seller] || { ventes: 0, montant: 0 }; bySeller[seller].ventes += 1; bySeller[seller].montant += sale.montant; });
    const sellerRows = Object.entries(bySeller).sort((a, b) => b[1].montant - a[1].montant).map(([nom, stats]) => `<tr><td><strong>${escapeHtml(nom)}</strong></td><td>${stats.ventes}</td><td><strong>${money(stats.montant)}</strong></td></tr>`);
    return `<div class="page-heading"><div><p class="eyebrow">${t('app_eyebrow_ops', 'Gestion opérationnelle')}</p><h1>${t('app_view_rep_title', 'Rapports')}</h1><p class="subtle">${t('app_view_rep_sub', 'Détail jour par jour des ventes, dépenses et trésorerie')}${scope}.</p></div><div class="page-heading-actions">${periodSelector()}<button class="btn btn-light" data-action="export-csv-daily">${t('app_export_csv', 'Exporter CSV ↗')}</button><button class="btn btn-primary" data-action="print-report">${icon('printer', 14)} ${t('app_print', 'Imprimer / PDF')}</button></div></div>
    <section class="stats-grid">
      <article class="glass-card stat-card"><div class="stat-top"><span>${t('app_rep_total_sales', 'Total des ventes')}</span><span class="stat-symbol">${icon('trendingUp')}</span></div><h2>${money(periodTotals.sales)}</h2><div class="stat-foot neutral">${t('app_rep_period', 'Sur la période sélectionnée')}</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>${t('app_rep_total_exp', 'Total des dépenses')}</span><span class="stat-symbol">${icon('trendingDown')}</span></div><h2>${money(periodTotals.expenses)}</h2><div class="stat-foot neutral">${t('app_rep_period', 'Sur la période sélectionnée')}</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>${t('app_rep_net', 'Résultat net')}</span><span class="stat-symbol">${icon('wallet')}</span></div><h2 class="${periodTotals.net >= 0 ? 'positive' : 'negative'}">${periodTotals.net >= 0 ? '+ ' : '− '}${money(Math.abs(periodTotals.net))}</h2><div class="stat-foot ${periodTotals.net >= 0 ? '' : 'negative'}">${t('app_rep_sales_expenses', 'Ventes − dépenses')}</div></article>
    </section>
    <section class="glass-card panel">
      <div class="panel-header"><div><h3>${t('app_rep_daily', 'Ventes, dépenses et résultat par jour')}</h3><p>${t('app_rep_daily_sub', 'Filtré selon la boutique et la période')}</p></div></div>
      ${reportSnapshotDaily(periodSales, periodExpenses) ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_day', 'Jour')}</th><th>${t('app_th_sales', 'Ventes')}</th><th>${t('app_th_expenses', 'Dépenses')}</th><th>${t('app_th_result', 'Résultat')}</th></tr></thead><tbody>${reportSnapshotDaily(periodSales, periodExpenses)}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_rep_no_data', 'Aucune donnée') + '</strong>' + t('app_rep_no_data_sub', 'Aucune vente ou dépense enregistrée pour ce filtre.') + '</div>'}
    </section>
    <section class="content-grid" style="margin-top:14px">
      <article class="glass-card panel"><div class="panel-header"><div><h3>${t('app_rep_by_product', 'Ventes par produit')}</h3><p>${t('app_rep_by_product_sub', 'Quantités et montants sur la période')}</p></div></div>${productRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_product', 'Produit')}</th><th>${t('app_th_quantity', 'Quantité')}</th><th>${t('app_th_amount', 'Montant')}</th></tr></thead><tbody>${productRows}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_no_sales', 'Aucune vente') + '</strong>' + t('app_rep_no_product_sale', 'Aucun produit vendu sur la période.') + '</div>'}</article>
      <article class="glass-card panel"><div class="panel-header"><div><h3>${t('app_rep_by_seller', 'Ventes par vendeur')}</h3><p>${t('app_rep_by_seller_sub', 'Performance sur la période')}</p></div></div>${sellerRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_seller', 'Vendeur')}</th><th>${t('app_th_sales', 'Ventes')}</th><th>${t('app_th_amount', 'Montant')}</th></tr></thead><tbody>${sellerRows}</tbody></table></div>` : '<div class="empty-state"><strong>' + t('app_no_sales', 'Aucune vente') + '</strong>' + t('app_rep_no_period_sale', 'Aucune vente sur la période.') + '</div>'}</article>
    </section>
    <section class="glass-card panel" style="margin-top:14px">
      <div class="panel-header"><div><h3>${t('app_rep_cash_hist', 'Historique des caisses')}</h3><p>${t('app_rep_cash_hist_sub', 'Ouvertures et fermetures passées')}</p></div><button class="text-link" data-action="export-csv-cash">${t('app_export_csv', 'Exporter CSV ↗')}</button></div>
      ${reportSnapshotCash() || '<div class="empty-state"><strong>' + t('app_rep_no_cash', 'Aucun historique de caisse') + '</strong>' + t('app_rep_no_cash_sub', 'Ouvrez puis fermez une caisse pour voir son historique ici.') + '</div>'}
    </section>`;
  }

  function reportSnapshotDaily(periodSales, periodExpenses) {
    const days = {};
    periodSales.forEach(sale => { const key = new Date(sale.date_heure).toISOString().slice(0, 10); days[key] = days[key] || { sales: 0, expenses: 0 }; days[key].sales += sale.montant; });
    periodExpenses.forEach(depense => { const key = new Date(depense.date_heure).toISOString().slice(0, 10); days[key] = days[key] || { sales: 0, expenses: 0 }; days[key].expenses += depense.montant; });
    return Object.keys(days).sort((a, b) => b.localeCompare(a)).map(key => {
      const d = days[key];
      const result = d.sales - d.expenses;
      return `<tr><td><strong>${new Date(key).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</strong></td><td><strong>${money(d.sales)}</strong></td><td class="negative">− ${money(d.expenses)}</td><td class="${result >= 0 ? 'positive' : 'negative'}"><strong>${result >= 0 ? '+ ' : '− '}${money(Math.abs(result))}</strong></td></tr>`;
    }).join('');
  }

  function reportSnapshotCash() {
    const rows = filtered(state.caisses).filter(item => item.date_fermeture).map(item => {
      const ecart = item.ecart || 0;
      return `<tr><td><strong>${toTime(item.date_fermeture)}</strong></td><td class="muted">${escapeHtml(storeName(item.magasin_id))}</td><td>${money(item.montant_ouverture)}</td><td>${money(item.solde_theorique ?? (item.montant_fermeture - ecart))}</td><td>${money(item.montant_fermeture)}</td><td class="${ecart >= 0 ? 'positive' : 'negative'}">${ecart >= 0 ? '+ ' : '− '}${money(Math.abs(ecart))}</td></tr>`;
    }).join('');
    return rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('app_th_closed_at', 'Clôturée le')}</th><th>${t('app_th_store', 'Boutique')}</th><th>${t('app_th_opening', 'Ouverture')}</th><th>${t('app_th_theoretical', 'Solde théorique')}</th><th>${t('app_th_real', 'Solde réel')}</th><th>${t('app_th_gap', 'Écart')}</th></tr></thead><tbody>${rows}</tbody></table></div>` : null;
  }

  function storeOptions(selectedId = '') {
    return state.magasins.map(magasin => `<option value="${magasin.id}"${magasin.id === selectedId ? ' selected' : ''}>${escapeHtml(magasin.nom)}</option>`).join('');
  }

  // Boutique pré-remplie : dernière utilisée (proprio) ou assignée (vendeur).
  function defaultStoreId() {
    if (state.isPersonnel) return state.store && state.store !== 'all' ? state.store : '';
    const last = readLastStore();
    if (last && state.magasins.some(m => m.id === last)) return last;
    return '';
  }

  function openModal(type, payload = null) {
    if (state.isPersonnel && ['product', 'team', 'magasin', 'settings', 'magasin-rename', 'magasin-delete'].includes(type)) { showToast(t('app_toast_forbidden', 'Action non autorisée.')); return; }
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    let title = t('app_modal_default', 'Nouvelle entrée');
    let fields = '';
    const save = () => saveModal(type, modal);

    if (type === 'sale') {
      title = t('app_modal_sale', 'Enregistrer une vente');
      const storeField = state.isPersonnel ? '' : `<div class="field"><label>${t('app_th_store', 'Boutique')}</label><select id="modal-store"><option value="">${t('app_modal_store_ph', '— Sélectionner —')}</option>${storeOptions(defaultStoreId())}</select></div>`;
      const catalogProducts = state.produits.filter(product => product.actif !== false && (state.isPersonnel ? product.magasin_id === state.store || product.magasin_id === null : true));
      const catalogGrid = catalogProducts.length
        ? `<div class="sale-catalog-grid">${catalogProducts.map(product => `<button type="button" class="sale-catalog-item" data-catalog-product="${product.id}"><span class="sale-catalog-name">${escapeHtml(product.nom)}</span><span class="sale-catalog-prix">${money(product.prix)}</span><span class="sale-catalog-stock ${product.stock > 0 ? '' : 'stock-out'}">Stock : ${product.stock}</span></button>`).join('')}</div>`
        : '<p class="subtle">' + t('app_modal_no_catalog', 'Aucun produit dans le catalogue. Ajoutez-en depuis la vue Produits.') + '</p>';
      fields = `<div class="catalog-check"><input type="checkbox" id="modal-use-catalog" /> <label for="modal-use-catalog">${t('app_modal_use_catalog', 'Choisir dans le stock')}</label></div>
        <div class="catalog-panel hidden" id="catalog-panel"><div class="sale-catalog-search"><input type="text" id="modal-catalog-search" placeholder="${t('app_modal_search_product', 'Rechercher un produit…')}" /></div>${catalogGrid}</div>
        <div class="field free-field"><label>${t('app_modal_product_opt', 'Produit (optionnel)')}</label><input id="modal-product" placeholder="${t('app_modal_product_ph', 'Nom du produit')}" list="product-list" /><datalist id="product-list">${state.produits.map(product => `<option value="${escapeHtml(product.nom)}">`).join('')}</datalist></div>
        <div class="field"><label>${t('app_modal_qty', 'Quantité')}</label><input id="modal-quantite" type="number" min="1" value="1" /></div><div class="field"><label>${t('app_modal_amount', 'Montant total')} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" /></div>${storeField}<div class="field"><label>${t('app_modal_payment', 'Mode de paiement')}</label><select id="modal-payment"><option value="liquide">${t('app_pay_cash', 'Liquide')}</option><option value="mobile_money">${t('app_pay_mobile', 'Mobile money')}</option></select></div>
        <div class="catalog-check"><input type="checkbox" id="modal-credit" /> <label for="modal-credit">${t('app_modal_credit', 'Vente à crédit')}</label></div>
        <div class="catalog-panel hidden" id="credit-panel">
          <div class="field"><label>${t('app_modal_client', 'Nom du client')}</label><input id="modal-client" placeholder="Ex. Moussa Diallo" /></div>
          <div class="field"><label>${t('app_modal_client_phone', 'Téléphone du client (optionnel)')}</label><input id="modal-client-phone" type="tel" inputmode="numeric" placeholder="77 000 00 00" /></div>
          <div class="field"><label>${t('app_modal_due', 'Date d’échéance')}</label><input id="modal-echeance" type="date" /></div>
        </div>`;
    } else if (type === 'expense') {
      title = t('app_modal_expense', 'Ajouter une dépense');
      const storeField = state.isPersonnel ? '' : `<div class="field"><label>${t('app_th_store', 'Boutique')}</label><select id="modal-store">${storeOptions(defaultStoreId())}</select></div>`;
      fields = `<div class="field"><label>${t('app_modal_reason', 'Motif')}</label><input id="modal-reason" placeholder="${t('app_modal_reason_ph', 'Ex. Transport livraison')}" /></div><div class="field"><label>${t('app_modal_amount', 'Montant total')} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" /></div>${storeField}`;
    } else if (type === 'product') {
      title = t('app_modal_add_product', 'Ajouter un produit');
      fields = `<div class="field"><label>${t('app_modal_prod_name', 'Nom du produit')}</label><input id="modal-product" placeholder="${t('app_modal_prod_name_ph', 'Ex. Biscuit')}" /></div><div class="field"><label>${t('app_modal_category', 'Catégorie')}</label><input id="modal-categorie" placeholder="${t('app_modal_category_ph', 'Ex. Épicerie')}" /></div><div class="field"><label>${t('app_modal_price', 'Prix de vente')} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-price" type="number" placeholder="0" /></div><div class="field"><label>${t('app_modal_stock_init', 'Stock initial')}</label><input id="modal-stock" type="number" value="0" min="0" /></div><div class="field"><label>${t('app_th_store', 'Boutique')}</label><select id="modal-store"><option value="">${t('app_modal_store_common', 'Toutes les boutiques (produit commun)')}</option>${storeOptions()}</select></div>`;
    } else if (type === 'product-edit') {
      const product = state.produits.find(item => item.id === payload);
      if (!product) { showToast(t('app_toast_product_gone', 'Produit introuvable.')); return; }
      title = t('app_modal_edit_product', 'Modifier le produit');
      fields = `<div class="field"><label>${t('app_modal_prod_name', 'Nom du produit')}</label><input id="modal-product" value="${escapeHtml(product.nom)}" /></div><div class="field"><label>${t('app_modal_category', 'Catégorie')}</label><input id="modal-categorie" value="${escapeHtml(product.categorie || '')}" placeholder="${t('app_modal_category_ph', 'Ex. Épicerie')}" /></div><div class="field"><label>${t('app_modal_price', 'Prix de vente')} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-price" type="number" value="${product.prix}" /></div><div class="field"><label>${t('app_modal_stock', 'Stock')}</label><input id="modal-stock" type="number" value="${product.stock}" min="0" /></div>`;
      modal.dataset.productId = product.id;
    } else if (type === 'team') {
      title = t('app_modal_add_person', 'Ajouter une personne');
      fields = `<div class="field"><label>${t('app_modal_fullname', 'Nom complet')}</label><input id="modal-name" placeholder="${t('app_modal_fullname_ph', 'Ex. Fatou Diop')}" /></div><div class="field"><label>${t('app_modal_phone', 'Numéro de téléphone')}</label><input id="modal-phone" type="tel" inputmode="numeric" placeholder="${t('app_modal_phone_ph', '77 000 00 00')}" /></div><div class="field"><label>${t('app_modal_pin', 'Code à 4 chiffres')}</label><input id="modal-pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" /></div><div class="field"><label>${t('app_th_store', 'Boutique')}</label><select id="modal-store">${storeOptions()}</select></div>`;
    } else if (type === 'open-cash' || type === 'close-cash') {
      const isOpen = type === 'open-cash';
      title = isOpen ? t('app_modal_open_cash', 'Ouvrir une caisse') : t('app_modal_close_cash', 'Fermer la caisse');
      const label = isOpen ? t('app_modal_open_amount', 'Montant d’ouverture') : t('app_modal_close_amount', 'Montant en caisse à la fermeture');
      const openCaisse = !isOpen ? state.caisses.find(item => item.magasin_id === payload && !item.date_fermeture) : null;
      fields = `${openCaisse ? `<p class="subtle" style="grid-column:1/-1">${t('app_close_expected', 'Attendu pour cette caisse')} : <strong>${money(cashExpectation(openCaisse))}</strong></p>` : ''}<div class="field"><label>${label} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" /></div>`;
    } else if (type === 'magasin') {
      title = t('app_modal_add_store', 'Ajouter une boutique');
      fields = `<div class="field"><label>${t('app_modal_store_name', 'Nom de la boutique')}</label><input id="modal-store-name" placeholder="${t('app_modal_store_name_ph', 'Ex. Boutique Ngor')}" /></div><p class="subtle">${t('app_modal_store_added_sub', "La boutique s'ajoute à votre entreprise")} ${escapeHtml(state.entreprise.nom || '')}. ${t('app_modal_store_rename_later', 'Vous pouvez le renommer plus tard.')}</p>`;
    } else if (type === 'magasin-rename') {
      const magasin = state.magasins.find(item => item.id === payload);
      if (!magasin) { showToast(t('app_toast_store_gone', 'Boutique introuvable.')); return; }
      title = t('app_modal_rename_store', 'Renommer la boutique');
      fields = `<div class="field"><label>${t('app_modal_store_name', 'Nom de la boutique')}</label><input id="modal-store-name" value="${escapeHtml(magasin.nom)}" /></div>`;
      modal.dataset.storeId = magasin.id;
    } else if (type === 'magasin-delete') {
      const magasin = state.magasins.find(item => item.id === payload);
      if (!magasin) { showToast(t('app_toast_store_gone', 'Boutique introuvable.')); return; }
      if (state.magasins.length <= 1) { showToast(t('app_toast_last_store', 'Impossible de supprimer votre dernière boutique.')); return; }
      title = t('app_modal_delete_store', 'Supprimer la boutique');
      fields = `<p class="subtle" style="grid-column:1/-1">${t('app_modal_delete_confirm', 'Voulez-vous vraiment supprimer')} <strong>« ${escapeHtml(magasin.nom)} »</strong> ?<br><br>${t('app_modal_delete_cascade', 'Ses ventes, dépenses, caisses, produits propres et membres du personnel seront définitivement supprimés. Les produits communs resteront.')}</p>`;
      modal.dataset.storeId = magasin.id;
    } else if (type === 'dette') {
      title = t('app_modal_new_debt', 'Nouvelle dette');
      const storeField = state.isPersonnel ? '' : `<div class="field"><label>${t('app_th_store', 'Boutique')}</label><select id="modal-store">${storeOptions(defaultStoreId())}</select></div>`;
      fields = `<div class="field"><label>${t('app_modal_client', 'Nom du client')}</label><input id="modal-client" placeholder="Ex. Moussa Diallo" /></div><div class="field"><label>${t('app_modal_client_phone', 'Téléphone du client (optionnel)')}</label><input id="modal-client-phone" type="tel" inputmode="numeric" placeholder="77 000 00 00" /></div><div class="field"><label>${t('app_modal_amount', 'Montant total')} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" /></div><div class="field"><label>${t('app_modal_due', 'Date d’échéance')}</label><input id="modal-echeance" type="date" /></div>${storeField}`;
    } else if (type === 'dette-pay') {
      const dette = state.dettes.find(item => item.id === payload);
      if (!dette) { showToast(t('app_toast_debt_gone', 'Dette introuvable.')); return; }
      const reste = detteReste(dette);
      title = t('app_debt_pay_title', 'Encaisser un paiement');
      fields = `<p class="subtle" style="grid-column:1/-1"><strong>${escapeHtml(dette.client_nom)}</strong> · ${t('app_debt_left_of', 'Reste dû')} : <strong>${money(reste)}</strong></p><div class="field"><label>${t('app_debt_pay_amount', 'Montant encaissé')} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" max="${reste}" /></div><div class="field"><label>${t('app_modal_payment', 'Mode de paiement')}</label><select id="modal-payment"><option value="liquide">${t('app_pay_cash', 'Liquide')}</option><option value="mobile_money">${t('app_pay_mobile', 'Mobile money')}</option></select></div>`;
      modal.dataset.detteId = dette.id;
    } else if (type === 'settings') {
      title = t('app_modal_settings', 'Paramètres');
      const profil = window.solmaCompteSession?.compte || {};
      const settingsFields = state.isPersonnel
        ? `<div class="field"><label>${t('app_modal_profile_name', 'Nom')}</label><input id="modal-profile-nom" value="${escapeHtml(profil.nom || '')}" /></div>`
        : `<div class="field"><label>${t('app_modal_profile_name', 'Nom')}</label><input id="modal-profile-nom" value="${escapeHtml(profil.nom || '')}" /></div>
           <div class="field"><label>${t('app_modal_profile_email', 'Email')}</label><input id="modal-profile-email" type="email" value="${escapeHtml(profil.email || '')}" /></div>
           <div class="field"><label>${t('app_modal_company', 'Entreprise')}</label><input id="modal-entreprise-nom" value="${escapeHtml(state.entreprise.nom || '')}" /></div>
           <div class="field"><label>${t('app_modal_currency', 'Devise')}</label><input id="modal-entreprise-devise" value="${escapeHtml(state.entreprise.devise || 'FCFA')}" /></div>
           <div class="field"><label>${t('app_modal_current_pw', 'Mot de passe actuel')}</label><input id="modal-profile-password-actuel" type="password" autocomplete="current-password" placeholder="${t('app_modal_current_pw_ph', 'Pour modifier le mot de passe')}" /></div>
           <div class="field"><label>${t('app_modal_new_pw', 'Nouveau mot de passe')}</label><input id="modal-profile-password-nouveau" type="password" autocomplete="new-password" placeholder="${t('app_modal_new_pw_ph', '8 caractères minimum')}" /></div>`;
      fields = settingsFields;
    } else if (type === 'team-edit') {
      const member = state.personnel.find(item => item.id === payload);
      if (!member) { showToast(t('app_toast_member_gone', 'Membre introuvable.')); return; }
      title = t('app_modal_edit_person', 'Modifier la personne');
      fields = `<div class="field"><label>${t('app_modal_fullname', 'Nom complet')}</label><input id="modal-name" value="${escapeHtml(member.nom)}" /></div><div class="field"><label>${t('app_modal_phone', 'Numéro de téléphone')}</label><input id="modal-phone" type="tel" inputmode="numeric" placeholder="${t('app_modal_phone_ph', '77 000 00 00')}" value="${escapeHtml(member.telephone)}" /></div><div class="field"><label>${t('app_modal_pin', 'Code à 4 chiffres')}</label><input id="modal-pin" type="password" inputmode="numeric" maxlength="4" placeholder="${t('app_modal_pin_keep', '•••• (laisser vide pour ne pas changer)')}" /></div><div class="field"><label>${t('app_th_store', 'Boutique')}</label><select id="modal-store">${storeOptions().replace(`value="${member.magasin_id}"`, `value="${member.magasin_id}" selected`)}</select></div>`;
      modal.dataset.personnelId = member.id;
    }
    modal.innerHTML = `<div class="modal glass-card"><button class="modal-close" aria-label="${t('app_modal_close_btn', 'Fermer')}">${icon('close', 16)}</button><p class="eyebrow">SamaCaisse</p><h2>${title}</h2><p class="subtle">${type === 'magasin-delete' ? t('app_modal_delete_warn', 'Cette action est définitive.') : t('app_modal_saved_live', 'Les informations sont enregistrées immédiatement.')}</p><div class="form-grid modal-fields">${fields}</div><div class="form-actions"><button class="btn btn-light modal-cancel">${t('app_btn_cancel', 'Annuler')}</button><button class="btn ${type === 'magasin-delete' ? 'btn-danger' : 'btn-primary'} modal-save">${type === 'magasin-delete' ? t('app_btn_delete', 'Supprimer') : t('app_btn_save', 'Enregistrer')}</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.querySelector('.modal-cancel').onclick = () => modal.remove();
    modal.querySelector('.modal-save').onclick = save;
    if (type === 'open-cash' || type === 'close-cash') modal.dataset.store = payload;
    if (type === 'sale') {
      const productInput = modal.querySelector('#modal-product');
      const quantiteInput = modal.querySelector('#modal-quantite');
      const amountInput = modal.querySelector('#modal-amount');
      const useCatalog = modal.querySelector('#modal-use-catalog');
      const catalogPanel = modal.querySelector('#catalog-panel');
      const catalogSearch = modal.querySelector('#modal-catalog-search');
      const catalogItems = modal.querySelectorAll('[data-catalog-product]');
      const freeField = modal.querySelector('.free-field');
      const fillPrice = () => {
        const valeur = String(productInput.value || '').trim().toLowerCase();
        const product = state.produits.find(item => valeur && item.nom.toLowerCase() === valeur);
        if (product) amountInput.value = product.prix * (Number(quantiteInput.value) || 1);
      };
      productInput.addEventListener('change', fillPrice);
      productInput.addEventListener('input', fillPrice);
      quantiteInput.addEventListener('input', fillPrice);
      const selectCatalogProduct = product => {
        productInput.value = product.nom;
        if (product.prix) amountInput.value = product.prix * (Number(quantiteInput.value) || 1);
        catalogItems.forEach(item => item.classList.toggle('selected', item.dataset.catalogProduct === product.id));
      };
      catalogItems.forEach(item => item.addEventListener('click', () => {
        const product = state.produits.find(p => p.id === item.dataset.catalogProduct);
        if (product) selectCatalogProduct(product);
      }));
      if (catalogSearch) catalogSearch.addEventListener('input', () => {
        const needle = String(catalogSearch.value || '').trim().toLowerCase();
        catalogItems.forEach(item => {
          const name = String(item.querySelector('.sale-catalog-name')?.textContent || '').toLowerCase();
          item.classList.toggle('hidden', !!(needle && !name.includes(needle)));
        });
      });
      if (useCatalog) useCatalog.addEventListener('change', () => {
        const show = useCatalog.checked;
        catalogPanel.classList.toggle('hidden', !show);
        freeField.classList.toggle('hidden-field', show);
      });
      const creditCheck = modal.querySelector('#modal-credit');
      const creditPanel = modal.querySelector('#credit-panel');
      if (creditCheck) creditCheck.addEventListener('change', () => {
        creditPanel.classList.toggle('hidden', !creditCheck.checked);
      });
    }
    return modal;
  }

  async function saveModal(type, modal) {
    const amount = Number(modal.querySelector('#modal-amount')?.value || 0);
    const required = val => { if (!val) { showToast(t('app_toast_required', 'Veuillez renseigner tous les champs requis.')); return false; } return true; };
    if (type === 'sale') {
      const rawProductName = modal.querySelector('#modal-product').value.trim();
      const productName = rawProductName || 'Vente';
      const quantite = Number(modal.querySelector('#modal-quantite').value || 1);
      const magId = state.isPersonnel ? state.store : modal.querySelector('#modal-store').value;
      const isCredit = !!modal.querySelector('#modal-credit')?.checked;
      const payment = isCredit ? 'credit' : modal.querySelector('#modal-payment').value;
      if (!magId || amount <= 0 || quantite <= 0) { showToast(t('app_toast_sale_need', 'Renseignez le montant et la boutique.')); return; }
      const matchedProduct = rawProductName ? state.produits.find(item => item.nom === rawProductName && item.actif !== false && (item.magasin_id === magId || item.magasin_id === null)) : null;
      const saleBody = { produit_id: matchedProduct?.id || null, nom_produit: productName, quantite, montant: amount, mode_paiement: payment, magasin_id: magId };
      if (isCredit) {
        saleBody.client_nom = modal.querySelector('#modal-client').value.trim();
        saleBody.client_telephone = modal.querySelector('#modal-client-phone').value.trim();
        saleBody.date_echeance = modal.querySelector('#modal-echeance').value;
        if (!saleBody.client_nom || !saleBody.date_echeance) { showToast(t('app_toast_credit_need', 'Renseignez le client et la date d’échéance.')); return; }
      }
      const { response, payload } = await API('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: saleBody });
      if (!response.ok) { showToast(payload.error || t('app_toast_sale_ko', 'Vente impossible.')); return; }
      modal.remove();
      saveLastStore(magId);
      await loadData();
      showToast(t('app_toast_sale_ok', 'Vente enregistrée.'));
    } else if (type === 'expense') {
      const reason = modal.querySelector('#modal-reason').value.trim();
      const magId = state.isPersonnel ? state.store : modal.querySelector('#modal-store').value;
      if (!required(reason) || amount <= 0 || !magId) { showToast(t('app_toast_exp_need', 'Renseignez le motif, le montant et la boutique.')); return; }
      const { response, payload } = await API('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { montant: amount, motif: reason, magasin_id: magId } });
      if (!response.ok) { showToast(payload.error || t('app_toast_exp_ko', 'Dépense impossible.')); return; }
      modal.remove();
      saveLastStore(magId);
      await loadData();
      showToast(t('app_toast_exp_ok', 'Dépense enregistrée.'));
    } else if (type === 'product') {
      const name = modal.querySelector('#modal-product').value.trim();
      const categorie = modal.querySelector('#modal-categorie').value.trim();
      const price = Number(modal.querySelector('#modal-price').value || 0);
      const stock = Number(modal.querySelector('#modal-stock').value || 0);
      const magId = modal.querySelector('#modal-store').value || null;
      if (!required(name) || price <= 0) { showToast(t('app_toast_prod_need', 'Renseignez le nom et le prix.')); return; }
      const { response, payload } = await API('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'create', nom: name, categorie, prix: price, stock, magasin_id: magId, entreprise_id: state.entreprise_id } });
      if (!response.ok) { showToast(payload.error || t('app_toast_prod_ko', 'Produit impossible.')); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_prod_ok', 'Produit ajouté.'));
    } else if (type === 'product-edit') {
      const productId = modal.dataset.productId;
      const name = modal.querySelector('#modal-product').value.trim();
      const categorie = modal.querySelector('#modal-categorie').value.trim();
      const price = Number(modal.querySelector('#modal-price').value || 0);
      const stock = Number(modal.querySelector('#modal-stock').value || 0);
      if (!required(name) || price <= 0) { showToast(t('app_toast_prod_need', 'Renseignez le nom et le prix.')); return; }
      const { response, payload } = await API('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'update', produit_id: productId, nom: name, categorie, prix: price, stock } });
      if (!response.ok) { showToast(payload.error || t('app_toast_member_ko', 'Modification impossible.')); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_prod_upd', 'Produit modifié.'));
    } else if (type === 'team') {
      const name = modal.querySelector('#modal-name').value.trim();
      const phone = modal.querySelector('#modal-phone').value.trim();
      const pin = modal.querySelector('#modal-pin').value.trim();
      const magId = modal.querySelector('#modal-store').value;
      if (!required(name) || !required(phone) || !/^\d{4}$/.test(pin) || !magId) { showToast(t('app_toast_team_need', 'Renseignez le nom, le téléphone, le code à 4 chiffres et la boutique.')); return; }
      const { response, payload } = await API('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'create', nom: name, telephone: phone, pin, magasin_id: magId } });
      if (!response.ok) { showToast(payload.error === 'Ce numéro de téléphone est déjà utilisé dans votre entreprise.' ? t('app_toast_team_dup', 'Ce numéro est déjà utilisé.') : (payload.error || t('app_toast_team_ko', 'Création impossible.'))); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_team_ok', 'Personne ajoutée.'));
    } else if (type === 'open-cash') {
      const magId = modal.dataset.store;
      if (Number.isNaN(amount) || amount < 0) { showToast(t('app_toast_cash_open_need', 'Renseignez un montant d’ouverture.')); return; }
      const { response, payload } = await API('/api/cash?magasin_id=' + encodeURIComponent(magId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'open', montant_ouverture: amount } });
      if (!response.ok) { showToast(payload.error || t('app_toast_cash_open_ko', 'Ouverture impossible.')); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_cash_open_ok', 'Caisse ouverte.'));
    } else if (type === 'close-cash') {
      const magId = modal.dataset.store;
      if (Number.isNaN(amount) || amount < 0) { showToast(t('app_toast_cash_close_need', 'Renseignez le montant de fermeture.')); return; }
      const { response, payload } = await API('/api/cash?magasin_id=' + encodeURIComponent(magId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'close', montant_fermeture: amount } });
      if (!response.ok) { showToast(payload.error || t('app_toast_cash_close_ko', 'Fermeture impossible.')); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_cash_close_ok', 'Caisse fermée.'));
    } else if (type === 'magasin') {
      const nom = modal.querySelector('#modal-store-name').value.trim();
      if (!required(nom)) { showToast(t('app_toast_store_need', 'Renseignez le nom de la boutique.')); return; }
      const { response, payload } = await API('/api/structure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { entreprise_id: state.entreprise_id, nom } });
      if (!response.ok) { showToast(payload.error || t('app_toast_store_ko', 'Création impossible.')); return; }
      modal.remove();
      state.store = payload.magasin.id;
      await loadData();
      showToast(t('app_toast_store_ok', 'Boutique ajoutée.'));
    } else if (type === 'magasin-rename') {
      const storeId = modal.dataset.storeId;
      const nom = modal.querySelector('#modal-store-name').value.trim();
      if (!required(nom)) { showToast(t('app_toast_store_need', 'Renseignez le nom de la boutique.')); return; }
      const { response, payload } = await API('/api/structure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'rename', magasin_id: storeId, nom } });
      if (!response.ok) { showToast(payload.error || t('app_toast_store_ren_ko', 'Renommage impossible.')); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_store_ren_ok', 'Boutique renommée.'));
    } else if (type === 'magasin-delete') {
      const storeId = modal.dataset.storeId;
      if (!storeId) { showToast(t('app_toast_store_gone', 'Boutique introuvable.')); return; }
      if (!confirm(t('app_confirm_store_del', 'Supprimer définitivement cette boutique et toutes ses données ?'))) return;
      const { response, payload } = await API('/api/structure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'delete', magasin_id: storeId } });
      if (!response.ok) { showToast(payload.error || t('app_toast_store_del_ko', 'Suppression impossible.')); return; }
      modal.remove();
      if (state.store === storeId) state.store = 'all';
      await loadData();
      showToast(t('app_toast_store_del_ok', 'Boutique supprimée.'));
    } else if (type === 'dette') {
      const nom = modal.querySelector('#modal-client').value.trim();
      const telephone = modal.querySelector('#modal-client-phone').value.trim();
      const echeance = modal.querySelector('#modal-echeance').value;
      const magId = state.isPersonnel ? state.store : modal.querySelector('#modal-store').value;
      if (!required(nom) || amount <= 0 || !echeance || !magId) { showToast(t('app_toast_debt_need', 'Renseignez le client, le montant et l’échéance.')); return; }
      const { response, payload } = await API('/api/dettes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { client_nom: nom, client_telephone: telephone, montant: amount, date_echeance: echeance, magasin_id: magId } });
      if (!response.ok) { showToast(payload.error || t('app_toast_debt_ko', 'Création impossible.')); return; }
      modal.remove();
      saveLastStore(magId);
      await loadData();
      showToast(t('app_toast_debt_ok', 'Dette enregistrée.'));
    } else if (type === 'dette-pay') {
      const detteId = modal.dataset.detteId;
      const payment = modal.querySelector('#modal-payment').value;
      if (!detteId || amount <= 0) { showToast(t('app_toast_pay_need', 'Renseignez un montant valide.')); return; }
      const { response, payload } = await API('/api/dettes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'pay', dette_id: detteId, montant: amount, mode_paiement: payment } });
      if (!response.ok) { showToast(payload.error || t('app_toast_pay_ko', 'Encaissement impossible.')); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_pay_ok', 'Paiement enregistré.'));
    } else if (type === 'settings') {
      const nom = modal.querySelector('#modal-profile-nom').value.trim();
      if (!required(nom)) { showToast(t('app_toast_profile_need', 'Renseignez votre nom.')); return; }
      if (!state.isPersonnel) {
        const entrepriseNom = modal.querySelector('#modal-entreprise-nom').value.trim();
        const devise = modal.querySelector('#modal-entreprise-devise').value.trim();
        if (!required(entrepriseNom) || !required(devise)) { showToast(t('app_toast_company_need', 'Renseignez l’entreprise et la devise.')); return; }
        const { response, payload } = await API('/api/structure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'entreprise', entreprise_id: state.entreprise_id, nom: entrepriseNom, devise } });
        if (!response.ok) { showToast(payload.error || t('app_toast_company_ko', 'Entreprise non modifiée.')); return; }
      }
      const email = modal.querySelector('#modal-profile-email')?.value.trim();
      const passwordActuel = modal.querySelector('#modal-profile-password-actuel')?.value || '';
      const nouveauMotDePasse = modal.querySelector('#modal-profile-password-nouveau')?.value || '';
      const body = { nom };
      if (!state.isPersonnel && email) body.email = email;
      if (passwordActuel || nouveauMotDePasse) {
        body.password_actuel = passwordActuel;
        body.nouveau_mot_de_passe = nouveauMotDePasse;
      }
      const { response, payload } = await API('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
      if (!response.ok) { showToast(payload.error || t('app_toast_profile_ko', 'Profil non modifié.')); return; }
      window.solmaCompteSession = { ...(window.solmaCompteSession || {}), compte: { ...(window.solmaCompteSession?.compte || {}), ...payload.compte } };
      modal.remove();
      await loadData();
      syncProfileUi();
      showToast(t('app_toast_settings_ok', 'Paramètres enregistrés.'));
    } else if (type === 'team-edit') {
      const personnelId = modal.dataset.personnelId;
      const nom = modal.querySelector('#modal-name').value.trim();
      const phone = modal.querySelector('#modal-phone').value.trim();
      const pin = modal.querySelector('#modal-pin').value.trim();
      const magId = modal.querySelector('#modal-store').value;
      if (!required(nom) || !required(phone) || !magId) { showToast(t('app_toast_member_need', 'Renseignez le nom, le téléphone et la boutique.')); return; }
      const body = { action: 'update', personnel_id: personnelId, nom, telephone: phone, magasin_id: magId };
      if (pin) {
        if (!/^\d{4}$/.test(pin)) { showToast(t('app_toast_pin4', 'Le code doit contenir 4 chiffres.')); return; }
        body.pin = pin;
      }
      const { response, payload } = await API('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!response.ok) { showToast(payload.error || t('app_toast_member_ko', 'Modification impossible.')); return; }
      modal.remove();
      await loadData();
      showToast(t('app_toast_member_ok', 'Personne modifiée.'));
    }
  }

  async function cancelSale(saleId) {
    if (!confirm(t('app_confirm_sale', 'Annuler cette vente ? Le stock sera remis à jour.'))) return;
    const { response, payload } = await API('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'cancel', sale_id: saleId } });
    if (!response.ok) { showToast(payload.error || t('app_toast_sale_cancel_ko', 'Annulation impossible.')); return; }
    await loadData();
    showToast(t('app_toast_sale_cancelled', 'Vente annulée.'));
  }
  async function cancelExpense(expenseId) {
    if (!confirm(t('app_confirm_expense', 'Annuler cette dépense ?'))) return;
    const { response, payload } = await API('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'cancel', expense_id: expenseId } });
    if (!response.ok) { showToast(payload.error || t('app_toast_exp_cancel_ko', 'Annulation impossible.')); return; }
    await loadData();
    showToast(t('app_toast_exp_cancelled', 'Dépense annulée.'));
  }
  async function cancelDette(detteId) {
    if (!confirm(t('app_confirm_debt', 'Annuler cette dette ? Les versements déjà reçus sont conservés.'))) return;
    const { response, payload } = await API('/api/dettes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'cancel', dette_id: detteId } });
    if (!response.ok) { showToast(payload.error || t('app_toast_debt_cancel_ko', 'Annulation impossible.')); return; }
    await loadData();
    showToast(t('app_toast_debt_cancelled', 'Dette annulée.'));
  }
  async function toggleProduct(productId, active) {
    if (!confirm(active ? t('app_confirm_prod_on', 'Réactiver ce produit ?') : t('app_confirm_prod_off', 'Désactiver ce produit ? Il ne pourra plus être vendu.'))) return;
    const { response, payload } = await API('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'toggle', produit_id: productId, actif: !active } });
    if (!response.ok) { showToast(payload.error || t('app_toast_member_ko', 'Modification impossible.')); return; }
    await loadData();
    showToast(t('app_toast_toggle_prod', 'Produit mis à jour.'));
  }

  async function togglePersonnel(personnelId, active) {
    if (!confirm(active ? t('app_confirm_member_off', 'Désactiver cette personne ? Elle ne pourra plus se connecter.') : t('app_confirm_member_on', 'Réactiver cette personne ?'))) return;
      const { response, payload } = await API('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'toggle', personnel_id: personnelId, actif: !active } });
    if (!response.ok) { showToast(payload.error || t('app_toast_member_ko', 'Modification impossible.')); return; }
    await loadData();
    showToast(t('app_toast_toggle_member', 'Accès mis à jour.'));
  }

  function bindViewEvents() {
    document.querySelectorAll('[data-view-link]').forEach(button => button.onclick = () => { state.currentView = button.dataset.viewLink; render(); });
    document.querySelectorAll('[data-search]').forEach(input => {
      input.value = state.search[input.dataset.search] || '';
      input.oninput = () => {
        const key = input.dataset.search;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          state.search[key] = value;
          render();
          const fresh = document.querySelector(`[data-search="${key}"]`);
          if (fresh) {
            fresh.focus({ preventScroll: true });
            try { fresh.setSelectionRange(start, end); } catch {}
          }
        }, 150);
      };
    });
    document.querySelectorAll('[data-filter]').forEach(select => {
      select.onchange = () => { state.filters[select.dataset.filter] = select.value; render(); };
    });
    document.querySelectorAll('[data-period]').forEach(button => button.onclick = () => { state.period = button.dataset.period; render(); });
    document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => {
      const action = button.dataset.action;
      if (action === 'retry') loadData();
      if (action === 'new-sale') openModal('sale');
      if (action === 'new-expense') openModal('expense');
      if (action === 'new-product') openModal('product');
      if (action === 'new-team') openModal('team');
      if (action === 'new-debt') openModal('dette');
      if (action === 'open-cash') openModal('open-cash', button.dataset.store);
      if (action === 'close-cash') openModal('close-cash', button.dataset.store);
      if (action === 'export-csv-sales') exportSalesCsv();
      if (action === 'export-csv-expenses') exportExpensesCsv();
      if (action === 'export-csv-daily') exportDailyCsv();
      if (action === 'export-csv-cash') exportCashCsv();
      if (action === 'print-report') openPrintReport();
      if (action === 'edit-profile') openModal('settings');
      if (action === 'start-tour') startTour();
    });
    document.querySelectorAll('[data-cancel-sale]').forEach(button => button.onclick = () => cancelSale(button.dataset.cancelSale));
    document.querySelectorAll('[data-cancel-expense]').forEach(button => button.onclick = () => cancelExpense(button.dataset.cancelExpense));
    document.querySelectorAll('[data-pay-dette]').forEach(button => button.onclick = () => openModal('dette-pay', button.dataset.payDette));
    document.querySelectorAll('[data-cancel-dette]').forEach(button => button.onclick = () => cancelDette(button.dataset.cancelDette));
    document.querySelectorAll('[data-edit-product]').forEach(button => button.onclick = () => openModal('product-edit', button.dataset.editProduct));
    document.querySelectorAll('[data-toggle-product]').forEach(button => button.onclick = () => toggleProduct(button.dataset.toggleProduct, button.dataset.active === '1'));
    document.querySelectorAll('[data-deactivate-personnel]').forEach(button => button.onclick = () => togglePersonnel(button.dataset.deactivatePersonnel, button.dataset.active === '1'));
    document.querySelectorAll('[data-edit-personnel]').forEach(button => button.onclick = () => openModal('team-edit', button.dataset.editPersonnel));
  }

  function render() {
    const views = { dashboard: dashboardView, sales: salesView, cash: cashView, expenses: expensesView, debts: dettesView, products: productsView, team: teamView, reports: reportsView };
    if (state.currentView === 'products' && state.isPersonnel) state.currentView = 'dashboard';
    if (state.currentView === 'team' && state.isPersonnel) state.currentView = 'dashboard';
    if (state.currentView === 'reports' && state.isPersonnel) state.currentView = 'dashboard';
    page.innerHTML = views[state.currentView]();
    document.querySelector('#breadcrumb-current').textContent = pageTitle();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === state.currentView));
    syncDebtsBadge();
    bindViewEvents();
    setupStoreSelector();
    animateCounts();
  }

  function syncDebtsBadge() {
    const badge = document.querySelector('#nav-debts-count');
    if (!badge) return;
    const late = personnelOwnDettes(filtered(state.dettes)).filter(dette => !dette.annulee && detteStatut(dette) === 'retard').length;
    badge.textContent = late > 99 ? '99+' : String(late);
    badge.classList.toggle('hidden', !late);
  }

  function setupStoreSelector() {
    const container = document.querySelector('#store-selector-custom');
    const label = document.querySelector('#store-selector-label');
    const trigger = document.querySelector('#store-selector-trigger');
    const menu = document.querySelector('#store-selector-menu');
    if (state.isPersonnel) {
      container.classList.add('hidden');
      label.textContent = state.magasins.find(magasin => magasin.id === state.store)?.nom || t('app_my_store', 'Ma boutique');
      state.store = state.magasins.find(magasin => magasin.id === state.store)?.id || (state.magasins[0]?.id || 'all');
      return;
    }
    container.classList.remove('hidden');
    menu.innerHTML = `<button type="button" class="store-selector-option ${state.store === 'all' ? 'active' : ''}" data-store-value="all" role="option">${escapeHtml(t('store_all', 'Toutes les boutiques'))}</button>` + state.magasins.map(magasin => `<button type="button" class="store-selector-option ${state.store === magasin.id ? 'active' : ''}" data-store-value="${magasin.id}" role="option">${escapeHtml(magasin.nom)}${state.magasins.length > 1 ? `<span class="store-selector-rename" data-store-rename="${magasin.id}" aria-label="Renommer ${escapeHtml(magasin.nom)}" title="Renommer">✎</span><span class="store-selector-delete" data-store-delete="${magasin.id}" aria-label="Supprimer ${escapeHtml(magasin.nom)}" title="Supprimer">🗑</span>` : ''}</button>`).join('') + `<button type="button" class="store-selector-option store-selector-add" data-store-new role="option">${icon('plus', 13)} ${escapeHtml(t('store_new', 'Nouvelle boutique'))}</button>`;
    const currentLabel = state.store === 'all' ? t('store_all', 'Toutes les boutiques') : state.magasins.find(magasin => magasin.id === state.store)?.nom || t('store_all', 'Toutes les boutiques');
    label.textContent = currentLabel;
    trigger.onclick = () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
      menu.classList.toggle('open', !open);
    };
    menu.querySelectorAll('[data-store-value]').forEach(option => option.onclick = () => {
      state.store = option.dataset.storeValue;
      trigger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      render();
      setupStoreSelector();
    });
    menu.querySelector('[data-store-new]')?.addEventListener('click', event => {
      event.stopPropagation();
      trigger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      openModal('magasin');
    });
    menu.querySelectorAll('[data-store-rename]').forEach(rename => rename.addEventListener('click', event => {
      event.stopPropagation();
      trigger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      openModal('magasin-rename', rename.dataset.storeRename);
    }));
    menu.querySelectorAll('[data-store-delete]').forEach(del => del.addEventListener('click', event => {
      event.stopPropagation();
      trigger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      openModal('magasin-delete', del.dataset.storeDelete);
    }));
    bindStoreMenuOutsideClose();
  }

  let storeMenuOutsideBound = false;
  function bindStoreMenuOutsideClose() {
    if (storeMenuOutsideBound) return;
    storeMenuOutsideBound = true;
    document.addEventListener('click', event => {
      const container = document.querySelector('#store-selector-custom');
      const menu = document.querySelector('#store-selector-menu');
      const trigger = document.querySelector('#store-selector-trigger');
      if (!container || !menu || !menu.classList.contains('open')) return;
      if (container.contains(event.target)) return;
      trigger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
    });
  }

  function setupNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = () => { state.currentView = item.dataset.view; render(); closeSidebarOnNav(); };
      const restricted = ['products', 'team', 'reports'].includes(item.dataset.view);
      item.classList.toggle('hidden', state.isPersonnel && restricted);
    });
  }

  function closeSidebarOnNav() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  }

  function animateCounts() {
    document.querySelectorAll('[data-count-target]').forEach(el => {
      const target = Number(el.dataset.countTarget) || 0;
      const isMoney = el.dataset.countFormat === 'money';
      const start = performance.now();
      const step = now => {
        const progress = Math.min((now - start) / 600, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        el.textContent = isMoney ? money(value) : value.toLocaleString('fr-FR');
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function init() {
    syncAuthState();
    if (!state.token) return;
    if (!state.isPersonnel && !state.entreprise_id) return;
    setupNav();
    setupSidebar();
    syncProfileUi();
    document.querySelectorAll('[data-action="edit-profile"]').forEach(button => button.onclick = () => openModal('settings'));
    loadData();
  }

  function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const toggleBtn = document.getElementById('mobile-menu');
    if (!sidebar || !toggleBtn) return;

    const collapsedKey = 'samacaisse_sidebar_collapsed';
    const isDesktop = () => window.matchMedia('(min-width: 721px)').matches;

    // Sur PC, on restaure le choix précédent (repliée ou non).
    if (isDesktop() && localStorage.getItem(collapsedKey) === '1') {
      sidebar.classList.add('collapsed');
    }

    const closeMobile = () => { sidebar.classList.remove('open'); backdrop?.classList.remove('show'); };

    const toggle = () => {
      if (isDesktop()) {
        const collapsed = sidebar.classList.toggle('collapsed');
        localStorage.setItem(collapsedKey, collapsed ? '1' : '0');
      } else {
        const open = sidebar.classList.toggle('open');
        backdrop?.classList.toggle('show', open);
      }
    };

    toggleBtn.onclick = event => { event.stopPropagation(); toggle(); };
    if (backdrop) backdrop.onclick = closeMobile;

    // PC : un clic n'importe où en dehors de la sidebar (déjà ouverte) la replie.
    document.addEventListener('click', event => {
      if (!isDesktop()) return;
      if (sidebar.classList.contains('collapsed')) return;
      if (sidebar.contains(event.target) || toggleBtn.contains(event.target)) return;
      sidebar.classList.add('collapsed');
      localStorage.setItem(collapsedKey, '1');
    });

    // En passant sous 720px, on annule tout état "replié/ouverte" laissé par le PC.
    window.addEventListener('resize', () => {
      if (isDesktop()) return;
      sidebar.classList.remove('open');
      backdrop?.classList.remove('show');
    });
  }

  window.addEventListener('solma-auth-ready', init);

  window.addEventListener('samacaisse-lang-changed', () => {
    if (window.SamaCaisseI18n) window.SamaCaisseI18n.applyTranslations();
    syncProfileUi();
    if (state.token) render();
  });

  if (window.solmaPersonnelSession?.token) {
    init();
  }

  /* ==========================================================================
     VISITE GUIDÉE — obligatoire à la première session, relançable à tout moment
     ========================================================================== */
  const TOUR_KEY = 'samacaisse_tour_v1';
  const TOUR_STEPS = [
    { title: t('app_tour_welcome_t', 'Bienvenue sur SamaCaisse'), text: t('app_tour_welcome_x', 'Voici un tour rapide : en une minute, vous saurez où tout se trouve.'), sel: null },
    { title: t('app_tour_menu_t', 'Le menu'), text: t('app_tour_menu_x', 'Touchez ici pour ouvrir le menu : ventes, caisses, dépenses, produits, personnel et rapports.'), sel: '#mobile-menu' },
    { title: t('app_tour_store_t', 'Vos boutiques'), text: t('app_tour_store_x', 'Choisissez une boutique ou « Toutes les boutiques » : tout le tableau de bord suit ce choix.'), sel: '#store-selector-custom' },
    { title: t('app_tour_sale_t', 'Nouvelle vente'), text: t('app_tour_sale_x', 'Le bouton le plus important : enregistrez une vente en renseignant juste le montant.'), sel: '[data-action="new-sale"]' },
    { title: t('app_tour_period_t', 'La période'), text: t('app_tour_period_x', 'Aujourd’hui, 7 jours, 30 jours ou tout : tous les chiffres suivent la période choisie.'), sel: '[data-period-switch]' },
    { title: t('app_tour_kpi_t', 'Vos chiffres'), text: t('app_tour_kpi_x', 'Ventes, transactions, dépenses et caisse attendue : l’essentiel en un coup d’œil.'), sel: '.stats-grid' }
  ];
  let tourIndex = -1;
  let tourSteps = TOUR_STEPS;
  let tourRepositionBound = false;
  let searchDebounce = null;

  const tourDone = () => { try { localStorage.setItem(TOUR_KEY, '1'); } catch {} };
  const tourCleanup = () => {
    document.querySelectorAll('.tour-scrim, .tour-highlight, .tour-tip').forEach(el => el.remove());
    tourIndex = -1;
  };
  const tourPosition = () => {
    if (tourIndex < 0) return;
    const step = tourSteps[tourIndex];
    const highlight = document.querySelector('.tour-highlight');
    const tip = document.querySelector('.tour-tip');
    if (!highlight || !tip) return;
    const target = step.sel ? document.querySelector(step.sel) : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const pad = 6;
      highlight.style.display = 'block';
      highlight.style.top = Math.max(8, rect.top - pad) + 'px';
      highlight.style.left = Math.max(8, rect.left - pad) + 'px';
      highlight.style.width = (rect.width + pad * 2) + 'px';
      highlight.style.height = (rect.height + pad * 2) + 'px';
      const below = window.innerHeight - rect.bottom;
      tip.style.top = '';
      tip.style.bottom = '';
      tip.style.transform = '';
      if (below >= 190) tip.style.top = (rect.bottom + 12) + 'px';
      else tip.style.bottom = '16px';
      tip.style.left = Math.max(16, Math.min(window.innerWidth - 336, rect.left)) + 'px';
    } else {
      highlight.style.display = 'none';
      tip.style.top = '50%';
      tip.style.bottom = '';
      tip.style.left = '50%';
      tip.style.transform = 'translate(-50%, -50%)';
    }
  };
  const tourShow = index => {
    tourIndex = index;
    tourCleanupSilent();
    const step = tourSteps[index];
    const last = index === tourSteps.length - 1;
    const scrim = document.createElement('div');
    scrim.className = 'tour-scrim';
    scrim.onclick = () => { tourDone(); tourCleanup(); };
    const highlight = document.createElement('div');
    highlight.className = 'tour-highlight';
    const tip = document.createElement('div');
    tip.className = 'tour-tip';
    tip.innerHTML = `<span class="tour-count">${index + 1} / ${tourSteps.length}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p><div class="tour-tip-actions"><button type="button" class="btn btn-light" data-tour="skip">${t('app_tour_skip', 'Passer')}</button><button type="button" class="btn btn-primary" data-tour="next">${last ? t('app_tour_done', 'Terminer') : t('app_tour_next', 'Suivant')}</button></div>`;
    document.body.append(scrim, highlight, tip);
    tip.querySelector('[data-tour="skip"]').onclick = () => { tourDone(); tourCleanup(); };
    tip.querySelector('[data-tour="next"]').onclick = () => {
      if (last) { tourDone(); tourCleanup(); return; }
      tourShow(index + 1);
    };
    if (!tourRepositionBound) {
      tourRepositionBound = true;
      window.addEventListener('resize', tourPosition);
    }
    const target = step.sel ? document.querySelector(step.sel) : null;
    if (target) {
      target.scrollIntoView({ block: 'center' });
      setTimeout(tourPosition, 350);
    }
    tourPosition();
  };
  const tourCleanupSilent = () => {
    document.querySelectorAll('.tour-scrim, .tour-highlight, .tour-tip').forEach(el => el.remove());
  };
  function startTour() {
    if (state.currentView !== 'dashboard') { state.currentView = 'dashboard'; render(); }
    tourSteps = TOUR_STEPS.filter(step => {
      if (!step.sel) return true;
      const el = document.querySelector(step.sel);
      return el && el.offsetParent !== null;
    });
    if (!tourSteps.length) return;
    setTimeout(() => tourShow(0), 300);
  }
  function maybeStartTour() {
    let seen = null;
    try { seen = localStorage.getItem(TOUR_KEY); } catch {}
    if (seen) return;
    if (!window.matchMedia('(max-width: 720px)').matches) return;
    startTour();
  }
})();