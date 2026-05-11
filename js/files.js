/**
 * Module de Gestion des Fichiers
 * Import/Export Excel et fichiers chiffrés .habil
 */

const FileManager = {
  saveDebounceTimer: null,

  /**
   * Vérifie si File System Access API est disponible
   * @returns {boolean}
   */
  isFSAAvailable() {
    return 'showSaveFilePicker' in window;
  },

  /**
   * Télécharge les données en tant que fichier
   * @param {Object} options - {filename, encrypt, password}
   */
  async downloadFile(options = {}) {
    const { filename, encrypt, password } = options;
    const data = DataModel.exportData();

    try {
      if (encrypt && password) {
        // Export chiffré .habil
        await this.downloadEncrypted(data, filename, password);
      } else {
        // Export Excel .xlsx
        await this.downloadExcel(data, filename);
      }

      DataModel.markSaved();
      DataModel.state.currentFile = filename;
      UI.toast('Fichier sauvegardé avec succès', 'success');
      UI.updateSaveIndicator();
      UI.updateEncryptIndicator();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      UI.toast('Erreur lors de la sauvegarde: ' + error.message, 'error');
    }
  },

  /**
   * Sauvegarde automatique via File System Access API
   * @param {boolean} immediate - Sauvegarde immédiate (sinon débounce 2s)
   */
  async autoSave(immediate = false) {
    // Annuler le timer précédent si debounce
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    const doSave = async () => {
      const fileHandle = DataModel.state.fileHandle;
      const password = DataModel.state.password;

      if (!fileHandle || !password) {
        console.warn('AutoSave: handle ou mot de passe manquant');
        return;
      }

      if (DataModel.state.savePending) {
        // Une sauvegarde est déjà en cours, reprogrammer
        console.log('AutoSave: sauvegarde déjà en cours, reprogrammation');
        this.saveDebounceTimer = setTimeout(() => this.autoSave(true), 1000);
        return;
      }

      try {
        DataModel.state.savePending = true;
        UI.updateAutosaveIndicator(true);

        const data = DataModel.exportData();
        const json = JSON.stringify(data);
        const bytes = new TextEncoder().encode(json);
        const recoveryKeyBytes = DataModel.state.recoveryKey;
        const encrypted = await Security.encryptBytes(bytes, password, recoveryKeyBytes);

        // Écrire dans le fichier via FSA
        const writable = await fileHandle.createWritable();
        await writable.write(encrypted);
        await writable.close();

        DataModel.markSaved();
        UI.updateSaveIndicator();
        console.log('AutoSave: sauvegarde réussie');

      } catch (error) {
        console.error('AutoSave error:', error);
        UI.toast('Erreur lors de la sauvegarde automatique: ' + error.message, 'error');
      } finally {
        DataModel.state.savePending = false;
        UI.updateAutosaveIndicator(false);
      }
    };

    if (immediate) {
      await doSave();
    } else {
      // Debounce de 2 secondes
      this.saveDebounceTimer = setTimeout(doSave, 2000);
    }
  },

  /**
   * Ouvre un fichier existant avec handle (File System Access API)
   * @returns {Promise<{file: File, handle: FileSystemFileHandle}|null>}
   */
  async openFileWithHandle() {
    if (!this.isFSAAvailable()) {
      return null;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Fichiers Habilitations',
            accept: {
              'application/octet-stream': ['.habil'],
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
            }
          }
        ],
        multiple: false
      });

      const file = await handle.getFile();
      return { file, handle };
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur lors de l\'ouverture du fichier:', error);
      }
      return null;
    }
  },

  /**
   * Demande à l'utilisateur de choisir un emplacement pour le fichier .habil
   * @returns {Promise<FileSystemFileHandle|null>}
   */
  async pickFileHandle() {
    if (!this.isFSAAvailable()) {
      UI.toast('File System Access API non disponible sur ce navigateur', 'error');
      return null;
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: DataModel.state.currentFile || 'habilitations_' + Utils.today() + '.habil',
        types: [{
          description: 'Fichier Habilitations Chiffré',
          accept: { 'application/octet-stream': ['.habil'] }
        }]
      });
      return handle;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erreur lors de la sélection du fichier:', error);
      }
      return null;
    }
  },

  /**
   * Exporte en Excel (.xlsx)
   * @param {Object} data - Données à exporter
   * @param {string} filename - Nom du fichier
   */
  async downloadExcel(data, filename) {
    const wb = XLSX.utils.book_new();

    // Feuille Agents
    const agentRows = data.agents.map(a => ({
      ID: a.id,
      Nom: a.nom,
      Prénom: a.prenom,
      Email: a.email,
      Service: a.service,
      Poste: a.poste
    }));
    const wsAgents = XLSX.utils.json_to_sheet(agentRows);
    XLSX.utils.book_append_sheet(wb, wsAgents, 'Agents');

    // Feuille Logiciels
    const logRows = data.logiciels.map(l => ({
      ID: l.id,
      Nom: l.nom,
      Valideurs: (l.valideurs || []).join(', '),
      Groupes: (l.groupes || []).join(', ')
    }));
    const wsLog = XLSX.utils.json_to_sheet(logRows);
    XLSX.utils.book_append_sheet(wb, wsLog, 'Logiciels');

    // Feuille Habilitations
    const habRows = data.habilitations.map(h => ({
      ID: h.id,
      AgentID: h.agentId,
      LogicielID: h.logicielId,
      Rôle: h.role,
      Permissions: h.permissions,
      Groupes: (h.groupes || []).join(', '),
      Statut: h.statut,
      Valideur: h.valideur,
      DateCréation: h.dateCreation,
      DateModif: h.dateDerniereModif,
      DateProchRevision: h.dateProchRevision,
      DateDerniereValidation: h.dateDerniereValidation,
      Commentaires: h.commentaires
    }));
    const wsHab = XLSX.utils.json_to_sheet(habRows);
    XLSX.utils.book_append_sheet(wb, wsHab, 'Habilitations');

    // Feuille Paramètres
    const paramRows = [
      { Clé: 'Services', Valeur: data.params.services.join(', ') },
      { Clé: 'Postes', Valeur: data.params.postes.join(', ') },
      { Clé: 'Rôles', Valeur: data.params.roles.join(', ') },
      { Clé: 'Permissions', Valeur: data.params.permissions.join(', ') },
      { Clé: 'RevisionPeriod', Valeur: data.params.revisionPeriod },
      { Clé: 'AlertDays', Valeur: data.params.alertDays }
    ];
    const wsParams = XLSX.utils.json_to_sheet(paramRows);
    XLSX.utils.book_append_sheet(wb, wsParams, 'Paramètres');

    // Téléchargement
    XLSX.writeFile(wb, filename);
  },

  /**
   * Exporte en fichier chiffré (.habil)
   * @param {Object} data - Données à exporter
   * @param {string} filename - Nom du fichier
   * @param {string} password - Mot de passe
   */
  async downloadEncrypted(data, filename, password) {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const recoveryKeyBytes = DataModel.state.recoveryKey;
    const encrypted = await Security.encryptBytes(bytes, password, recoveryKeyBytes);

    const blob = new Blob([encrypted], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Importe un fichier Excel
   * @param {ArrayBuffer} arrayBuffer - Contenu du fichier
   * @returns {Object} Données importées
   */
  importExcel(arrayBuffer) {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    // Lecture des agents
    const agents = XLSX.utils.sheet_to_json(wb.Sheets['Agents'] || {}).map(row => ({
      id: row.ID || Utils.uid(),
      nom: row.Nom || '',
      prenom: row.Prénom || '',
      email: row.Email || '',
      service: row.Service || '',
      poste: row.Poste || ''
    }));

    // Lecture des logiciels
    const logiciels = XLSX.utils.sheet_to_json(wb.Sheets['Logiciels'] || {}).map(row => ({
      id: row.ID || Utils.uid(),
      nom: row.Nom || '',
      valideurs: row.Valideurs ? row.Valideurs.split(',').map(v => v.trim()).filter(v => v) : [],
      groupes: row.Groupes ? row.Groupes.split(',').map(g => g.trim()).filter(g => g) : []
    }));

    // Lecture des habilitations
    const habilitations = XLSX.utils.sheet_to_json(wb.Sheets['Habilitations'] || {}).map(row => {
      // Gestion rétrocompatibilité : ancien champ "Groupe" (singulier) et nouveau "Groupes" (pluriel)
      let groupes = [];
      if (row.Groupes) {
        groupes = row.Groupes.split(',').map(g => g.trim()).filter(g => g);
      } else if (row.Groupe) {
        // Ancien format avec groupe unique
        groupes = row.Groupe ? [row.Groupe] : [];
      }

      return {
        id: row.ID || Utils.uid(),
        agentId: row.AgentID,
        logicielId: row.LogicielID,
        role: row.Rôle || '',
        permissions: row.Permissions || '',
        groupes: groupes,
        statut: row.Statut || 'Actif',
        valideur: row.Valideur || '',
        dateCreation: row.DateCréation || Utils.today(),
        dateDerniereModif: row.DateModif || Utils.today(),
        dateProchRevision: row.DateProchRevision || '',
        dateDerniereValidation: row.DateDerniereValidation || '',
        commentaires: row.Commentaires || ''
      };
    });

    // Lecture des paramètres
    const params = {};
    const paramSheet = wb.Sheets['Paramètres'] || {};
    const paramRows = XLSX.utils.sheet_to_json(paramSheet);
    paramRows.forEach(row => {
      const key = row['Clé'] || row.Clé;
      const val = row['Valeur'] || row.Valeur;
      if (key === 'Services') params.services = val.split(',').map(s => s.trim());
      else if (key === 'Postes') params.postes = val.split(',').map(s => s.trim());
      else if (key === 'Rôles') params.roles = val.split(',').map(s => s.trim());
      else if (key === 'Permissions') params.permissions = val.split(',').map(s => s.trim());
      else if (key === 'RevisionPeriod') params.revisionPeriod = parseInt(val) || 12;
      else if (key === 'AlertDays') params.alertDays = parseInt(val) || 30;
    });

    return { agents, logiciels, habilitations, params };
  },

  /**
   * Importe un fichier chiffré
   * @param {Uint8Array} bytes - Contenu du fichier
   * @param {string} password - Mot de passe
   * @returns {Promise<Object>} Données déchiffrées
   */
  async importEncrypted(bytes, password) {
    const result = await Security.decryptBytes(bytes, password);
    const json = new TextDecoder().decode(result.data);
    return JSON.parse(json);
  },

  /**
   * Fusionne les données importées avec les données existantes
   * Les nouveaux éléments sont ajoutés, les existants (même ID) sont mis à jour
   * @param {Object} importedData - Données importées
   */
  mergeData(importedData) {
    // Fusion des agents
    if (importedData.agents && Array.isArray(importedData.agents)) {
      importedData.agents.forEach(importAgent => {
        const existingIndex = DataModel.agents.findIndex(a => a.id === importAgent.id);
        if (existingIndex >= 0) {
          // Mise à jour de l'agent existant
          DataModel.agents[existingIndex] = { ...DataModel.agents[existingIndex], ...importAgent };
        } else {
          // Ajout du nouvel agent
          DataModel.agents.push(importAgent);
        }
      });
    }

    // Fusion des logiciels
    if (importedData.logiciels && Array.isArray(importedData.logiciels)) {
      importedData.logiciels.forEach(importLog => {
        const existingIndex = DataModel.logiciels.findIndex(l => l.id === importLog.id);
        if (existingIndex >= 0) {
          // Mise à jour du logiciel existant
          DataModel.logiciels[existingIndex] = { ...DataModel.logiciels[existingIndex], ...importLog };
        } else {
          // Ajout du nouveau logiciel
          DataModel.logiciels.push(importLog);
        }
      });
    }

    // Fusion des habilitations
    if (importedData.habilitations && Array.isArray(importedData.habilitations)) {
      importedData.habilitations.forEach(importHab => {
        const existingIndex = DataModel.habilitations.findIndex(h => h.id === importHab.id);
        if (existingIndex >= 0) {
          // Mise à jour de l'habilitation existante
          DataModel.habilitations[existingIndex] = { ...DataModel.habilitations[existingIndex], ...importHab };
        } else {
          // Ajout de la nouvelle habilitation
          DataModel.habilitations.push(importHab);
        }
      });
    }

    // Fusion des paramètres (ajout uniquement des valeurs non présentes)
    if (importedData.params) {
      if (importedData.params.services) {
        importedData.params.services.forEach(s => {
          if (!DataModel.params.services.includes(s)) {
            DataModel.params.services.push(s);
          }
        });
      }
      if (importedData.params.postes) {
        importedData.params.postes.forEach(p => {
          if (!DataModel.params.postes.includes(p)) {
            DataModel.params.postes.push(p);
          }
        });
      }
      if (importedData.params.roles) {
        importedData.params.roles.forEach(r => {
          if (!DataModel.params.roles.includes(r)) {
            DataModel.params.roles.push(r);
          }
        });
      }
      if (importedData.params.permissions) {
        importedData.params.permissions.forEach(p => {
          if (!DataModel.params.permissions.includes(p)) {
            DataModel.params.permissions.push(p);
          }
        });
      }
      // Les valeurs numériques sont conservées de l'existant sauf si non définies
      if (importedData.params.revisionPeriod && !DataModel.params.revisionPeriod) {
        DataModel.params.revisionPeriod = importedData.params.revisionPeriod;
      }
      if (importedData.params.alertDays && !DataModel.params.alertDays) {
        DataModel.params.alertDays = importedData.params.alertDays;
      }
    }

    // Migration des données après fusion
    DataModel.migrateData();
  }
};
