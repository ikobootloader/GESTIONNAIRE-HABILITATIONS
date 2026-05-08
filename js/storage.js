/**
 * Module de Stockage Persistant
 * Gestion de IndexedDB pour persister les handles de fichiers
 */

const PersistentStorage = {
  DB_NAME: 'HabilitationsDB',
  DB_VERSION: 1,
  STORE_NAME: 'fileHandles',
  HANDLE_KEY: 'currentFileHandle',

  /**
   * Initialise la base de données IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  },

  /**
   * Sauvegarde le handle de fichier dans IndexedDB
   * @param {FileSystemFileHandle} handle - Handle à sauvegarder
   * @returns {Promise<void>}
   */
  async saveFileHandle(handle) {
    if (!handle) return;

    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      await new Promise((resolve, reject) => {
        const request = store.put(handle, this.HANDLE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('[Storage] Handle de fichier sauvegardé dans IndexedDB');
      db.close();
    } catch (error) {
      console.error('[Storage] Erreur lors de la sauvegarde du handle:', error);
    }
  },

  /**
   * Récupère le handle de fichier depuis IndexedDB
   * @returns {Promise<FileSystemFileHandle|null>}
   */
  async getFileHandle() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      const handle = await new Promise((resolve, reject) => {
        const request = store.get(this.HANDLE_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (handle) {
        console.log('[Storage] Handle récupéré depuis IndexedDB');
        return handle;
      }

      return null;
    } catch (error) {
      console.error('[Storage] Erreur lors de la récupération du handle:', error);
      return null;
    }
  },

  /**
   * Vérifie et demande les permissions pour un handle
   * @param {FileSystemFileHandle} handle - Handle à vérifier
   * @param {boolean} needsWrite - Besoin de permission en écriture
   * @returns {Promise<boolean>} true si les permissions sont accordées
   */
  async verifyPermission(handle, needsWrite = true) {
    // Vérifier que les méthodes de permission existent
    if (!handle.queryPermission || !handle.requestPermission) {
      console.warn('[Storage] Méthodes de permission non disponibles, on assume la permission');
      // Sur certains navigateurs, les permissions sont toujours accordées pour les handles restaurés
      return true;
    }

    const options = {};
    if (needsWrite) {
      options.mode = 'readwrite';
    }

    try {
      // Vérifier si on a déjà la permission
      const currentPermission = await handle.queryPermission(options);
      console.log('[Storage] Permission actuelle:', currentPermission);

      if (currentPermission === 'granted') {
        console.log('[Storage] Permission déjà accordée');
        return true;
      }

      // Demander la permission (le navigateur affichera une notification)
      console.log('[Storage] Demande de permission...');
      const newPermission = await handle.requestPermission(options);
      console.log('[Storage] Nouvelle permission:', newPermission);

      if (newPermission === 'granted') {
        console.log('[Storage] Permission accordée par l\'utilisateur');
        return true;
      }

      console.log('[Storage] Permission refusée');
      return false;
    } catch (error) {
      console.error('[Storage] Erreur lors de la vérification des permissions:', error);
      // En cas d'erreur, on tente quand même d'utiliser le handle
      return true;
    }
  },

  /**
   * Supprime le handle sauvegardé
   * @returns {Promise<void>}
   */
  async clearFileHandle() {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      await new Promise((resolve, reject) => {
        const request = store.delete(this.HANDLE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('[Storage] Handle supprimé de IndexedDB');
      db.close();
    } catch (error) {
      console.error('[Storage] Erreur lors de la suppression du handle:', error);
    }
  }
};
