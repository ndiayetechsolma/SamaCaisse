# AGENTS.md — SamaCaisse (suivi technique projet)

Fichier de suivi **technique uniquement** (projet / builds / bugs / tests / déploiement).
Aucune préférence personnelle consignée ici (les règles de travail sont dans EXPLICATIONS-TECHNIQUES.md si besoin).

---

## 1. Identité & accès

- **App** : SamaCaisse — gestion commerciale multi-magasins (Sénégal, FCFA, interface française, mobile-first).
- **Local** : `C:\Users\Ablaye Ndiaye\Desktop\SamaCaisse`
- **Production** : https://samacaisse-com.vercel.app (Vercel, auto-deploy)
- **Git** : https://github.com/ndiayetechsolma/SamaCaisse (branche `main`)
- **Déploiement** : `git push origin main` (auto-deploy Vercel) OU `vercel --prod --yes`
- **Système** : Windows / PowerShell 5.1

## 2. Stack technique

- 100 % natif : `index.html` + `styles.css` + `app.js` + `auth.js` (+ `config.js` optionnel). Aucun framework/bundler.
- Backend : Vercel Serverless Functions (`api/*.js`).
- DB : Supabase (Postgres), client chargé via CDN jsDelivr.
- Contrainte Vercel Hobby : max **12 fonctions serveur** → actuellement **11 handlers**. N'ajouter une route qu'après fusion. Helpers regroupés dans `api/_lib/` (`auth.js`).

## 3. Modèle de données Supabase

- Tables : `comptes`, `entreprises`, `magasins`, `personnel`, `produits`, `ventes`, `depenses`, `caisses`, …
- **PIÈGE** : colonne création personnel = `cree_le`, PAS `created_at` (voir `supabase/schema.sql`). Vérifier le schéma avant toute requête.

## 4. Sessions & comptes

- Propriétaire : `localStorage` (`samacaisse_compte`) → `window.solmaCompteSession` / `solmaCompteData`.
- Personnel (vendeur) : `sessionStorage` (`solma_personnel_session`) → `solmaPersonnelSession` ; mode vendeur = `body.seller-mode`.
- Événement `solma-auth-ready` → lance `init()` dans `app.js`.
- Comptes démo : propriétaire `demo@samacaisse.app`/`demo1234` (via `/api/demo`) ; vendeur `0000000000`/`1234`.

## 5. Suivi builds & bugs

CORRIGÉS & VÉRIFIÉS (Puppeteer/Edge contre prod) :
1. Hamburger PC figé → `@media(min-width:721px){ .mobile-menu{display:none} }` manquait en production.
2. Connexion personnel silencieuse → `novalidate` + bascule dynamique de `required` + messages d'erreur explicites (`auth.js`).

⚠️ NON RÉSOLU (en attente de diagnostic) :
- « Je ne vois pas ce que j'écris » (saisie invisible ponctuelle) — à clarifier (navigateur / terminal / champ précis).

## 6. Boucles de travail (allocation tokens)

Cadre validé — continuer la session de façon **autonome**, sans redemander la permission à chaque action ; résumé fourni en fin de boucle, taggé selon la boucle :

| Boucle | Rôle | Budget tokens |
|---|---|---|
| **GIGO** | Boucle principale (Large) — tâche complète, multi-étapes | ~64 000 |
| **MIGO** | Boucle moyenne (Mini) — sous-tâche de recherche/action ciblée | ~6 000 |
| **LIGO** | Boucle micro (micro) — action élémentaire pointue | ~600 |

L'utilisateur annonce le mot-clé et le budget ; l'assistant exécute à partir de la **dernière réponse** et rend un compte-rendu en français, taggé (ex. `[GIGO]`, `[MIGO]`).

## 7. Règles opérationnelles (contraintes projet)

- **GRATUIT UNIQUEMENT** : jamais de solution payante (Vercel Hobby, Supabase Free, pas de PSP/paywall). Si impossible gratuitement → alternative gratuite ou refus franc.
- **Toujours VÉRIFIER avant de dire « corrigé »** : repro navigateur réel (Puppeteer/Edge) contre le **déploiement**, jamais simple inspection de code.
- **Cache-busting** : après modif CSS/JS, incrémenter `?v=` dans `index.html` (`styles.css`, `app.js`, `auth.js`), sinon cache obsolète.
- **Hard-refresh navigateur** (Ctrl+Shift+R) à communiquer après chaque déploiement CSS/JS.
- Répondre en **français** ; contexte sénégalais (FCFA, téléphone), gratuit.

## 8. Prochaines étapes

1. **Nettoyage mémoires** : AGENTS.md/MEMOIRE.md → suivi technique seul (fait ici).
2. **EXPLICATIONS-TECHNIQUES.md** → conclusions Liquid Glass (créé).
3. **Implémentation Liquid Glass** conforme au modèle (voir EXPLICATIONS-TECHNIQUES.md) : SVG filter `#glass-distortion`, appliqué aux surfaces verre ; fond saturé derrière.
4. Cache-busting + déploiement + **vérif navigateur réel** contre la prod.
