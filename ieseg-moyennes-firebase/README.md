# Moyennes IESEG — version Firebase (100 % gratuite)

Site statique + Firebase (plan **Spark**, gratuit, **sans carte bancaire**) :
- **Firebase Authentication** : les comptes (e-mail + mot de passe, mot de passe oublié).
- **Cloud Firestore** : les matières et les notes de chaque étudiant.
- **Firebase Hosting** : l'hébergement du site, en HTTPS, à une adresse `https://TON-PROJET.web.app`.

Aucun serveur à gérer. Comme aucune carte bancaire n'est enregistrée, tu ne peux pas être facturé.

---

## Étape 1 — Créer le projet Firebase (5 min, dans le navigateur)

1. Va sur https://console.firebase.google.com et connecte-toi avec un compte Google.
2. **Créer un projet** → nom : `moyennes-ieseg` → tu peux désactiver Google Analytics → **Créer le projet**.
3. Note l'**ID du projet** affiché (ex. `moyennes-ieseg-1a2b3`).

## Étape 2 — Activer les comptes

1. Menu de gauche : **Créer (Build) → Authentication → Commencer**.
2. Onglet **Mode de connexion** → **Adresse e-mail/Mot de passe** → **Activer** → **Enregistrer**.
3. (Optionnel) Onglet **Modèles** : passe la langue des e-mails en **français**.

## Étape 3 — Créer la base de données

1. **Créer → Firestore Database → Créer une base de données**.
2. Emplacement : **eur3 (Europe)** (ou `europe-west1`) → **Démarrer en mode production** → **Créer**.
3. Onglet **Règles** : remplace tout le contenu par celui du fichier `firestore.rules` de ce dossier → **Publier**.
   (Ces règles garantissent que chaque étudiant ne voit et ne modifie que ses propres notes.)

## Étape 4 — Brancher le site sur ton projet

1. **⚙️ Paramètres du projet → Général → Vos applications → icône Web `</>`**.
2. Surnom : `site` → **Enregistrer l'application**.
3. Firebase affiche un bloc `const firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
4. Ouvre `public/firebase-config.js` et remplace chaque `A_REMPLACER` par les valeurs affichées.
   (La clé `apiKey` n'est pas secrète : c'est normal qu'elle soit dans le site. La sécurité vient des règles de l'étape 3.)
5. Ouvre `.firebaserc` et remplace `A_REMPLACER` par l'**ID du projet**.

## Étape 5 — Mettre en ligne (Firebase Hosting)

1. Installe **Node.js LTS** (gratuit) : https://nodejs.org
2. Ouvre un terminal **dans ce dossier** (Windows : clic droit dans le dossier → « Ouvrir dans le terminal » ; Mac : Terminal puis `cd ` + glisser le dossier).
3. Tape, une ligne à la fois :

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

4. À la fin, le terminal affiche **Hosting URL: https://TON-PROJET.web.app** : c'est l'adresse de ton site. Elle fonctionne sur téléphone et ordinateur.

`firebase deploy` publie le site **et** les règles de sécurité. Pour une mise à jour plus tard : modifie les fichiers puis relance `firebase deploy`.

## Étape 6 — Vérifier

1. Ouvre l'adresse sur ordinateur, crée un compte, ajoute une matière et une note.
2. Ouvre la même adresse sur ton téléphone, connecte-toi : tes notes sont là.
3. Dans la console Firebase : **Authentication → Utilisateurs** liste tous les comptes créés ; **Firestore → Données** montre les notes.

---

## Alternative sans rien installer : GitHub Pages

Si tu ne veux pas installer Node.js :
1. Fais les étapes 1 à 4 (les règles sont publiées à la main à l'étape 3).
2. Crée un dépôt **public** sur GitHub et dépose-y le **contenu du dossier `public`** (index.html, app.js, etc.).
3. Dépôt → **Settings → Pages → Branch : main / root → Save**. Le site sera à `https://TON-PSEUDO.github.io/NOM-DU-DEPOT/`.
4. Firebase → **Authentication → Paramètres → Domaines autorisés → Ajouter** `TON-PSEUDO.github.io`.

---

## Bon à savoir

- **Limites du plan gratuit** : largement suffisantes pour une promo d'étudiants. Si un quota quotidien était un jour dépassé, le site serait simplement indisponible jusqu'au lendemain, sans aucun frais.
- **Ne passe pas au plan Blaze** si on te le propose : ce n'est pas nécessaire pour ce site.
- **Contenu du dossier**
  - `public/` : le site (HTML, CSS, JS, bibliothèques incluses dans `public/vendor`).
  - `firestore.rules` : règles de sécurité de la base.
  - `firebase.json`, `.firebaserc` : configuration de l'hébergement.
  - `src/firebase-entry.js` : source du fichier `public/vendor/firebase.js` (à régénérer avec `npm install && npm run build` seulement si tu veux mettre à jour le SDK Firebase).

> Outil indépendant et non officiel : seul le relevé de notes de l'école fait foi.
