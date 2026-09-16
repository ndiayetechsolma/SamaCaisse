# MÉMOIRE PROJET — SamaCaisse

> **À lire intégralement au début de CHAQUE session, avant toute action.**
> Ce fichier est la mémoire persistante du projet : architecture, bugs traités, état d'avancement et préférences de l'utilisateur. Complète-le au fil des sessions.

---

## 1. Identité & accès

- **App** : SamaCaisse — gestion commerciale multi-magasins pour commerçants au **Sénégal** (devise FCFA, interface en français, mobile-first).
- **Dossier local** : `C:\Users\Ablaye Ndiaye\Desktop\SamaCaisse`
- **Production** : https://samacaisse-com.vercel.app (alias Vercel)
- **Git remote** : github.com/ndiayetechsolma/SamaCaisse (branche `main`)
- **Déploiement** : `git push origin main` (déclenche l'auto-deploy Vercel) OU `vercel --prod --yes` depuis le dossier local.
- Système : Windows / PowerShell 5.1 sur poste de l'utilisateur.

## 2. Stack technique

- **100% natif** : `index.html` + `styles.css` + `app.js` + `auth.js` (+ `config.js` optionnel). Aucun framework JS, aucun bundler, aucun React.
- **Backend** : Vercel Serverless Functions dans `api/*.js`.
- **Base de données** : Supabase (Postgres), client Supabase chargé via CDN jsDelivr.
- **Limite Vercel Hobby = 12 fonctions serveur** → actuellement **11 handlers**. NE PAS ajouter de route sans fusionner d'abord. Les helpers sont regroupés dans `api/_lib/` (ex. `auth.js`).

## 3. Modèle de données (Supabase)

- Tables principales : `comptes`, `entreprises`, `magasins`, `personnel`, `produits`, `ventes`, `depenses`, `caisses`, etc.
- **PIÈGE FRÉQUENT** : la colonne de création du personnel s'appelle `cree_le`, PAS `created_at` (voir `supabase/schema.sql`). Toujours vérifier le schéma avant d'écrire une requête.

## 4. Sessions & comptes

- **Propriétaire (compte)** : stocké dans `localStorage` (`samacaisse_compte`) → `window.solmaCompteSession` / `solmaCompteData`.
- **Personnel (vendeur)** : session en `sessionStorage` (`solma_personnel_session`) → `window.solmaPersonnelSession` ; mode vendeur = classe `body.seller-mode`.
- Event `'solma-auth-ready'` déclenche `init()` dans `app.js`.

### Comptes de démonstration (vérifiés en prod)
- **Propriétaire** : `demo@samacaisse.app` / `demo1234` (via `/api/demo`) — entreprise "Boutique Démo".
- **Vendeur** : téléphone `0000000000`, PIN `1234` (Awa démo).

## 5. Dernière session (16/09/2026) — bugs corrigés & VÉRIFIÉS en direct

Deux bugs signalés, tracés et corrigés, puis validés sur le site en production réelle avec Puppeteer/Edge headless :

1. **Menu hamburger "figé" sur PC** — la règle `@media (min-width:721px){ .mobile-menu{ display:none; } }` manquait dans le `styles.css` **déployé** (version en production était obsolète). Le hamburger s'affichait sur desktop et son clic ne faisait qu'afficher un voile noir qui ne disparaissait pas.
   - **Fix** : règle desktop réintégrée dans `styles.css` + déploiement.
2. **Connexion personnel "ne réagit pas"** — les champs `admin-email`/`admin-password` (`required`) restaient `required` même masqués en mode personnel → la validation native HTML5 bloquait la soumission **sans aucun message** ("invalid form control … is not focusable").
   - **Fix** : `novalidate` sur le formulaire dans `index.html` + bascule `required` dynamique selon `authMode` + validation JS explicite (téléphone/PIN) avec messages d'erreur clairs dans `auth.js`.

**Validation** : PC 1366px (hamburger `display:none`, plus de voile bloquant) + mobile 390px (hamburger ouvre/ferme la sidebar) + connexion vendeur `0000000000`/`1234` (shell ouvert en mode vendeur, 0 erreur JS). Commit `6822753` poussé et déployé.

## 6. Règles de travail de l'utilisateur (IMPORTANTES)

- **GRATUIT UNIQUEMENT** : ne JAMAIS proposer de solution payante. L'utilisateur veut exclusivement les services gratuits (Vercel Hobby, Supabase Free, pas de PSP/paywall payant). Si une option coûte de l'argent, proposer uniquement l'alternative gratuite, ou dire franchement que ce n'est pas possible gratuitement.
- **Toujours VÉRIFIER avant de dire "c'est corrigé"** : repro basé sur navigateur réel (Puppeteer/Edge) contre le **déploiement**, pas seulement par inspection de code. L'utilisateur a déjà été trompé par des "c'était corrigé" non vérifiés — ne jamais déclarer quelque chose de réglé sans preuve de test.
- **Cache-busting** : après toute modif CSS/JS, incrémenter le paramètre `?v=` dans `index.html` (références `styles.css`, `app.js`, `auth.js`), sinon l'utilisateur reste sur l'ancienne version en cache.
- **Prévenir l'utilisateur** de faire un hard-refresh (Ctrl+Shift+R) après un déploiement CSS/JS (cache navigateur/PC).
- Répondre en **français**. Tenir compte du contexte sénégalais (FCFA, téléphone/OM/Wave si un jour paiement — mais gratuit).

## 7. Où on s'est arrêté / prochaines étapes

### 🟡 TÂCHE EN COURS — Refonte du FOND « Liqueur Glace » (non implémentée à ce jour)

- **Demande utilisateur (16/09/2026)** : changer le fond du site pour un fond **très moderne et très beau**, inspiré d'un site en ligne, qui valorise l'**effet "liquide glace"** (transparence/verre dépoli). GRATUIT, CSS pur uniquement.
- **Recherche TERMINÉE (faite en ligne)** : la tendance 2025-2026 est le **Liquid Glass** (Apple Liquid Glass, glassmorphism) + palettes de **dégradés liquides vert-teal-lime** (ex. LiquidGradientGreenTeal) — parfaitement dans l'identité SamaCaisse.
- **Leçon CLÉ des articles** : un "verre" ne se voit que s'il y a **une couleur saturée et vive DERRIÈRE** lui. Le fond actuel est très pâle (`linear-gradient(160deg,#f6faf7…)` + blobs `opacity:.55`, blur `rgba(255,255,255,.62)`) → le glass ne "lit" pas. Il faut un fond plus saturé (teal/émeraude/lime) pour que le verre transpire.
- **Recette Liquid Glass (à appliquer)** : `backdrop-filter: blur(12-24px) saturate(150-180%)` + remplissage `rgba(255,255,255,.15-.70)` + **bordure hairline 1px** + **reflet intérieur haut** (inner highlight) + ombre douce. Borner à ~3 surfaces vitrées (perf mobile), fallback `prefers-reduced-motion`/`prefers-reduced-transparency`.
- **Éléments concernés** : `body` background, `.ambient-one/two/three`, `.glass-card`, `.sidebar`, `.topbar`, cartes/panneaux glass (styles.css).
- **À faire ensuite** : modifier `styles.css` (fond saturé + verre renforcé), incrémenter `?v=` dans `index.html`, déployer, **VÉRIFIER en navigateur réel contre le déploiement** (règle utilisateur), prévenir hard-refresh (Ctrl+Shift+R).

### 🐞 NOUVEAU BUG SIGNALÉ (non diagnostiqué) — « je ne vois même pas ce que j'écris »

- **Signalé le 16/09/2026 (session refonte fond)** : l'utilisateur ne voit **pas ce qu'il tape/écrit** par moment (peut toucher le shell/terminal, un champ de l'app, ou un voile/glass qui masque le texte de saisie — **à clarifier en priorité** au prochain retour, AVANT toute reprise, car c'est bloquant pour lui).
- Le message MÊME du bug lui a empêché de voir ce qu'il écrivait → il a demandé une sauvegarde mémoire pour ne rien perdre.
- Actions : demander à l'utilisateur **où exactement** il écrit (navigateur ? terminal PowerShell ? champ précis de l'app ?) ; reproduire en navigateur réel ; corriger puis VÉRIFIER côté déploiement avant de déclarer réglé.

