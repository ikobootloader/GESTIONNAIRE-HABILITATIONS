/**
 * Module de Sécurité
 * Gestion du chiffrement AES-256-GCM avec PBKDF2
 */

const Security = {
  /**
   * Dérive une clé de chiffrement depuis un mot de passe
   * @param {string} password - Mot de passe
   * @param {Uint8Array} salt - Salt pour PBKDF2
   * @returns {Promise<CryptoKey>} Clé dérivée
   */
  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Chiffre des données avec AES-256-GCM et inclut la clé de récupération
   * @param {Uint8Array} bytes - Données à chiffrer
   * @param {string} password - Mot de passe
   * @param {Uint8Array} recoveryKeyBytes - Clé de récupération (optionnel)
   * @returns {Promise<Uint8Array>} Données chiffrées avec en-tête
   */
  async encryptBytes(bytes, password, recoveryKeyBytes = null) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);

    let recoveryData = new Uint8Array(0);
    let hasRecovery = 0;

    // Si clé de récupération fournie, chiffrer le mot de passe
    if (recoveryKeyBytes && recoveryKeyBytes.length === 32) {
      const encryptedPassword = await Recovery.encryptPasswordWithRecoveryKey(password, recoveryKeyBytes);
      recoveryData = encryptedPassword;
      hasRecovery = 1;
    }

    // Format: magic(4) + version(1) + hasRecovery(1) + salt(16) + iv(12) + recoveryDataLength(2) + recoveryData + ciphertext
    const magic = new TextEncoder().encode('HAB2'); // Version 2 pour support récupération
    const headerSize = 4 + 1 + 1 + 16 + 12 + 2;
    const result = new Uint8Array(headerSize + recoveryData.length + ct.byteLength);

    let offset = 0;
    result.set(magic, offset); offset += 4;
    result.set([2], offset); offset += 1; // Version 2
    result.set([hasRecovery], offset); offset += 1;
    result.set(salt, offset); offset += 16;
    result.set(iv, offset); offset += 12;

    // Longueur recovery data (2 octets big-endian)
    const recoveryLen = recoveryData.length;
    result.set([recoveryLen >> 8, recoveryLen & 0xFF], offset); offset += 2;

    if (recoveryData.length > 0) {
      result.set(recoveryData, offset); offset += recoveryData.length;
    }

    result.set(new Uint8Array(ct), offset);

    return result;
  },

  /**
   * Déchiffre des données avec AES-256-GCM
   * @param {Uint8Array} bytes - Données chiffrées
   * @param {string} password - Mot de passe
   * @returns {Promise<Object>} {data: Uint8Array, hasRecovery: boolean, recoveryData: Uint8Array|null}
   * @throws {Error} Si le mot de passe est incorrect ou le format invalide
   */
  async decryptBytes(bytes, password) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API indisponible dans ce navigateur.');
    }

    if (bytes.byteLength < 48) {
      throw new Error(`Fichier corrompu ou invalide (taille: ${bytes.byteLength} octets, minimum requis: 48 octets). Le fichier n'a peut-être pas été sauvegardé correctement. Veuillez supprimer ce fichier et en créer un nouveau.`);
    }

    // Vérification du magic number et version
    const magic = new TextDecoder().decode(bytes.slice(0, 4));

    // Support ancien format HAB1 (sans récupération)
    if (magic === 'HAB1') {
      const salt = bytes.slice(4, 20);
      const iv = bytes.slice(20, 32);
      const ct = bytes.slice(32);

      const key = await this.deriveKey(password, salt);
      try {
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        return { data: new Uint8Array(pt), hasRecovery: false, recoveryData: null };
      } catch (e) {
        throw new Error('Mot de passe incorrect ou fichier corrompu.');
      }
    }

    // Nouveau format HAB2 (avec récupération)
    if (magic === 'HAB2') {
      let offset = 4;
      const version = bytes[offset]; offset += 1;
      const hasRecovery = bytes[offset]; offset += 1;
      const salt = bytes.slice(offset, offset + 16); offset += 16;
      const iv = bytes.slice(offset, offset + 12); offset += 12;

      // Lire la longueur des données de récupération
      const recoveryLen = (bytes[offset] << 8) | bytes[offset + 1]; offset += 2;

      let recoveryData = null;
      if (hasRecovery && recoveryLen > 0) {
        recoveryData = bytes.slice(offset, offset + recoveryLen);
        offset += recoveryLen;
      }

      const ct = bytes.slice(offset);

      // Déchiffrement
      const key = await this.deriveKey(password, salt);
      try {
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
        return {
          data: new Uint8Array(pt),
          hasRecovery: hasRecovery === 1,
          recoveryData
        };
      } catch (e) {
        throw new Error('Mot de passe incorrect ou fichier corrompu.');
      }
    }

    // Format inconnu
    const pk = String.fromCharCode(bytes[0], bytes[1]);
    if (pk === 'PK') {
      throw new Error('Ce fichier est un .xlsx non chiffré. Ouvrez-le sans mot de passe.');
    }
    throw new Error("Format invalide — ce fichier n'a pas été produit par cette application.");
  },

  /**
   * Récupère le mot de passe avec la clé de récupération
   * @param {Uint8Array} bytes - Fichier .habil
   * @param {string} recoveryMnemonic - Clé de récupération (24 mots)
   * @returns {Promise<string>} Mot de passe récupéré
   * @throws {Error} Si la clé est invalide ou le fichier ne supporte pas la récupération
   */
  async recoverPassword(bytes, recoveryMnemonic) {
    if (bytes.byteLength < 48) {
      throw new Error('Fichier invalide.');
    }

    const magic = new TextDecoder().decode(bytes.slice(0, 4));
    if (magic !== 'HAB2') {
      throw new Error('Ce fichier ne supporte pas la récupération par clé (format trop ancien).');
    }

    let offset = 4;
    const version = bytes[offset]; offset += 1;
    const hasRecovery = bytes[offset]; offset += 1;

    if (!hasRecovery) {
      throw new Error('Ce fichier n\'a pas été créé avec une clé de récupération.');
    }

    // Sauter salt et iv
    offset += 16 + 12;

    // Lire recovery data
    const recoveryLen = (bytes[offset] << 8) | bytes[offset + 1]; offset += 2;
    if (recoveryLen === 0) {
      throw new Error('Données de récupération manquantes.');
    }

    const recoveryData = bytes.slice(offset, offset + recoveryLen);

    // Convertir le mnemonic en bytes
    const recoveryKeyBytes = Recovery.mnemonicToBytes(recoveryMnemonic);
    if (!recoveryKeyBytes) {
      throw new Error('Clé de récupération invalide (format incorrect).');
    }

    // Déchiffrer le mot de passe
    try {
      const password = await Recovery.decryptPasswordWithRecoveryKey(recoveryData, recoveryKeyBytes);
      return password;
    } catch (error) {
      throw new Error('Clé de récupération incorrecte.');
    }
  },

  /**
   * Vérifie si Web Crypto API est disponible
   * @returns {boolean} true si disponible
   */
  isAvailable() {
    return !!(window.crypto && window.crypto.subtle);
  }
};
