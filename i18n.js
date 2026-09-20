/*
 * i18n.js — Sélecteur de langue Français / Wolof pour SamaCaisse.
 *
 * IMPORTANT — à lire avant de publier :
 * Chaque entrée wolof ci-dessous est notée avec un niveau de confiance :
 *   [sûr]     mot attesté dans plusieurs dictionnaires wolof-français fiables
 *   [prudent] construction raisonnable à partir de mots attestés, mais pas
 *             une expression figée trouvée telle quelle — à faire relire
 *   [fr]      laissé volontairement en français : soit il s'agit d'un terme
 *             administratif/technique moderne qui n'a pas d'équivalent wolof
 *             standard (compte, rapport, mot de passe...), soit c'est un mot
 *             que les locuteurs wolof utilisent eux-mêmes tel quel au
 *             quotidien (caisse, personnel...)
 *
 * Avant de considérer ce fichier comme définitif, fais-le relire par une
 * personne qui parle et lit couramment le wolof — surtout les entrées
 * [prudent]. Une traduction correcte n'a pas de prix quand elle doit guider
 * quelqu'un qui ne peut pas se rattraper en lisant le français à côté.
 */

(() => {
  const STORAGE_KEY = 'samacaisse_lang';

  const dict = {
    // Navigation (sidebar)
    nav_dashboard: { fr: 'Tableau de bord', wo: 'Tableau de bord' }, // [fr] pas d'équivalent standard
    nav_sales: { fr: 'Ventes', wo: 'Jaay' }, // [sûr] jaay = vendre/vente
    nav_cash: { fr: 'Caisses', wo: 'Kayse yi' }, // [fr/prudent] "caisse" utilisé tel quel par les commerçants
    nav_expenses: { fr: 'Dépenses', wo: 'Dépenses' }, // [fr] pas de mot sourcé trouvé
    nav_overview: { fr: "Vue d'ensemble", wo: 'Ci lu bare' }, // [prudent] "en général"
    nav_management: { fr: 'Gestion', wo: 'Jëf yi' }, // [prudent] "les actions/opérations"
    nav_products: { fr: 'Produits', wo: 'Marsandiz' }, // [prudent] emprunt courant de "marchandise"
    nav_team: { fr: 'Personnel', wo: 'Personnel' }, // [fr] utilisé tel quel au Sénégal
    nav_reports: { fr: 'Rapports', wo: 'Rapports' }, // [fr] terme administratif, pas d'équivalent standard
    nav_logout: { fr: 'Se déconnecter', wo: 'Génn' }, // [prudent] génn = sortir
    nav_about: { fr: 'À propos', wo: 'Ñan lanu' }, // [prudent] "qui sommes-nous"

    // Écran de connexion
    auth_owner_tab: { fr: 'Propriétaire', wo: 'Boroom bitik' }, // [sûr-ish] "propriétaire de boutique"
    auth_staff_tab: { fr: 'Personnel', wo: 'Liggéeykat yi' },
    auth_welcome_title: { fr: 'Bienvenue dans votre espace.', wo: 'Dalal ak jàmm.' }, // [sûr] formule d'accueil très répandue
    auth_welcome_intro: { fr: 'Connectez-vous pour gérer vos boutiques.', wo: 'Dugg ngir jëfandikoo say bitik.' }, // [prudent]
    auth_create_title: { fr: 'Créez votre espace.', wo: 'Sos sa palas.' }, // [prudent] sos = créer/fonder ; palas = emprunt "place/espace"
    auth_create_intro: { fr: 'Renseignez vos informations pour commencer.', wo: 'Joxe say xibaar ngir tambali.' }, // [prudent]
    auth_email: { fr: 'Adresse email', wo: 'Adress email' }, // [fr] emprunt courant
    auth_password: { fr: 'Mot de passe', wo: 'Mot de passe' }, // [fr] terme technique sans équivalent standard
    auth_confirm_password: { fr: 'Confirmer le mot de passe', wo: 'Waxtaanal mot de passe bi' }, // [prudent]
    auth_name: { fr: 'Votre nom', wo: 'Sa tur' }, // [sûr] tur = nom
    auth_phone: { fr: 'Numéro de téléphone', wo: 'Numero telefon' }, // [fr] emprunt phonétique, usage courant
    auth_pin: { fr: 'Code à 4 chiffres', wo: 'Kod bu 4 xarale' }, // [prudent]
    auth_login_button: { fr: 'Se connecter', wo: 'Dugg' }, // [prudent] dugg = entrer
    auth_open_session: { fr: 'Ouvrir ma session', wo: 'Dugg' }, // [prudent]
    auth_new_here: { fr: 'Nouveau sur SamaCaisse ?', wo: 'Bees nga ci SamaCaisse ?' }, // [prudent] bees = nouveau
    auth_create_button: { fr: 'Créer mon espace', wo: 'Sos sama palas' }, // [prudent]
    auth_already_account: { fr: "J'ai déjà un compte", wo: 'Am naa ab compte' }, // [fr/prudent] "compte" gardé tel quel

    // Boutique / topbar
    store_all: { fr: 'Toutes les boutiques', wo: 'Bitik yépp' }, // [sûr] bitik = boutique, yépp = tous
    store_new: { fr: 'Nouvelle boutique', wo: 'Bitik bu bees' }, // [sûr] bu bees = nouveau/nouvelle

    // Footer
    footer_tagline: {
      fr: 'La gestion commerciale simple, pensée pour les commerçants : ventes, caisse, stock et dépenses depuis un téléphone.',
      wo: 'Jëfandikoo sa bitik ci lu yomb : jaay, kayse, marsandiz ak dépenses ci sa telefon.' // [prudent]
    },

    // Actions communes
    common_add: { fr: 'Ajouter', wo: 'Yokk' }, // [sûr] yokk = ajouter/augmenter
    common_edit: { fr: 'Modifier', wo: 'Soppi' }, // [sûr] soppi = changer/modifier
    common_delete: { fr: 'Supprimer', wo: 'Far' }, // [prudent]
    common_cancel: { fr: 'Annuler', wo: 'Bàyyi' }, // [sûr] bàyyi = laisser/abandonner
    common_save: { fr: 'Enregistrer', wo: 'Bind' }, // [prudent] bind = écrire/noter
    common_close: { fr: 'Fermer', wo: 'Tëj' }, // [sûr] tëj = fermer
    common_new_sale: { fr: 'Nouvelle vente', wo: 'Jaay bu bees' },
    app_hello: { fr: 'Bonjour', wo: 'Salaamalekum' },
    app_dash_happening: { fr: 'Voici ce qui se passe aujourd’hui' },
    app_dash_sales_day: { fr: 'Ventes du jour' },
    app_dash_sales_period: { fr: 'Ventes de la période' },
    app_dash_vs_yesterday: { fr: 'vs. hier', wo: 'vs. demb' },
    app_dash_today_full: { fr: 'Aujourd’hui' },
    app_dash_new: { fr: 'Nouveau', wo: 'Bees' },
    app_dash_transactions: { fr: 'Transactions' },
    app_dash_trans_today: { fr: 'Ventes enregistrées aujourd’hui' },
    app_dash_expenses: { fr: 'Dépenses du jour' },
    app_dash_expense_unit: { fr: 'dépense' },
    app_dash_today_word: { fr: 'aujourd’hui', wo: 'tey' },
    app_dash_cash: { fr: 'Caisse attendue' },
    app_dash_cash_open: { fr: 'Caisse ouverte' },
    app_dash_cash_none: { fr: 'Caisse non ouverte' },
    app_dash_perf: { fr: 'Performance des ventes' },
    app_dash_perf_sub: { fr: 'Chiffre d’affaires des 7 derniers jours' },
    app_dash_see_report: { fr: 'Voir le rapport ↗', wo: 'Gis rapport bi' },
    app_dash_cash_state: { fr: 'État des caisses' },
    app_dash_cash_sub: { fr: 'Suivi en temps réel' },
    app_dash_see_all: { fr: 'Tout voir', wo: 'Gis yëpp' },
    app_dash_opened_at: { fr: 'Ouverte à ' },
    app_dash_open: { fr: 'Ouverte', wo: 'Ubbi' },
    app_dash_closed: { fr: 'Fermée', wo: 'Tëj' },
    app_dash_ongoing: { fr: 'En cours' },
    app_dash_no_cash: { fr: 'Aucune caisse' },
    app_dash_no_cash_sub: { fr: 'Ouvrez une caisse pour commencer le suivi.' },
    app_dash_latest: { fr: 'Dernières transactions' },
    app_dash_latest_sub: { fr: 'Les ventes les plus récentes' },
    app_dash_all_sales: { fr: 'Voir toutes les ventes ↗', wo: 'Gis jaay yëpp' },
    app_dash_loading: { fr: 'Chargement des données…' },
    app_dash_loading_sub: { fr: 'Connexion en cours.' },
    app_dash_error: { fr: 'Impossible de charger vos données.' },
    app_retry: { fr: 'Réessayer' },
    app_chart_total: { fr: 'Total des ventes' },
    app_th_product: { fr: 'Produit' },
    app_th_seller: { fr: 'Vendeur', wo: 'Jaaykat' },
    app_th_store: { fr: 'Boutique', wo: 'Bitik' },
    app_th_payment: { fr: 'Paiement' },
    app_th_amount: { fr: 'Montant' },
    app_th_datetime: { fr: 'Date et heure' },
    app_th_action: { fr: 'Action' },
    app_th_reason: { fr: 'Motif' },
    app_th_added_by: { fr: 'Ajoutée par' },
    app_th_date: { fr: 'Date' },
    app_th_category: { fr: 'Catégorie' },
    app_th_price: { fr: 'Prix de vente', wo: 'Niata' },
    app_th_stock: { fr: 'Stock' },
    app_th_name: { fr: 'Nom', wo: 'Tur' },
    app_th_role: { fr: 'Rôle' },
    app_th_phone: { fr: 'Téléphone' },
    app_th_access: { fr: 'Accès' },
    app_th_day: { fr: 'Jour' },
    app_th_sales: { fr: 'Ventes', wo: 'Jaay' },
    app_th_expenses: { fr: 'Dépenses' },
    app_th_result: { fr: 'Résultat' },
    app_th_quantity: { fr: 'Quantité' },
    app_th_closed_at: { fr: 'Clôturée le' },
    app_th_opening: { fr: 'Ouverture' },
    app_th_closing: { fr: 'Fermeture' },
    app_th_gap: { fr: 'Écart' },
    app_th_theoretical: { fr: 'Solde théorique' },
    app_th_real: { fr: 'Solde réel' },
    app_pay_cash: { fr: 'Liquide' },
    app_pay_mobile: { fr: 'Mobile money' },
    app_owner: { fr: 'Propriétaire' },
    app_cancelled: { fr: 'Annulée' },
    app_cancel: { fr: 'Annuler', wo: 'Bàyyi' },
    app_no_sales: { fr: 'Aucune vente' },
    app_no_sales_sub: { fr: 'Les ventes enregistrées apparaîtront ici.' },
    app_search_product: { fr: 'Rechercher un produit…' },
    app_search_reason: { fr: 'Rechercher un motif…' },
    app_unit_sale: { fr: 'vente', wo: 'jaay' },
    app_unit_expense: { fr: 'dépense' },
    app_export_csv: { fr: 'Exporter CSV ↗' },
    app_view_sales_title: { fr: 'Ventes', wo: 'Jaay' },
    app_view_sales_sub_owner: { fr: 'Toutes les ventes enregistrées dans vos boutiques.' },
    app_view_sales_sub_staff: { fr: 'Les ventes enregistrées dans votre boutique.' },
    app_view_exp_title: { fr: 'Dépenses' },
    app_view_exp_sub: { fr: 'Gardez une trace claire des sorties.' },
    app_add_expense: { fr: 'Ajouter une dépense' },
    app_no_expense: { fr: 'Aucune dépense' },
    app_no_expense_sub: { fr: 'Les dépenses ajoutées apparaîtront ici.' },
    app_view_cash_title: { fr: 'Caisses', wo: 'Kayse yi' },
    app_view_cash_sub: { fr: 'Ouvertures, fermetures et écarts de caisse.' },
    app_cash_card: { fr: 'Caisse' },
    app_cash_opening: { fr: 'Montant d’ouverture' },
    app_cash_expected: { fr: 'Montant attendu' },
    app_cash_open_btn: { fr: 'Ouvrir la caisse', wo: 'Ubbi kayse bi' },
    app_cash_close_btn: { fr: 'Fermer la caisse', wo: 'Tëj kayse bi' },
    app_cash_history: { fr: 'Historique des jours passés' },
    app_cash_history_sub: { fr: 'Les caisses clôturées sont conservées' },
    app_cash_no_history: { fr: 'Pas encore d’historique' },
    app_cash_no_history_sub: { fr: 'Il apparaîtra ici après la première fermeture de caisse.' },
    app_view_prod_title: { fr: 'Produits', wo: 'Marsandiz' },
    app_view_prod_sub: { fr: 'Votre catalogue : prix, catégories et stock par boutique.' },
    app_new_product: { fr: 'Nouveau produit' },
    app_stock_empty: { fr: 'Épuisé' },
    app_stock_low: { fr: 'Stock faible' },
    app_stock_ok: { fr: 'Disponible' },
    app_prod_edit: { fr: 'Modifier', wo: 'Soppi' },
    app_prod_deactivate: { fr: 'Désactiver' },
    app_prod_reactivate: { fr: 'Réactiver' },
    app_no_product: { fr: 'Aucun produit' },
    app_no_product_sub: { fr: 'Ajoutez des produits pour les vendre et suivre le stock.' },
    app_unit_product: { fr: 'produit' },
    app_view_team_title: { fr: 'Personnel' },
    app_view_team_sub: { fr: 'Les personnes autorisées à enregistrer des opérations.' },
    app_add_person: { fr: 'Ajouter une personne' },
    app_role_admin: { fr: 'Administrateur' },
    app_role_seller: { fr: 'Vendeur', wo: 'Jaaykat' },
    app_access_on: { fr: 'Actif' },
    app_access_off: { fr: 'Inactif' },
    app_no_member: { fr: 'Aucune personne' },
    app_no_member_sub: { fr: 'Ajoutez vos premiers vendeurs pour qu’ils enregistrent des opérations.' },
    app_view_rep_title: { fr: 'Rapports' },
    app_view_rep_sub: { fr: 'Détail jour par jour des ventes, dépenses et trésorerie' },
    app_print: { fr: 'Imprimer / PDF' },
    app_rep_total_sales: { fr: 'Total des ventes' },
    app_rep_total_exp: { fr: 'Total des dépenses' },
    app_rep_net: { fr: 'Résultat net' },
    app_rep_period: { fr: 'Sur la période sélectionnée' },
    app_rep_sales_expenses: { fr: 'Ventes − dépenses' },
    app_rep_daily: { fr: 'Ventes, dépenses et résultat par jour' },
    app_rep_daily_sub: { fr: 'Filtré selon la boutique et la période' },
    app_rep_no_data: { fr: 'Aucune donnée' },
    app_rep_no_data_sub: { fr: 'Aucune vente ou dépense enregistrée pour ce filtre.' },
    app_rep_by_product: { fr: 'Ventes par produit' },
    app_rep_by_product_sub: { fr: 'Quantités et montants sur la période' },
    app_rep_by_seller: { fr: 'Ventes par vendeur', wo: 'Jaaykat yi' },
    app_rep_by_seller_sub: { fr: 'Performance sur la période' },
    app_rep_no_period_sale: { fr: 'Aucune vente sur la période.' },
    app_rep_no_product_sale: { fr: 'Aucun produit vendu sur la période.' },
    app_rep_cash_hist: { fr: 'Historique des caisses' },
    app_rep_cash_hist_sub: { fr: 'Ouvertures et fermetures passées' },
    app_rep_no_cash: { fr: 'Aucun historique de caisse' },
    app_rep_no_cash_sub: { fr: 'Ouvrez puis fermez une caisse pour voir son historique ici.' },
    app_period_today: { fr: "Aujourd'hui", wo: 'Tey' }, // Glosbe dict
    app_period_7d: { fr: '7 jours' },
    app_period_30d: { fr: '30 jours' },
    app_period_all: { fr: 'Tout', wo: 'Yépp' },
    app_period_map_7d: { fr: '7 derniers jours' },
    app_period_map_30d: { fr: '30 derniers jours' },
    app_modal_sale: { fr: 'Enregistrer une vente' },
    app_modal_store_ph: { fr: '— Sélectionner —' },
    app_modal_no_catalog: { fr: 'Aucun produit dans le catalogue. Ajoutez-en depuis la vue Produits.' },
    app_modal_use_catalog: { fr: 'Choisir dans le stock' },
    app_modal_search_product: { fr: 'Rechercher un produit…' },
    app_modal_product_opt: { fr: 'Produit (optionnel)' },
    app_modal_product_ph: { fr: 'Nom du produit' },
    app_modal_qty: { fr: 'Quantité' },
    app_modal_amount: { fr: 'Montant total' },
    app_modal_payment: { fr: 'Mode de paiement' },
    app_modal_expense: { fr: 'Ajouter une dépense' },
    app_modal_reason: { fr: 'Motif' },
    app_modal_reason_ph: { fr: 'Ex. Transport livraison' },
    app_modal_add_product: { fr: 'Ajouter un produit' },
    app_modal_prod_name: { fr: 'Nom du produit' },
    app_modal_prod_name_ph: { fr: 'Ex. Biscuit' },
    app_modal_category: { fr: 'Catégorie' },
    app_modal_category_ph: { fr: 'Ex. Épicerie' },
    app_modal_price: { fr: 'Prix de vente' },
    app_modal_stock_init: { fr: 'Stock initial' },
    app_modal_store_common: { fr: 'Toutes les boutiques (produit commun)' },
    app_modal_edit_product: { fr: 'Modifier le produit' },
    app_modal_stock: { fr: 'Stock' },
    app_modal_add_person: { fr: 'Ajouter une personne' },
    app_modal_fullname: { fr: 'Nom complet' },
    app_modal_fullname_ph: { fr: 'Ex. Fatou Diop' },
    app_modal_phone: { fr: 'Numéro de téléphone' },
    app_modal_phone_ph: { fr: '77 000 00 00' },
    app_modal_pin: { fr: 'Code à 4 chiffres', wo: 'Kod bu 4 xarale' },
    app_modal_open_cash: { fr: 'Ouvrir une caisse', wo: 'Ubbi kayse bi' },
    app_modal_close_cash: { fr: 'Fermer la caisse', wo: 'Tëj kayse bi' },
    app_modal_open_amount: { fr: 'Montant d’ouverture' },
    app_modal_close_amount: { fr: 'Montant en caisse à la fermeture' },
    app_modal_add_store: { fr: 'Ajouter une boutique', wo: 'Yokk bitik' },
    app_modal_store_name: { fr: 'Nom de la boutique', wo: 'Turu bitik bi' },
    app_modal_store_name_ph: { fr: 'Ex. Boutique Ngor' },
    app_modal_store_added_sub: { fr: "La boutique s'ajoute à votre entreprise" },
    app_modal_store_rename_later: { fr: 'Vous pouvez le renommer plus tard.' },
    app_modal_rename_store: { fr: 'Renommer la boutique' },
    app_modal_delete_store: { fr: 'Supprimer la boutique', wo: 'Far bitik' },
    app_modal_delete_confirm: { fr: 'Voulez-vous vraiment supprimer' },
    app_modal_delete_cascade: { fr: 'Ses ventes, dépenses, caisses, produits propres et membres du personnel seront définitivement supprimés. Les produits communs resteront.' },
    app_modal_close_btn: { fr: 'Fermer', wo: 'Tëj' },
    app_modal_delete_warn: { fr: 'Cette action est définitive.' },
    app_modal_saved_live: { fr: 'Les informations sont enregistrées immédiatement.' },
    app_modal_settings: { fr: 'Paramètres' },
    app_modal_profile_name: { fr: 'Nom', wo: 'Tur' },
    app_modal_profile_email: { fr: 'Email' },
    app_modal_company: { fr: 'Entreprise' },
    app_modal_currency: { fr: 'Devise' },
    app_modal_current_pw: { fr: 'Mot de passe actuel' },
    app_modal_current_pw_ph: { fr: 'Pour modifier le mot de passe' },
    app_modal_new_pw: { fr: 'Nouveau mot de passe' },
    app_modal_new_pw_ph: { fr: '8 caractères minimum' },
    app_modal_edit_person: { fr: 'Modifier la personne' },
    app_modal_pin_keep: { fr: '•••• (laisser vide pour ne pas changer)' },
    app_btn_cancel: { fr: 'Annuler', wo: 'Bàyyi' },
    app_btn_save: { fr: 'Enregistrer', wo: 'Bind' },
    app_btn_delete: { fr: 'Supprimer', wo: 'Far' },
    app_toast_required: { fr: 'Veuillez renseigner tous les champs requis.' },
    app_toast_sale_need: { fr: 'Renseignez le montant et la boutique.' },
    app_toast_sale_ok: { fr: 'Vente enregistrée.', wo: 'Jaay bi bind na' },
    app_toast_sale_ko: { fr: 'Vente impossible.' },
    app_toast_exp_need: { fr: 'Renseignez le motif, le montant et la boutique.' },
    app_toast_exp_ok: { fr: 'Dépense enregistrée.' },
    app_toast_exp_ko: { fr: 'Dépense impossible.' },
    app_toast_prod_need: { fr: 'Renseignez le nom et le prix.' },
    app_toast_prod_ok: { fr: 'Produit ajouté.', wo: 'Marsandiz bi yokk na' },
    app_toast_prod_ko: { fr: 'Produit impossible.' },
    app_toast_prod_upd: { fr: 'Produit modifié.' },
    app_toast_team_need: { fr: 'Renseignez le nom, le téléphone, le code à 4 chiffres et la boutique.' },
    app_toast_team_dup: { fr: 'Ce numéro est déjà utilisé.' },
    app_toast_team_ko: { fr: 'Création impossible.' },
    app_toast_team_ok: { fr: 'Personne ajoutée.' },
    app_toast_cash_open_need: { fr: 'Renseignez un montant d’ouverture.' },
    app_toast_cash_open_ok: { fr: 'Caisse ouverte.' },
    app_toast_cash_open_ko: { fr: 'Ouverture impossible.' },
    app_toast_cash_close_need: { fr: 'Renseignez le montant de fermeture.' },
    app_toast_cash_close_ok: { fr: 'Caisse fermée.', wo: 'Kayse bi tëj na' },
    app_toast_cash_close_ko: { fr: 'Fermeture impossible.' },
    app_toast_store_need: { fr: 'Renseignez le nom de la boutique.' },
    app_toast_store_ko: { fr: 'Création impossible.' },
    app_toast_store_ok: { fr: 'Boutique ajoutée.', wo: 'Bitik bi yokk na' },
    app_toast_store_ren_ko: { fr: 'Renommage impossible.' },
    app_toast_store_ren_ok: { fr: 'Boutique renommée.' },
    app_toast_store_del_ko: { fr: 'Suppression impossible.' },
    app_toast_store_del_ok: { fr: 'Boutique supprimée.', wo: 'Bitik bi far na' },
    app_toast_profile_need: { fr: 'Renseignez votre nom.' },
    app_toast_company_need: { fr: 'Renseignez l’entreprise et la devise.' },
    app_toast_company_ko: { fr: 'Entreprise non modifiée.' },
    app_toast_profile_ko: { fr: 'Profil non modifié.' },
    app_toast_settings_ok: { fr: 'Paramètres enregistrés.' },
    app_toast_member_need: { fr: 'Renseignez le nom, le téléphone et la boutique.' },
    app_toast_pin4: { fr: 'Le code doit contenir 4 chiffres.' },
    app_toast_member_ko: { fr: 'Modification impossible.' },
    app_toast_member_ok: { fr: 'Personne modifiée.' },
    app_toast_product_gone: { fr: 'Produit introuvable.' },
    app_toast_store_gone: { fr: 'Boutique introuvable.' },
    app_toast_member_gone: { fr: 'Membre introuvable.' },
    app_toast_last_store: { fr: 'Impossible de supprimer votre dernière boutique.' },
    app_toast_toggle_prod: { fr: 'Produit mis à jour.' },
    app_toast_toggle_member: { fr: 'Accès mis à jour.' },
    app_toast_forbidden: { fr: 'Action non autorisée.' },
    app_confirm_sale: { fr: 'Annuler cette vente ? Le stock sera remis à jour.' },
    app_confirm_expense: { fr: 'Annuler cette dépense ?' },
    app_confirm_prod_off: { fr: 'Désactiver ce produit ? Il ne pourra plus être vendu.' },
    app_confirm_prod_on: { fr: 'Réactiver ce produit ?' },
    app_confirm_member_off: { fr: 'Désactiver cette personne ? Elle ne pourra plus se connecter.' },
    app_confirm_member_on: { fr: 'Réactiver cette personne ?' },
    app_confirm_store_del: { fr: 'Supprimer définitivement cette boutique et toutes ses données ?' },
    app_toast_sale_cancelled: { fr: 'Vente annulée.', wo: 'Jaay bi bàyyi na' },
    app_toast_sale_cancel_ko: { fr: 'Annulation impossible.' },
    app_toast_exp_cancelled: { fr: 'Dépense annulée.' },
    app_toast_exp_cancel_ko: { fr: 'Annulation impossible.' },
    app_eyebrow_ops: { fr: 'Gestion opérationnelle' },
    app_profile_owner: { fr: 'Compte propriétaire' },
    app_role_owner: { fr: 'Propriétaire' },
    app_your_store: { fr: 'Votre boutique', wo: 'Sa bitik' },
    app_my_store: { fr: 'Ma boutique', wo: 'Sama bitik' },
    app_tour_welcome_t: { fr: 'Bienvenue sur SamaCaisse', wo: 'Dalal ak jàmm ci SamaCaisse' },
    app_tour_welcome_x: { fr: 'Voici un tour rapide : en une minute, vous saurez où tout se trouve.' },
    app_tour_menu_t: { fr: 'Le menu' },
    app_tour_menu_x: { fr: 'Touchez ici pour ouvrir le menu : ventes, caisses, dépenses, produits, personnel et rapports.' },
    app_tour_store_t: { fr: 'Vos boutiques', wo: 'Seen bitik' },
    app_tour_store_x: { fr: 'Choisissez une boutique ou « Toutes les boutiques » : tout le tableau de bord suit ce choix.' },
    app_tour_sale_t: { fr: 'Nouvelle vente', wo: 'Jaay bu bees' },
    app_tour_sale_x: { fr: 'Le bouton le plus important : enregistrez une vente en renseignant juste le montant.' },
    app_tour_period_t: { fr: 'La période' },
    app_tour_period_x: { fr: 'Aujourd’hui, 7 jours, 30 jours ou tout : tous les chiffres suivent la période choisie.' },
    app_tour_kpi_t: { fr: 'Vos chiffres' },
    app_tour_kpi_x: { fr: 'Ventes, transactions, dépenses et caisse attendue : l’essentiel en un coup d’œil.' },
    app_tour_skip: { fr: 'Passer', wo: 'Bàyyi' },
    app_tour_next: { fr: 'Suivant' },
    app_tour_done: { fr: 'Terminer' },
    app_print_title: { fr: 'Rapport de gestion' },
    app_print_gen: { fr: 'Généré le' },
    app_print_total: { fr: 'Total de la période' },
    app_print_net: { fr: 'Résultat net' },
    app_print_best: { fr: 'Meilleurs produits' },
    app_print_best_amount: { fr: 'Montant vendu' },
    app_print_daily: { fr: 'Jour par jour' },
    app_print_cash: { fr: 'Historique des caisses' },
    app_print_none: { fr: 'Aucune vente ou dépense enregistrée.' },
    app_print_no_cash: { fr: 'Aucune caisse clôturée.' },
    app_modal_default: { fr: 'Nouvelle entrée' }, // [sûr]
  };

  const getLang = () => {
    try { return localStorage.getItem(STORAGE_KEY) === 'wo' ? 'wo' : 'fr'; }
    catch { return 'fr'; }
  };

  const setLang = lang => {
    try { localStorage.setItem(STORAGE_KEY, lang === 'wo' ? 'wo' : 'fr'); } catch {}
    applyTranslations();
    window.dispatchEvent(new CustomEvent('samacaisse-lang-changed'));
    document.querySelectorAll('[data-lang-switch]').forEach(button => {
      button.classList.toggle('active', button.dataset.langSwitch === getLang());
    });
  };

  const t = key => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[getLang()] || entry.fr;
  };

  const applyTranslations = () => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
    });
  };

  window.SamaCaisseI18n = { t, setLang, getLang, applyTranslations };

  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    document.querySelectorAll('[data-lang-switch]').forEach(button => {
      button.classList.toggle('active', button.dataset.langSwitch === getLang());
      button.addEventListener('click', () => setLang(button.dataset.langSwitch));
    });
  });
})();
