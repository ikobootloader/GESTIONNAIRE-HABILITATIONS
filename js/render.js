/**
 * Module de Rendu
 * Fonctions de rendu des tables, statistiques et dashboards
 */

const Renderer = {
  /**
   * Rend toutes les vues
   */
  renderAll() {
    this.renderStats();
    this.renderDashboard();
    this.renderAgentsTable();
    this.renderHabilTable();
    this.renderRevisions();
    this.renderSettings();
    this.updateRevBadge();
    this.populateHabilFilters();
  },

  /**
   * Rend les statistiques du dashboard
   */
  renderStats() {
    const totalHabils = DataModel.habilitations.length;
    const actifs = DataModel.habilitations.filter(h => h.statut === 'Actif').length;
    const soon = DataModel.habilitations.filter(h => Utils.daysUntil(h.dateProchRevision) <= DataModel.params.alertDays).length;
    const urgent = DataModel.habilitations.filter(h => Utils.daysUntil(h.dateProchRevision) <= 7).length;

    document.getElementById('statAgents').textContent = DataModel.agents.length;
    document.getElementById('statLogiciels').textContent = DataModel.logiciels.length;
    document.getElementById('statTotalHabils').textContent = totalHabils;
    document.getElementById('statActifs').textContent = actifs;
    document.getElementById('statRevisions').textContent = soon;
    document.getElementById('statUrgent').textContent = urgent;
  },

  /**
   * Rend le dashboard (récents + alertes)
   */
  renderDashboard() {
    // 5 derniers agents
    const recentAgents = [...DataModel.agents].slice(-5).reverse();
    const recentBody = document.getElementById('recentAgentsBody');
    if (recentAgents.length === 0) {
      recentBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text3);padding:20px">Aucun agent</td></tr>';
    } else {
      recentBody.innerHTML = recentAgents.map(a => `
        <tr>
          <td><strong>${Utils.esc(a.nom)} ${Utils.esc(a.prenom)}</strong></td>
          <td class="muted">${Utils.esc(a.service)}</td>
          <td class="muted">${Utils.esc(a.email)}</td>
        </tr>
      `).join('');
    }

    // Révisions urgentes
    const urgentRevs = DataModel.habilitations
      .filter(h => Utils.daysUntil(h.dateProchRevision) <= 7)
      .slice(0, 5);
    const urgentBody = document.getElementById('urgentRevBody');
    if (urgentRevs.length === 0) {
      urgentBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px">Aucune révision urgente</td></tr>';
    } else {
      urgentBody.innerHTML = urgentRevs.map(h => {
        const a = DataModel.getAgent(h.agentId) || {};
        const l = DataModel.getLogiciel(h.logicielId) || {};
        const d = Utils.daysUntil(h.dateProchRevision);
        return `
          <tr>
            <td><strong>${Utils.esc(a.nom)} ${Utils.esc(a.prenom)}</strong></td>
            <td><span class="badge-logiciel">${Utils.esc(l.nom)}</span></td>
            <td class="muted">${Utils.fmtDate(h.dateProchRevision)}</td>
            <td><span style="color:var(--red);font-weight:600">J-${d}</span></td>
          </tr>
        `;
      }).join('');
    }
  },

  /**
   * Rend la table des agents avec pagination
   */
  renderAgentsTable() {
    const search = (document.getElementById('agentSearch').value || '').toLowerCase();
    const svc = document.getElementById('agentFilterService').value;

    // Filtrage
    let list = DataModel.agents.filter(a => {
      const txt = [a.nom, a.prenom, a.email, a.service, a.poste].join(' ').toLowerCase();
      return (!search || txt.includes(search)) && (!svc || a.service === svc);
    });

    // Tri
    if (DataModel.state.agentSortCol) {
      const getV = a => ({
        nom: a.nom + ' ' + a.prenom,
        service: a.service,
        poste: a.poste,
        email: a.email
      }[DataModel.state.agentSortCol] || '').toLowerCase();
      list.sort((a, b) => DataModel.state.agentSortAsc ?
        getV(a).localeCompare(getV(b), 'fr') :
        getV(b).localeCompare(getV(a), 'fr'));
    }

    // Pagination
    const pagination = PaginationManager.paginate(list, 'agents');
    document.getElementById('agentCount').textContent = `${list.length} agent(s)`;

    const body = document.getElementById('agentsBody');
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👤</div><p>Aucun agent</p></div></td></tr>`;
      document.getElementById('agentsPagination').innerHTML = '';
      return;
    }

    body.innerHTML = pagination.paginatedData.map(a => {
      const habils = DataModel.getAgentHabilitations(a.id);
      const logs = habils.map(h => DataModel.getLogicielName(h.logicielId)).filter((v, i, arr) => v && arr.indexOf(v) === i);
      return `<tr>
        <td><strong>${Utils.esc(a.nom)} ${Utils.esc(a.prenom)}</strong><br><span style="font-size:11px;color:var(--text3)">${Utils.esc(a.id)}</span></td>
        <td class="muted">${Utils.esc(a.service) || '—'}</td>
        <td class="muted">${Utils.esc(a.poste) || '—'}</td>
        <td>${logs.length ? logs.map(l => `<span class="badge-logiciel">${Utils.esc(l)}</span>`).join('') : '<span style="color:var(--text3);font-size:12px">Aucun accès</span>'}</td>
        <td class="muted">${Utils.esc(a.email) || '—'}</td>
        <td><div class="row-actions">
          <button class="action-btn" onclick="UI.openAgentModal('${a.id}')" title="Modifier">✏</button>
          <button class="action-btn del" onclick="UI.confirmDeleteAgent('${a.id}')" title="Supprimer">🗑</button>
        </div></td>
      </tr>`;
    }).join('');

    document.getElementById('agentsPagination').innerHTML = PaginationManager.renderControls(pagination, 'agents');
  },

  /**
   * Rend la table des habilitations avec pagination
   */
  renderHabilTable() {
    const search = (document.getElementById('habilSearch').value || '').toLowerCase();
    const fLog = document.getElementById('habilFilterLogiciel').value;
    const fStat = document.getElementById('habilFilterStatut').value;

    // Filtrage
    let list = DataModel.habilitations.filter(h => {
      const a = DataModel.getAgent(h.agentId) || {};
      const l = DataModel.getLogiciel(h.logicielId) || {};
      const groupesStr = (h.groupes || []).join(' ');
      const txt = [a.nom, a.prenom, a.email, l.nom, h.role, h.permissions, groupesStr, h.valideur, h.statut].join(' ').toLowerCase();
      return (!search || txt.includes(search)) && (!fLog || h.logicielId === fLog) && (!fStat || h.statut === fStat);
    });

    // Tri
    if (DataModel.state.habilSortCol) {
      const getV = h => {
        const a = DataModel.getAgent(h.agentId) || {};
        const l = DataModel.getLogiciel(h.logicielId) || {};
        return ({
          agent: (a.nom + ' ' + a.prenom).toLowerCase(),
          logiciel: (l.nom || '').toLowerCase(),
          role: (h.role || '').toLowerCase(),
          permissions: (h.permissions || '').toLowerCase(),
          groupe: ((h.groupes || []).join(' ') || '').toLowerCase(),
          statut: (h.statut || '').toLowerCase(),
          valideur: (h.valideur || '').toLowerCase(),
          revision: h.dateProchRevision || '9'
        })[DataModel.state.habilSortCol] || '';
      };
      list.sort((a, b) => DataModel.state.habilSortAsc ?
        getV(a).localeCompare(getV(b), 'fr') :
        getV(b).localeCompare(getV(a), 'fr'));
    }

    // Pagination
    const pagination = PaginationManager.paginate(list, 'habilitations');
    document.getElementById('habilCount').textContent = `${list.length} habilitation(s)`;

    const body = document.getElementById('habilBody');
    if (!list.length) {
      body.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🔐</div><p>Aucune habilitation</p></div></td></tr>`;
      document.getElementById('habilPagination').innerHTML = '';
      return;
    }

    body.innerHTML = pagination.paginatedData.map(h => {
      const a = DataModel.getAgent(h.agentId) || {};
      const l = DataModel.getLogiciel(h.logicielId) || {};
      const d = Utils.daysUntil(h.dateProchRevision);
      const isAlert = d <= DataModel.params.alertDays;
      const dStr = d === 9999 ? '—' : d <= 0 ? `<span style="color:var(--red);font-weight:600">Expiré</span>` : d <= 7 ? `<span style="color:var(--red)">J-${d}</span>` : d <= DataModel.params.alertDays ? `<span style="color:var(--orange)">J-${d}</span>` : `<span class="muted">J-${d}</span>`;
      return `<tr class="${isAlert ? 'alert-row' : ''}">
        <td><strong>${Utils.esc(a.nom) || '?'} ${Utils.esc(a.prenom) || ''}</strong><br><span style="font-size:11px;color:var(--text3)">${Utils.esc(a.service) || ''}</span></td>
        <td><span class="badge-logiciel">${Utils.esc(l.nom) || '?'}</span></td>
        <td class="muted">${Utils.esc(h.role) || '—'}</td>
        <td class="muted" style="font-size:12px">${Utils.esc(h.permissions) || '—'}</td>
        <td style="font-size:11px">${Utils.groupesBadges(h.groupes)}</td>
        <td>${Utils.statusBadge(h.statut)}</td>
        <td class="muted">${Utils.valideurLink(h.valideur)}</td>
        <td>${dStr}</td>
        <td><div class="row-actions">
          <button class="action-btn" onclick="UI.openHabilModal('${h.id}')" title="Modifier">✏</button>
          <button class="action-btn del" onclick="UI.confirmDeleteHabil('${h.id}')" title="Supprimer">🗑</button>
        </div></td>
      </tr>`;
    }).join('');

    document.getElementById('habilPagination').innerHTML = PaginationManager.renderControls(pagination, 'habilitations');
  },

  /**
   * Rend la table des révisions avec pagination
   */
  renderRevisions() {
    this.populateHabilFilters();
    const fLog = document.getElementById('revFilterLogiciel').value;

    const toRev = DataModel.habilitations
      .map(h => ({ ...h, _days: Utils.daysUntil(h.dateProchRevision) }))
      .filter(h => h._days <= DataModel.params.alertDays && (!fLog || h.logicielId === fLog))
      .sort((a, b) => a._days - b._days);

    const urgent = toRev.filter(h => h._days <= 7).length;
    const soon = toRev.filter(h => h._days <= 30 && h._days > 7).length;

    document.getElementById('revisionAlerts').innerHTML =
      (urgent > 0 ? `<div class="revision-alert"><span class="alert-icon">🚨</span><div class="alert-text"><strong>${urgent} révision(s) urgente(s)</strong> dans les 7 prochains jours</div></div>` : '') +
      (soon > 0 ? `<div class="revision-alert"><span class="alert-icon">⚠️</span><div class="alert-text"><strong>${soon} révision(s) à planifier</strong> dans les 30 prochains jours</div></div>` : '');

    const pagination = PaginationManager.paginate(toRev, 'revisions');
    document.getElementById('revCount').textContent = `${toRev.length} habilitation(s)`;

    const body = document.getElementById('revisionBody');
    if (!toRev.length) {
      body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">✅</div><p>Aucune révision à planifier</p></div></td></tr>`;
      document.getElementById('revisionsPagination').innerHTML = '';
      return;
    }

    body.innerHTML = pagination.paginatedData.map(h => {
      const a = DataModel.getAgent(h.agentId) || {};
      const l = DataModel.getLogiciel(h.logicielId) || {};
      const ds = h._days <= 0 ? `<span style="color:var(--red);font-weight:700">Expiré (${Math.abs(h._days)}j)</span>` : h._days <= 7 ? `<span style="color:var(--red);font-weight:600">J-${h._days}</span>` : `<span style="color:var(--orange)">J-${h._days}</span>`;
      return `<tr>
        <td><strong>${Utils.esc(a.nom) || '?'} ${Utils.esc(a.prenom) || ''}</strong></td>
        <td class="muted">${Utils.esc(a.service) || '—'}</td>
        <td><span class="badge-logiciel">${Utils.esc(l.nom) || '?'}</span></td>
        <td class="muted">${Utils.esc(h.role) || '—'}</td>
        <td class="muted">${Utils.fmtDate(h.dateProchRevision)}</td>
        <td>${ds}</td>
        <td class="muted">${Utils.valideurLink(h.valideur)}</td>
        <td><div class="row-actions" style="opacity:1">
          <button class="btn btn-success btn-sm" onclick="UI.validateRevision('${h.id}')">✔ Valider</button>
          <button class="btn btn-ghost btn-sm" onclick="UI.openHabilModal('${h.id}')">✏</button>
        </div></td>
      </tr>`;
    }).join('');

    document.getElementById('revisionsPagination').innerHTML = PaginationManager.renderControls(pagination, 'revisions');
  },

  /**
   * Rend la page des paramètres
   */
  renderSettings() {
    this.renderListEditor('servicesEditor', 'services');
    this.renderListEditor('postesEditor', 'postes');
    this.renderListEditor('rolesEditor', 'roles');
    this.renderListEditor('permissionsEditor', 'permissions');
    this.renderLogicielsEditor();
    this.populateHabilFilters();

    document.getElementById('revisionPeriod').value = DataModel.params.revisionPeriod;
    document.getElementById('alertDays').value = DataModel.params.alertDays;

    UI.renderSecurityPanel();

    // Filtre services dans agents
    const sel = document.getElementById('agentFilterService');
    const cur = sel.value;
    sel.innerHTML = '<option value="">Tous les services</option>' + DataModel.params.services.map(s => `<option>${Utils.esc(s)}</option>`).join('');
    sel.value = cur;
  },

  /**
   * Rend un éditeur de liste
   * @param {string} containerId - ID du conteneur
   * @param {string} key - Clé dans params
   */
  renderListEditor(containerId, key) {
    const c = document.getElementById(containerId);
    c.innerHTML = DataModel.params[key].map((item, i) => `
      <div class="list-item"><span>${Utils.esc(item)}</span><button onclick="UI.removeParam('${key}',${i})">✕</button></div>
    `).join('') || '<div style="color:var(--text3);font-size:12px;padding:4px 0">Aucun élément</div>';
  },

  /**
   * Rend l'éditeur de logiciels
   */
  renderLogicielsEditor() {
    const container = document.getElementById('logicielsEditor');
    container.innerHTML = DataModel.logiciels.map(l => `
      <div class="logiciel-editor-card">
        <div class="logiciel-editor-top">
          <input type="text" value="${Utils.esc(l.nom)}" onchange="UI.updateLogicielName('${l.id}', this.value)">
          <button class="btn btn-danger btn-sm" onclick="UI.deleteLogiciel('${l.id}')">🗑</button>
        </div>

        <div class="logiciel-section-label">Valideurs par défaut</div>
        <div class="logiciel-editor-valideurs" id="valideurs_${l.id}">
          ${(l.valideurs || []).map(v => `<span class="valideur-chip">${Utils.esc(v)}<button onclick="UI.removeValideur('${l.id}','${Utils.esc(v)}')">✕</button></span>`).join('')}
        </div>
        <div class="add-valideur-row" style="position:relative;">
          <input type="text" placeholder="Taper pour rechercher un agent..." id="newValideur_${l.id}" oninput="UI.onValideurLogicielInput('${l.id}')" autocomplete="off">
          <button class="btn btn-primary btn-sm" onclick="UI.addValideur('${l.id}')">＋</button>
          <div id="valideurSuggest_${l.id}" class="valideur-autocomplete-suggestions"></div>
        </div>

        <div class="logiciel-section-label">Groupes de sécurité par défaut</div>
        <div class="logiciel-editor-groupes" id="groupes_${l.id}">
          ${(l.groupes || []).map(g => `<span class="groupe-chip">${Utils.esc(g)}<button onclick="UI.removeGroupeLogiciel('${l.id}','${Utils.esc(g)}')">✕</button></span>`).join('')}
        </div>
        <div class="add-groupe-row">
          <input type="text" placeholder="Ajouter groupe (ex: GRP_APP_LECTURE)" id="newGroupe_${l.id}">
          <button class="btn btn-primary btn-sm" onclick="UI.addGroupeLogiciel('${l.id}')">＋</button>
        </div>
      </div>
    `).join('');
  },

  /**
   * Peuple les filtres de logiciels
   */
  populateHabilFilters() {
    ['habilFilterLogiciel', 'revFilterLogiciel'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="">Tous les logiciels</option>' + DataModel.logiciels.map(l => `<option value="${Utils.esc(l.id)}">${Utils.esc(l.nom)}</option>`).join('');
      sel.value = cur;
    });
  },

  /**
   * Met à jour le badge de révisions dans le menu
   */
  updateRevBadge() {
    const n = DataModel.habilitations.filter(h => Utils.daysUntil(h.dateProchRevision) <= DataModel.params.alertDays).length;
    const b = document.getElementById('revBadge');
    b.style.display = n > 0 ? 'inline-flex' : 'none';
    b.textContent = n;
  }
};

// Fonctions de tri exposées globalement pour compatibilité onclick
function agentSort(col) {
  if (DataModel.state.agentSortCol === col) DataModel.state.agentSortAsc = !DataModel.state.agentSortAsc;
  else { DataModel.state.agentSortCol = col; DataModel.state.agentSortAsc = true; }
  PaginationManager.reset('agents');
  Renderer.renderAgentsTable();
}

function habilSort(col) {
  if (DataModel.state.habilSortCol === col) DataModel.state.habilSortAsc = !DataModel.state.habilSortAsc;
  else { DataModel.state.habilSortCol = col; DataModel.state.habilSortAsc = true; }
  PaginationManager.reset('habilitations');
  Renderer.renderHabilTable();
}

// Alias pour compatibilité avec pagination
function renderAgentsTable() { Renderer.renderAgentsTable(); }
function renderHabilTable() { Renderer.renderHabilTable(); }
function renderRevisions() { Renderer.renderRevisions(); }
