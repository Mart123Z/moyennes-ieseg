# Moyennes IESEG

Site gratuit pour calculer sa moyenne par matière et sa moyenne générale, avec comptes étudiants, graphique par matière et export PDF.

- **Hébergement** : GitHub Pages (gratuit)
- **Comptes et notes** : Firebase, plan Spark (gratuit, sans carte bancaire)

Tout se fait dans le navigateur. Rien n'est installé ni ne tourne sur ton ordinateur.

## 1. Firebase (comptes + base de données)

1. Ouvre https://console.firebase.google.com, puis clique sur **Créer un projet** (Analytics peut être désactivé).
2. Ouvre **Authentication**, clique sur **Commencer**, puis active **Adresse e-mail/Mot de passe**.
3. Ouvre **Firestore Database** et clique sur **Créer une base de données**. Choisis la région **eur3 (Europe)** et le **mode production**.
4. Dans Firestore, onglet **Règles** : colle le contenu de `firestore.rules`, puis clique sur **Publier**.
5. Ouvre ⚙️ **Paramètres du projet** et clique sur l'icône Web **`</>`**. Enregistre l'application, puis garde le bloc `firebaseConfig` affiché.

## 2. GitHub (mise en ligne)

1. Sur https://github.com, clique sur **New repository**. Nomme-le `moyennes-ieseg`, choisis **Public** (obligatoire pour GitHub Pages gratuit), puis clique sur **Create repository**.
2. Clique sur **uploading an existing file**. Glisse tout le contenu de ce dossier, y compris le dossier `vendor`. Clique ensuite sur **Commit changes**.
3. Dans le dépôt, ouvre `firebase-config.js` et clique sur ✏️. Remplace chaque `A_REMPLACER` par les valeurs de `firebaseConfig`, puis clique sur **Commit changes**.
4. Ouvre **Settings**, puis **Pages**. Dans **Source**, choisis **Deploy from a branch**, puis **Branch : main** et **/ (root)**. Clique sur **Save**.
5. Après 1 à 2 minutes, l'adresse s'affiche en haut de la page : `https://TON-PSEUDO.github.io/moyennes-ieseg/`.

## 3. Autoriser l'adresse dans Firebase

Dans Firebase, ouvre **Authentication**, puis **Paramètres** et **Domaines autorisés**. Clique sur **Ajouter un domaine** et saisis `TON-PSEUDO.github.io`.

## Template S1 (Bachelor 1)

Le bouton **Template S1** ajoute d'un coup les matières du semestre 1 du PGE avec leurs évaluations et pondérations. Les notes sont créées « à venir » : l'étudiant les remplit au fil du semestre.
Les données du modèle sont dans `templates.js` : pour corriger une pondération ou un crédit ECTS, modifie ce fichier (les ECTS `null` sont « à confirmer » et utilisent `ectsProvisoire`).

## Import Aurion

Bouton **Importer depuis Aurion (CSV)** : dans Aurion, « Mes notes aux épreuves » → export CSV, puis choisir le semestre et le fichier.
Le site reconnaît chaque matière par son code (ex. `1728`) et chaque épreuve par sa clé (ex. `CONT1`). On peut réimporter un nouvel export à tout moment : les notes existantes sont mises à jour, rien n'est ajouté en double. Les valeurs non numériques (ABS…) sont ignorées.

## Évolution de la moyenne

Chaque note a une date : celle choisie lors d'un ajout ou d'une modification manuelle, ou le jour de l'import pour les notes nouvelles ou modifiées par un CSV Aurion. Le graphique « Évolution de ta moyenne » recalcule la moyenne (générale ou d'une matière) à chacune de ces dates. Il apparaît aussi dans l'export PDF.

## Mises à jour

Modifie un fichier directement sur GitHub (✏️, puis **Commit changes**). Le site se met à jour tout seul en 1 à 2 minutes.

## Voir les comptes

Dans Firebase, l'onglet **Authentication → Utilisateurs** liste les comptes et l'onglet **Firestore → Données** contient les notes.

## Remarques

- La clé `apiKey` visible dans `firebase-config.js` n'est pas un secret : c'est le fonctionnement normal de Firebase. La sécurité repose sur les règles de l'étape 1.4.
- Si Firebase te propose de passer au plan **Blaze**, refuse : ce site n'en a pas besoin.
- Outil indépendant et non officiel : seul le relevé de notes de l'école fait foi.
