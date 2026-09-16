# MÉMOIRE PROJET — SamaCaisse

> Ce fichier est la mémoire persistante du projet « SamaCaisse ». Il doit être **lu au début de chaque session** pour retrouver :
> 1. ce qu'est le projet, 2. l'architecture, 3. les bugs traités & leurs causes racines, 4. où on s'est arrêté, 5. vos règles de travail & préférences.

---

## 1. Identité & accès

- **App** : SamaCaisse — gestion commerciale multi-magasins pour commerçants au **Sénégal** (devise FCFA, interface en français, mobile-first).
- **Dossier local** : `C:\Users\Ablaye Ndiaye\Desktop\SamaCaisse`
- **Production** : https://samacaisse-com.vercel.app (alias Vercel)
- **Git remote** : github.com/ndiayetechsolma/SamaCaisse (branche `main`)
- **Déploiement** : `git push origin main` (déclenche l'auto-deploy Vercel) OU `vercel --prod --yes` depuis le dossier local.
- Système : Windows / PowerShell 5.1 sur poste de l'utilisateur.

## 2. Stack technique

- **100% natif** : `index.html` + `styles.css` + `app.js` + `auth.js` (+ `config.js` optionnel). Aucun framework JS, aucun bundler.
- **Backend** : Vercel Serverless Functions dans `api/*.js`.
- **Base de données** : Supabase (Postgres), client Supabase chargé via CDN jsDelivr.
- **Limite Vercel Hobby = 12 fonctions serveur** → actuellement **11 handlers**. NE PAS ajouter de route sans fusionner d'abord. Helpers regroupés dans `api/_lib/` (ex. `auth.js`).

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
2. **Connexion personnel "ne réagit pas"** — les champs `admin-email`/`admin-password` (`required`) restaient `required` même masqués en mode personnel → la validation native HTML5 bloquait la soumission **sans aucun message** ("invalid form control not focusable").
   - **Fix** : `novalidate` sur le formulaire (`index.html`) + bascule `required` dynamique selon le mode dans `auth.js` + validation JS explicite (téléphone/PIN) avec messages d'erreur clairs.

**Validation** : PC 1366px (hamburger `display:none`) + mobile 390px (hamburger ouvre/ferme la sidebar) + connexion vendeur `0000000000`/`1234` (shell ouvert en mode vendeur, 0 erreur JS). Commit `6822753` poussé et déployé.

## 6. Règles de travail de l'utilisateur (IMPORTANTES)

- **GRATUIT UNIQUEMENT** : ne JAMAIS proposer de solution payante. Tous les services doivent être gratuits (Vercel Hobby, Supabase Free, pas de PSP/paywall). Si une option coûte de l'argent, proposer uniquement l'alternative gratuite ou dire franchement que ce n'est pas possible gratuitement.
- **Toujours VÉRIFIER avant de dire "c'est corrigé"** : repro basé sur navigateur réel (Puppeteer/Edge) contre le **déploiement**, pas seulement par inspection de code. L'utilisateur a déjà été trompé par des "c'était corrigé" non vérifiés — ne jamais déclarer quelque chose de réglé sans preuve de test.
- **Cache-busting** : après toute modif CSS/JS, incrémenter le paramètre `?v=` dans `index.html` (références `styles.css`, `app.js`, `auth.js`), sinon l'utilisateur reste sur l'ancienne version en cache.
- **Prévenir l'utilisateur** de faire un hard-refresh (Ctrl+Shift+R) après un déploiement CSS/JS (cache navigateur/PC).
- Répondre en **français**. Tenir compte du contexte sénégalais (FCFA, téléphone/OM/Wave si un jour paiement — mais gratuit).

## 7. Où on s'est arrêté / prochaines étapes

- Les 2 bugs ci-dessus sont corrigés, déployés et vérifiés → rapportés à l'utilisateur.
- **Abandonner la piste "freemium/abonnement/paywall"** : l'utilisateur veut du 100% gratuit. Toute envie de monétisation doit être reconduite vers une **limite honnête et gratuite** (restrictions par compte/magasin maintenues côté API), jamais un paiement.
- Autres idées/améliorations : les aborder en priorité selon les demandes explicites de l'utilisateur.

## 8. Préférences à l'écoute

- L'utilisateur donnera d'autres préférences au fil des sessions ; **les ajouter automatiquement ici** (habitudes, façon de régler les problèmes, préférences d'interface/langue) sans qu'il ait à le redemander.
- Écouter les tournures parlées : l'utilisateur dicte ou emploie des formulations orales — reformuler précisément avant d'agir et confirmer.

---

*Mis à jour : 16/09/2026.*
