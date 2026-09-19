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
    caisses: [],
    personnel: [],
    store: 'all',
    loading: true,
    error: '',
    currentView: 'dashboard',
    search: { produits: '', ventes: '', depenses: '' },
    period: 'all'
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

  const storeName = magasinId => state.magasins.find(magasin => magasin.id === magasinId)?.nom || 'Toutes les boutiques';
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
    state.caisses = payload.caisses || [];
    state.personnel = payload.personnel || [];
    state.loading = false;
    syncEnterpriseBadge();
    render();
    maybeStartTour();
  }

  const pageTitle = () => ({ dashboard: 'Tableau de bord', sales: 'Ventes', cash: 'Caisses', expenses: 'Dépenses', products: 'Produits', team: 'Personnel', reports: 'Rapports' }[state.currentView] || 'Tableau de bord');

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
    return `<svg class="chart" viewBox="0 0 700 220" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#80bca0" stop-opacity=".30"/><stop offset="1" stop-color="#80bca0" stop-opacity="0"/></linearGradient></defs><line class="chart-grid" x1="0" y1="30" x2="700" y2="30"/><line class="chart-grid" x1="0" y1="87" x2="700" y2="87"/><line class="chart-grid" x1="0" y1="144" x2="700" y2="144"/><path class="chart-area" d="${areaPath}"/><path class="chart-line" d="${linePath}"/><circle class="chart-dot" cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="5"/>${points.map(point => `<text class="axis-label" x="${point.x.toFixed(1)}" y="216">${point.label}</text>`).join('')}${yTicks.map(tick => `<text class="axis-label" x="696" y="${(tick.y - 5).toFixed(1)}" text-anchor="end">${shortMoney(tick.value)}</text>`).join('')}</svg>`;
  }

  function cashExpectation(caisse) {
    if (!caisse) return 0;
    if (caisse.date_fermeture) return caisse.montant_fermeture || 0;
    const since = new Date(caisse.date_ouverture);
    const sales = state.ventes.filter(v => v.magasin_id === caisse.magasin_id && !v.annulee && v.mode_paiement === 'liquide' && new Date(v.date_heure) >= since).reduce((sum, v) => sum + v.montant, 0);
    const expenses = state.depenses.filter(d => d.magasin_id === caisse.magasin_id && !d.annulee && new Date(d.date_heure) >= since).reduce((sum, d) => sum + d.montant, 0);
    return caisse.montant_ouverture + sales - expenses;
  }

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
  const scopeLabel = () => (state.store === 'all' ? 'Toutes les boutiques' : storeName(state.store));
  function syncProfileUi() {
    const profile = window.solmaCompteSession?.compte || window.solmaPersonnelSession?.personnel;
    if (!profile) return;
    const name = profile.nom || profile.email || 'Compte propriétaire';
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
    downloadCsv('ventes.csv', ['Produit', 'Vendeur', 'Boutique', 'Paiement', 'Quantité', 'Montant', 'Date', 'Statut'], personnelOwnSales(filtered(state.ventes)).filter(sale => matchesSearch(sale.nom_produit, 'ventes')).map(v => [v.nom_produit, v.personnel?.nom || v.admin_nom || 'Propriétaire', v.magasins?.nom || '', v.mode_paiement === 'liquide' ? 'Liquide' : 'Mobile money', v.quantite, v.montant, toTime(v.date_heure), v.annulee ? 'Annulée' : 'Valide']));
  }
  function exportExpensesCsv() {
    downloadCsv('depenses.csv', ['Motif', 'Ajoutée par', 'Boutique', 'Montant', 'Date', 'Statut'], filtered(state.depenses).filter(d => matchesSearch(d.motif, 'depenses')).map(d => [d.motif, d.personnel?.nom || d.admin_nom || 'Propriétaire', d.magasins?.nom || '', d.montant, toTime(d.date_heure), d.annulee ? 'Annulée' : 'Valide']));
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
    const dailyRows = daily.length ? daily.map(d => `<tr><td>${d.date}</td><td>${moneyRaw(d.sales)}</td><td>− ${moneyRaw(d.expenses)}</td><td>${moneyRaw(d.sales - d.expenses)}</td></tr>`).join('') : '<tr><td colspan="4">Aucune vente ou dépense enregistrée.</td></tr>';
    const cashRows = cashClosed.length ? cashClosed.slice(0, 60).map(c => `<tr><td>${c.date}</td><td>${escapeHtml(c.store)}</td><td>${moneyRaw(c.opening)}</td><td>${moneyRaw(c.theorique)}</td><td>${moneyRaw(c.closings)}</td><td>${moneyRaw(c.difference)}</td></tr>`).join('') : '<tr><td colspan="6">Aucune caisse clôturée.</td></tr>';
    const topRows = topProducts.length ? topProducts.map(([name, value]) => `<tr><td>${escapeHtml(name)}</td><td>${moneyRaw(value)}</td></tr>`).join('') : '';
    const container = document.querySelector('#print-report');
    container.innerHTML = `
      <h1>${escapeHtml(state.entreprise.nom || 'SamaCaisse')} — Rapport de gestion</h1>
      <p class="print-muted">${escapeHtml(scopeLabel())} · Généré le ${today}</p>
      <h2>Total de la période</h2>
      <table><tr><th>Ventes</th><th>Dépenses</th><th>Résultat net</th></tr><tr><td>${moneyRaw(totals.sales)}</td><td>− ${moneyRaw(totals.expenses)}</td><td>${moneyRaw(totals.net)}</td></tr></table>
      ${topRows ? `<h2>Meilleurs produits</h2><table><tr><th>Produit</th><th>Montant vendu</th></tr>${topRows}</table>` : ''}
      <h2>Jour par jour</h2>
      <table><tr><th>Jour</th><th>Ventes</th><th>Dépenses</th><th>Résultat</th></tr>${dailyRows}</table>
      <h2>Historique des caisses</h2>
      <table><tr><th>Clôturée le</th><th>Boutique</th><th>Ouverture</th><th>Solde théorique</th><th>Solde réel</th><th>Écart</th></tr>${cashRows}</table>`;
    window.print();
  }

  function dashboardView() {
    if (state.loading) return '<div class="loading-state glass-card"><strong>Chargement des données…</strong><span>Connexion en cours.</span></div>';
    if (state.error) return `<div class="empty-state glass-card"><strong>Impossible de charger vos données.</strong><span>${escapeHtml(state.error)}</span><button class="btn btn-primary" data-action="retry">Réessayer</button></div>`;
    const range = periodRange();
    const sales = filtered(state.ventes).filter(sale => !sale.annulee && inPeriod(sale.date_heure));
    const todaySales = sales.filter(sale => isToday(sale.date_heure));
    const todayExpenses = filtered(state.depenses).filter(depense => !depense.annulee && isToday(depense.date_heure) && inPeriod(depense.date_heure));
    const totalSales = sales.reduce((sum, sale) => sum + sale.montant, 0);
    const totalExpenses = todayExpenses.reduce((sum, depense) => sum + depense.montant, 0);
    const openCash = filtered(state.caisses).filter(item => !item.date_fermeture);
    const cashTotal = openCash.reduce((sum, item) => sum + cashExpectation(item), 0);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTotal = filtered(state.ventes).filter(sale => !sale.annulee && isSameDay(new Date(sale.date_heure), yesterday)).reduce((sum, sale) => sum + sale.montant, 0);
    let trend;
    if (yesterdayTotal > 0) trend = `${((totalSales - yesterdayTotal) / yesterdayTotal * 100).toFixed(1).replace('.', ',') >= 0 ? '+' : ''}${((totalSales - yesterdayTotal) / yesterdayTotal * 100).toFixed(1).replace('.', ',')}%`;
    else if (totalSales > 0) trend = 'Nouveau';
    else trend = '—';
    const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const sellerName = window.solmaPersonnelSession?.personnel?.nom || (state.entreprise.nom || 'Votre boutique');
    const periodLabel = state.period === 'all' ? '' : `<span class="period-label"> · ${({ today: 'Aujourd’hui', '7d': '7 derniers jours', '30d': '30 derniers jours' })[state.period]}</span>`;
    const cashCards = filtered(state.caisses).reduce((items, item) => {
      const key = item.magasin_id;
      if (items.some(entry => entry.magasin_id === key)) return items;
      const open = !item.date_fermeture;
      items.push({ key, name: storeName(item.magasin_id) || 'Toutes les boutiques', magasin_id: item.magasin_id, open, opening: item.montant_ouverture, expected: cashExpectation(item), openedAt: toTime(item.date_ouverture) });
      return items;
    }, []);
    const latestSales = personnelOwnSales(filtered(state.ventes)).slice(0, 5);
    return `<div class="page-heading"><div><p class="eyebrow">${todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p><h1>Bonjour ${escapeHtml(sellerName)}</h1><p class="subtle">Voici ce qui se passe aujourd’hui${periodLabel}.</p></div>${state.isPersonnel ? '' : `<div class="page-heading-actions">${periodSelector()}<button class="btn btn-primary" data-action="new-sale">${icon('plus', 14)} Nouvelle vente</button></div>`}</div>
    <section class="stats-grid">
      <article class="glass-card stat-card"><div class="stat-top"><span>${state.period === 'today' ? 'Ventes du jour' : 'Ventes de la période'}</span><span class="stat-symbol">${icon('trendingUp')}</span></div><h2>${money(totalSales)}</h2><div class="stat-foot ${yesterdayTotal > 0 ? '' : 'neutral'}"><b>${trend}</b> vs. hier</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>Transactions</span><span class="stat-symbol">${icon('activity')}</span></div><h2>${todaySales.length}</h2><div class="stat-foot neutral">Ventes enregistrées aujourd’hui</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>Dépenses du jour</span><span class="stat-symbol">${icon('trendingDown')}</span></div><h2>${money(totalExpenses)}</h2><div class="stat-foot neutral">${todayExpenses.length} dépense${todayExpenses.length > 1 ? 's' : ''} aujourd’hui</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>Caisse attendue</span><span class="stat-symbol">${icon('wallet')}</span></div><h2>${money(cashTotal)}</h2><div class="stat-foot ${openCash.length ? '' : 'neutral'}">${openCash.length ? 'Caisse ouverte' : 'Caisse non ouverte'}</div></article>
    </section>
    <section class="content-grid">
      <article class="glass-card panel"><div class="panel-header"><div><h3>Performance des ventes</h3><p>Chiffre d’affaires des 7 derniers jours</p></div><button class="text-link" data-view-link="reports">Voir le rapport ↗</button></div><div class="chart-wrap">${buildTrendSvg(sales)}</div><div class="legend"><span><i></i> Total des ventes</span></div></article>
      <article class="glass-card panel"><div class="panel-header"><div><h3>État des caisses</h3><p>Suivi en temps réel</p></div><button class="text-link" data-view-link="cash">Tout voir</button></div><div class="cash-list">${cashCards.length ? cashCards.map(cash => `<div class="cash-item"><div class="store-icon">${icon('store', 18)}</div><div class="cash-info"><strong>${escapeHtml(cash.name)}</strong><span>${cash.open ? (cash.openedAt ? 'Ouverte à ' + cash.openedAt.split(', ')[1] : 'Ouverte') : 'Fermée'}</span></div><div class="cash-amount"><strong>${money(cash.expected)}</strong><span class="${cash.open ? '' : 'closed'}">${cash.open ? 'En cours' : 'Fermée'}</span></div><div class="cash-progress"><i class="${cash.open ? '' : 'closed'}"></i></div></div>`).join('') : '<div class="empty-state"><strong>Aucune caisse</strong><span>Ouvrez une caisse pour commencer le suivi.</span></div>'}</div></article>
    </section>
    <section class="glass-card panel activity-panel"><div class="panel-header"><div><h3>Dernières transactions</h3><p>Les ventes les plus récentes</p></div><button class="text-link" data-view-link="sales">Voir toutes les ventes ↗</button></div>${salesTable(latestSales)}</section>`;
  }

  function salesTable(sales) {
    const rows = sales.length ? sales.map(sale => `<tr class="${sale.annulee ? 'cancelled-row' : ''}"><td><strong>${escapeHtml(sale.nom_produit)}</strong></td><td><div class="person"><span class="person-avatar">${initials(sale.personnel?.nom || sale.admin_nom || 'A')}</span>${escapeHtml(sale.personnel?.nom || sale.admin_nom || 'Propriétaire')}</div></td><td class="muted">${escapeHtml(sale.magasins?.nom || '—')}</td><td><span class="badge ${sale.mode_paiement === 'liquide' ? 'badge-cash' : 'badge-money'}">${sale.mode_paiement === 'liquide' ? 'Liquide' : 'Mobile money'}</span></td><td><strong>${money(sale.montant)}</strong></td><td class="muted">${escapeHtml(toTime(sale.date_heure))}${sale.annulee ? ' · Annulée' : ''}</td>${state.isPersonnel ? '' : `<td>${sale.annulee ? '<span class="muted">Annulée</span>' : `<button class="text-link danger-link" data-cancel-sale="${sale.id}">Annuler</button>`}</td>`}</tr>`).join('') : '<tr><td colspan="7"><div class="empty-state"><strong>Aucune vente</strong><span>Les ventes enregistrées apparaîtront ici.</span></div></td></tr>';
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Produit</th><th>Vendeur</th><th>Boutique</th><th>Paiement</th><th>Montant</th><th>Date et heure</th>${state.isPersonnel ? '' : '<th>Action</th>'}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const genericHeader = (title, subtitle, action, actionLabel) => `<div class="page-heading"><div><p class="eyebrow">Gestion opérationnelle</p><h1>${title}</h1><p class="subtle">${subtitle}</p></div>${action ? `<button class="btn btn-primary" data-action="${action}">${icon('plus', 14)} ${actionLabel}</button>` : ''}</div>`;

  const searchInput = (key, placeholder) => `<input class="filter-input" data-search="${key}" placeholder="${placeholder}" value="${escapeHtml(state.search[key] || '')}" />`;
  const matchesSearch = (value, key) => {
    const needle = String(state.search[key] || '').trim().toLowerCase();
    if (!needle) return true;
    return String(value || '').toLowerCase().includes(needle);
  };
  const periodSelector = () => `
    <div class="period-switch" data-period-switch>
      <button type="button" class="${state.period === 'today' ? 'active' : ''}" data-period="today">Aujourd'hui</button>
      <button type="button" class="${state.period === '7d' ? 'active' : ''}" data-period="7d">7 jours</button>
      <button type="button" class="${state.period === '30d' ? 'active' : ''}" data-period="30d">30 jours</button>
      <button type="button" class="${state.period === 'all' ? 'active' : ''}" data-period="all">Tout</button>
    </div>`;

  const personnelOwnSales = items => {
    if (!state.isPersonnel) return items;
    const pid = window.solmaPersonnelSession?.personnel?.id;
    if (!pid) return items;
    return items.filter(sale => sale.personnel_id === pid);
  };

  function salesTableView() {
    const visible = personnelOwnSales(filtered(state.ventes).filter(sale => matchesSearch(sale.nom_produit, 'ventes')));
    return `<section class="glass-card view-card"><div class="filters">${searchInput('ventes', 'Rechercher un produit…')}<span class="muted">${visible.length} vente${visible.length > 1 ? 's' : ''}${state.store !== 'all' ? ' · ' + escapeHtml(scopeLabel()) : ''}</span><button class="btn btn-light" data-action="export-csv-sales">Exporter CSV ↗</button></div>${salesTable(visible)}</section>`;
  }

  function salesView() {
    return genericHeader('Ventes', state.isPersonnel ? 'Les ventes enregistrées dans votre boutique.' : 'Toutes les ventes enregistrées dans vos boutiques.', 'new-sale', 'Nouvelle vente') +
      salesTableView();
  }

  function expensesView() {
    const visibleExpenses = filtered(state.depenses).filter(depense => matchesSearch(depense.motif, 'depenses'));
    const rows = visibleExpenses.map(depense => `<tr class="${depense.annulee ? 'cancelled-row' : ''}"><td><strong>${escapeHtml(depense.motif)}</strong></td><td>${escapeHtml(depense.personnel?.nom || depense.admin_nom || 'Propriétaire')}</td><td class="muted">${escapeHtml(depense.magasins?.nom || '—')}</td><td class="negative"><strong>− ${money(depense.montant)}</strong></td><td class="muted">${escapeHtml(toTime(depense.date_heure))}${depense.annulee ? ' · Annulée' : ''}</td>${state.isPersonnel ? '' : `<td>${depense.annulee ? '<span class="muted">Annulée</span>' : `<button class="text-link danger-link" data-cancel-expense="${depense.id}">Annuler</button>`}</td>`}</tr>`).join('');
    return genericHeader('Dépenses', 'Gardez une trace claire des sorties.', 'new-expense', 'Ajouter une dépense') +
      `<section class="glass-card view-card"><div class="filters">${searchInput('depenses', 'Rechercher un motif…')}<span class="muted">${visibleExpenses.length} dépense${visibleExpenses.length > 1 ? 's' : ''}${state.store !== 'all' ? ' · ' + escapeHtml(scopeLabel()) : ''}</span><button class="btn btn-light" data-action="export-csv-expenses">Exporter CSV ↗</button></div>${visibleExpenses.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Motif</th><th>Ajoutée par</th><th>Boutique</th><th>Montant</th><th>Date</th>${state.isPersonnel ? '' : '<th>Action</th>'}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>Aucune dépense</strong><span>Les dépenses ajoutées apparaîtront ici.</span></div>'}</section>`;
  }

  function cashView() {
    const magasins = state.store === 'all' ? state.magasins : state.magasins.filter(magasin => magasin.id === state.store);
    const cards = magasins.map(magasin => {
      const caisse = filtered(state.caisses).find(item => item.magasin_id === magasin.id);
      const open = Boolean(caisse && !caisse.date_fermeture);
      return `<article class="glass-card view-card"><div class="panel-header"><div><h3>Caisse ${escapeHtml(magasin.nom)}</h3><p>${open ? 'Ouverte' : 'Fermée'}${caisse ? ' · ' + escapeHtml(toTime(caisse.date_ouverture)) : ''}</p></div><span class="badge ${open ? 'badge-money' : 'badge-cash'}">${open ? 'En cours' : 'Fermée'}</span></div><div class="form-grid"><div><span class="muted">Montant d’ouverture</span><h3>${money(caisse?.montant_ouverture || 0)}</h3></div><div><span class="muted">Montant attendu</span><h3>${money(caisse && !caisse.date_fermeture ? cashExpectation(caisse) : (caisse?.montant_fermeture || 0))}</h3></div></div><div class="form-actions"><button class="btn ${open ? 'btn-danger' : 'btn-primary'}" data-action="${open ? 'close-cash' : 'open-cash'}" data-store="${magasin.id}">${open ? 'Fermer la caisse' : 'Ouvrir la caisse'}</button></div></article>`;
    }).join('');
    const history = filtered(state.caisses).filter(item => item.date_fermeture).map(item => {
      const ecart = item.ecart || 0;
      return `<tr><td><strong>${escapeHtml(toTime(item.date_fermeture))}</strong></td><td class="muted">${escapeHtml(storeName(item.magasin_id))}</td><td>${money(item.montant_ouverture)}</td><td>${money(item.montant_fermeture)}</td><td class="${ecart >= 0 ? 'positive' : 'negative'}">${ecart >= 0 ? '+ ' : '− '}${money(Math.abs(ecart))}</td></tr>`;
    }).join('');
    return genericHeader('Caisses', 'Ouvertures, fermetures et écarts de caisse.', null, '') +
      `<section class="cash-list">${cards}</section>` +
      `<section class="glass-card panel" style="margin-top:14px"><div class="panel-header"><div><h3>Historique des jours passés</h3><p>Les caisses clôturées sont conservées</p></div></div>${history ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Clôturée le</th><th>Boutique</th><th>Ouverture</th><th>Fermeture</th><th>Écart</th></tr></thead><tbody>${history}</tbody></table></div>` : '<div class="empty-state"><strong>Pas encore d’historique</strong><span>Il apparaîtra ici après la première fermeture de caisse.</span></div>'}</section>`;
  }

  function productsView() {
    const visibleProducts = filtered(state.produits).filter(product => matchesSearch(product.nom, 'produits') || matchesSearch(product.categorie, 'produits'));
    const rows = visibleProducts.map(product => {
      const stockLabel = product.stock <= 0 ? '<span class="badge badge-cash">Épuisé</span>' : product.stock < 10 ? `<span class="badge badge-money">Stock faible</span>` : '<span class="badge badge-money">Disponible</span>';
      return `<tr><td><strong>${escapeHtml(product.nom)}</strong></td><td class="muted">${escapeHtml(product.categorie || '—')}</td><td>${escapeHtml(storeName(product.magasin_id))}</td><td><strong>${money(product.prix)}</strong></td><td><strong>${product.stock}</strong> ${stockLabel}</td><td><button class="text-link" data-edit-product="${product.id}">Modifier</button> · <button class="text-link ${product.actif ? 'danger-link' : ''}" data-toggle-product="${product.id}" data-active="${product.actif ? '1' : '0'}">${product.actif ? 'Désactiver' : 'Réactiver'}</button></td></tr>`;
    }).join('');
    return genericHeader('Produits', 'Votre catalogue : prix, catégories et stock par boutique.', 'new-product', 'Nouveau produit') +
      `<section class="glass-card view-card"><div class="filters">${searchInput('produits', 'Rechercher un produit…')}<span class="muted">${visibleProducts.length} produit${visibleProducts.length > 1 ? 's' : ''}</span></div>${visibleProducts.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Produit</th><th>Catégorie</th><th>Boutique</th><th>Prix de vente</th><th>Stock</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>Aucun produit</strong><span>Ajoutez des produits pour les vendre et suivre le stock.</span></div>'}</section>`;
  }

  function teamView() {
    const rows = state.personnel.map(member => `<tr><td><div class="person"><span class="person-avatar">${initials(member.nom)}</span><strong>${escapeHtml(member.nom)}</strong></div></td><td class="muted">${member.role === 'admin' ? 'Administrateur' : 'Vendeur'}</td><td>${escapeHtml(member.telephone)}</td><td class="muted">${escapeHtml(storeName(member.magasin_id))}</td><td><span class="badge ${member.actif ? 'badge-money' : 'badge-cash'}">${member.actif ? 'Actif' : 'Inactif'}</span></td><td><button class="text-link" data-edit-personnel="${member.id}">Modifier</button> · <button class="text-link danger-link" data-deactivate-personnel="${member.id}" data-active="${member.actif ? '1' : '0'}">${member.actif ? 'Désactiver' : 'Réactiver'}</button></td></tr>`).join('');
    return genericHeader('Personnel', 'Les personnes autorisées à enregistrer des opérations.', 'new-team', 'Ajouter une personne') +
      `<section class="glass-card view-card">${state.personnel.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Nom</th><th>Rôle</th><th>Téléphone</th><th>Boutique</th><th>Accès</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty-state"><strong>Aucune personne</strong><span>Ajoutez vos premiers vendeurs pour qu’ils enregistrent des opérations.</span></div>'}</section>`;
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
    periodSales.forEach(sale => { const seller = sale.personnel?.nom || sale.admin_nom || 'Propriétaire'; bySeller[seller] = bySeller[seller] || { ventes: 0, montant: 0 }; bySeller[seller].ventes += 1; bySeller[seller].montant += sale.montant; });
    const sellerRows = Object.entries(bySeller).sort((a, b) => b[1].montant - a[1].montant).map(([nom, stats]) => `<tr><td><strong>${escapeHtml(nom)}</strong></td><td>${stats.ventes}</td><td><strong>${money(stats.montant)}</strong></td></tr>`);
    return `<div class="page-heading"><div><p class="eyebrow">Gestion opérationnelle</p><h1>Rapports</h1><p class="subtle">Détail jour par jour des ventes, dépenses et trésorerie${scope}.</p></div><div class="page-heading-actions">${periodSelector()}<button class="btn btn-light" data-action="export-csv-daily">Exporter CSV ↗</button><button class="btn btn-primary" data-action="print-report">${icon('printer', 14)} Imprimer / PDF</button></div></div>
    <section class="stats-grid">
      <article class="glass-card stat-card"><div class="stat-top"><span>Total des ventes</span><span class="stat-symbol">${icon('trendingUp')}</span></div><h2>${money(periodTotals.sales)}</h2><div class="stat-foot neutral">Sur la période sélectionnée</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>Total des dépenses</span><span class="stat-symbol">${icon('trendingDown')}</span></div><h2>${money(periodTotals.expenses)}</h2><div class="stat-foot neutral">Sur la période sélectionnée</div></article>
      <article class="glass-card stat-card"><div class="stat-top"><span>Résultat net</span><span class="stat-symbol">${icon('wallet')}</span></div><h2 class="${periodTotals.net >= 0 ? 'positive' : 'negative'}">${periodTotals.net >= 0 ? '+ ' : '− '}${money(Math.abs(periodTotals.net))}</h2><div class="stat-foot ${periodTotals.net >= 0 ? '' : 'negative'}">Ventes − dépenses</div></article>
    </section>
    <section class="glass-card panel">
      <div class="panel-header"><div><h3>Ventes, dépenses et résultat par jour</h3><p>Filtré selon la boutique et la période</p></div></div>
      ${reportSnapshotDaily(periodSales, periodExpenses) ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Jour</th><th>Ventes</th><th>Dépenses</th><th>Résultat</th></tr></thead><tbody>${reportSnapshotDaily(periodSales, periodExpenses)}</tbody></table></div>` : '<div class="empty-state"><strong>Aucune donnée</strong>Aucune vente ou dépense enregistrée pour ce filtre.</div>'}
    </section>
    <section class="content-grid" style="margin-top:14px">
      <article class="glass-card panel"><div class="panel-header"><div><h3>Ventes par produit</h3><p>Quantités et montants sur la période</p></div></div>${productRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Produit</th><th>Quantité</th><th>Montant</th></tr></thead><tbody>${productRows}</tbody></table></div>` : '<div class="empty-state"><strong>Aucune vente</strong>Aucun produit vendu sur la période.</div>'}</article>
      <article class="glass-card panel"><div class="panel-header"><div><h3>Ventes par vendeur</h3><p>Performance sur la période</p></div></div>${sellerRows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Vendeur</th><th>Ventes</th><th>Montant</th></tr></thead><tbody>${sellerRows}</tbody></table></div>` : '<div class="empty-state"><strong>Aucune vente</strong>Aucune vente sur la période.</div>'}</article>
    </section>
    <section class="glass-card panel" style="margin-top:14px">
      <div class="panel-header"><div><h3>Historique des caisses</h3><p>Ouvertures et fermetures passées</p></div><button class="text-link" data-action="export-csv-cash">Exporter CSV ↗</button></div>
      ${reportSnapshotCash() || '<div class="empty-state"><strong>Aucun historique de caisse</strong>Ouvrez puis fermez une caisse pour voir son historique ici.</div>'}
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
    return rows ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Clôturée le</th><th>Boutique</th><th>Ouverture</th><th>Solde théorique</th><th>Solde réel</th><th>Écart</th></tr></thead><tbody>${rows}</tbody></table></div>` : null;
  }

  function storeOptions() {
    return state.magasins.map(magasin => `<option value="${magasin.id}">${escapeHtml(magasin.nom)}</option>`).join('');
  }

  function openModal(type, payload = null) {
    if (state.isPersonnel && ['product', 'team', 'magasin', 'settings', 'magasin-rename', 'magasin-delete'].includes(type)) { showToast('Action non autorisée.'); return; }
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    let title = 'Nouvelle entrée';
    let fields = '';
    const save = () => saveModal(type, modal);

    if (type === 'sale') {
      title = 'Enregistrer une vente';
      const storeField = state.isPersonnel ? '' : `<div class="field"><label>Boutique</label><select id="modal-store"><option value="">— Sélectionner —</option>${storeOptions()}</select></div>`;
      const catalogProducts = state.produits.filter(product => product.actif !== false && (state.isPersonnel ? product.magasin_id === state.store || product.magasin_id === null : true));
      const catalogGrid = catalogProducts.length
        ? `<div class="sale-catalog-grid">${catalogProducts.map(product => `<button type="button" class="sale-catalog-item" data-catalog-product="${product.id}"><span class="sale-catalog-name">${escapeHtml(product.nom)}</span><span class="sale-catalog-prix">${money(product.prix)}</span><span class="sale-catalog-stock ${product.stock > 0 ? '' : 'stock-out'}">Stock : ${product.stock}</span></button>`).join('')}</div>`
        : '<p class="subtle">Aucun produit dans le catalogue. Ajoutez-en depuis la vue Produits.</p>';
      fields = `<div class="catalog-check"><input type="checkbox" id="modal-use-catalog" /> <label for="modal-use-catalog">Choisir dans le stock</label></div>
        <div class="catalog-panel hidden" id="catalog-panel"><div class="sale-catalog-search"><input type="text" id="modal-catalog-search" placeholder="Rechercher un produit…" /></div>${catalogGrid}</div>
        <div class="field free-field"><label>Produit (optionnel)</label><input id="modal-product" placeholder="Nom du produit" list="product-list" /><datalist id="product-list">${state.produits.map(product => `<option value="${escapeHtml(product.nom)}">`).join('')}</datalist></div>
        <div class="field"><label>Quantité</label><input id="modal-quantite" type="number" min="1" value="1" /></div><div class="field"><label>Montant total (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" /></div>${storeField}<div class="field"><label>Mode de paiement</label><select id="modal-payment"><option value="liquide">Liquide</option><option value="mobile_money">Mobile money</option></select></div>`;
    } else if (type === 'expense') {
      title = 'Ajouter une dépense';
      const storeField = state.isPersonnel ? '' : `<div class="field"><label>Boutique</label><select id="modal-store">${storeOptions()}</select></div>`;
      fields = `<div class="field"><label>Motif</label><input id="modal-reason" placeholder="Ex. Transport livraison" /></div><div class="field"><label>Montant (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" /></div>${storeField}`;
    } else if (type === 'product') {
      title = 'Ajouter un produit';
      fields = `<div class="field"><label>Nom du produit</label><input id="modal-product" placeholder="Ex. Biscuit" /></div><div class="field"><label>Catégorie</label><input id="modal-categorie" placeholder="Ex. Épicerie" /></div><div class="field"><label>Prix de vente (${escapeHtml(state.entreprise.devise)})</label><input id="modal-price" type="number" placeholder="0" /></div><div class="field"><label>Stock initial</label><input id="modal-stock" type="number" value="0" min="0" /></div><div class="field"><label>Boutique</label><select id="modal-store"><option value="">Toutes les boutiques (produit commun)</option>${storeOptions()}</select></div>`;
    } else if (type === 'product-edit') {
      const product = state.produits.find(item => item.id === payload);
      if (!product) { showToast('Produit introuvable.'); return; }
      title = 'Modifier le produit';
      fields = `<div class="field"><label>Nom du produit</label><input id="modal-product" value="${escapeHtml(product.nom)}" /></div><div class="field"><label>Catégorie</label><input id="modal-categorie" value="${escapeHtml(product.categorie || '')}" placeholder="Ex. Épicerie" /></div><div class="field"><label>Prix de vente (${escapeHtml(state.entreprise.devise)})</label><input id="modal-price" type="number" value="${product.prix}" /></div><div class="field"><label>Stock</label><input id="modal-stock" type="number" value="${product.stock}" min="0" /></div>`;
      modal.dataset.productId = product.id;
    } else if (type === 'team') {
      title = 'Ajouter une personne';
      fields = `<div class="field"><label>Nom complet</label><input id="modal-name" placeholder="Ex. Fatou Diop" /></div><div class="field"><label>Numéro de téléphone</label><input id="modal-phone" type="tel" inputmode="numeric" placeholder="77 000 00 00" /></div><div class="field"><label>Code à 4 chiffres</label><input id="modal-pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" /></div><div class="field"><label>Boutique</label><select id="modal-store">${storeOptions()}</select></div>`;
    } else if (type === 'open-cash' || type === 'close-cash') {
      const isOpen = type === 'open-cash';
      title = isOpen ? 'Ouvrir une caisse' : 'Fermer la caisse';
      const label = isOpen ? 'Montant d’ouverture' : 'Montant en caisse à la fermeture';
      fields = `<div class="field"><label>${label} (${escapeHtml(state.entreprise.devise)})</label><input id="modal-amount" type="number" placeholder="0" /></div>`;
    } else if (type === 'magasin') {
      title = 'Ajouter une boutique';
      fields = `<div class="field"><label>Nom de la boutique</label><input id="modal-store-name" placeholder="Ex. Boutique Ngor" /></div><p class="subtle">La boutique s'ajoute à votre entreprise ${escapeHtml(state.entreprise.nom || '')}. Vous pouvez le renommer plus tard.</p>`;
    } else if (type === 'magasin-rename') {
      const magasin = state.magasins.find(item => item.id === payload);
      if (!magasin) { showToast('Boutique introuvable.'); return; }
      title = 'Renommer la boutique';
      fields = `<div class="field"><label>Nom de la boutique</label><input id="modal-store-name" value="${escapeHtml(magasin.nom)}" /></div>`;
      modal.dataset.storeId = magasin.id;
    } else if (type === 'magasin-delete') {
      const magasin = state.magasins.find(item => item.id === payload);
      if (!magasin) { showToast('Boutique introuvable.'); return; }
      if (state.magasins.length <= 1) { showToast('Impossible de supprimer votre dernière boutique.'); return; }
      title = 'Supprimer la boutique';
      fields = `<p class="subtle" style="grid-column:1/-1">Voulez-vous vraiment supprimer <strong>« ${escapeHtml(magasin.nom)} »</strong> ?<br><br>Ses ventes, dépenses, caisses, produits propres et membres du personnel seront définitivement supprimés. Les produits communs resteront.</p>`;
      modal.dataset.storeId = magasin.id;
    } else if (type === 'settings') {
      title = 'Paramètres';
      const profil = window.solmaCompteSession?.compte || {};
      const settingsFields = state.isPersonnel
        ? `<div class="field"><label>Nom</label><input id="modal-profile-nom" value="${escapeHtml(profil.nom || '')}" /></div>`
        : `<div class="field"><label>Nom</label><input id="modal-profile-nom" value="${escapeHtml(profil.nom || '')}" /></div>
           <div class="field"><label>Email</label><input id="modal-profile-email" type="email" value="${escapeHtml(profil.email || '')}" /></div>
           <div class="field"><label>Entreprise</label><input id="modal-entreprise-nom" value="${escapeHtml(state.entreprise.nom || '')}" /></div>
           <div class="field"><label>Devise</label><input id="modal-entreprise-devise" value="${escapeHtml(state.entreprise.devise || 'FCFA')}" /></div>
           <div class="field"><label>Mot de passe actuel</label><input id="modal-profile-password-actuel" type="password" autocomplete="current-password" placeholder="Pour modifier le mot de passe" /></div>
           <div class="field"><label>Nouveau mot de passe</label><input id="modal-profile-password-nouveau" type="password" autocomplete="new-password" placeholder="8 caractères minimum" /></div>`;
      fields = settingsFields;
    } else if (type === 'team-edit') {
      const member = state.personnel.find(item => item.id === payload);
      if (!member) { showToast('Membre introuvable.'); return; }
      title = 'Modifier la personne';
      fields = `<div class="field"><label>Nom complet</label><input id="modal-name" value="${escapeHtml(member.nom)}" /></div><div class="field"><label>Numéro de téléphone</label><input id="modal-phone" type="tel" inputmode="numeric" placeholder="77 000 00 00" value="${escapeHtml(member.telephone)}" /></div><div class="field"><label>Code à 4 chiffres</label><input id="modal-pin" type="password" inputmode="numeric" maxlength="4" placeholder="•••• (laisser vide pour ne pas changer)" /></div><div class="field"><label>Boutique</label><select id="modal-store">${storeOptions().replace(`value="${member.magasin_id}"`, `value="${member.magasin_id}" selected`)}</select></div>`;
      modal.dataset.personnelId = member.id;
    }
    modal.innerHTML = `<div class="modal glass-card"><button class="modal-close" aria-label="Fermer">${icon('close', 16)}</button><p class="eyebrow">SamaCaisse</p><h2>${title}</h2><p class="subtle">${type === 'magasin-delete' ? 'Cette action est définitive.' : 'Les informations sont enregistrées immédiatement.'}</p><div class="form-grid modal-fields">${fields}</div><div class="form-actions"><button class="btn btn-light modal-cancel">Annuler</button><button class="btn ${type === 'magasin-delete' ? 'btn-danger' : 'btn-primary'} modal-save">${type === 'magasin-delete' ? 'Supprimer' : 'Enregistrer'}</button></div></div>`;
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
    }
    return modal;
  }

  async function saveModal(type, modal) {
    const amount = Number(modal.querySelector('#modal-amount')?.value || 0);
    const required = val => { if (!val) { showToast('Veuillez renseigner tous les champs requis.'); return false; } return true; };
    if (type === 'sale') {
      const rawProductName = modal.querySelector('#modal-product').value.trim();
      const productName = rawProductName || 'Vente';
      const quantite = Number(modal.querySelector('#modal-quantite').value || 1);
      const magId = state.isPersonnel ? state.store : modal.querySelector('#modal-store').value;
      const payment = modal.querySelector('#modal-payment').value;
      if (!magId || amount <= 0 || quantite <= 0) { showToast('Renseignez le montant et la boutique.'); return; }
      const matchedProduct = rawProductName ? state.produits.find(item => item.nom === rawProductName && item.actif !== false && (item.magasin_id === magId || item.magasin_id === null)) : null;
      const { response, payload } = await API('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { produit_id: matchedProduct?.id || null, nom_produit: productName, quantite, montant: amount, mode_paiement: payment, magasin_id: magId } });
      if (!response.ok) { showToast(payload.error || 'Vente impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Vente enregistrée.');
    } else if (type === 'expense') {
      const reason = modal.querySelector('#modal-reason').value.trim();
      const magId = state.isPersonnel ? state.store : modal.querySelector('#modal-store').value;
      if (!required(reason) || amount <= 0 || !magId) { showToast('Renseignez le motif, le montant et la boutique.'); return; }
      const { response, payload } = await API('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { montant: amount, motif: reason, magasin_id: magId } });
      if (!response.ok) { showToast(payload.error || 'Dépense impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Dépense enregistrée.');
    } else if (type === 'product') {
      const name = modal.querySelector('#modal-product').value.trim();
      const categorie = modal.querySelector('#modal-categorie').value.trim();
      const price = Number(modal.querySelector('#modal-price').value || 0);
      const stock = Number(modal.querySelector('#modal-stock').value || 0);
      const magId = modal.querySelector('#modal-store').value || null;
      if (!required(name) || price <= 0) { showToast('Renseignez le nom et le prix.'); return; }
      const { response, payload } = await API('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'create', nom: name, categorie, prix: price, stock, magasin_id: magId, entreprise_id: state.entreprise_id } });
      if (!response.ok) { showToast(payload.error || 'Produit impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Produit ajouté.');
    } else if (type === 'product-edit') {
      const productId = modal.dataset.productId;
      const name = modal.querySelector('#modal-product').value.trim();
      const categorie = modal.querySelector('#modal-categorie').value.trim();
      const price = Number(modal.querySelector('#modal-price').value || 0);
      const stock = Number(modal.querySelector('#modal-stock').value || 0);
      if (!required(name) || price <= 0) { showToast('Renseignez le nom et le prix.'); return; }
      const { response, payload } = await API('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'update', produit_id: productId, nom: name, categorie, prix: price, stock } });
      if (!response.ok) { showToast(payload.error || 'Modification impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Produit modifié.');
    } else if (type === 'team') {
      const name = modal.querySelector('#modal-name').value.trim();
      const phone = modal.querySelector('#modal-phone').value.trim();
      const pin = modal.querySelector('#modal-pin').value.trim();
      const magId = modal.querySelector('#modal-store').value;
      if (!required(name) || !required(phone) || !/^\d{4}$/.test(pin) || !magId) { showToast('Renseignez le nom, le téléphone, le code à 4 chiffres et la boutique.'); return; }
      const { response, payload } = await API('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'create', nom: name, telephone: phone, pin, magasin_id: magId } });
      if (!response.ok) { showToast(payload.error === 'Ce numéro de téléphone est déjà utilisé dans votre entreprise.' ? 'Ce numéro est déjà utilisé.' : (payload.error || 'Création impossible.')); return; }
      modal.remove();
      await loadData();
      showToast('Personne ajoutée.');
    } else if (type === 'open-cash') {
      const magId = modal.dataset.store;
      if (Number.isNaN(amount) || amount < 0) { showToast('Renseignez un montant d’ouverture.'); return; }
      const { response, payload } = await API('/api/cash?magasin_id=' + encodeURIComponent(magId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'open', montant_ouverture: amount } });
      if (!response.ok) { showToast(payload.error || 'Ouverture impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Caisse ouverte.');
    } else if (type === 'close-cash') {
      const magId = modal.dataset.store;
      if (Number.isNaN(amount) || amount < 0) { showToast('Renseignez le montant de fermeture.'); return; }
      const { response, payload } = await API('/api/cash?magasin_id=' + encodeURIComponent(magId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'close', montant_fermeture: amount } });
      if (!response.ok) { showToast(payload.error || 'Fermeture impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Caisse fermée.');
    } else if (type === 'magasin') {
      const nom = modal.querySelector('#modal-store-name').value.trim();
      if (!required(nom)) { showToast('Renseignez le nom de la boutique.'); return; }
      const { response, payload } = await API('/api/magasins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { entreprise_id: state.entreprise_id, nom } });
      if (!response.ok) { showToast(payload.error || 'Création impossible.'); return; }
      modal.remove();
      state.store = payload.magasin.id;
      await loadData();
      showToast('Boutique ajoutée.');
    } else if (type === 'magasin-rename') {
      const storeId = modal.dataset.storeId;
      const nom = modal.querySelector('#modal-store-name').value.trim();
      if (!required(nom)) { showToast('Renseignez le nom de la boutique.'); return; }
      const { response, payload } = await API('/api/magasins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'rename', magasin_id: storeId, nom } });
      if (!response.ok) { showToast(payload.error || 'Renommage impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Boutique renommée.');
    } else if (type === 'magasin-delete') {
      const storeId = modal.dataset.storeId;
      if (!storeId) { showToast('Boutique introuvable.'); return; }
      if (!confirm('Supprimer définitivement cette boutique et toutes ses données ?')) return;
      const { response, payload } = await API('/api/magasins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'delete', magasin_id: storeId } });
      if (!response.ok) { showToast(payload.error || 'Suppression impossible.'); return; }
      modal.remove();
      if (state.store === storeId) state.store = 'all';
      await loadData();
      showToast('Boutique supprimée.');
    } else if (type === 'settings') {
      const nom = modal.querySelector('#modal-profile-nom').value.trim();
      if (!required(nom)) { showToast('Renseignez votre nom.'); return; }
      if (!state.isPersonnel) {
        const entrepriseNom = modal.querySelector('#modal-entreprise-nom').value.trim();
        const devise = modal.querySelector('#modal-entreprise-devise').value.trim();
        if (!required(entrepriseNom) || !required(devise)) { showToast('Renseignez l’entreprise et la devise.'); return; }
        const { response, payload } = await API('/api/entreprise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { entreprise_id: state.entreprise_id, nom: entrepriseNom, devise } });
        if (!response.ok) { showToast(payload.error || 'Entreprise non modifiée.'); return; }
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
      if (!response.ok) { showToast(payload.error || 'Profil non modifié.'); return; }
      window.solmaCompteSession = { ...(window.solmaCompteSession || {}), compte: { ...(window.solmaCompteSession?.compte || {}), ...payload.compte } };
      modal.remove();
      await loadData();
      syncProfileUi();
      showToast('Paramètres enregistrés.');
    } else if (type === 'team-edit') {
      const personnelId = modal.dataset.personnelId;
      const nom = modal.querySelector('#modal-name').value.trim();
      const phone = modal.querySelector('#modal-phone').value.trim();
      const pin = modal.querySelector('#modal-pin').value.trim();
      const magId = modal.querySelector('#modal-store').value;
      if (!required(nom) || !required(phone) || !magId) { showToast('Renseignez le nom, le téléphone et la boutique.'); return; }
      const body = { action: 'update', personnel_id: personnelId, nom, telephone: phone, magasin_id: magId };
      if (pin) {
        if (!/^\d{4}$/.test(pin)) { showToast('Le code doit contenir 4 chiffres.'); return; }
        body.pin = pin;
      }
      const { response, payload } = await API('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!response.ok) { showToast(payload.error || 'Modification impossible.'); return; }
      modal.remove();
      await loadData();
      showToast('Personne modifiée.');
    }
  }

  async function cancelSale(saleId) {
    if (!confirm('Annuler cette vente ? Le stock sera remis à jour.')) return;
    const { response, payload } = await API('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'cancel', sale_id: saleId } });
    if (!response.ok) { showToast(payload.error || 'Annulation impossible.'); return; }
    await loadData();
    showToast('Vente annulée.');
  }
  async function cancelExpense(expenseId) {
    if (!confirm('Annuler cette dépense ?')) return;
    const { response, payload } = await API('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'cancel', expense_id: expenseId } });
    if (!response.ok) { showToast(payload.error || 'Annulation impossible.'); return; }
    await loadData();
    showToast('Dépense annulée.');
  }
  async function toggleProduct(productId, active) {
    if (!confirm(active ? 'Réactiver ce produit ?' : 'Désactiver ce produit ? Il ne pourra plus être vendu.')) return;
    const { response, payload } = await API('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'toggle', produit_id: productId, actif: !active } });
    if (!response.ok) { showToast(payload.error || 'Modification impossible.'); return; }
    await loadData();
    showToast('Produit mis à jour.');
  }

  async function togglePersonnel(personnelId, active) {
    if (!confirm(active ? 'Désactiver cette personne ? Elle ne pourra plus se connecter.' : 'Réactiver cette personne ?')) return;
      const { response, payload } = await API('/api/personnel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { action: 'toggle', personnel_id: personnelId, actif: !active } });
    if (!response.ok) { showToast(payload.error || 'Modification impossible.'); return; }
    await loadData();
    showToast('Accès mis à jour.');
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
    document.querySelectorAll('[data-period]').forEach(button => button.onclick = () => { state.period = button.dataset.period; render(); });
    document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => {
      const action = button.dataset.action;
      if (action === 'retry') loadData();
      if (action === 'new-sale') openModal('sale');
      if (action === 'new-expense') openModal('expense');
      if (action === 'new-product') openModal('product');
      if (action === 'new-team') openModal('team');
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
    document.querySelectorAll('[data-edit-product]').forEach(button => button.onclick = () => openModal('product-edit', button.dataset.editProduct));
    document.querySelectorAll('[data-toggle-product]').forEach(button => button.onclick = () => toggleProduct(button.dataset.toggleProduct, button.dataset.active === '1'));
    document.querySelectorAll('[data-deactivate-personnel]').forEach(button => button.onclick = () => togglePersonnel(button.dataset.deactivatePersonnel, button.dataset.active === '1'));
    document.querySelectorAll('[data-edit-personnel]').forEach(button => button.onclick = () => openModal('team-edit', button.dataset.editPersonnel));
  }

  function render() {
    const views = { dashboard: dashboardView, sales: salesView, cash: cashView, expenses: expensesView, products: productsView, team: teamView, reports: reportsView };
    if (state.currentView === 'products' && state.isPersonnel) state.currentView = 'dashboard';
    if (state.currentView === 'team' && state.isPersonnel) state.currentView = 'dashboard';
    if (state.currentView === 'reports' && state.isPersonnel) state.currentView = 'dashboard';
    page.innerHTML = views[state.currentView]();
    document.querySelector('#breadcrumb-current').textContent = pageTitle();
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === state.currentView));
    bindViewEvents();
    setupStoreSelector();
    animateCounts();
  }

  function setupStoreSelector() {
    const container = document.querySelector('#store-selector-custom');
    const label = document.querySelector('#store-selector-label');
    const trigger = document.querySelector('#store-selector-trigger');
    const menu = document.querySelector('#store-selector-menu');
    if (state.isPersonnel) {
      container.classList.add('hidden');
      label.textContent = state.magasins.find(magasin => magasin.id === state.store)?.nom || 'Ma boutique';
      state.store = state.magasins.find(magasin => magasin.id === state.store)?.id || (state.magasins[0]?.id || 'all');
      return;
    }
    container.classList.remove('hidden');
    menu.innerHTML = `<button type="button" class="store-selector-option ${state.store === 'all' ? 'active' : ''}" data-store-value="all" role="option">Toutes les boutiques</button>` + state.magasins.map(magasin => `<button type="button" class="store-selector-option ${state.store === magasin.id ? 'active' : ''}" data-store-value="${magasin.id}" role="option">${escapeHtml(magasin.nom)}${state.magasins.length > 1 ? `<span class="store-selector-rename" data-store-rename="${magasin.id}" aria-label="Renommer ${escapeHtml(magasin.nom)}" title="Renommer">✎</span><span class="store-selector-delete" data-store-delete="${magasin.id}" aria-label="Supprimer ${escapeHtml(magasin.nom)}" title="Supprimer">🗑</span>` : ''}</button>`).join('') + `<button type="button" class="store-selector-option store-selector-add" data-store-new role="option">${icon('plus', 13)} Nouvelle boutique</button>`;
    const currentLabel = state.store === 'all' ? 'Toutes les boutiques' : state.magasins.find(magasin => magasin.id === state.store)?.nom || 'Toutes les boutiques';
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

  if (window.solmaPersonnelSession?.token) {
    init();
  }

  /* ==========================================================================
     VISITE GUIDÉE — obligatoire à la première session, relançable à tout moment
     ========================================================================== */
  const TOUR_KEY = 'samacaisse_tour_v1';
  const TOUR_STEPS = [
    { title: 'Bienvenue sur SamaCaisse', text: 'Voici un tour rapide : en une minute, vous saurez où tout se trouve.', sel: null },
    { title: 'Le menu', text: 'Touchez ici pour ouvrir le menu : ventes, caisses, dépenses, produits, personnel et rapports.', sel: '#mobile-menu' },
    { title: 'Vos boutiques', text: 'Choisissez une boutique ou « Toutes les boutiques » : tout le tableau de bord suit ce choix.', sel: '#store-selector-custom' },
    { title: 'Nouvelle vente', text: 'Le bouton le plus important : enregistrez une vente en renseignant juste le montant.', sel: '[data-action="new-sale"]' },
    { title: 'La période', text: 'Aujourd’hui, 7 jours, 30 jours ou tout : tous les chiffres suivent la période choisie.', sel: '[data-period-switch]' },
    { title: 'Vos chiffres', text: 'Ventes, transactions, dépenses et caisse attendue : l’essentiel en un coup d’œil.', sel: '.stats-grid' }
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
    tip.innerHTML = `<span class="tour-count">${index + 1} / ${tourSteps.length}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p><div class="tour-tip-actions"><button type="button" class="btn btn-light" data-tour="skip">Passer</button><button type="button" class="btn btn-primary" data-tour="next">${last ? 'Terminer' : 'Suivant'}</button></div>`;
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