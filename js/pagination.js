/**
 * Module de Pagination
 * Gestionnaire de pagination réutilisable pour les tables
 */

const PaginationManager = {
  // État de pagination pour chaque table
  states: {
    agents: { currentPage: 1, itemsPerPage: 25 },
    habilitations: { currentPage: 1, itemsPerPage: 25 },
    revisions: { currentPage: 1, itemsPerPage: 25 }
  },

  /**
   * Initialise ou réinitialise l'état de pagination pour une table
   * @param {string} tableKey - Clé de la table (agents, habilitations, revisions)
   */
  reset(tableKey) {
    if (this.states[tableKey]) {
      this.states[tableKey].currentPage = 1;
    }
  },

  /**
   * Change la page courante
   * @param {string} tableKey - Clé de la table
   * @param {number} page - Numéro de la page
   */
  goToPage(tableKey, page) {
    if (this.states[tableKey]) {
      this.states[tableKey].currentPage = page;
    }
  },

  /**
   * Change le nombre d'éléments par page
   * @param {string} tableKey - Clé de la table
   * @param {number} itemsPerPage - Nombre d'éléments par page
   */
  setItemsPerPage(tableKey, itemsPerPage) {
    if (this.states[tableKey]) {
      this.states[tableKey].itemsPerPage = itemsPerPage;
      this.states[tableKey].currentPage = 1; // Retour à la première page
    }
  },

  /**
   * Pagine un tableau de données
   * @param {Array} data - Tableau de données à paginer
   * @param {string} tableKey - Clé de la table
   * @returns {Object} { paginatedData, totalPages, currentPage, totalItems, startIndex, endIndex }
   */
  paginate(data, tableKey) {
    const state = this.states[tableKey];
    if (!state) {
      return {
        paginatedData: data,
        totalPages: 1,
        currentPage: 1,
        totalItems: data.length,
        startIndex: 1,
        endIndex: data.length
      };
    }

    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;

    // Ajuster la page courante si elle dépasse le nombre total de pages
    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }

    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      paginatedData,
      totalPages,
      currentPage: state.currentPage,
      totalItems,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, totalItems)
    };
  },

  /**
   * Génère le HTML des contrôles de pagination
   * @param {Object} paginationInfo - Info de pagination retournée par paginate()
   * @param {string} tableKey - Clé de la table
   * @returns {string} HTML des contrôles
   */
  renderControls(paginationInfo, tableKey) {
    const { totalPages, currentPage, totalItems, startIndex, endIndex } = paginationInfo;
    const state = this.states[tableKey];

    if (totalItems === 0) return '';

    // Info affichage
    const infoText = `Affichage ${startIndex} - ${endIndex} sur ${totalItems}`;

    // Sélecteur items par page
    const itemsPerPageSelect = `
      <select class="pagination-select" onchange="PaginationManager.setItemsPerPage('${tableKey}', parseInt(this.value)); ${this.getRenderFunction(tableKey)}()">
        <option value="10" ${state.itemsPerPage === 10 ? 'selected' : ''}>10 / page</option>
        <option value="25" ${state.itemsPerPage === 25 ? 'selected' : ''}>25 / page</option>
        <option value="50" ${state.itemsPerPage === 50 ? 'selected' : ''}>50 / page</option>
        <option value="100" ${state.itemsPerPage === 100 ? 'selected' : ''}>100 / page</option>
      </select>
    `;

    // Boutons de navigation
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';

    // Génération des numéros de pages avec ellipses
    let pageButtons = '';
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      // Afficher toutes les pages si peu de pages
      for (let i = 1; i <= totalPages; i++) {
        pageButtons += this.renderPageButton(i, currentPage, tableKey);
      }
    } else {
      // Afficher avec ellipses pour beaucoup de pages
      pageButtons += this.renderPageButton(1, currentPage, tableKey);

      if (currentPage > 3) {
        pageButtons += '<span class="pagination-page dots">...</span>';
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pageButtons += this.renderPageButton(i, currentPage, tableKey);
      }

      if (currentPage < totalPages - 2) {
        pageButtons += '<span class="pagination-page dots">...</span>';
      }

      pageButtons += this.renderPageButton(totalPages, currentPage, tableKey);
    }

    return `
      <div class="pagination-info">${infoText}</div>
      <div class="pagination-controls">
        ${itemsPerPageSelect}
        <button class="pagination-btn" ${prevDisabled} onclick="PaginationManager.goToPage('${tableKey}', ${currentPage - 1}); ${this.getRenderFunction(tableKey)}()" title="Page précédente">
          ◀
        </button>
        <div class="pagination-pages">
          ${pageButtons}
        </div>
        <button class="pagination-btn" ${nextDisabled} onclick="PaginationManager.goToPage('${tableKey}', ${currentPage + 1}); ${this.getRenderFunction(tableKey)}()" title="Page suivante">
          ▶
        </button>
      </div>
    `;
  },

  /**
   * Génère le HTML d'un bouton de page
   * @param {number} pageNum - Numéro de la page
   * @param {number} currentPage - Page courante
   * @param {string} tableKey - Clé de la table
   * @returns {string} HTML du bouton
   */
  renderPageButton(pageNum, currentPage, tableKey) {
    const activeClass = pageNum === currentPage ? 'active' : '';
    return `<button class="pagination-page ${activeClass}" onclick="PaginationManager.goToPage('${tableKey}', ${pageNum}); ${this.getRenderFunction(tableKey)}()">${pageNum}</button>`;
  },

  /**
   * Retourne le nom de la fonction de rendu associée à une table
   * @param {string} tableKey - Clé de la table
   * @returns {string} Nom de la fonction
   */
  getRenderFunction(tableKey) {
    const functionMap = {
      'agents': 'renderAgentsTable',
      'habilitations': 'renderHabilTable',
      'revisions': 'renderRevisions'
    };
    return functionMap[tableKey] || 'renderAgentsTable';
  }
};
