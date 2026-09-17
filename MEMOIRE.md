# MEMOIRE.md — SamaCaisse (condensé opérationnel)

Version condensée du suivi technique (référence canonique : `AGENTS.md`).

## État (au plus récent)

- **App** : SamaCaisse — gestion commerciale multi-magasins (France/français, FCFA, mobile-first, 100 % natif).
- **Prod** : https://samacaisse-com.vercel.app — **Git** : github.com/ndiayetechsolma/SamaCaisse (`main`).
- **Stack** : `index.html` + `styles.css` + `app.js` + `auth.js` + `api/*.js` (Vercel Serverless) + Supabase.
- **Limite Vercel Hobby** : 12 fonctions → 11 handlers. Ne pas ajouter de route sans fusion.

## Bugs

- ✅ CORRIGÉS + VÉRIFIÉS (prod) : hamburger PC figé ; connexion personnel silencieuse (`novalidate` + `required` dynamique).
- ⚠️ À DIAGNOSTIQUER : « je ne vois pas ce que j'écris » (saisie invisible ponctuelle) — clarifier le contexte (navigateur/terminal/champ).

## Commandes

- **Push** : `git add -A; git commit -m "…"; git push origin main` (auto-deploy Vercel) — cache-bust `?v=` + hard-refresh requis.
- **Suivi** : `AGENTS.md` = canonique ; `MEMOIRE.md` = condensé.
