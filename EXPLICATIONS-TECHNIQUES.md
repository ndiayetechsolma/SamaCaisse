# EXPLICATIONS-TECHNIQUES.md — SamaCaisse / Liquid Glass « Minuit Émeraude » (noir émeraude, fond)

Version 1.0 — Septembre 2026. Suite au nettoyage des mémoires (AGENTS.md, MEMOIRE.md → suivi projets/builds/bugs/tests/déploiement uniquement). Document à usage : **1) développeur humain, 2) développeur IA (ami), 3) référentiel projet SamaCaisse**. Style : formel professionnel, valeurs précises, étapes validées navigateur.

---

## 1. Objet

Implémenter l'effet **Liquid Glass** (verre liquide réfractant) de référence — modèle `alexerlandsson/GgJQEKE` — en **version sombre « Minuit Émeraude »**, distincte du pen d'origine (plus de points/bling-bling du code actuel). Le verre s'apprécie **par le contraste avec ce qui se trouve derrière lui** : le secret du modèle n'est pas le panneau, c'est ce qui est **sous** le verre.

## 2. Le principe : le verre ne se lit que par ce qui est derrière

Dans le modèle `GgJQEKE`, le « liquide » visible n'est **pas** le panneau : c'est la **texture de fond saturée et animée** (dégradés turbulents très colorés) qui est **déformée optiquement** quand le panneau la traverse. Un verre sur fond uni = invisible. Un verre sur fond saturé + filtre de déformation = l'illusion du liquide.

**Ce que ça veut dire pour SamaCaisse** : abandonner le fond actuel (blobs/bling-bling) au profit d'un **fond profond « Minuit Émeraude »** — un dégradé très sombre (noir → émeraude profond) traversé de **veines/lueurs saturées** (émeraude, teal, éventuellement lime ponctuel) qui ***n'apparaissent que là où le verre passe devant***. Derrière le verre : le dégradé émeraude-noir **plus lumineux/saturé qu'ailleurs** (zones de « lumière sous-marine »), pour que la réfraction se voie.

## 3. Ce qui se trouve EXACTEMENT sous le verre (clarification demandée)

| Couche (de l'arrière vers l'avant) | Élément | Rôle |
|---|---|---|
| L1 — Sol | `body` : dégradé radial/linéaire `#04070b` → `#06281f` → touches `#0e3b2c` | Toile profonde sombre ; sert de « zone d'ombre » au verre |
| L2 — Lueurs saturées | 2-4 `.glass-blob` (dégradés radiaux émeraude/teal + `filter:blur(30px)`), répartis derrière les panneaux | Zones de couleurs vives **sous** le verre : ce qui rend le verre lisible |
| L3 — Surface verre | Panneaux `.liquid-glass` (sidebar, topbar, cartes) avec filtre SVG `#glass-distortion` | Le « liquide » : déformation + reflets |
| L4 — Contenu UI | Textes, boutons, icônes, données FCFA | Toujours **au-dessus** du verre, jamais flouté |

