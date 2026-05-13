/**
 * Module d'Interface Utilisateur
 * Gestion des modales, toasts, navigation, thème
 */

const UI = {
  // Etat de repli/depli des habilitations dans la modale agent
  agentHabilCollapsed: [],
  // État temporaire du drag-and-drop des listes de paramètres
  paramDragState: null,
  // Onglet actif de la page Paramètres
  activeSettingsTab: 'logiciels',
  /**
   * Bascule le thème clair/sombre
   */
  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('habil_theme', isDark ? 'light' : 'dark'); } catch (e) {}
  },

  /**
   * Change l'onglet actif
   * @param {string} tabName - Nom de l'onglet
   */
  switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    document.querySelector(`.nav-tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`page-${tabName}`).classList.add('active');

    // Restaurer l'onglet interne actif de la page Paramètres
    if (tabName === 'settings') {
      this.switchSettingsTab(this.activeSettingsTab);
    }
  },

  /**
   * Change l'onglet interne de la page Paramètres
   * @param {string} tabKey - Clé d'onglet paramètres
   */
  switchSettingsTab(tabKey) {
    this.activeSettingsTab = tabKey || 'logiciels';

    document.querySelectorAll('.settings-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.settingsTab === this.activeSettingsTab);
    });

    document.querySelectorAll('.settings-panel').forEach(el => {
      el.classList.toggle('active', el.dataset.settingsPanel === this.activeSettingsTab);
    });
  },

  /**
   * Affiche un toast
   * @param {string} message - Message
   * @param {string} type - Type (success, error, info)
   */
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${Utils.esc(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  /**
   * Affiche une boîte de confirmation
   * @param {Object} options - {title, message, onConfirm}
   */
  confirm(options) {
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = options.title || 'Confirmation';
    document.getElementById('confirmMsg').textContent = options.message || 'Êtes-vous sûr ';

    overlay.classList.add('show');

    const onYes = () => {
      overlay.classList.remove('show');
      if (options.onConfirm) options.onConfirm();
    };

    document.getElementById('confirmBtn').onclick = onYes;
  },

  /**
   * Met à jour l'indicateur de sauvegarde
   */
  updateSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    const icon = document.getElementById('saveIcon');
    const sync = document.getElementById('saveSync');

    // Retirer la classe saving si présente
    indicator.classList.remove('saving');

    if (DataModel.state.unsaved) {
      // État : Non sauvegardé (○)
      indicator.classList.remove('saved');
      indicator.setAttribute('title', 'Non sauvegardé');
      if (icon) icon.style.display = 'block';
      if (sync) sync.style.display = 'none';
    } else {
      // État : Sauvegardé (✓)
      indicator.classList.add('saved');
      indicator.setAttribute('title', 'Sauvegardé');
      if (icon) icon.style.display = 'block';
      if (sync) sync.style.display = 'none';
    }
  },

  /**
   * Met à jour l'indicateur de sauvegarde automatique
   * @param {boolean} active - true si sauvegarde en cours
   */
  updateAutosaveIndicator(active) {
    const indicator = document.getElementById('saveIndicator');
    const icon = document.getElementById('saveIcon');
    const sync = document.getElementById('saveSync');

    if (!indicator || !icon || !sync) return;

    if (active) {
      // État : Sauvegarde en cours (sync qui tourne)
      indicator.classList.remove('saved');
      indicator.classList.add('saving');
      indicator.setAttribute('title', 'Sauvegarde en cours...');
      icon.style.display = 'none';
      sync.style.display = 'block';
      sync.classList.add('spinning');
    } else {
      // Retour à l'état sauvegardé après un court délai
      setTimeout(() => {
        sync.classList.remove('spinning');
        setTimeout(() => {
          sync.style.display = 'none';
          icon.style.display = 'block';
          indicator.classList.remove('saving');
          indicator.classList.add('saved');
          indicator.setAttribute('title', 'Sauvegardé');
        }, 300);
      }, 500);
    }
  },

  /**
   * Met à jour l'indicateur de chiffrement
   */
  updateEncryptIndicator() {
    const indicator = document.getElementById('encryptIndicator');
    const icon = document.getElementById('encIcon');
    const file = DataModel.state.currentFile;

    if (!file) {
      icon.textContent = '🔓';
      indicator.className = 'encrypt-indicator';
      indicator.setAttribute('title', 'Aucun fichier chargé');
    } else if (file.endsWith('.habil')) {
      icon.textContent = '🔒';
      indicator.className = 'encrypt-indicator locked';
      indicator.setAttribute('title', 'Fichier chiffré AES-256');
    } else {
      icon.textContent = '📄';
      indicator.className = 'encrypt-indicator';
      indicator.setAttribute('title', 'Fichier non chiffré (.xlsx)');
    }

    if (DataModel.state.pendingSecurityChange) {
      indicator.classList.add('pending');
    }
  },

  /**
   * Ouvre la modale agent
   * @param {string} agentId - ID de l'agent (null pour création)
   */
  openAgentModal(agentId = null) {
    DataModel.state.editingAgentId = agentId;
    const modal = document.getElementById('agentModalOverlay');
    const title = document.getElementById('agentModalTitle');

    // Peupler les selects AVANT de définir les valeurs
    this.populateAgentModalSelects();

    if (agentId) {
      const agent = DataModel.getAgent(agentId);
      if (!agent) return;

      title.textContent = "Modifier l'agent";
      document.getElementById('aNom').value = agent.nom;
      document.getElementById('aPrenom').value = agent.prenom;
      document.getElementById('aEmail').value = agent.email;
      document.getElementById('aId').value = agent.id;
      document.getElementById('aService').value = agent.service;
      document.getElementById('aPoste').value = agent.poste;

      // Charger habilitations
      DataModel.state.agentHabilLines = DataModel.getAgentHabilitations(agentId).map(h => ({
        logicielId: h.logicielId,
        role: h.role,
        permissions: h.permissions,
        groupes: h.groupes || [],
        statut: h.statut,
        valideur: h.valideur || '',
        dateProchRevision: h.dateProchRevision,
        commentaires: h.commentaires || ''
      }));
      DataModel.state.agentHabilLines.forEach((_, idx) => this.applyAgentHabilDefaultValideur(idx));
      this.agentHabilCollapsed = DataModel.state.agentHabilLines.map(() => true);
    } else {
      title.textContent = 'Nouvel agent';
      document.getElementById('aNom').value = '';
      document.getElementById('aPrenom').value = '';
      document.getElementById('aEmail').value = '';
      document.getElementById('aId').value = '';
      document.getElementById('aService').value = '';
      document.getElementById('aPoste').value = '';
      DataModel.state.agentHabilLines = [];
      this.agentHabilCollapsed = [];
    }

    this.renderAgentHabilLines();
    modal.classList.add('show');
  },

  /**
   * Ferme la modale agent
   */
  closeAgentModal() {
    document.getElementById('agentModalOverlay').classList.remove('show');
  },

  /**
   * Sauvegarde l'agent depuis la modale
   */
  saveAgent() {
    const nom = document.getElementById('aNom').value.trim();
    const prenom = document.getElementById('aPrenom').value.trim();
    const email = document.getElementById('aEmail').value.trim();

    if (!nom || !prenom) {
      this.toast('Le nom et le prénom sont obligatoires', 'error');
      return;
    }

    const agentData = {
      nom,
      prenom,
      email,
      service: document.getElementById('aService').value,
      poste: document.getElementById('aPoste').value
    };

    if (DataModel.state.editingAgentId) {
      DataModel.state.agentHabilLines.forEach((_, idx) => this.applyAgentHabilDefaultValideur(idx));
      // Mise à jour
      DataModel.updateAgent(DataModel.state.editingAgentId, agentData);

      // Supprimer anciennes habilitations et créer les nouvelles
      DataModel.habilitations = DataModel.habilitations.filter(h => h.agentId !== DataModel.state.editingAgentId);
      DataModel.state.agentHabilLines.forEach(line => {
        DataModel.addHabilitation({
          agentId: DataModel.state.editingAgentId,
          logicielId: line.logicielId,
          role: line.role,
          permissions: line.permissions,
          groupes: line.groupes || [],
          statut: line.statut,
          valideur: line.valideur,
          dateProchRevision: line.dateProchRevision,
          commentaires: line.commentaires
        });
      });
    } else {
      DataModel.state.agentHabilLines.forEach((_, idx) => this.applyAgentHabilDefaultValideur(idx));
      // Création
      const newId = Utils.uid();
      DataModel.addAgent({ id: newId, ...agentData });

      DataModel.state.agentHabilLines.forEach(line => {
        DataModel.addHabilitation({
          agentId: newId,
          logicielId: line.logicielId,
          role: line.role,
          permissions: line.permissions,
          groupes: line.groupes || [],
          statut: line.statut,
          valideur: line.valideur,
          dateProchRevision: line.dateProchRevision,
          commentaires: line.commentaires
        });
      });
    }

    this.closeAgentModal();
    DataModel.markUnsaved();
    Renderer.renderAll();
    this.updateSaveIndicator();
  },

  /**
   * Confirme la suppression d'un agent
   * @param {string} agentId - ID de l'agent
   */
  confirmDeleteAgent(agentId) {
    const agent = DataModel.getAgent(agentId);
    if (!agent) return;

    this.confirm({
      title: "Supprimer l'agent",
      message: `Supprimer définitivement ${agent.nom} ${agent.prenom} et toutes ses habilitations `,
      onConfirm: () => {
        DataModel.deleteAgent(agentId);
        DataModel.markUnsaved();
        Renderer.renderAll();
        this.updateSaveIndicator();
        this.toast('Agent supprimé', 'info');
      }
    });
  },

  /**
   * Valide une révision
   * @param {string} habilId - ID de l'habilitation
   */
  validateRevision(habilId) {
    const h = DataModel.getHabilitation(habilId);
    if (!h) return;

    h.dateDerniereValidation = Utils.today();
    h.dateDerniereModif = Utils.today();
    h.dateProchRevision = Utils.addMonths(DataModel.params.revisionPeriod);

    DataModel.markUnsaved();
    Renderer.renderRevisions();
    Renderer.renderStats();
    Renderer.updateRevBadge();
    this.updateSaveIndicator();
    this.toast(`Révision validée — prochaine révision dans ${DataModel.params.revisionPeriod} mois`, 'success');
  },

  /**
   * Peuple les selects de la modale agent
   */
  populateAgentModalSelects() {
    const svc = document.getElementById('aService');
    svc.innerHTML = '<option value="">— Choisir —</option>' + DataModel.params.services.map(s => `<option>${Utils.esc(s)}</option>`).join('');

    const poste = document.getElementById('aPoste');
    poste.innerHTML = '<option value="">— Choisir —</option>' + DataModel.params.postes.map(p => `<option>${Utils.esc(p)}</option>`).join('');
  },

  /**
   * Rend les lignes d'habilitation dans la modale agent
   */
  renderAgentHabilLines() {
    const container = document.getElementById('habilLines');
    const lines = DataModel.state.agentHabilLines;
    this.agentHabilCollapsed = lines.map((_, idx) => this.agentHabilCollapsed[idx] === true);
    container.innerHTML = lines.map((line, idx) => `
      <div class="habil-line">
        <div class="habil-line-header">
          <div class="habil-line-num">${idx + 1}</div>
          <div class="habil-line-title">Habilitation ${DataModel.getLogicielName(line.logicielId)}</div>
          <button class="habil-line-toggle" onclick="UI.toggleAgentHabilLine(${idx})" title="Replier/Deplier">
            ${this.agentHabilCollapsed[idx] ? '▸' : '▾'}
          </button>
          <button class="habil-line-del" onclick="UI.removeAgentHabilLine(${idx})">×</button>
        </div>
        <div class="form-grid ${this.agentHabilCollapsed[idx] ? 'is-collapsed' : ''}">
          <div class="form-group">
            <label class="form-label">LOGICIEL</label>
            <select class="form-control" onchange="UI.onAgentHabilLogicielChange(${idx}, this.value)">
              ${DataModel.logiciels.map(l => `<option value="${l.id}" ${l.id === line.logicielId ? 'selected' : ''}>${Utils.esc(l.nom)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">RÔLE</label>
            <select class="form-control" onchange="UI.updateAgentHabilLine(${idx}, 'role', this.value)">
              <option value="">— Choisir —</option>
              ${DataModel.params.roles.map(r => `<option ${r === line.role ? 'selected' : ''}>${Utils.esc(r)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">PERMISSIONS</label>
            <select class="form-control" onchange="UI.updateAgentHabilLine(${idx}, 'permissions', this.value)">
              <option value="">— Choisir —</option>
              ${DataModel.params.permissions.map(p => `<option ${p === line.permissions ? 'selected' : ''}>${Utils.esc(p)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="position:relative;">
            <label class="form-label">GROUPES</label>
            <textarea class="form-control agent-groupes-input"
              id="groupesAgent_${idx}"
              placeholder="Ex: GRP_APP_LECTURE, GRP_APP_ADMIN"
              oninput="UI.onAgentHabilGroupesInput(${idx}, this.value)"
              onchange="UI.updateAgentHabilLineGroupes(${idx}, this.value)">${Utils.esc((line.groupes || []).join(', '))}</textarea>
            <div id="groupesListSuggest_${idx}" class="valideur-autocomplete-suggestions"></div>
            <div style="font-size:11px;color:var(--text3);margin-top:3px;" id="groupesSuggest_${idx}"></div>
          </div>
          <div class="form-group">
            <label class="form-label">STATUT</label>
            <select class="form-control" onchange="UI.updateAgentHabilLine(${idx}, 'statut', this.value)">
              <option ${line.statut === 'Actif' ? 'selected' : ''}>Actif</option>
              <option ${line.statut === 'Inactif' ? 'selected' : ''}>Inactif</option>
              <option ${line.statut === 'Suspendu' ? 'selected' : ''}>Suspendu</option>
              <option ${line.statut === 'En attente' ? 'selected' : ''}>En attente</option>
            </select>
          </div>
          <div class="form-group" style="position:relative;">
            <label class="form-label">VALIDEUR</label>
            <input type="text" class="form-control"
              id="valideurAgent_${idx}"
              value="${Utils.esc(line.valideur)}"
              placeholder="Taper pour rechercher un agent..."
              autocomplete="off"
              oninput="UI.onValideurAgentHabilInput(${idx})"
              onchange="UI.updateAgentHabilLine(${idx}, 'valideur', this.value)">
            <div id="valideurAgentSuggest_${idx}" class="valideur-autocomplete-suggestions"></div>
          </div>
          <div class="form-group">
            <label class="form-label">DATE PROCHAINE RÉVISION</label>
            <input type="date" class="form-control" value="${line.dateProchRevision || ''}" onchange="UI.updateAgentHabilLine(${idx}, 'dateProchRevision', this.value)">
          </div>
        </div>
      </div>
    `).join('') + `<button class="add-habil-btn" onclick="UI.addAgentHabilLine()">＋ Ajouter une habilitation</button>`;

    // Initialiser les suggestions de groupes pour chaque ligne
    setTimeout(() => {
      lines.forEach((line, idx) => {
        this.updateAgentHabilGroupeSuggestions(idx, line.logicielId);
        this.autoGrowAgentHabilGroupesField(idx);
      });
    }, 10);
  },

  /**
   * Applique le premier valideur par défaut du logiciel sur une ligne d'habilitation agent
   * @param {number} idx - Index de la ligne
   */
  applyAgentHabilDefaultValideur(idx) {
    const line = DataModel.state.agentHabilLines[idx];
    if (!line) return;
    const log = DataModel.getLogiciel(line.logicielId);
    const defaultValideur = (log && Array.isArray(log.valideurs) && log.valideurs.length > 0) ? log.valideurs[0] : '';
    line.valideur = defaultValideur;
  },

  /**
   * Applique automatiquement le groupe par défaut si un seul groupe existe
   * pour le logiciel de la ligne d'habilitation agent.
   * @param {number} idx - Index de la ligne
   * @param {boolean} overwriteExisting - true pour remplacer la valeur existante
   */
  applyAgentHabilDefaultGroupe(idx, overwriteExisting = false) {
    const line = DataModel.state.agentHabilLines[idx];
    if (!line) return;

    const hasExistingGroupes = Array.isArray(line.groupes) && line.groupes.length > 0;
    if (hasExistingGroupes && !overwriteExisting) return;

    const log = DataModel.getLogiciel(line.logicielId);
    const defaultGroupes = (log && Array.isArray(log.groupes)) ? log.groupes.filter(g => g && g.trim()) : [];

    if (defaultGroupes.length === 1) {
      line.groupes = [defaultGroupes[0]];
    } else if (overwriteExisting) {
      line.groupes = [];
    }
  },

  addAgentHabilLine() {
    if (DataModel.logiciels.length === 0) {
      this.toast('Aucun logiciel disponible', 'error');
      return;
    }
    const firstLogId = DataModel.logiciels[0].id;
    DataModel.state.agentHabilLines.push({
      logicielId: firstLogId,
      role: '',
      permissions: '',
      groupes: [],
      statut: 'Actif',
      valideur: '',
      dateProchRevision: '',
      commentaires: ''
    });
    this.applyAgentHabilDefaultValideur(DataModel.state.agentHabilLines.length - 1);
    this.applyAgentHabilDefaultGroupe(DataModel.state.agentHabilLines.length - 1);
    this.agentHabilCollapsed.push(false);
    this.renderAgentHabilLines();

    // Mettre à jour les suggestions pour la nouvelle ligne
    setTimeout(() => {
      const idx = DataModel.state.agentHabilLines.length - 1;
      this.updateAgentHabilGroupeSuggestions(idx, firstLogId);
    }, 10);
  },

  removeAgentHabilLine(idx) {
    DataModel.state.agentHabilLines.splice(idx, 1);
    this.agentHabilCollapsed.splice(idx, 1);
    this.renderAgentHabilLines();
  },

  toggleAgentHabilLine(idx) {
    if (typeof this.agentHabilCollapsed[idx] === 'undefined') return;
    this.agentHabilCollapsed[idx] = !this.agentHabilCollapsed[idx];
    this.renderAgentHabilLines();
  },

  updateAgentHabilLine(idx, field, value) {
    if (DataModel.state.agentHabilLines[idx]) {
      DataModel.state.agentHabilLines[idx][field] = value;
    }
  },

  /**
   * Met à jour les groupes d'une ligne d'habilitation agent (parse CSV)
   * @param {number} idx - Index de la ligne
   * @param {string} value - Groupes séparés par virgule
   */
  updateAgentHabilLineGroupes(idx, value) {
    if (DataModel.state.agentHabilLines[idx]) {
      const groupes = value.split(',').map(g => g.trim()).filter(g => g);
      DataModel.state.agentHabilLines[idx].groupes = groupes;
    }
  },

  /**
   * Met à jour les suggestions de groupes pendant la saisie (support multi-groupes CSV)
   * @param {number} idx - Index de la ligne
   * @param {string} rawValue - Valeur courante du champ groupes
   */
  onAgentHabilGroupesInput(idx, rawValue) {
    const line = DataModel.state.agentHabilLines[idx];
    if (!line) return;

    // Garder le modèle synchronisé en continu pour éviter les écarts UI/état.
    this.updateAgentHabilLineGroupes(idx, rawValue);

    const log = DataModel.getLogiciel(line.logicielId);
    const suggestList = document.getElementById(`groupesListSuggest_${idx}`);
    if (!log || !suggestList) return;

    const allGroupes = Array.isArray(log.groupes) ? log.groupes : [];
    const parts = String(rawValue || '').split(',');
    const currentToken = (parts.pop() || '').trim().toLowerCase();
    const selected = parts.map(p => p.trim()).filter(p => p);
    const selectedLower = selected.map(s => s.toLowerCase());
    const basePrefix = selected.length ? selected.join(', ') + ', ' : '';

    const candidates = allGroupes
      .filter(g => !selectedLower.includes(String(g).toLowerCase()))
      .filter(g => !currentToken || String(g).toLowerCase().includes(currentToken))
      .slice(0, 20);

    if (!candidates.length) {
      suggestList.innerHTML = '';
      this.autoGrowAgentHabilGroupesField(idx);
      return;
    }

    suggestList.innerHTML = candidates.map(g =>
      `<div class="valideur-suggestion-item" onclick='UI.selectAgentHabilGroupeSuggestion(${idx}, ${JSON.stringify(g)})'>
        <div class="valideur-suggestion-name">${Utils.esc(g)}</div>
      </div>`
    ).join('');

    this.autoGrowAgentHabilGroupesField(idx);
  },

  /**
   * Sélectionne une suggestion de groupe pour une ligne d'habilitation agent
   * @param {number} idx - Index de la ligne
   * @param {string} groupe - Groupe sélectionné
   */
  selectAgentHabilGroupeSuggestion(idx, groupe) {
    const input = document.getElementById(`groupesAgent_${idx}`);
    const suggestList = document.getElementById(`groupesListSuggest_${idx}`);
    if (!input) return;

    const parts = String(input.value || '').split(',');
    parts.pop(); // remplace le segment en cours de saisie
    const selected = parts.map(p => p.trim()).filter(p => p);
    const nextValue = (selected.length ? selected.join(', ') + ', ' : '') + groupe;

    input.value = nextValue;
    this.updateAgentHabilLineGroupes(idx, nextValue);
    this.autoGrowAgentHabilGroupesField(idx);
    if (suggestList) suggestList.innerHTML = '';
  },

  /**
   * Ajuste automatiquement la hauteur du champ groupes d'une ligne agent
   * @param {number} idx - Index de la ligne
   */
  autoGrowAgentHabilGroupesField(idx) {
    const input = document.getElementById(`groupesAgent_${idx}`);
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  },

  /**
   * Appelé quand le logiciel change dans une ligne d'habilitation agent
   * @param {number} idx - Index de la ligne
   * @param {string} logicielId - ID du logiciel sélectionné
   */
  onAgentHabilLogicielChange(idx, logicielId) {
    this.updateAgentHabilLine(idx, 'logicielId', logicielId);
    this.applyAgentHabilDefaultValideur(idx);
    this.applyAgentHabilDefaultGroupe(idx, true);
    this.updateAgentHabilGroupeSuggestions(idx, logicielId);
    this.renderAgentHabilLines();
  },

  /**
   * Met à jour les suggestions de groupes pour une ligne d'habilitation agent
   * @param {number} idx - Index de la ligne
   * @param {string} logicielId - ID du logiciel
   */
  updateAgentHabilGroupeSuggestions(idx, logicielId) {
    const log = DataModel.getLogiciel(logicielId);
    const datalist = document.getElementById(`groupesList_${idx}`);
    const suggestDiv = document.getElementById(`groupesSuggest_${idx}`);

    if (!log) return;

    // Remplir la datalist
    if (datalist && log.groupes && log.groupes.length > 0) {
      datalist.innerHTML = log.groupes.map(g =>
        `<option value="${Utils.esc(g)}"></option>`
      ).join('');
    }

    // Afficher le message de suggestion
    if (suggestDiv && log.groupes && log.groupes.length > 0) {
      suggestDiv.textContent = 'Groupes suggérés : ' + log.groupes.join(', ');
    } else if (suggestDiv) {
      suggestDiv.textContent = '';
    }
  },

  // Autres méthodes similaires pour habilitations, paramètres, etc.
  // (à compléter selon besoin)

  /**
   * Remplit les selects de la modale habilitation
   */
  populateHabilModalSelects() {
    // Agents
    const agentSelect = document.getElementById('hAgent');
    agentSelect.innerHTML = '<option value="">— Choisir un agent —</option>' +
      DataModel.agents.map(a => `<option value="${a.id}">${Utils.esc(a.nom)} ${Utils.esc(a.prenom)}</option>`).join('');

    // Logiciels
    const logicielSelect = document.getElementById('hLogiciel');
    logicielSelect.innerHTML = '<option value="">— Choisir un logiciel —</option>' +
      DataModel.logiciels.map(l => `<option value="${l.id}">${Utils.esc(l.nom)}</option>`).join('');

    // Rôles
    const roleSelect = document.getElementById('hRole');
    roleSelect.innerHTML = '<option value="">— Choisir —</option>' +
      DataModel.params.roles.map(r => `<option>${Utils.esc(r)}</option>`).join('');

    // Permissions
    const permSelect = document.getElementById('hPermissions');
    permSelect.innerHTML = '<option value="">— Choisir —</option>' +
      DataModel.params.permissions.map(p => `<option>${Utils.esc(p)}</option>`).join('');
  },

  /**
   * Ouvre la modale d'habilitation
   * @param {string} habilId - ID de l'habilitation (null pour création)
   */
  openHabilModal(habilId = null) {
    DataModel.state.editingHabilId = habilId;
    const modal = document.getElementById('habilModalOverlay');
    const title = document.getElementById('habilModalTitle');

    // Remplir les selects
    this.populateHabilModalSelects();

    if (habilId) {
      const h = DataModel.getHabilitation(habilId);
      if (!h) return;

      title.textContent = "Modifier l'habilitation";
      document.getElementById('hAgent').value = h.agentId;
      document.getElementById('hLogiciel').value = h.logicielId;
      document.getElementById('hRole').value = h.role || '';
      document.getElementById('hPermissions').value = h.permissions || '';
      document.getElementById('hStatut').value = h.statut || 'Actif';
      document.getElementById('hValideur').value = h.valideur || '';
      document.getElementById('hRevision').value = h.dateProchRevision || '';
      document.getElementById('hDerniereValidation').value = h.dateDerniereValidation || '';
      document.getElementById('hCommentaires').value = h.commentaires || '';

      // Charger les groupes
      DataModel.state.currentHabilGroupes = (h.groupes || []).slice();
    } else {
      title.textContent = 'Nouvelle habilitation';
      document.getElementById('hAgent').value = '';
      document.getElementById('hLogiciel').value = '';
      document.getElementById('hRole').value = '';
      document.getElementById('hPermissions').value = '';
      document.getElementById('hStatut').value = 'Actif';
      document.getElementById('hValideur').value = '';
      document.getElementById('hRevision').value = '';
      document.getElementById('hDerniereValidation').value = Utils.today();
      document.getElementById('hCommentaires').value = '';

      // Groupes vides
      DataModel.state.currentHabilGroupes = [];
    }

    this.renderHabilGroupes();
    modal.classList.add('show');

    // Initialiser les suggestions de groupes si un logiciel est sélectionné
    if (habilId) {
      const h = DataModel.getHabilitation(habilId);
      if (h && h.logicielId) {
        onHabilLogicielChange();
      }
    }
  },

  /**
   * Affiche les groupes de sécurité dans la modale d'habilitation
   */
  renderHabilGroupes() {
    const container = document.getElementById('hGroupesContainer');
    if (!container) return;

    const groupes = DataModel.state.currentHabilGroupes || [];
    container.innerHTML = groupes.map(g =>
      `<span class="habil-groupe-chip">${Utils.esc(g)}<button onclick="UI.removeHabilGroupe('${Utils.esc(g)}')">✕</button></span>`
    ).join('');
  },

  /**
   * Ajoute un groupe à l'habilitation en cours d'édition
   */
  addHabilGroupe() {
    const input = document.getElementById('hGroupeInput');
    const val = input.value.trim();
    if (!val) return;

    if (!DataModel.state.currentHabilGroupes) {
      DataModel.state.currentHabilGroupes = [];
    }

    if (!DataModel.state.currentHabilGroupes.includes(val)) {
      DataModel.state.currentHabilGroupes.push(val);
      this.renderHabilGroupes();
      input.value = '';
    } else {
      this.toast('Ce groupe est déjà ajouté', 'warning');
    }
  },

  /**
   * Supprime un groupe de l'habilitation en cours d'édition
   * @param {string} groupe - Nom du groupe à supprimer
   */
  removeHabilGroupe(groupe) {
    if (DataModel.state.currentHabilGroupes) {
      DataModel.state.currentHabilGroupes = DataModel.state.currentHabilGroupes.filter(g => g !== groupe);
      this.renderHabilGroupes();
    }
  },

  confirmDeleteHabil(habilId) {
    this.confirm({
      title: "Supprimer l'habilitation",
      message: 'Supprimer définitivement cette habilitation ',
      onConfirm: () => {
        DataModel.deleteHabilitation(habilId);
        DataModel.markUnsaved();
        Renderer.renderAll();
        this.updateSaveIndicator();
        this.toast('Habilitation supprimée', 'info');
      }
    });
  },

  removeParam(key, idx) {
    DataModel.params[key].splice(idx, 1);
    DataModel.markUnsaved();
    Renderer.renderSettings();
    this.updateSaveIndicator();
  },

  addParam(key, inputId) {
    const input = document.getElementById(inputId);
    const val = input.value.trim();
    if (!val) return;
    DataModel.params[key].push(val);
    input.value = '';
    DataModel.markUnsaved();
    Renderer.renderSettings();
    this.updateSaveIndicator();
  },

  /**
   * Démarre un drag d'item dans une liste de paramètres
   * @param {DragEvent} event - Événement dragstart
   * @param {string} key - Clé du paramètre
   * @param {number} idx - Index de l'item
   */
  startParamDrag(event, key, idx) {
    this.paramDragState = { key, from: idx };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', `${key}:${idx}`);
    }
    event.currentTarget.classList.add('is-dragging');
  },

  /**
   * Autorise le drop sur un item
   * @param {DragEvent} event - Événement dragover
   */
  onParamDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  },

  /**
   * Gère l'entrée de survol pendant le drag
   * @param {DragEvent} event - Événement dragenter
   */
  onParamDragEnter(event) {
    event.currentTarget.classList.add('drag-over');
  },

  /**
   * Gère la sortie de survol pendant le drag
   * @param {DragEvent} event - Événement dragleave
   */
  onParamDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
  },

  /**
   * Termine un drag (nettoyage visuel)
   */
  endParamDrag() {
    document.querySelectorAll('.list-item.is-dragging, .list-item.drag-over')
      .forEach(el => el.classList.remove('is-dragging', 'drag-over'));
  },

  /**
   * Dépose un item et réordonne la liste de paramètres
   * @param {DragEvent} event - Événement drop
   * @param {string} key - Clé du paramètre
   * @param {number} toIdx - Index cible
   */
  onParamDrop(event, key, toIdx) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    const drag = this.paramDragState;
    this.paramDragState = null;

    if (!drag || drag.key !== key) return;
    if (drag.from === toIdx) return;

    this.reorderParam(key, drag.from, toIdx);
  },

  /**
   * Réordonne les items d'un paramètre sans changer le format des données
   * @param {string} key - Clé du paramètre
   * @param {number} fromIdx - Index source
   * @param {number} toIdx - Index cible
   */
  reorderParam(key, fromIdx, toIdx) {
    const list = DataModel.params[key];
    if (!Array.isArray(list)) return;
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    DataModel.markUnsaved();
    Renderer.renderSettings();
    this.updateSaveIndicator();
  },

  updateLogicielName(id, name) {
    const log = DataModel.getLogiciel(id);
    if (log) {
      log.nom = name;
      DataModel.markUnsaved();
      this.updateSaveIndicator();
    }
  },

  deleteLogiciel(id) {
    DataModel.deleteLogiciel(id);
    DataModel.markUnsaved();
    Renderer.renderLogicielsEditor();
    Renderer.populateHabilFilters();
    Renderer.renderAll();
    this.updateSaveIndicator();
  },

  addValideur(logId) {
    const input = document.getElementById(`newValideur_${logId}`);
    const val = input.value.trim();
    if (!val) return;

    const log = DataModel.getLogiciel(logId);
    if (log) {
      if (!log.valideurs) log.valideurs = [];
      log.valideurs.push(val);
      input.value = '';
      DataModel.markUnsaved();
      Renderer.renderLogicielsEditor();
      this.updateSaveIndicator();
    }
  },

  removeValideur(logId, valideur) {
    const log = DataModel.getLogiciel(logId);
    if (log && log.valideurs) {
      log.valideurs = log.valideurs.filter(v => v !== valideur);
      DataModel.markUnsaved();
      Renderer.renderLogicielsEditor();
      this.updateSaveIndicator();
    }
  },

  /**
   * Gère l'autocomplétion du champ valideur dans les paramètres logiciels
   * @param {string} logId - ID du logiciel
   */
  onValideurLogicielInput(logId) {
    const input = document.getElementById(`newValideur_${logId}`);
    const suggestDiv = document.getElementById(`valideurSuggest_${logId}`);
    if (!input || !suggestDiv) return;

    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      suggestDiv.innerHTML = '';
      return;
    }

    // Recherche dans les agents existants
    const matches = DataModel.agents.filter(a => {
      const fullName = `${a.nom} ${a.prenom}`.toLowerCase();
      const reverseName = `${a.prenom} ${a.nom}`.toLowerCase();
      return fullName.includes(query) || reverseName.includes(query);
    }).slice(0, 5);

    if (matches.length > 0) {
      suggestDiv.innerHTML = matches.map(a => {
        const fullName = `${a.nom} ${a.prenom}`;
        return `<div class="valideur-suggestion-item" onclick="UI.selectValideurLogiciel('${logId}', '${Utils.esc(fullName)}')">
          <div class="valideur-suggestion-name">${Utils.esc(fullName)}</div>
          <div class="valideur-suggestion-meta">${Utils.esc(a.service || '')} ${a.poste ? '· ' + Utils.esc(a.poste) : ''}</div>
        </div>`;
      }).join('');
    } else {
      suggestDiv.innerHTML = '';
    }
  },

  /**
   * Sélectionne un valideur depuis les suggestions (paramètres logiciels)
   * @param {string} logId - ID du logiciel
   * @param {string} fullName - Nom complet de l'agent
   */
  selectValideurLogiciel(logId, fullName) {
    const input = document.getElementById(`newValideur_${logId}`);
    const suggestDiv = document.getElementById(`valideurSuggest_${logId}`);
    if (input) input.value = fullName;
    if (suggestDiv) suggestDiv.innerHTML = '';
  },

  /**
   * Gère l'autocomplétion du champ valideur dans les lignes d'habilitation agent
   * @param {number} idx - Index de la ligne d'habilitation
   */
  onValideurAgentHabilInput(idx) {
    const input = document.getElementById(`valideurAgent_${idx}`);
    const suggestDiv = document.getElementById(`valideurAgentSuggest_${idx}`);
    if (!input || !suggestDiv) return;

    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      suggestDiv.innerHTML = '';
      return;
    }

    // Recherche dans les agents existants
    const matches = DataModel.agents.filter(a => {
      const fullName = `${a.nom} ${a.prenom}`.toLowerCase();
      const reverseName = `${a.prenom} ${a.nom}`.toLowerCase();
      return fullName.includes(query) || reverseName.includes(query);
    }).slice(0, 5);

    if (matches.length > 0) {
      suggestDiv.innerHTML = matches.map(a => {
        const fullName = `${a.nom} ${a.prenom}`;
        return `<div class="valideur-suggestion-item" onclick="UI.selectValideurAgentHabil(${idx}, '${Utils.esc(fullName)}')">
          <div class="valideur-suggestion-name">${Utils.esc(fullName)}</div>
          <div class="valideur-suggestion-meta">${Utils.esc(a.service || '')} ${a.poste ? '· ' + Utils.esc(a.poste) : ''}</div>
        </div>`;
      }).join('');
    } else {
      suggestDiv.innerHTML = '';
    }
  },

  /**
   * Sélectionne un valideur depuis les suggestions (lignes habilitation agent)
   * @param {number} idx - Index de la ligne
   * @param {string} fullName - Nom complet de l'agent
   */
  selectValideurAgentHabil(idx, fullName) {
    const input = document.getElementById(`valideurAgent_${idx}`);
    const suggestDiv = document.getElementById(`valideurAgentSuggest_${idx}`);
    if (input) {
      input.value = fullName;
      // Déclencher l'événement onchange pour mettre à jour le modèle
      this.updateAgentHabilLine(idx, 'valideur', fullName);
    }
    if (suggestDiv) suggestDiv.innerHTML = '';
  },

  /**
   * Ajoute un groupe de sécurité à un logiciel
   * @param {string} logId - ID du logiciel
   */
  addGroupeLogiciel(logId) {
    const input = document.getElementById(`newGroupe_${logId}`);
    const val = input.value.trim();
    if (!val) return;

    const log = DataModel.getLogiciel(logId);
    if (log) {
      if (!log.groupes) log.groupes = [];
      log.groupes.push(val);
      input.value = '';
      DataModel.markUnsaved();
      Renderer.renderLogicielsEditor();
      this.updateSaveIndicator();
    }
  },

  /**
   * Supprime un groupe de sécurité d'un logiciel
   * @param {string} logId - ID du logiciel
   * @param {string} groupe - Nom du groupe à supprimer
   */
  removeGroupeLogiciel(logId, groupe) {
    const log = DataModel.getLogiciel(logId);
    if (log && log.groupes) {
      log.groupes = log.groupes.filter(g => g !== groupe);
      DataModel.markUnsaved();
      Renderer.renderLogicielsEditor();
      this.updateSaveIndicator();
    }
  },

  /**
   * Gère l'autocomplétion du champ valideur avec suggestions d'agents
   */
  onValideurInput() {
    const input = document.getElementById('hValideur');
    const suggestDiv = document.getElementById('hValideurSuggest');
    if (!input || !suggestDiv) return;

    const query = input.value.trim().toLowerCase();
    if (query.length < 2) {
      suggestDiv.innerHTML = '';
      return;
    }

    // Recherche dans les agents existants
    const matches = DataModel.agents.filter(a => {
      const fullName = `${a.nom} ${a.prenom}`.toLowerCase();
      const reverseName = `${a.prenom} ${a.nom}`.toLowerCase();
      return fullName.includes(query) || reverseName.includes(query);
    }).slice(0, 5);

    if (matches.length > 0) {
      suggestDiv.innerHTML = matches.map(a => {
        const fullName = `${a.nom} ${a.prenom}`;
        return `<div class="valideur-suggestion-item" onclick="UI.selectValideur('${Utils.esc(fullName)}', '${a.id}')">
          <div class="valideur-suggestion-name">${Utils.esc(fullName)}</div>
          <div class="valideur-suggestion-meta">${Utils.esc(a.service || '')} ${a.poste ? '· ' + Utils.esc(a.poste) : ''}</div>
        </div>`;
      }).join('') + `<div class="valideur-suggestion-create" onclick="UI.createAgentFromValideur('${Utils.esc(input.value)}')">
        ➕ Créer un nouvel agent
      </div>`;
    } else {
      suggestDiv.innerHTML = `<div class="valideur-suggestion-create" onclick="UI.createAgentFromValideur('${Utils.esc(input.value)}')">
        ➕ Créer l'agent "${Utils.esc(input.value)}"
      </div>`;
    }
  },

  /**
   * Sélectionne un valideur depuis les suggestions
   * @param {string} fullName - Nom complet de l'agent
   * @param {string} agentId - ID de l'agent
   */
  selectValideur(fullName, agentId) {
    const input = document.getElementById('hValideur');
    const suggestDiv = document.getElementById('hValideurSuggest');
    if (input) {
      input.value = fullName;
      input.dataset.agentId = agentId;
    }
    if (suggestDiv) suggestDiv.innerHTML = '';
  },

  /**
   * Crée un agent depuis le champ valideur
   * @param {string} input - Texte saisi par l'utilisateur
   */
  createAgentFromValideur(input) {
    const parts = input.trim().split(/\s+/);
    const nom = parts.length > 1 ? parts[0] : input.trim();
    const prenom = parts.length > 1 ? parts.slice(1).join(' ') : '';

    this.showQuickAgentModal(nom, prenom);
  },

  /**
   * Affiche la modale de création rapide d'agent
   * @param {string} nom - Nom pré-rempli
   * @param {string} prenom - Prénom pré-rempli
   */
  showQuickAgentModal(nom = '', prenom = '') {
    const overlay = document.getElementById('quickAgentModalOverlay');
    const nameInput = document.getElementById('qaName');
    const firstNameInput = document.getElementById('qaFirstName');
    const serviceInput = document.getElementById('qaService');
    const serviceList = document.getElementById('qaServiceList');

    // Pré-remplir les champs
    if (nameInput) nameInput.value = nom;
    if (firstNameInput) firstNameInput.value = prenom;
    if (serviceInput) serviceInput.value = '';

    // Remplir la datalist des services
    if (serviceList) {
      serviceList.innerHTML = DataModel.params.services.map(s =>
        `<option value="${Utils.esc(s)}"></option>`
      ).join('');
    }

    overlay.classList.add('show');
    if (nameInput) nameInput.focus();
  },

  /**
   * Ferme la modale de création rapide d'agent
   */
  closeQuickAgentModal() {
    const overlay = document.getElementById('quickAgentModalOverlay');
    overlay.classList.remove('show');
  },

  /**
   * Sauvegarde l'agent créé rapidement
   */
  saveQuickAgent() {
    const nom = document.getElementById('qaName').value.trim();
    const prenom = document.getElementById('qaFirstName').value.trim();
    const service = document.getElementById('qaService').value.trim();

    if (!nom) {
      this.toast('Le nom est obligatoire', 'error');
      return;
    }

    // Créer l'agent
    const newAgent = {
      nom,
      prenom: prenom || '',
      service: service || '',
      poste: '',
      email: ''
    };

    DataModel.addAgent(newAgent);
    DataModel.markUnsaved();

    // Remplir le champ valideur avec le nom complet
    const fullName = `${nom} ${prenom}`.trim();
    const valideurInput = document.getElementById('hValideur');
    if (valideurInput) {
      valideurInput.value = fullName;
      valideurInput.dataset.agentId = newAgent.id;
    }

    // Fermer la modale
    this.closeQuickAgentModal();

    // Rafraîchir l'affichage des agents si on est sur cet onglet
    if (DataModel.state.currentTab === 'agents') {
      Renderer.renderAgentsTable();
    }

    this.toast(`Agent ${fullName} créé avec succès`, 'success');
    this.updateSaveIndicator();
  },

  renderSecurityPanel() {
    const file = DataModel.state.currentFile;
    const isEncrypted = file && file.endsWith('.habil');
    const hasHandle = DataModel.state.fileHandle !== null;

    const iconEl = document.getElementById('secStatusIcon');
    const titleEl = document.getElementById('secStatusTitle');
    const subEl = document.getElementById('secStatusSub');

    if (!file) {
      iconEl.textContent = '🔓';
      titleEl.textContent = 'Aucun fichier';
      subEl.textContent = 'Créez ou chargez un fichier pour commencer.';
    } else if (isEncrypted) {
      iconEl.textContent = '🔒';
      titleEl.textContent = 'Fichier chiffré (AES-256)';
      if (hasHandle) {
        subEl.textContent = `Sauvegarde automatique activée sur ${file}`;
      } else {
        subEl.textContent = `Fichier : ${file}`;
      }
    } else {
      iconEl.textContent = '📄';
      titleEl.textContent = 'Fichier non chiffré';
      subEl.textContent = `Fichier Excel en clair : ${file}`;
    }
  },

  /**
   * Affiche la modale de mot de passe
   * @param {Object} options - {title, message, isCreation, onConfirm, onCancel}
   */
  showPasswordModal(options) {
    const overlay = document.getElementById('passwordModalOverlay');
    if (!overlay) {
      console.error('Modale de mot de passe non trouvée');
      return;
    }

    document.getElementById('passwordModalTitle').textContent = options.title || 'Mot de passe';
    document.getElementById('passwordModalMessage').textContent = options.message || '';

    const pwd1 = document.getElementById('passwordInput1');
    const pwd2 = document.getElementById('passwordInput2');
    const pwd2Group = document.getElementById('passwordConfirmGroup');

    pwd1.value = '';
    pwd2.value = '';

    if (options.isCreation) {
      pwd2Group.style.display = 'block';
    } else {
      pwd2Group.style.display = 'none';
    }

    overlay.classList.add('show');

    const onValidate = () => {
      const p1 = pwd1.value;
      const p2 = pwd2.value;

      if (!p1) {
        this.toast('Le mot de passe ne peut pas être vide', 'error');
        return;
      }

      if (p1.length < 8) {
        this.toast('Le mot de passe doit contenir au moins 8 caractères', 'error');
        return;
      }

      if (options.isCreation && p1 !== p2) {
        this.toast('Les mots de passe ne correspondent pas', 'error');
        return;
      }

      overlay.classList.remove('show');
      if (options.onConfirm) options.onConfirm(p1);
    };

    const onCancelModal = () => {
      overlay.classList.remove('show');
      if (options.onCancel) options.onCancel();
    };

    document.getElementById('passwordModalConfirm').onclick = onValidate;
    document.getElementById('passwordModalCancel').onclick = onCancelModal;

    // Enter pour valider
    const enterHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onValidate();
      }
    };
    pwd1.onkeydown = enterHandler;
    pwd2.onkeydown = enterHandler;
  }
};