### 📌 INSTRUCTION UTILISATEUR (à respecter au retour) — « donne-moi la dernière réponse précédente »

- Au retour (nouvelle session), après lecture de `AGENTS.md` + `MEMOIRE.md`, **reprendre EXACTEMENT là où on s'est arrêté** : la tâche de fond en cours ci-dessus (Refonte du FOND « Liquide Glace » — recherche TERMINÉE, **implémentation NON ENCORE FAITE**), et rappeler la/les dernière(s) réponse(s) précédente(s) avant de demander la suite.
- Commencer la session par : redonner le point d'étape (% comblée) + la prochaine action, puis demander confirmation.

### Contexte figé (ne pas oublier)
- Les 2 bugs précédents (hamburger PC + connexion personnel) sont corrigés, déployés et VÉRIFIÉS (commit `6822753` poussé).
- **Abandonner définitivement la piste "freemium/abonnement/paywall"** : 100% gratuit. Toute envie de monétisation → reconduite vers une **limite honnête et gratuite** (restrictions par compte/magasin côté API), jamais un paiement.
- Autres idées/améliorations : les aborder selon les demandes explicites de l'utilisateur, en priorité la tâche en cours ci-dessus.

## 8. Préférences à l'écoute

- L'utilisateur donnera d'autres préférences au fil des sessions ; **les ajouter automatiquement ici** (habitudes, façon de régler les problèmes, préférences d'interface/langue) sans qu'il ait à le redemander.
- Écouter les tournures parlées : l'utilisateur dicte ou emploie des formulations orales — reformuler précisément avant d'agir et confirmer.

---

*Mis à jour : 16/09/2026.*
