# SamaCaisse

**La gestion commerciale simple, pensée pour les commerçants — comme Wave.**

SamaCaisse est une plateforme web de gestion commerciale qui permet à **chacun de gérer sa propre entreprise** : ventes, caisse, produits, stock, dépenses et personnel, depuis son téléphone.

Contrairement aux cahiers et aux calculs manuels, SamaCaisse donne au propriétaire une vision claire et fiable de son activité, magasin par magasin.

## Pour qui ?

- Boutiques, supérettes, épiceries, petites pharmacies
- Restaurants, boulangeries, points de restauration rapide
- Toute activité avec des ventes quotidiennes et une caisse
- Les commerces avec plusieurs agences ou magasins

L'interface est pensée pour être **extrêmement simple** : grandes icônes, peu de texte, un geste = une action, utilisable au doigt sur mobile comme sur ordinateur.

## Fonctionnalités

| Domaine | Ce que fait SamaCaisse |
| --- | --- |
| **Comptes & entreprises** | Inscription libre du propriétaire (email + mot de passe), onboarding guidé (entreprise + premier magasin), plan gratuit (freemium à venir) |
| **Magasins** | Plusieurs magasins, filtre par magasin, vue globale ou par point de vente |
| **Ventes** | Enregistrement rapide (liquide / mobile money), quantité, annulation |
| **Caisse** | Ouverture, fermeture, écart compté vs attendu, historique indéfini |
| **Dépenses** | Saisie immédiate de toute sortie d'argent, annulation |
| **Produits** | Catalogue avec catégories, prix et **gestion de stock** |
| **Personnel** | Connexion par téléphone + code PIN, rôles, désactivation |
| **Rapports** | Ventes / dépenses / bénéfice par jour, historique des caisses, **exports CSV / PDF** |

## Architecture technique

Front-end **HTML/CSS/JavaScript natif** (léger, rapide, adapté mobile), base de données **Supabase** (PostgreSQL + RLS), et routes serveur **Vercel Functions** pour les opérations sensibles.

```
Navigateur
  ├─ Interface web responsive (HTML/CSS/JS natif)
  ├─ Comptes propriétaires (inscription/connexion) via /api/account
  ├─ Onboarding guidé (entreprise + magasin) via /api/onboarding
  ├─ Client Supabase avec règles d'accès RLS
  └─ Routes Vercel /api pour les opérations métier
       └─ Base de données PostgreSQL Supabase
```

Les mots de passe et codes PIN sont hashés avec `bcryptjs`, les sessions des propriétaires et des vendeurs utilisent des JWT signés, et **chaque table de données porte l'identifiant du compte propriétaire** pour garantir l'isolation entre utilisateurs.

## Structure du dépôt

```
api/                  Routes serveur Vercel (comptes, onboarding, ventes, caisse…)
api/account/          Inscription, connexion et profil du propriétaire
api/_lib/             Helpers de session (JWT) partagés
supabase/             Schéma SQL et politiques RLS
auth.js               Connexion propriétaire / personnel
app.js                Logique de l'interface
styles.css            Style « liquid glass »
index.html            Page principale (l'application, servie à /app)
landing.html          Page d'accueil publique (servie à la racine)
manifest.webmanifest  Configuration PWA
config.example.js     Maquette de configuration (à copier en config.js)
vercel.json           Routage public : / → landing, /app → application
```

## Démarrage en local

Prérequis : **Node.js 18+** et un projet **Supabase** (gratuit) déjà créé.

1. Cloner le dépôt

```
git clone https://github.com/ton-utilisateur/samacaisse.git
cd samacaisse
npm install
```

2. Copier `config.example.js` en `config.js` et renseigner l'URL et la clé anon publiques de ton projet Supabase.

```
config.js   ← rempli avec tes valeurs (fichier ignoré par git)
```

3. Dans Supabase (SQL Editor), exécuter le schéma complet :

```
supabase/schema.sql
```

Le premier compte propriétaire se crée ensuite directement depuis l'application (inscription en ligne) — aucune manipulation SQL nécessaire.

Facultatif : coller aussi `supabase/test-rls.sql` pour vérifier que deux comptes restent bien isolés.

4. Ajouter ces variables dans Vercel (Settings > Environment Variables) :

```
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ta-cle-secrete-service-role
PERSONNEL_SESSION_SECRET=une-chaine-longue-aleatoire-et-secrete
```

5. Lancer en local :

```
npx vercel dev
```

Puis ouvrir l'adresse affichée dans le terminal.

## Vérification rapide

```
npm run check
```

## Sécurité (important pour un repo public)

- `config.js`, `.env` et tout secret ne sont **jamais** versionnés.
- La clé `service_role` ne vit que sur les serveurs Vercel, jamais dans le navigateur.
- Chaque table porte le `compte_id` du propriétaire ; les politiques RLS n'autorisent l'accès qu'aux lignes de son propre compte.
- Signale toute faille via les issues GitHub du dépôt.

## Feuille de route

### État actuel (fait)

