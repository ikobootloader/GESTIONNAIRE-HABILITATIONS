# Changelog

Historique des modifications du Gestionnaire d'Habilitations.

## [2.4.6] - 2026-05-11

## [2.4.7] - 2026-05-12

### Modale "Modifier l'agent"

#### Auto-remplissage du champ GROUPES si unique
- **[js/ui.js](js/ui.js)** : ajout de `applyAgentHabilDefaultGroupe(idx, overwriteExisting)` pour appliquer automatiquement le groupe du logiciel lorsqu'un seul groupe est défini
- Application automatique lors de l'ajout d'une ligne d'habilitation agent
- Application lors du changement de logiciel dans une ligne, avec remplacement cohérent du groupe selon le logiciel sélectionné

### Modale "Modifier l'agent"

#### Champ GROUPES auto-extensible
- **[js/ui.js](js/ui.js)** : remplacement du champ `GROUPES` par une zone multi-ligne auto-ajustable en hauteur
- **[js/ui.js](js/ui.js)** : ajout de `autoGrowAgentHabilGroupesField(idx)` pour adapter la hauteur au contenu (croissance verticale bornée)
- **[js/ui.js](js/ui.js)** : passage des suggestions de groupes en liste cliquable dédiée (compatible multi-ligne)
- **[css/styles.css](css/styles.css)** : ajout de la classe `.agent-groupes-input` (min/max hauteur, resize manuel désactivé, scroll vertical)

### Documentation
- **[README.md](README.md)** : ajout du comportement d'agrandissement vertical automatique du champ `GROUPES`

## [2.4.5] - 2026-05-11

### Modale "Modifier l'agent"

#### Correction autocomplétion multi-groupes
- **[js/ui.js](js/ui.js)** : ajout de `onAgentHabilGroupesInput(idx, rawValue)` pour maintenir les suggestions de groupes du logiciel lors d'une saisie CSV
- **[js/ui.js](js/ui.js)** : branchement `oninput` sur le champ `GROUPES` des lignes "Habilitations par logiciel"
- Les suggestions restent actives après une virgule et proposent des valeurs complétées avec le préfixe déjà saisi (ex: `GROUPE_A, GROUPE_B`)

### Documentation
- **[README.md](README.md)** : ajout de la précision sur la saisie multi-groupes avec suggestions conservées

## [2.4.4] - 2026-05-11

### Modale "Modifier l'agent"

#### Valideur par défaut logiciel appliqué systématiquement
- **[js/ui.js](js/ui.js)** : ajout de `applyAgentHabilDefaultValideur(idx)` pour imposer le premier valideur par défaut du logiciel sur chaque ligne d'habilitation agent
- Application automatique à l'ouverture de la modale agent, à l'ajout de ligne, au changement de logiciel et juste avant sauvegarde
- Le champ `valideur` des lignes "Habilitations par logiciel" est désormais toujours synchronisé avec le premier valideur défini dans les paramètres du logiciel

### Documentation
- **[README.md](README.md)** : ajout de la règle métier de synchronisation automatique du valideur dans la section "Gestion des Habilitations"

## [2.4.3] - 2026-05-11

### Registre des habilitations

#### Nouveaux filtres métier
- **[gestion_habilitations.html](gestion_habilitations.html)** : ajout de 3 filtres dans la barre du registre (`Rôle`, `Permissions`, `Poste`)
- **[js/render.js](js/render.js)** : extension du filtrage dans `renderHabilTable()` avec combinaison des critères `logiciel + rôle + permissions + poste + statut + recherche texte`
- **[js/render.js](js/render.js)** : enrichissement de `populateHabilFilters()` pour peupler dynamiquement les nouvelles listes depuis `DataModel.params.roles`, `DataModel.params.permissions` et `DataModel.params.postes`

### Documentation
- **[README.md](README.md)** : ajout de la mention des filtres avancés dans la section "Gestion des Habilitations"

## [2.4.2] - 2026-05-11

### Interface Agent

#### Repli/dépli des habilitations dans la modale agent
- **[js/ui.js](js/ui.js)** : ajout d'un toggle par habilitation (`▸`/`▾`) avec état local de repli par ligne
- Les habilitations existantes sont maintenant ouvertes en mode replié à l'ouverture d'un agent
- Les nouvelles habilitations ajoutées restent dépliées pour une saisie immédiate
- **[css/styles.css](css/styles.css)** : styles dédiés au bouton de toggle et masquage des lignes repliées