// Fonctions globales pour compatibilité onclick
function toggleTheme() { UI.toggleTheme(); }
function switchTab(tab) { UI.switchTab(tab); }
function switchSettingsTab(tab) { UI.switchSettingsTab(tab); }
function openAgentModal(id) { UI.openAgentModal(id); }
function closeAgentModal() { UI.closeAgentModal(); }
function saveAgent() { UI.saveAgent(); }
function openHabilModal(id) { UI.openHabilModal(id); }
function closeHabilModal() {
  document.getElementById('habilModalOverlay').classList.remove('show');
}
function saveHabil() {
  const agentId = document.getElementById('hAgent').value;
  const logicielId = document.getElementById('hLogiciel').value;
  const role = document.getElementById('hRole').value || '';
  const permissions = document.getElementById('hPermissions').value || '';
  const statut = document.getElementById('hStatut').value || 'Actif';
  const valideur = (document.getElementById('hValideur').value || '').trim();
  const dateProchRevision = document.getElementById('hRevision').value;
  const dateDerniereValidation = document.getElementById('hDerniereValidation').value;
  const commentaires = (document.getElementById('hCommentaires').value || '').trim();

  if (!agentId || !logicielId) {
    UI.toast('Agent et logiciel sont obligatoires', 'error');
    return;
  }

  const habilData = {
    agentId,
    logicielId,
    role,
    permissions,
    statut,
    valideur,
    dateProchRevision,
    dateDerniereValidation,
    commentaires,
    groupes: DataModel.state.currentHabilGroupes || []
  };

  const habilId = DataModel.state.editingHabilId;
  if (habilId) {
    // Modification
    DataModel.updateHabilitation(habilId, habilData);
    UI.toast('Habilitation modifiée', 'success');
  } else {
    // Création
    DataModel.addHabilitation(habilData);
    UI.toast('Habilitation créée', 'success');
  }

  DataModel.markUnsaved();
  closeHabilModal();
  Renderer.renderAll();
  UI.updateSaveIndicator();
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('show');
}
function addParam(key, inputId) { UI.addParam(key, inputId); }
function addHabilLine() { UI.addAgentHabilLine(); }
function onHabilLogicielChange() {
  const logId = document.getElementById('hLogiciel').value;
  if (!logId) return;
  const log = DataModel.getLogiciel(logId);

  // Suggestion de valideurs selon le logiciel sélectionné
  if (log && log.valideurs && log.valideurs.length > 0) {
    const suggestDiv = document.getElementById('hValideurSuggest');
    if (suggestDiv) {
      suggestDiv.textContent = 'Valideurs suggérés : ' + log.valideurs.join(', ');
    }
  }

  // Suggestion de groupes de sécurité selon le logiciel sélectionné
  if (log && log.groupes && log.groupes.length > 0) {
    const groupeSuggestDiv = document.getElementById('hGroupeSuggest');
    const groupeList = document.getElementById('hGroupeList');

    if (groupeSuggestDiv) {
      groupeSuggestDiv.textContent = 'Groupes suggérés : ' + log.groupes.join(', ');
    }

    if (groupeList) {
      groupeList.innerHTML = log.groupes.map(g =>
        `<option value="${Utils.esc(g)}"></option>`
      ).join('');
    }
  }
}
function addLogiciel() {
  const nom = prompt('Nom du logiciel :');
  if (!nom || !nom.trim()) return;
  DataModel.addLogiciel({ nom: nom.trim(), valideurs: [] });
  DataModel.markUnsaved();
  Renderer.renderLogicielsEditor();
  Renderer.populateHabilFilters();
  UI.updateSaveIndicator();
}
function closeQuickAgentModal() { UI.closeQuickAgentModal(); }
function saveQuickAgent() { UI.saveQuickAgent(); }
function addHabilGroupe() { UI.addHabilGroupe(); }