- [x] Fondations du dépôt public (marque, licence, nettoyage des secrets)
- [x] Schéma multi-tenant + politiques RLS (`supabase/schema.sql`, test d'isolation inclus)
- [x] Inscription, connexion et onboarding guidé du propriétaire (email + mot de passe)
- [x] Cœur métier : ventes, caisse, dépenses, produits avec stock, personnel (connexion par téléphone + PIN)
- [x] Rapports et exports CSV / PDF
- [x] Plusieurs magasins : filtre par magasin, vue globale ou par point de vente
- [x] **Ajout d'un nouveau magasin depuis son espace** (sélecteur en haut → « Nouveau magasin »)

**Phase 1 — Assainir et fiabiliser le MVP**

- [x] Supprimer `api/admin-data.js` et `api/treasury.js` (routes legacy cassées / remplacées)
- [x] Nettoyer `index.html` : options de magasins codées en dur et `<select id="store-filter">` morts supprimés
- [x] Ajouter favicon, méta-description, balises Open Graph et thème couleur

**Phase 2 — Approfondir la gestion (parcours propriétaire)**

- [x] Renommer un magasin (route `api/magasins.js` + icône ✎ dans le sélecteur)
- [x] Modifier l'entreprise : renommer, changer la devise (`api/entreprise.js`)
- [x] Modifier le profil : nom, email, mot de passe (bouton `•••`, `api/profile.js`)
- [x] Modifier un membre du personnel : nom, magasin, réinitialisation du PIN (`api/personnel.js`)
- [x] Recherche et filtres dans les listes (produits, ventes, dépenses)

**Phase 3 — Rapports et exploitation**

- [x] Sélecteur de période (aujourd'hui / 7 jours / 30 jours) sur le tableau de bord et les rapports
- [x] Rapports par produit (quantités vendues) et par vendeur
- [x] Exports CSV et impression PDF alignés sur la période et le magasin sélectionnés

**Phase 4 — Vente en situation réelle (mobile)**

- [x] Vente rapide : montant pré-rempli automatiquement d'après le produit et la quantité
- [x] Application installable (PWA : `manifest.webmanifest`, icônes, thème)
- [x] Personnel : voit uniquement ses propres ventes

**Phase 5 — Lancement public et démo**

- [x] Page d'accueil publique (`landing.html`) présentant SamaCaisse, servie à la racine via `vercel.json`
- [x] Compte de démonstration pré-rempli (« Essayer la démo » — `api/demo.js`)
- [x] Documentation : ce guide + documentation des routes API ci-dessous
- [ ] Modèle freemium (le champ `plan` existe déjà dans le schéma)

## Démo

Sur le site public, le bouton **« Essayer la démo »** appelle `POST /api/demo`. À la première requête, la route crée un compte de démonstration (`demo@samacaisse.app`) avec :

- une entreprise « Boutique Démo » (devise FCFA)
- deux magasins (Point de vente A et B)
- six produits avec stock
- un vendeur (Connexion → « Espace personnel » : téléphone `0000000000`, code `1234`)
- une douzaine de ventes, des dépenses et l'historique de caisse sur les 7 derniers jours

Les requêtes suivantes réutilisent ce compte, telles des données de démonstration.

## Routes API

Toutes les routes de mutation attendent un JWT dans l'en-tête `Authorization: Bearer <token>` (sauf inscription, connexion et démo).

| Route | Méthode | Rôle | Description |
| --- | --- | --- | --- |
| `POST /api/account/create` | public | — | Inscrire un propriétaire `{ nom, email, password }` |
| `POST /api/account/login` | public | — | Connexion propriétaire `{ email, password }` → `{ token, compte }` |
| `GET /api/account/me` | compte | — | Profil + entreprises du propriétaire |
| `POST /api/onboarding` | compte | — | Créer l'entreprise + premier magasin `{ entreprise_nom, devise, magasin_nom }` |
| `POST /api/magasins` | compte | — | `{ entreprise_id, nom }` (créer) ou `{ action: 'rename', magasin_id, nom }` |
| `POST /api/entreprise` | compte | — | Modifier `{ entreprise_id, nom, devise }` |
| `PATCH /api/profile` | compte | — | Modifier `{ nom, email, password_actuel, nouveau_mot_de_passe }` |
| `POST /api/personnel/create` | compte | — | Ajouter `{ nom, telephone, pin, magasin_id }` |
| `POST /api/personnel` | compte | — | Modifier `{ personnel_id, nom, telephone, pin?, magasin_id }` |
| `POST /api/personnel-delete` | compte | — | Désactiver / réactiver `{ personnel_id, actif }` |
| `POST /api/personnel-login` | public | — | Connexion vendeur `{ telephone, pin }` → `{ token, personnel }` |
| `POST /api/products` | compte | — | `{ action: 'create', nom, categorie, prix, stock, magasin_id? }` ou `{ action: 'update', produit_id, nom, categorie, prix, stock }` |
| `POST /api/sales` | compte ou vendeur | — | Enregistrer une vente `{ produit_id?, nom_produit, quantite, montant, mode_paiement, magasin_id }` |
| `POST /api/sales-delete` | compte | — | Annuler `{ vente_id }` |
| `POST /api/expenses` | compte ou vendeur | — | Enregistrer une dépense `{ montant, motif, magasin_id }` |
| `POST /api/expenses-delete` | compte | — | Annuler `{ depense_id }` |
| `POST /api/cash?magasin_id=…` | compte ou vendeur | — | `{ action: 'open', montant_ouverture }` ou `{ action: 'close', montant_fermeture }` |
| `GET /api/business-data?entreprise_id=…` | compte ou vendeur | — | Charger entreprise, magasins, produits, ventes, dépenses, caisses, personnel |
| `POST /api/demo` | public | — | Créer/récupérer le compte de démonstration → `{ token, compte }` |

Une note d'identité : un jeton `compte` gère toutes les entreprises de son compte ; un jeton `personnel` est limité à un magasin et à ses propres opérations.

## Licence

Distribué sous licence **GNU AGPL-3.0**. Voir `LICENSE` pour les conditions complètes.