**Règle d'or** : sous chaque panneau verre, il doit y avoir **de la couleur saturée animée** (L2), sinon l'effet disparaît. On ne place jamais deux panneaux verre dos à dos (le second n'aurait rien à déformer derrière lui).

## 4. La recette technique du modèle (valeurs exactes)

### 4.1 Filtre SVG déclaratif (le cœur) — `#glass-distortion`

```svg
<svg width="0" height="0" style="position:absolute">
  <filter id="glass-distortion">
    <feTurbulence type="fractalNoise"
      baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/>
    <feColorMatrix in="turbulence" type="matrix" result="softMap"
      values="1 0 0 0 0
              0 0.5 0 0 0
              0 0.8 0 0 0
              0 0 0 izinè 0" />  <!-- à ajuster : mapping R/G pour un blob net -->
    <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap2"/>
    <feSpecularLighting in="softMap2" surfaceScale="5" specularConstant="1"
      specularExponent="100" lighting-color="white" result="specLight">
      <fePointLight x="-200" y="-200" z="300"/>
    </feSpecularLighting>
    <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/>
    <feDisplacementMap in="SourceGraphic" in2="litImage" scale="200"
      xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

Paramètres clés du modèle (à reproduire) :
- `feTurbulence` : `fractalNoise`, `baseFrequency="0.001 0.005"`, `numOctaves="1"`, `seed="17"` → texture douce et lente.
- `feGaussianBlur` `stdDeviation="3"` → adoucit la map de déformation.
- `feSpecularLighting` : `surfaceScale=5`, `specularConstant=1`, `specularExponent=100`, lumière `white`, point lumineux `x=-200 y=-200 z=300` → le **reflet** qui donne l'aspect « verre bombé ».
- `feComposite` opérateur `arithmetic` `k1=0 k2=1 k3=1 k4=0` → mélange la lumière avec la map.
- `feDisplacementMap` `scale="200"`, canaux R→X, G→Y → la **réfraction** (déformation du fond derrière).

### 4.2 CSS du panneau verre

```css
.liquid-glass{
  position: relative;
  background-color: rgb(255 255 255 / 25%);   /* très translucide */
  color: rgb(255 255 255 / 36%);
  border: 1px solid rgb(255 255 255 / 18%);    /* fine ligne « tranche de verre » */
}
.liquid-glass::before{  /* la couche qui floute + déforme le fond */
  content:"";
  position:absolute; inset:0;
  z-index:-1;
  backdrop-filter: blur(3px);                 /* léger, car la distorsion fait le gros du travail */
  filter: url(#glass-distortion);             /* le filtre SVG ci-dessus */
  background: rgb(255 255 255 / 6%);
}
.liquid-glass::after{  /* le reflet intérieur haut-gauche (biseau) */
  content:"";
  position:absolute; inset:0;
  border-radius:inherit;
  box-shadow:
    inset 2px 2px 1px 0 rgb(255 255 255 / 50%),
    inset -1px -1px 1px 1px rgb(255 255 255 / 20%);
  pointer-events:none;
}
```

Notes d'adaptation sombre :
- `background-color` passe de blanc translucide → **translucide gravitant vers l'émeraude** : `rgb(16 71 58 / 35%)` par exemple, pour coller au thème Minuit Émeraude.
- `backdrop-filter: blur(3-6px)` — garder **faible** (3px) sinon le panneau devient « gelé » et on perd le liquide.
- L'effet repose à ~80 % sur le **SVG filter** (`feDisplacementMap scale=200`), pas sur le blur.

## 5. Chapînes technique d'intégration SamaCaisse

1. **`index.html`** : insérer le `<svg>` du filtre en début de `<body>` (1 seule fois) ; ajouter la classe `liquid-glass` aux surfaces : sidebar, topbar, cartes principales (catalogue, ventes, tableau de bord).
2. **`styles.css`** : règles ci-dessus + fond `body` minuit émeraude + animation des `.glass-blob` (translation/lueur lentes, `@keyframes`).
3. **`app.js`** : positionnement des blobs (responsive, absolu/`vh`), aucune dépendance réseau.
4. **Cache-busting** : incrémenter `?v=` (`styles.css`, `app.js`) ; **hard-refresh** (Ctrl+Shift+R) après déploiement.
5. **Vérification navigateur réel obligatoire** (Puppeteer/Edge contre la prod) avant de déclarer « corrigé » : vérifier que la déformation déforme bien les lueurs **sous** les panneaux et que les textes restent lisibles.

## 6. Contraintes projet (inchangées)

- **Gratuit uniquement** : filtre SVG inline + CSS pur, zéro requête réseau, zéro libray/asset payante.
- 12 fonctions Vercel (11 handlers) — aucun ajout de route ici (front-end pur).

## 7. Prochaines étapes (à valider ensemble)

1. Validation du design « Minuit Émeraude » (sombre, émeraude/teal, plus de points/bling-bling).
2. Implémentation filtre SVG + panneaux + fond (étape 4).
3. Déploiement + **vérif navigateur réel** contre la prod.