### Documentation
- **[README.md](README.md)** : ajout du comportement de repli/dépli dans la section "Gestion des Agents"

## [2.4.1] - 2026-05-08

### Documentation

#### Ajout de la section "Conformité aux standards de sécurité" dans le README
- **[README.md:113-123](README.md#L113-L123)** : Nouvelle sous-section validant la conformité cryptographique
- Mise en avant de l'utilisation d'AES-256-GCM (mode AEAD recommandé)
- Documentation de PBKDF2 avec 200 000 itérations + SHA-256
- Confirmation du salt et nonce aléatoires uniques
- Validation de l'utilisation de Web Crypto API (standard W3C)
- Précision sur le niveau de sécurité (équivalent standards industriels et gouvernementaux)
- Point essentiel pour un gestionnaire d'habilitations destiné à l'administration publique

## [2.4.0] - 2026-05-08

### Refonte du header avec icônes uniquement

#### Indicateur de sauvegarde unifié avec Material Symbols
- **[gestion_habilitations.html:17](gestion_habilitations.html#L17)** : Intégration de Material Symbols Outlined de Google Fonts
- **[gestion_habilitations.html:76-80](gestion_habilitations.html#L76-L80)** : Fusion des indicateurs de sauvegarde en un seul
- **[css/styles.css:209-244](css/styles.css#L209-L244)** : Système d'icônes superposées avec position absolute
- **[js/ui.js:68-122](js/ui.js#L68-L122)** : Logique de transition entre 3 états
- **États de l'indicateur unique** :
  - Non sauvegardé : ○ (cercle vide, background gris)
  - Sauvegarde en cours : sync Material Symbols qui tourne (background bleu)
  - Sauvegardé : ✓ (check, background vert)
- **Animation optimisée** : Seule l'icône sync tourne, pas le conteneur background
- Transitions fluides entre les états avec délais progressifs

#### Simplification des boutons
- **[gestion_habilitations.html:83-89](gestion_habilitations.html#L83-L89)** : Retrait des textes, conservation des icônes uniquement
- **[css/styles.css:246-259](css/styles.css#L246-L259)** : Refonte encrypt-indicator (icône uniquement)
- Tous les boutons avec attribut `title` pour tooltips au survol
- Interface plus épurée et moderne
- Gain d'espace dans le header

### Import Excel depuis l'application

#### Bouton d'import dans le header
- **[gestion_habilitations.html:82](gestion_habilitations.html#L82)** : Ajout du bouton "⬆ Importer Excel" dans le header
- Accessible à tout moment une fois le registre chargé
- Input file caché pour sélection de fichiers .xlsx

#### Modale d'options d'import
- **[gestion_habilitations.html:614-659](gestion_habilitations.html#L614-L659)** : Modale de choix du mode d'importation
- **Mode fusion** (recommandé) : Fusionne les données importées avec les existantes
  - Mise à jour des éléments existants (même ID)
  - Ajout des nouveaux éléments
  - Conservation des données actuelles non présentes dans le fichier
- **Mode remplacement** : Remplace toutes les données par celles du fichier
  - Action irréversible avec avertissement visuel

#### Logique de fusion intelligente
- **[js/files.js:342-423](js/files.js#L342-L423)** : Fonction `mergeData()` pour fusion des données
- Fusion par ID pour agents, logiciels et habilitations
- Ajout non-duplicatif des valeurs de paramètres (services, postes, rôles, permissions)
- Migration automatique des données après fusion

#### Fonctions globales d'import
- **[js/app.js:764-869](js/app.js#L764-L869)** : Fonctions `handleImportExcel()`, `closeImportExcelModal()`, `confirmImportExcel()`
- Validation du format de fichier (.xlsx uniquement)
- Comptage et affichage du nombre d'éléments importés
- Marquage automatique comme non sauvegardé après import
- Rafraîchissement complet de l'interface

#### Cas d'usage
- Import de données depuis un export Excel précédent
- Synchronisation entre plusieurs registres
- Restauration partielle de données
- Migration de données depuis d'autres sources

## [2.3.0] - 2026-05-08

### Groupes de sécurité multiples

#### Groupes par logiciel
- **[js/data.js](js/data.js)** : Ajout du champ `groupes[]` aux logiciels pour définir les groupes de sécurité par défaut
- **[js/render.js:307-323](js/render.js#L307-L323)** : Interface de gestion des groupes dans l'éditeur de logiciels (chips)
- **[js/ui.js:468-501](js/ui.js#L468-L501)** : Fonctions `addGroupeLogiciel()` et `removeGroupeLogiciel()`
- **[css/styles.css:440-447](css/styles.css#L440-L447)** : Styles pour les chips de groupes

#### Groupes multiples par habilitation
- **[js/data.js:69-95](js/data.js#L69-L95)** : Migration automatique `groupe` (string) → `groupes` (array)
- **[gestion_habilitations.html:429-433](gestion_habilitations.html#L429-L433)** : Interface multi-sélection avec chips
- **[js/ui.js:388-469](js/ui.js#L388-L469)** : Gestion complète des groupes dans la modale d'habilitation
- **[css/styles.css:461-466](css/styles.css#L461-L466)** : Styles pour les groupes dans la modale

#### Suggestions intelligentes
- **[js/ui.js:822-841](js/ui.js#L822-L841)** : Fonction `onHabilLogicielChange()` suggère les groupes du logiciel sélectionné
- Les groupes définis au niveau logiciel apparaissent dans la datalist lors de la création d'habilitations

#### Export/Import Excel
- **[js/files.js:189-193](js/files.js#L189-L193)** : Export des groupes des logiciels (colonne "Groupes")
- **[js/files.js:204](js/files.js#L204)** : Export des groupes multiples des habilitations (séparés par virgule)
- **[js/files.js:273-277](js/files.js#L273-L277)** : Import avec support rétrocompatibilité (ancien champ "Groupe" unique)
- **[js/files.js:279-303](js/files.js#L279-L303)** : Import des groupes multiples avec parsing intelligent

### Autocomplétion valideurs

#### Suggestions agents existants
- **[gestion_habilitations.html:436](gestion_habilitations.html#L436)** : Champ valideur avec autocomplétion
- **[js/ui.js:510-541](js/ui.js#L510-L541)** : Fonction `onValideurInput()` avec recherche intelligente
- **[js/ui.js:543-555](js/ui.js#L543-L555)** : Sélection depuis les suggestions
- **[css/styles.css:450-457](css/styles.css#L450-L457)** : Styles dropdown d'autocomplétion

#### Création rapide d'agents
- **[gestion_habilitations.html:578-603](gestion_habilitations.html#L578-L603)** : Modale légère de création agent (Nom, Prénom, Service)
- **[js/ui.js:567-651](js/ui.js#L567-L651)** : Fonctions `showQuickAgentModal()`, `saveQuickAgent()`
- Création automatique d'agent si valideur introuvable dans la base
- Parsing intelligent du nom complet saisi (Nom Prénom)

### Liens valideurs vers agents

#### Affichage amélioré
- **[js/utils.js:88-104](js/utils.js#L88-L104)** : Fonction `valideurLink()` génère un lien cliquable si agent trouvé
- **[js/render.js:198,250](js/render.js#L198,250)** : Valideurs affichés comme liens dans les tables
- Clic sur valideur ouvre directement la fiche agent correspondante

#### Badges groupes
- **[js/utils.js:106-116](js/utils.js#L106-L116)** : Fonction `groupesBadges()` pour affichage élégant
- **[js/render.js:196](js/render.js#L196)** : Affichage des groupes multiples en badges dans les tables
- **[css/styles.css:468-469](css/styles.css#L468-L469)** : Styles badges groupes (monospace, couleur bleue)

### Migration et rétrocompatibilité

#### Migration automatique des données
- **[js/data.js:73-95](js/data.js#L73-L95)** : Fonction `migrateData()` appelée au chargement
- Conversion automatique `groupe` string → `groupes` array
- Ajout des champs `groupes[]` aux logiciels existants
- Ajout des champs `valideurs[]` aux logiciels existants

#### Support formats anciens
- **[js/files.js:280-290](js/files.js#L280-L290)** : Import Excel avec support "Groupe" (singulier) et "Groupes" (pluriel)
- **[js/render.js:147-150](js/render.js#L147-L150)** : Recherche et filtres adaptés aux groupes multiples
- Aucune perte de données lors de la migration

### Corrections techniques

#### Ajustements render.js
- **[js/render.js:147,163](js/render.js#L147,163)** : Correction filtrage et tri pour groupes array
- Recherche fulltext inclut tous les groupes de sécurité

#### Ajustements ui.js
- **[js/ui.js:151](js/ui.js#L151)** : Correction chargement habilitations agent (`groupes` au lieu de `groupe`)
- **[js/ui.js:859-866](js/ui.js#L859-L866)** : Fonction `saveHabil()` complète avec sauvegarde des groupes multiples

## [2.2.1] - 2026-05-07

### Corrections de bugs

#### Bouton "Nouveau registre vierge" non fonctionnel
- **[css/styles.css:340](css/styles.css#L340)** : Correction du z-index de `.modal-overlay` (500 → 1500)
- La modale de création de mot de passe s'affichait derrière le splash screen (z-index: 1000)
- **[js/app.js:421-447](js/app.js#L421-L447)** : Ajout de gestion d'erreurs avec try/catch dans les fonctions globales async
- Correction permet la création de nouveaux registres depuis l'écran de connexion

#### Statut de chiffrement incorrect dans les paramètres
- **[js/ui.js:468-491](js/ui.js#L468-L491)** : Implémentation de `renderSecurityPanel()`
- Affichage correct du statut de chiffrement (chiffré/non chiffré) dans l'onglet Paramètres
- Indication de la sauvegarde automatique quand un handle de fichier est actif

#### Mot de passe non demandé lors de l'ouverture via bouton "Ouvrir"
- **[js/app.js:168-222](js/app.js#L168-L222)** : Ajout de `promptPasswordForDecryption()` pour demander le mot de passe via modale
- Lors de l'ouverture d'un fichier .habil via le bouton "Ouvrir →", une modale demande maintenant le mot de passe
- Correction de l'erreur "Fichier trop court ou tronqué" lors du chargement

### Améliorations

#### Sauvegarde automatique optimisée avec persistence
- **[js/storage.js](js/storage.js)** : Nouveau module de stockage persistant avec IndexedDB
- **[js/files.js:108-133](js/files.js#L108-L133)** : Ajout de `openFileWithHandle()` utilisant `showOpenFilePicker`
- **[js/app.js](js/app.js)** : Persistence du handle de fichier entre les sessions
- Le handle de fichier est **sauvegardé dans IndexedDB** et restauré au chargement
- Le navigateur demande automatiquement confirmation via notification pour redonner les permissions
- **Plus besoin de resélectionner le fichier** à chaque connexion - le fichier reste lié
- Bouton "🔓 Délier ce fichier" pour supprimer le lien persistant si souhaité
- Sauvegarde automatique activée automatiquement lors de l'ouverture d'un fichier .habil

#### Interface
- **[gestion_habilitations.html:80](gestion_habilitations.html#L80)** : Icône de sauvegarde automatique changée (⇄ → ↻)
- Symbole de recyclage plus intuitif pour indiquer la sauvegarde en cours

## [2.2.0] - 2026-05-07

### Système de récupération par clé de sécurité

#### Clé de récupération automatique
- **Génération automatique** : Clé de 24 mots générée à la création de chaque registre
- **Format mnémonique** : 24 mots en français faciles à mémoriser ou écrire
- **Affichage obligatoire** : L'utilisateur doit confirmer avoir sauvegardé sa clé
- **Téléchargement sécurisé** : Fichier texte avec instructions de conservation
- **Copie presse-papiers** : Fonction de copie rapide intégrée

#### Protection double couche
- **Nouveau format HAB2** : Support de la clé de récupération
- **Rétrocompatibilité HAB1** : Lecture des anciens fichiers sans clé
- **Mot de passe chiffré** : Le mot de passe est stocké chiffré avec la clé de récupération
- **Récupération autonome** : Pas besoin de contact avec un support

#### Interface de récupération
- **Lien "Mot de passe oublié "** : Accessible depuis l'écran de chargement
- **Modale de saisie** : Interface claire pour saisir les 24 mots
- **Validation robuste** : Vérification du format et de la validité de la clé
- **Récupération automatique** : Le fichier se charge automatiquement après récupération

#### Sécurité renforcée
- **256 bits d'entropie** : Clé de récupération aussi sécurisée qu'un mot de passe fort
- **Chiffrement AES-GCM** : Protection cryptographique du mot de passe stocké
- **Pas de stockage** : La clé n'est jamais sauvegardée dans le navigateur
- **Wordlist française** : 256 mots soigneusement sélectionnés

#### Licence open source
- **Licence MIT** : Code open source sous licence permissive
- **Auteur** : Frédérick MURAT
- **Année** : 2026

## [2.1.0] - 2026-05-07

### Sécurité renforcée - Chiffrement obligatoire

#### Mot de passe obligatoire
- **Création de registre** : Mot de passe obligatoire (min. 8 caractères) à la création
- **Modale de mot de passe** : Interface dédiée avec confirmation et validation robuste
- **Mémorisation en mémoire** : Le mot de passe n'est jamais persisté, stocké uniquement en RAM

#### Chiffrement par défaut
- **Format .habil obligatoire** : Tous les nouveaux registres sont chiffrés en AES-256-GCM
- **Suppression de la toggle** : Le chiffrement n'est plus optionnel
- **Import Excel** : Les fichiers .xlsx peuvent être importés mais sont automatiquement chiffrés au premier enregistrement

#### Sauvegarde automatique via File System Access API
- **Rattachement de fichier** : L'utilisateur sélectionne l'emplacement du fichier .habil au démarrage
- **Sauvegarde asynchrone** : Enregistrement automatique en arrière-plan (debounce 2s)
- **Queue de sauvegarde** : Système de file d'attente pour éviter les conflits
- **Indicateur visuel** : Icône ⇄ animée dans le header pendant la sauvegarde
- **Fallback** : Téléchargement classique si File System Access API indisponible

#### Améliorations UX
- **Splash screen simplifié** : Message clair sur le chiffrement obligatoire
- **Champ mot de passe conditionnel** : Affiché uniquement pour les fichiers .habil
- **Export Excel non chiffré** : Fonction dédiée pour export d'audit en clair
- **Messages d'erreur explicites** : Retours clairs en cas d'échec de sauvegarde

## [2.0.1] - 2026-05-07

### Corrections de bugs

#### Erreurs JavaScript corrigées
- **[ui.js:117](js/ui.js#L117)** : Apostrophes non échappées dans les chaînes littérales (lignes 117, 234, 374)
- **[render.js:30](js/render.js#L30)** : Éléments DOM manquants pour les statistiques du dashboard
- **switchTab is not defined** : Fonction désormais correctement exposée globalement

#### Fonctions globales ajoutées
- Exposition de toutes les fonctions appelées depuis les gestionnaires onclick HTML
- `saveFile()`, `exportFile()`, `confirmDisconnect()` dans [js/app.js](js/app.js)
- `openAgentModal()`, `closeAgentModal()`, `saveAgent()` dans [js/ui.js](js/ui.js)
- `openHabilModal()`, `closeHabilModal()`, `addLogiciel()`, `addHabilLine()` dans [js/ui.js](js/ui.js)

#### Synchronisation HTML/JS
- Correction des IDs d'éléments DOM (`confirmMsg` vs `confirmMessage`, `habilLines` vs `habilLinesContainer`)
- Ajout de la structure HTML des cartes de statistiques dans le dashboard

## [2.0.0] - 2026-05-07

### Refactorisation majeure - Architecture modulaire

#### Structure
- **Séparation CSS** : Extraction complète dans [css/styles.css](css/styles.css)
- **Séparation JavaScript** : Code réorganisé en 8 modules distincts
- **Architecture propre** : Respect des principes Clean Code et SOLID

#### Modules créés
- **[js/utils.js](js/utils.js)** : Utilitaires généraux (dates, formatage, échappement HTML)
- **[js/data.js](js/data.js)** : Modèle de données centralisé avec API CRUD
- **[js/security.js](js/security.js)** : Cryptographie AES-256-GCM avec PBKDF2
- **[js/pagination.js](js/pagination.js)** : Gestionnaire de pagination réutilisable
- **[js/files.js](js/files.js)** : Import/Export Excel et fichiers chiffrés
- **[js/render.js](js/render.js)** : Rendu des tables, statistiques et dashboards
- **[js/ui.js](js/ui.js)** : Interface utilisateur (modales, toasts, navigation)
- **[js/app.js](js/app.js)** : Orchestrateur principal et initialisation

#### Bénéfices
- **Maintenabilité** : Code organisé par domaine métier
- **Lisibilité** : Séparation des responsabilités claire
- **Évolutivité** : Ajout de fonctionnalités facilité
- **Performance** : Pas d'impact, application toujours locale
- **Documentation** : Code entièrement commenté en français

## [1.1.0] - 2026-05-07

### Ajouté
- Pagination pour l'onglet Agents
- Pagination pour l'onglet Habilitations
- Pagination pour l'onglet Révisions
- Module de pagination réutilisable
- README.md avec documentation complète
- CHANGELOG.md pour suivi des versions

## [1.0.0] - Version initiale

### Fonctionnalités
- Gestion des agents (CRUD)
- Gestion des habilitations (CRUD)
- Système de révisions automatiques
- Alertes paramétrables
- Chiffrement AES-256
- Export/Import Excel
- Thème clair/sombre
- Interface responsive
