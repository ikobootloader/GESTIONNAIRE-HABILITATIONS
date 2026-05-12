/**
 * Module de Gestion des Données
 * Modèle de données centralisé et fonctions d'accès
 */

const DataModel = {
  // Collections principales
  agents: [],
  logiciels: [],
  habilitations: [],

  // Paramètres de configuration
  params: {
    services: [],
    postes: [],
    roles: [],
    permissions: [],
    revisionPeriod: 12,
    alertDays: 30
  },

  // États de l'application
  state: {
    currentFile: null,
    fileHandle: null, // Handle File System Access API
    password: null, // Mot de passe en mémoire (jamais persisté)
    recoveryKey: null, // Clé de récupération en mémoire (pour la session)
    unsaved: false,
    savePending: false, // Sauvegarde en cours
    saveQueue: [], // Queue de sauvegardes
    pendingSecurityChange: false,
    agentSortCol: null,
    agentSortAsc: true,
    habilSortCol: null,
    habilSortAsc: true,
    editingAgentId: null,
    editingHabilId: null,
    agentHabilLines: [], // Lignes temporaires dans la modale agent
    currentHabilGroupes: [] // Groupes temporaires de l'habilitation en cours d'édition
  },

  /**
   * Réinitialise toutes les données (nouveau fichier vierge)
   */
  resetAll() {
    this.agents = [];
    this.logiciels = [];
    this.habilitations = [];
    this.params = {
      services: ['Direction', 'RH', 'Comptabilité', 'IT', 'Commercial'],
      postes: ['Directeur', 'Manager', 'Agent', 'Technicien', 'Stagiaire'],
      roles: ['Administrateur', 'Utilisateur', 'Lecteur'],
      permissions: ['Lecture seule', 'Lecture/Écriture', 'Administration complète'],
      revisionPeriod: 12,
      alertDays: 30
    };
    this.state.currentFile = null;
    this.state.unsaved = false;
    this.state.pendingSecurityChange = false;
  },

  /**
   * Charge des données depuis un objet
   * @param {Object} data - Objet contenant agents, logiciels, habilitations, params
   */
  loadData(data) {
    this.agents = data.agents || [];
    this.logiciels = data.logiciels || [];
    this.habilitations = data.habilitations || [];
    this.params = { ...this.params, ...data.params };

    // Migration des données anciennes
    this.migrateData();
  },

  /**
   * Migration des données pour rétrocompatibilité
   * - groupe (string) → groupes (array)
   * - Ajoute groupes[] aux logiciels si absent
   */
  migrateData() {
    // Migration logiciels : ajouter groupes[] si absent
    this.logiciels.forEach(log => {
      if (!log.groupes) {
        log.groupes = [];
      }
      if (!log.valideurs) {
        log.valideurs = [];
      }
    });

    // Migration habilitations : groupe (string) → groupes (array)
    this.habilitations.forEach(hab => {
      if (hab.groupe && !hab.groupes) {
        // Ancien format : groupe en string ? hab.groupes = hab.groupe  [hab.groupe] : [];
        delete hab.groupe;
      } else if (!hab.groupes) {
        // Nouveau format sans données
        hab.groupes = [];
      }
    });
  },

  /**
   * Retourne toutes les données sous forme d'objet
   * @returns {Object} Objet contenant toutes les données
   */
  exportData() {
    return {
      agents: this.agents,
      logiciels: this.logiciels,
      habilitations: this.habilitations,
      params: this.params
    };
  },

  /**
   * Trouve un agent par son ID
   * @param {string} id - ID de l'agent
   * @returns {Object|null} Agent trouvé ou null
   */
  getAgent(id) {
    return this.agents.find(a => a.id === id) || null;
  },

  /**
   * Trouve un logiciel par son ID
   * @param {string} id - ID du logiciel
   * @returns {Object|null} Logiciel trouvé ou null
   */
  getLogiciel(id) {
    return this.logiciels.find(l => l.id === id) || null;
  },

  /**
   * Trouve une habilitation par son ID
   * @param {string} id - ID de l'habilitation
   * @returns {Object|null} Habilitation trouvée ou null
   */
  getHabilitation(id) {
    return this.habilitations.find(h => h.id === id) || null;
  },

  /**
   * Retourne le nom complet d'un agent
   * @param {string} id - ID de l'agent
   * @returns {string} Nom complet ou '—'
   */
  getAgentName(id) {
    const a = this.getAgent(id);
    return a ? `${a.nom} ${a.prenom}` : '—';
  },

  /**
   * Retourne le nom d'un logiciel
   * @param {string} id - ID du logiciel
   * @returns {string} Nom du logiciel ou '—'
   */
  getLogicielName(id) {
    const l = this.getLogiciel(id);
    return l ? l.nom : '—';
  },

  /**
   * Retourne toutes les habilitations d'un agent
   * @param {string} agentId - ID de l'agent
   * @returns {Array} Liste des habilitations
   */
  getAgentHabilitations(agentId) {
    return this.habilitations.filter(h => h.agentId === agentId);
  },

  /**
   * Retourne toutes les habilitations d'un logiciel
   * @param {string} logicielId - ID du logiciel
   * @returns {Array} Liste des habilitations
   */
  getLogicielHabilitations(logicielId) {
    return this.habilitations.filter(h => h.logicielId === logicielId);
  },

  /**
   * Ajoute un agent
   * @param {Object} agent - Objet agent
   */
  addAgent(agent) {
    if (!agent.id) agent.id = Utils.uid();
    this.agents.push(agent);
  },

  /**
   * Met à jour un agent
   * @param {string} id - ID de l'agent
   * @param {Object} data - Nouvelles données
   * @returns {boolean} true si succès
   */
  updateAgent(id, data) {
    const agent = this.getAgent(id);
    if (!agent) return false;
    Object.assign(agent, data);
    return true;
  },

  /**
   * Supprime un agent et ses habilitations
   * @param {string} id - ID de l'agent
   * @returns {boolean} true si succès
   */
  deleteAgent(id) {
    const idx = this.agents.findIndex(a => a.id === id);
    if (idx === -1) return false;
    this.agents.splice(idx, 1);
    this.habilitations = this.habilitations.filter(h => h.agentId !== id);
    return true;
  },

  /**
   * Ajoute un logiciel
   * @param {Object} logiciel - Objet logiciel
   */
  addLogiciel(logiciel) {
    if (!logiciel.id) logiciel.id = Utils.uid();
    if (!logiciel.valideurs) logiciel.valideurs = [];
    if (!logiciel.groupes) logiciel.groupes = [];
    this.logiciels.push(logiciel);
  },

  /**
   * Supprime un logiciel et ses habilitations
   * @param {string} id - ID du logiciel
   * @returns {boolean} true si succès
   */
  deleteLogiciel(id) {
    const idx = this.logiciels.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.logiciels.splice(idx, 1);
    this.habilitations = this.habilitations.filter(h => h.logicielId !== id);
    return true;
  },

  /**
   * Ajoute une habilitation
   * @param {Object} habilitation - Objet habilitation
   */
  addHabilitation(habilitation) {
    if (!habilitation.id) habilitation.id = Utils.uid();
    if (!habilitation.dateCreation) habilitation.dateCreation = Utils.today();
    if (!habilitation.dateDerniereModif) habilitation.dateDerniereModif = Utils.today();
    if (!habilitation.groupes) habilitation.groupes = [];
    this.habilitations.push(habilitation);
  },

  /**
   * Met à jour une habilitation
   * @param {string} id - ID de l'habilitation
   * @param {Object} data - Nouvelles données
   * @returns {boolean} true si succès
   */
  updateHabilitation(id, data) {
    const habil = this.getHabilitation(id);
    if (!habil) return false;
    Object.assign(habil, data);
    habil.dateDerniereModif = Utils.today();
    return true;
  },

  /**
   * Supprime une habilitation
   * @param {string} id - ID de l'habilitation
   * @returns {boolean} true si succès
   */
  deleteHabilitation(id) {
    const idx = this.habilitations.findIndex(h => h.id === id);
    if (idx === -1) return false;
    this.habilitations.splice(idx, 1);
    return true;
  },

  /**
   * Marque les données comme non sauvegardées
   * Déclenche la sauvegarde automatique si un handle est disponible
   */
  markUnsaved() {
    this.state.unsaved = true;

    // Déclencher la sauvegarde automatique si handle disponible
    if (this.state.fileHandle && this.state.password) {
      FileManager.autoSave();
    }
  },

  /**
   * Marque les données comme sauvegardées
   */
  markSaved() {
    this.state.unsaved = false;
    this.state.pendingSecurityChange = false;
  }
};
