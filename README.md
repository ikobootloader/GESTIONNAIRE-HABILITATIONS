# Gestionnaire d'Habilitations

Application web locale de gestion des habilitations pour l'administration publique.

## Caractéristiques

- **Application autonome** : Aucun serveur requis, fonctionne en local
- **Architecture modulaire** : Code organisé en modules JavaScript séparés
- **Chiffrement AES-256** : Protection des données sensibles par mot de passe
- **Interface moderne** : Design épuré avec thème clair/sombre
- **Export/Import** : Compatible Excel (.xlsx) et fichiers chiffrés (.habil)
- **Pagination** : Navigation fluide dans les grandes listes

## Architecture

### Structure des fichiers

```
/css
  - styles.css              # Styles CSS centralisés
/js
  - utils.js                # Utilitaires généraux (dates, formatage, échappement)
  - data.js                 # Modèle de données centralisé (agents, habilitations, logiciels)
  - security.js             # Cryptographie AES-256-GCM
  - pagination.js           # Gestion de la pagination des tables
  - files.js                # Import/Export Excel et .habil
  - render.js               # Rendu des tables, statistiques et dashboards
  - ui.js                   # Interface utilisateur (modales, toasts, navigation)
  - app.js                  # Orchestrateur principal et initialisation
gestion_habilitations.html  # Point d'entrée HTML
```

### Principes de conception

- **Séparation des responsabilités** : Chaque module a un rôle bien défini
- **Clean Code** : Code commenté, fonctions documentées, nommage explicite
- **SOLID** : Respect des principes de conception orientée objet
- **Maintenabilité** : Structure claire facilitant les évolutions futures
- **Performance** : Pagination pour gérer efficacement de grandes quantités de données

## Fonctionnalités

### Gestion des Agents
- Création, modification et suppression d'agents
- Suivi des services, postes et emails
- Attribution multiple d'habilitations par agent
- Repli/dépli des habilitations dans la modale agent pour faciliter l'édition

### Gestion des Habilitations
- Attribution de permissions par logiciel
- Rôles et groupes personnalisables
- Suivi des valideurs et statuts
- Filtres avancés dans le registre : logiciel, rôle, permissions, poste, statut
- En modale agent (section "Habilitations par logiciel"), le valideur est automatiquement aligné sur le premier valideur par défaut du logiciel
- En modale agent, la saisie multi-groupes (CSV) conserve les suggestions de groupes du logiciel après chaque virgule
- En modale agent, le champ `GROUPES` s'agrandit automatiquement en hauteur selon le contenu saisi (avec limite visuelle)

### Révisions Automatiques
- Alertes de révision paramétrables
- Période de révision configurable
- Vue dédiée des habilitations à renouveler

### Paramétrage
- Gestion des services, postes, rôles
- Configuration des logiciels et valideurs
- Ajustement des délais d'alerte

## Utilisation

1. Ouvrir [gestion_habilitations.html](gestion_habilitations.html) dans un navigateur
2. Charger un fichier existant ou créer un nouveau registre
3. Activer le chiffrement (optionnel mais recommandé)
4. Gérer agents et habilitations via les onglets

## Technologies

- HTML5 / CSS3 / JavaScript vanilla
- Bibliothèque SheetJS pour Excel
- Web Crypto API (native) pour chiffrement AES-256
- File System Access API pour sauvegarde automatique
- Aucune dépendance npm

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

**Auteur :** Frédérick MURAT
**Année :** 2026

## Sécurité

### Chiffrement obligatoire AES-256-GCM

**Toutes les données sont chiffrées par défaut** dans des fichiers `.habil`. Le chiffrement n'est pas optionnel.

- **Mot de passe obligatoire** : Minimum 8 caractères, demandé à la création
- **Jamais stocké** : Le mot de passe reste en mémoire uniquement (RAM)
- **Dérivation PBKDF2** : 200 000 itérations pour ralentir les attaques par force brute
- **Chiffrement authentifié** : AES-256-GCM avec protection contre les modifications
- **Fichiers illisibles** : Sans le mot de passe correct, les données sont inaccessibles

### Clé de récupération

**Une clé de récupération de 24 mots** est générée automatiquement à la création de chaque registre :

- **Génération automatique** : Clé de 256 bits convertie en 24 mots français
- **Sauvegarde obligatoire** : L'utilisateur doit confirmer avoir sauvegardé sa clé
- **Récupération simple** : En cas d'oubli du mot de passe, la clé permet de le récupérer
- **Téléchargement sécurisé** : Fichier texte avec instructions de conservation
- **Format mnémonique** : Mots faciles à écrire et à conserver (coffre-fort, gestionnaire de mots de passe)

**Comment récupérer un mot de passe oublié :**
1. Charger le fichier `.habil`
2. Cliquer sur "Mot de passe oublié ?"
3. Saisir les 24 mots de la clé de récupération
4. Le mot de passe est automatiquement récupéré et le fichier se charge

### Conformité aux standards de sécurité

L'implémentation cryptographique respecte **les recommandations de sécurité professionnelles** :

- **✓ AES-256-GCM** : Mode recommandé avec authentification intégrée (AEAD)
- **✓ PBKDF2** : Dérivation de clé robuste (200 000 itérations + SHA-256)
- **✓ Salt aléatoire** : 16 octets uniques par fichier (via crypto.getRandomValues)
- **✓ Nonce unique** : 12 octets aléatoires par chiffrement (jamais réutilisé)
- **✓ Web Crypto API** : Bibliothèque standard W3C auditée
- **✓ Mot de passe RAM uniquement** : Aucun stockage persistant du mot de passe

**Niveau de sécurité** : Équivalent aux standards utilisés dans les produits industriels et gouvernementaux pour des fichiers locaux. La protection est efficace contre le vol de disque, la copie de fichier et l'accès hors session.

### Sauvegarde automatique avec persistence

L'application utilise **File System Access API** + **IndexedDB** pour une expérience sans friction :

- **Liaison persistante** : Le fichier est lié à l'application et restauré automatiquement au prochain lancement
- **Permission navigateur** : Le navigateur demande confirmation via notification pour redonner accès
- **Plus de resélection** : Une fois lié, cliquez simplement sur "Ouvrir →" pour charger votre fichier
- **Sauvegarde asynchrone** : Enregistrement automatique en arrière-plan (2 secondes après modification)
- **Indicateur visuel** : Icône ↻ animée pendant la sauvegarde, icône 🔗 quand un fichier est lié
- **Déliaison facile** : Bouton "🔓 Délier ce fichier" sur l'écran d'accueil pour supprimer le lien
- **Pas de blocage** : L'utilisateur peut continuer à travailler pendant la sauvegarde
- **Fallback** : Support du drag&drop classique avec rattachement optionnel

### Export non chiffré

Le bouton **Export audit (.xlsx)** permet d'exporter les données en clair au format Excel, pour archivage ou audit.
