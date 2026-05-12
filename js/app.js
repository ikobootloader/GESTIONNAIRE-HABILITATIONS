/**
 * Module Principal - Orchestrateur de l'Application
 * Initialisation, gestion du splash screen, sauvegarde
 */

const App = {
  splashFile: null,

  /**
   * Initialise l'application au chargement de la page
   */
  async init() {
    this.setupSplashScreen();
    this.setupFileHandlers();
    this.setupAutoSave();
    await this.restorePersistedHandle();
  },

  /**
   * Restaure un handle de fichier persisté depuis IndexedDB
   */
  async restorePersistedHandle() {
    console.log('[App] restorePersistedHandle: début');

    if (!FileManager.isFSAAvailable()) {
      console.log('[App] File System Access API non disponible');
      return;
    }

    try {
      console.log('[App] Récupération du handle depuis IndexedDB...');
      const handle = await PersistentStorage.getFileHandle();

      if (!handle) {
        console.log('[App] Aucun handle trouvé dans IndexedDB');
        return;
      }

      console.log('[App] Handle trouvé:', handle.name);

      // Vérifier les permissions (le navigateur demandera confirmation)
      console.log('[App] Vérification des permissions...');
      const hasPermission = await PersistentStorage.verifyPermission(handle, true);
      console.log('[App] Permissions accordées:', hasPermission);

      if (hasPermission) {
        DataModel.state.fileHandle = handle;
        DataModel.state.currentFile = handle.name;
        console.log('[App] ✓ Handle restauré avec succès:', handle.name);

        // Afficher un indicateur visuel qu'un fichier est lié
        const fileDrop = document.getElementById('fileDrop');
        const fileDropIcon = fileDrop.querySelector('.file-drop-icon');
        const fileDropText = fileDrop.querySelector('p');

        if (fileDropIcon && fileDropText) {
          fileDropIcon.textContent = '🔗';
          fileDropText.innerHTML = `<strong>Fichier lié :</strong> ${handle.name}<br><small style="color:var(--text3)">Cliquez sur "Ouvrir →" pour charger ce fichier</small><br><br><button class="btn btn-ghost btn-sm" onclick="unlinkFile()" style="margin-top:8px;">🔓 Délier ce fichier</button>`;
          console.log('[App] Interface mise à jour avec fichier lié');
        }
      } else {
        // Permission refusée, supprimer le handle
        console.log('[App] Permission refusée, suppression du handle');
        await PersistentStorage.clearFileHandle();
        DataModel.state.fileHandle = null;
        DataModel.state.currentFile = null;
      }
    } catch (error) {
      console.error('[App] ✕ Erreur lors de la restauration du handle:', error);
      await PersistentStorage.clearFileHandle();
    }
  },

  /**
   * Configure le splash screen et ses gestionnaires
   */
  setupSplashScreen() {
    const fileDrop = document.getElementById('fileDrop');
    const fileInput = document.getElementById('fileInput');
    const splashPwd = document.getElementById('splashPwd');

    // Drag & drop
    fileDrop.addEventListener('dragover', e => {
      e.preventDefault();
      fileDrop.classList.add('drag');
    });

    fileDrop.addEventListener('dragleave', () => {
      fileDrop.classList.remove('drag');
    });

    fileDrop.addEventListener('drop', e => {
      e.preventDefault();
      fileDrop.classList.remove('drag');
      const f = e.dataTransfer.files[0];
      if (f) {
        fileInput.files = e.dataTransfer.files;
        this.onSplashFile(f);
      }
    });

    // Sélection fichier
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) this.onSplashFile(e.target.files[0]);
    });

    // Enter pour charger
    splashPwd.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.loadFile();
      }
    });

    // Indicateur longueur mot de passe
    splashPwd.addEventListener('input', () => {
      const len = splashPwd.value.length;
      const hint = document.getElementById('pwdLengthHint');
      if (!hint) return;

      if (len === 0) {
        hint.textContent = '';
        return;
      }

      hint.textContent = len + ' caractère' + (len > 1 ? 's' : '') + ' saisi' + (len > 1 ? 's' : '');
      hint.style.color = len >= 4 ? 'var(--green)' : 'var(--orange)';
    });
  },

  /**
   * Gestionnaire de sélection de fichier
   * @param {File} file - Fichier sélectionné
   */
  onSplashFile(file) {
    this.splashFile = file;
    this.hideSplashError();

    const isEnc = file.name.toLowerCase().endsWith('.habil');
    const pwdField = document.getElementById('pwdField');
    const pwdFieldLabel = document.getElementById('pwdFieldLabel');

    if (isEnc) {
      pwdField.style.display = 'block';
      pwdFieldLabel.textContent = 'MOT DE PASSE (REQUIS POUR DÉCHIFFRER)';
    } else {
      pwdField.style.display = 'none';
    }
  },

  /**
   * Charge le fichier sélectionné
   */
  async loadFile() {
    // Si FSA disponible et qu'un handle existe déjà, charger ce fichier
    if (FileManager.isFSAAvailable() && !this.splashFile && DataModel.state.fileHandle) {
      await this.loadLinkedFile();
      return;
    }

    // Si FSA disponible, utiliser showOpenFilePicker pour avoir directement un handle
    if (FileManager.isFSAAvailable() && !this.splashFile) {
      await this.loadFileWithHandle();
      return;
    }

    if (!this.splashFile) {
      this.showSplashError('Veuillez sélectionner un fichier.');
      return;
    }

    const isEnc = this.splashFile.name.toLowerCase().endsWith('.habil');
    const pwd = document.getElementById('splashPwd').value;

    if (isEnc && !pwd) {
      this.showSplashError('Mot de passe requis pour ouvrir un fichier chiffré.');
      return;
    }

    try {
      const arrayBuffer = await this.splashFile.arrayBuffer();

      let data;
      let handle = null;

      if (isEnc) {
        const bytes = new Uint8Array(arrayBuffer);
        data = await FileManager.importEncrypted(bytes, pwd);
        DataModel.state.password = pwd; // Mémoriser le mot de passe

        // Si fichier .habil et FSA disponible, demander le handle pour sauvegarde auto
        if (FileManager.isFSAAvailable()) {
          UI.confirm({
            title: 'Activer la sauvegarde automatique ',
            message: 'Pour activer la sauvegarde automatique, sélectionnez l\'emplacement de ce fichier.',
            onConfirm: async () => {
              const h = await FileManager.pickFileHandle();
              if (h) {
                DataModel.state.fileHandle = h;
                DataModel.state.currentFile = h.name;
                await FileManager.autoSave(true); // Sauvegarde immédiate
                UI.toast('Sauvegarde automatique activée', 'success');
                UI.updateEncryptIndicator();
                Renderer.renderSettings();
              }
            }
          });
        }
      } else {
        data = FileManager.importExcel(arrayBuffer);
      }

      DataModel.loadData(data);
      DataModel.state.currentFile = this.splashFile.name;
      DataModel.markSaved();
      this.showApp();
      Renderer.renderAll();
      UI.updateSaveIndicator();
      UI.updateEncryptIndicator();
      UI.toast('Fichier chargé avec succès', 'success');
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      this.showSplashError(error.message);
    }
  },

  /**
   * Charge le fichier lié (handle déjà persisté)
   */
  async loadLinkedFile() {
    const handle = DataModel.state.fileHandle;
    if (!handle) return;

    try {
      // Vérifier les permissions
      const hasPermission = await PersistentStorage.verifyPermission(handle, true);
      if (!hasPermission) {
        this.showSplashError('Permission refusée pour accéder au fichier lié.');
        await PersistentStorage.clearFileHandle();
        DataModel.state.fileHandle = null;
        DataModel.state.currentFile = null;
        location.reload(); // Recharger pour réinitialiser l'affichage
        return;
      }

      const file = await handle.getFile();
      const isEnc = file.name.toLowerCase().endsWith('.habil');

      const arrayBuffer = await file.arrayBuffer();
      let data;
      let pwd = null;

      if (isEnc) {
        // Demander le mot de passe via modale
        pwd = await this.promptPasswordForDecryption();
        if (!pwd) {
          this.showSplashError('Mot de passe requis pour ouvrir le fichier.');
          return;
        }

        const bytes = new Uint8Array(arrayBuffer);
        data = await FileManager.importEncrypted(bytes, pwd);
        DataModel.state.password = pwd;
      } else {
        data = FileManager.importExcel(arrayBuffer);
      }

      DataModel.loadData(data);
      DataModel.state.currentFile = file.name;
      DataModel.markSaved();
      this.showApp();
      Renderer.renderAll();
      UI.updateSaveIndicator();
      UI.updateEncryptIndicator();
      UI.toast('Fichier lié chargé avec sauvegarde automatique activée', 'success');
    } catch (error) {
      console.error('Erreur lors du chargement du fichier lié:', error);
      this.showSplashError(error.message);
    }
  },

  /**
   * Charge un fichier avec handle (File System Access API)
   */
  async loadFileWithHandle() {
    const result = await FileManager.openFileWithHandle();
    if (!result) return; // Utilisateur a annulé

    const { file, handle } = result;
    const isEnc = file.name.toLowerCase().endsWith('.habil');

    try {
      const arrayBuffer = await file.arrayBuffer();
      let data;
      let pwd = null;

      if (isEnc) {
        // Demander le mot de passe via modale
        pwd = await this.promptPasswordForDecryption();
        if (!pwd) {
          this.showSplashError('Mot de passe requis pour ouvrir le fichier.');
          return;
        }

        const bytes = new Uint8Array(arrayBuffer);
        data = await FileManager.importEncrypted(bytes, pwd);
        DataModel.state.password = pwd;
        DataModel.state.fileHandle = handle; // Conserver le handle pour sauvegarde auto

        // Sauvegarder le handle dans IndexedDB pour persistance
        await PersistentStorage.saveFileHandle(handle);
      } else {
        data = FileManager.importExcel(arrayBuffer);
      }

      DataModel.loadData(data);
      DataModel.state.currentFile = file.name;
      DataModel.markSaved();
      this.showApp();
      Renderer.renderAll();
      UI.updateSaveIndicator();
      UI.updateEncryptIndicator();

      if (isEnc && handle) {
        UI.toast('Fichier chargé avec sauvegarde automatique activée', 'success');
      } else {
        UI.toast('Fichier chargé avec succès', 'success');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      this.showSplashError(error.message);
    }
  },

  /**
   * Demande le mot de passe pour déchiffrer un fichier
   * @returns {Promise<string|null>} Mot de passe ou null
   */
  async promptPasswordForDecryption() {
    return new Promise((resolve) => {
      UI.showPasswordModal({
        title: 'Mot de passe requis',
        message: 'Saisissez le mot de passe pour déchiffrer ce fichier.',
        isCreation: false,
        onConfirm: (pwd) => resolve(pwd),
        onCancel: () => resolve(null)
      });
    });
  },

  /**
   * Crée un nouveau fichier vierge
   */
  async createNewFile() {
    // Demander le mot de passe OBLIGATOIRE
    const pwd = await this.promptPasswordCreation();
    if (!pwd) {
      this.showSplashError('Un mot de passe est obligatoire pour créer un nouveau registre.');
      return;
    }

    // Générer la clé de récupération
    const recoveryKey = Recovery.generateRecoveryKey();
    DataModel.state.recoveryKey = recoveryKey.bytes;

    // Afficher la clé de récupération à l'utilisateur
    const keySaved = await this.showRecoveryKey(recoveryKey);
    if (!keySaved) {
      this.showSplashError('Vous devez sauvegarder la clé de récupération pour continuer.');
      return;
    }

    DataModel.resetAll();
    DataModel.state.password = pwd;
    DataModel.state.recoveryKey = recoveryKey.bytes;

    // Demander l'emplacement du fichier via File System Access API
    if (FileManager.isFSAAvailable()) {
      const handle = await FileManager.pickFileHandle();
      if (handle) {
        DataModel.state.fileHandle = handle;
        DataModel.state.currentFile = handle.name;

        // Sauvegarder le handle dans IndexedDB pour persistance
        await PersistentStorage.saveFileHandle(handle);
      } else {
        // L'utilisateur a annulé, nom par défaut
        DataModel.state.currentFile = 'habilitations_' + Utils.today() + '.habil';
      }
    } else {
      DataModel.state.currentFile = 'habilitations_' + Utils.today() + '.habil';
    }

    // Sauvegarde initiale
    if (DataModel.state.fileHandle) {
      try {
        await FileManager.autoSave(true);
        console.log('[INFO] Sauvegarde initiale réussie');
      } catch (error) {
        console.error('[ERROR] Échec de la sauvegarde initiale:', error);
        this.showSplashError('Erreur lors de la création du fichier : ' + error.message + '. Veuillez réessayer.');
        // Réinitialiser l'état
        DataModel.state.fileHandle = null;
        DataModel.state.password = null;
        DataModel.state.recoveryKey = null;
        DataModel.state.currentFile = null;
        return;
      }
    } else {
      // Pas de handle, proposer de télécharger le fichier maintenant
      UI.confirm({
        title: 'Sauvegarder le fichier maintenant ',
        message: 'Voulez-vous télécharger le fichier maintenant  Sinon, vos données seront perdues à la fermeture.',
        onConfirm: async () => {
          await FileManager.downloadFile({
            filename: DataModel.state.currentFile,
            encrypt: true,
            password: pwd
          });
        }
      });
    }

    DataModel.markSaved();
    this.showApp();
    Renderer.renderAll();
    UI.updateSaveIndicator();
    UI.updateEncryptIndicator();
    UI.toast('Nouveau registre créé (chiffré AES-256 avec clé de récupération)', 'success');
  },

  /**
   * Affiche la clé de récupération à l'utilisateur
   * @param {Object} recoveryKey - Clé de récupération générée
   * @returns {Promise<boolean>} true si l'utilisateur a confirmé la sauvegarde
   */
  async showRecoveryKey(recoveryKey) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('recoveryKeyModalOverlay');
      const display = document.getElementById('recoveryKeyDisplay');
      const checkbox = document.getElementById('recoveryKeySavedCheck');
      const confirmBtn = document.getElementById('recoveryKeyConfirm');

      display.value = recoveryKey.formatted;
      checkbox.checked = false;
      confirmBtn.disabled = true;

      // Activer le bouton uniquement si la checkbox est cochée
      checkbox.onchange = () => {
        confirmBtn.disabled = !checkbox.checked;
      };

      // Stocker temporairement la clé pour les fonctions de copie/téléchargement
      window._tempRecoveryMnemonic = recoveryKey.mnemonic;

      overlay.classList.add('show');

      window._resolveRecoveryKey = () => {
        overlay.classList.remove('show');
        window._tempRecoveryMnemonic = null;
        resolve(true);
      };
    });
  },

  /**
   * Demande la création d'un nouveau mot de passe
   * @returns {Promise<string|null>} Mot de passe ou null
   */
  async promptPasswordCreation() {
    return new Promise((resolve) => {
      UI.showPasswordModal({
        title: 'Créer un mot de passe',
        message: 'Définissez un mot de passe pour protéger vos données. Ce mot de passe sera nécessaire à chaque ouverture du fichier.',
        isCreation: true,
        onConfirm: (pwd) => resolve(pwd),
        onCancel: () => resolve(null)
      });
    });
  },

  /**
   * Affiche l'application principale
   */
  showApp() {
    document.getElementById('splash').classList.add('hidden');
    document.getElementById('app').classList.add('show');
  },

  /**
   * Affiche une erreur dans le splash screen
   * @param {string} message - Message d'erreur
   */
  showSplashError(message) {
    const err = document.getElementById('splashError');
    err.textContent = message;
    err.classList.add('show');
  },

  /**
   * Cache l'erreur du splash screen
   */
  hideSplashError() {
    const err = document.getElementById('splashError');
    err.classList.remove('show');
  },

  /**
   * Configure les gestionnaires de fichiers (sauvegarde, export)
   */
  setupFileHandlers() {
    // Bouton sauvegarder
    const saveBtn = document.getElementById('btnSave');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.save());
    }

    // Bouton sauvegarder sous
    const saveAsBtn = document.getElementById('btnSaveAs');
    if (saveAsBtn) {
      saveAsBtn.addEventListener('click', () => this.saveAs());
    }
  },

  /**
   * Sauvegarde le fichier
   */
  async save() {
    // Si handle disponible, utiliser la sauvegarde auto
    if (DataModel.state.fileHandle && DataModel.state.password) {
      await FileManager.autoSave(true);
      UI.toast('Fichier sauvegardé', 'success');
      return;
    }

    // Sinon, téléchargement classique
    const currentFile = DataModel.state.currentFile;

    if (!currentFile) {
      // Créer un nouveau fichier avec mot de passe
      const pwd = await this.promptPasswordCreation();
      if (!pwd) return;

      DataModel.state.password = pwd;

      if (FileManager.isFSAAvailable()) {
        const handle = await FileManager.pickFileHandle();
        if (handle) {
          DataModel.state.fileHandle = handle;
          DataModel.state.currentFile = handle.name;
          await FileManager.autoSave(true);
          UI.toast('Fichier sauvegardé', 'success');
          UI.updateEncryptIndicator();
          return;
        }
      }

      // Fallback: téléchargement classique
      await FileManager.downloadFile({
        filename: 'habilitations_' + Utils.today() + '.habil',
        encrypt: true,
        password: pwd
      });
      return;
    }

    const encrypt = currentFile.endsWith('.habil');
    const password = encrypt ? DataModel.state.password || await this.promptPassword() : null;

    if (encrypt && !password) return;

    await FileManager.downloadFile({
      filename: currentFile,
      encrypt,
      password
    });
  },

  /**
   * Sauvegarde sous (nouveau nom)
   */
  async saveAs() {
    const filename = prompt('Nom du fichier :', DataModel.state.currentFile || 'habilitations');
    if (!filename) return;

    const encrypt = filename.toLowerCase().endsWith('.habil');
    let finalFilename = filename;

    if (encrypt && !finalFilename.endsWith('.habil')) {
      finalFilename += '.habil';
    } else if (!encrypt && !finalFilename.endsWith('.xlsx')) {
      finalFilename += '.xlsx';
    }
    const password = encrypt ? await this.promptPassword() : null;
    if (encrypt && !password) return;

    await FileManager.downloadFile({
      filename: finalFilename,
      encrypt,
      password
    });
  },

  /**
   * Demande le mot de passe pour chiffrement
   * @returns {Promise<string|null>} Mot de passe ou null
   */
  async promptPassword() {
    const pwd = prompt('Mot de passe pour chiffrement (min. 4 caractères) :');
    if (!pwd) return null;

    if (pwd.length < 4) {
      UI.toast('Le mot de passe doit contenir au moins 4 caractères', 'error');
      return null;
    }

    return pwd;
  },

  /**
   * Configure la sauvegarde automatique
   */
  setupAutoSave() {
    // Sauvegarde automatique toutes les 5 minutes si non sauvegardé
    setInterval(() => {
      if (DataModel.state.unsaved && DataModel.state.currentFile) {
        console.log('Auto-save: données non sauvegardées détectées');
        // Note: Ne pas sauvegarder automatiquement pour éviter de perdre le mot de passe
      }
    }, 300000);

    // Avertissement avant fermeture si non sauvegardé
    window.addEventListener('beforeunload', (e) => {
      if (DataModel.state.unsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
};

// Fonctions globales pour compatibilité onclick
async function loadFile() {
  try {
    await App.loadFile();
  } catch (error) {
    console.error('[ERROR] loadFile:', error);
    App.showSplashError('Erreur lors du chargement : ' + error.message);
  }
}

async function createNewFile() {
  try {
    await App.createNewFile();
  } catch (error) {
    console.error('[ERROR] createNewFile:', error);
    App.showSplashError('Erreur lors de la création : ' + error.message);
  }
}

async function saveFile() {
  try {
    await App.save();
  } catch (error) {
    console.error('[ERROR] saveFile:', error);
    UI.toast('Erreur lors de la sauvegarde : ' + error.message, 'error');
  }
}
function exportFile() {
  const includeAgentLabel = window.confirm(
    'Inclure une colonne "Agent" (Nom Prénom) dans la feuille Habilitations \n\n' +
    'Oui : export lisible en clair (AgentID conservé)\n' +
    'Non : export standard'
  );
  FileManager.downloadExcel(
    DataModel.exportData(),
    'export_habilitations_' + Utils.today() + '.xlsx',
    { includeAgentLabel }
  );
}
function confirmDisconnect() {
  if (DataModel.state.unsaved) {
    UI.confirm({
      title: 'Fermer sans sauvegarder ',
      message: 'Des modifications non sauvegardées seront perdues.',
      onConfirm: () => location.reload()
    });
  } else {
    location.reload();
  }
}

// Fonctions de gestion de la clé de récupération
function copyRecoveryKey() {
  const mnemonic = window._tempRecoveryMnemonic;
  if (!mnemonic) return;

  navigator.clipboard.writeText(mnemonic).then(() => {
    UI.toast('Clé de récupération copiée dans le presse-papiers', 'success');
  }).catch(() => {
    UI.toast('Impossible de copier dans le presse-papiers', 'error');
  });
}

function downloadRecoveryKeyFile() {
  const mnemonic = window._tempRecoveryMnemonic;
  if (!mnemonic) return;

  Recovery.downloadRecoveryKey(mnemonic);
  UI.toast('Clé de récupération téléchargée', 'success');
}

function closeRecoveryKeyModal() {
  if (window._resolveRecoveryKey) {
    window._resolveRecoveryKey();
  }
}

// Fonctions de récupération de mot de passe
function showRecoveryModal() {
  if (!App.splashFile) {
    App.showSplashError('Veuillez d\'abord sélectionner un fichier .habil');
    return;
  }

  document.getElementById('recoveryModalOverlay').classList.add('show');
  document.getElementById('recoveryKeyInput').value = '';
  document.getElementById('recoveryError').style.display = 'none';
}

function closeRecoveryModal() {
  document.getElementById('recoveryModalOverlay').classList.remove('show');
}

async function attemptRecovery() {
  const recoveryMnemonic = document.getElementById('recoveryKeyInput').value.trim();
  const errorDiv = document.getElementById('recoveryError');

  if (!recoveryMnemonic) {
    errorDiv.textContent = 'Veuillez saisir votre clé de récupération';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const arrayBuffer = await App.splashFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Récupérer le mot de passe
    const password = await Security.recoverPassword(bytes, recoveryMnemonic);

    // Fermer la modale de récupération
    closeRecoveryModal();

    // Remplir le champ mot de passe et charger le fichier
    document.getElementById('splashPwd').value = password;
    UI.toast('Mot de passe récupéré avec succès !', 'success');

    // Charger automatiquement le fichier
    setTimeout(() => {
      App.loadFile();
    }, 500);

  } catch (error) {
    console.error('Erreur de récupération:', error);
    errorDiv.textContent = error.message || 'Erreur lors de la récupération';
    errorDiv.style.display = 'block';
  }
}

// Variables globales pour l'import Excel
let _pendingImportFile = null;

/**
 * Gère la sélection d'un fichier Excel à importer
 * @param {HTMLInputElement} input - Input file
 */
async function handleImportExcel(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];

  // Vérifier que c'est bien un fichier Excel
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    UI.toast('Veuillez sélectionner un fichier Excel (.xlsx)', 'error');
    input.value = ''; // Reset input
    return;
  }

  // Stocker le fichier temporairement
  _pendingImportFile = file;

  // Afficher le nom du fichier dans la modale
  document.getElementById('importExcelFileName').textContent = file.name;

  // Réinitialiser le mode à "fusion"
  document.querySelector('input[name="importMode"][value="merge"]').checked = true;
  updateImportModeStyle();

  // Afficher la modale
  document.getElementById('importExcelModalOverlay').classList.add('show');

  // Reset input pour permettre la resélection du même fichier
  input.value = '';
}

/**
 * Ferme la modale d'import Excel
 */
function closeImportExcelModal() {
  document.getElementById('importExcelModalOverlay').classList.remove('show');
  _pendingImportFile = null;
}

/**
 * Met à jour le style des options selon la sélection
 */
function updateImportModeStyle() {
  const radios = document.querySelectorAll('input[name="importMode"]');
  radios.forEach(radio => {
    const label = radio.closest('label');
    if (radio.checked) {
      if (radio.value === 'replace') {
        label.style.borderColor = 'var(--red)';
      } else {
        label.style.borderColor = 'var(--accent)';
      }
    } else {
      label.style.borderColor = 'transparent';
    }
  });
}

/**
 * Confirme et exécute l'import Excel
 */
async function confirmImportExcel() {
  if (!_pendingImportFile) {
    UI.toast('Aucun fichier sélectionné', 'error');
    return;
  }

  // Récupérer le mode d'import sélectionné
  const mode = document.querySelector('input[name="importMode"]:checked').value || 'merge';

  try {
    // Lire le fichier Excel
    const arrayBuffer = await _pendingImportFile.arrayBuffer();
    const importedData = FileManager.importExcel(arrayBuffer);

    // Compter les éléments importés
    const counts = {
      agents: importedData.agents.length || 0,
      logiciels: importedData.logiciels.length || 0,
      habilitations: importedData.habilitations.length || 0
    };

    if (mode === 'replace') {
      // Mode remplacement : écraser toutes les données
      DataModel.loadData(importedData);
      UI.toast(`Données remplacées : ${counts.agents} agents, ${counts.logiciels} logiciels, ${counts.habilitations} habilitations`, 'success');
    } else {
      // Mode fusion : fusionner avec les données existantes
      FileManager.mergeData(importedData);
      UI.toast(`Données fusionnées : ${counts.agents} agents, ${counts.logiciels} logiciels, ${counts.habilitations} habilitations`, 'success');
    }

    // Marquer comme non sauvegardé et rafraîchir l'interface
    DataModel.markUnsaved();
    Renderer.renderAll();
    UI.updateSaveIndicator();

    // Fermer la modale
    closeImportExcelModal();

  } catch (error) {
    console.error('Erreur lors de l\'import Excel:', error);
    UI.toast('Erreur lors de l\'import : ' + error.message, 'error');
  }
}

// Fonction pour délier le fichier
async function unlinkFile() {
  await PersistentStorage.clearFileHandle();
  DataModel.state.fileHandle = null;
  DataModel.state.currentFile = null;
  location.reload();
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
