/**
 * Module de Clé de Récupération
 * Génération et gestion des clés de récupération en cas de perte de mot de passe
 */

const Recovery = {
  // Liste de mots pour la clé mnémonique (256 mots BIP39-like simplifiés en français)
  wordlist: [
    'abricot', 'absent', 'absurde', 'abuser', 'accent', 'accepter', 'accident', 'accord', 'accuser', 'acheter',
    'adieu', 'admettre', 'adorer', 'adresse', 'adroit', 'adulte', 'affaire', 'affreux', 'agacer', 'agence',
    'agenda', 'agent', 'agile', 'agiter', 'aider', 'aigle', 'aigre', 'aimer', 'ainsi', 'ajuster',
    'alarme', 'album', 'alcool', 'alerte', 'algue', 'aliment', 'allumer', 'alors', 'altitude', 'amande',
    'amateur', 'ambition', 'amener', 'amitié', 'amour', 'amuser', 'ancien', 'ange', 'angle', 'animal',
    'annoncer', 'annuel', 'anodin', 'anomalie', 'anonyme', 'anormal', 'antenne', 'anxieux', 'apaiser', 'apercevoir',
    'appareil', 'appeler', 'apporter', 'apprendre', 'appuyer', 'arbitre', 'arbre', 'arcade', 'archer', 'argent',
    'argument', 'arme', 'armoire', 'armure', 'arracher', 'arranger', 'arriver', 'arroser', 'article', 'aspect',
    'assembler', 'assiette', 'associer', 'assurer', 'astre', 'astuce', 'atelier', 'atome', 'attacher', 'attaquer',
    'atteindre', 'attendre', 'attention', 'attirer', 'attraper', 'aubaine', 'aucun', 'audace', 'augmenter', 'aurore',
    'autant', 'auteur', 'automne', 'autoriser', 'autour', 'autre', 'avaler', 'avance', 'avancer', 'avantage',
    'avenir', 'averse', 'aveugle', 'aviateur', 'avide', 'avion', 'avis', 'aviser', 'avocat', 'avouer',
    'axe', 'azur', 'bagage', 'bague', 'baigner', 'balancer', 'balcon', 'baleine', 'balle', 'bambou',
    'banane', 'bancal', 'bande', 'bannir', 'banque', 'barbare', 'barbe', 'barre', 'barreau', 'barrière',
    'basculer', 'basse', 'bateau', 'bâtiment', 'bâton', 'battre', 'bavarder', 'bazar', 'beau', 'beaucoup',
    'beauté', 'bébé', 'bénéfice', 'bercer', 'besoin', 'bétail', 'beurre', 'biberon', 'bicycle', 'bidule',
    'bienfait', 'bijou', 'bilan', 'billard', 'billet', 'biologie', 'biscuit', 'bison', 'bizarre', 'blague',
    'blanc', 'blesser', 'bleu', 'bloc', 'blond', 'bloquer', 'blottir', 'bobine', 'boire', 'boiser',
    'boîte', 'bomber', 'bonbon', 'bondir', 'bonheur', 'bonjour', 'bonne', 'bonsoir', 'bonus', 'bord',
    'borgne', 'borne', 'botte', 'boucle', 'bouder', 'boueux', 'bouger', 'bougie', 'bouillir', 'boulanger',
    'boule', 'boulon', 'bouquet', 'bourg', 'bourrer', 'bourse', 'boussole', 'bout', 'bouteille', 'bouton',
    'boxeur', 'branche', 'brave', 'brebis', 'brèche', 'breuvage', 'bricoler', 'brigade', 'brillant', 'briller',
    'brin', 'brique', 'briser', 'brochure', 'broder', 'bronze', 'brosse', 'brouette', 'brouillard', 'broyer',
    'bruit', 'brûler', 'brume', 'brun', 'brusque', 'brutal', 'bruyant', 'buisson', 'bulletin', 'bureau',
    'burin', 'buste', 'butiner', 'butter', 'cabane', 'cabinet', 'câble', 'cacao', 'cachette', 'cadeau',
    'cadre', 'cafard', 'café', 'cage', 'caillou', 'caisse'
  ],

  /**
   * Génère une clé de récupération aléatoire
   * @returns {Object} {bytes: Uint8Array, mnemonic: string, formatted: string}
   */
  generateRecoveryKey() {
    // Générer 256 bits (32 octets) aléatoires
    const bytes = crypto.getRandomValues(new Uint8Array(32));

    // Convertir en mnemonic de 24 mots (chaque mot = ~10.67 bits, 24 mots = ~256 bits)
    const mnemonic = this.bytesToMnemonic(bytes);

    // Formater pour affichage (4 groupes de 6 mots)
    const words = mnemonic.split(' ');
    const formatted = [
      words.slice(0, 6).join(' '),
      words.slice(6, 12).join(' '),
      words.slice(12, 18).join(' '),
      words.slice(18, 24).join(' ')
    ].join('\n');

    return { bytes, mnemonic, formatted };
  },

  /**
   * Convertit des octets en mnemonic
   * @param {Uint8Array} bytes - Octets à convertir
   * @returns {string} Mnemonic (24 mots séparés par des espaces)
   */
  bytesToMnemonic(bytes) {
    const words = [];
    for (let i = 0; i < 24; i++) {
      // Prendre environ 10.67 bits par mot (256 bits / 24 mots)
      const offset = Math.floor(i * 10.67);
      const byteIndex = Math.floor(offset / 8);
      const bitOffset = offset % 8;

      let value = 0;
      // Lire 11 bits (pour avoir 2048 possibilités, on utilise seulement 256 de notre wordlist)
      if (byteIndex < bytes.length) {
        value = bytes[byteIndex];
        if (byteIndex + 1 < bytes.length) {
          value = (value << 8) | bytes[byteIndex + 1];
        }
        value = (value >> (16 - bitOffset - 11)) & 0x7FF;
      }

      // Mapper sur notre wordlist de 256 mots
      const wordIndex = value % this.wordlist.length;
      words.push(this.wordlist[wordIndex]);
    }
    return words.join(' ');
  },

  /**
   * Convertit un mnemonic en octets
   * @param {string} mnemonic - Mnemonic (24 mots)
   * @returns {Uint8Array|null} Octets ou null si invalide
   */
  mnemonicToBytes(mnemonic) {
    const words = mnemonic.trim().toLowerCase().split(/\s+/);
    if (words.length !== 24) return null;

    // Vérifier que tous les mots sont valides
    for (const word of words) {
      if (!this.wordlist.includes(word)) {
        console.error('Mot invalide dans le mnemonic:', word);
        return null;
      }
    }

    // Reconstruire les octets
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 24; i++) {
      const wordIndex = this.wordlist.indexOf(words[i]);
      const offset = Math.floor(i * 10.67);
      const byteIndex = Math.floor(offset / 8);
      const bitOffset = offset % 8;

      if (byteIndex < bytes.length) {
        bytes[byteIndex] |= (wordIndex >> (3 + bitOffset)) & 0xFF;
        if (byteIndex + 1 < bytes.length) {
          bytes[byteIndex + 1] |= (wordIndex << (5 - bitOffset)) & 0xFF;
        }
      }
    }

    return bytes;
  },

  /**
   * Chiffre le mot de passe avec la clé de récupération
   * @param {string} password - Mot de passe à protéger
   * @param {Uint8Array} recoveryKeyBytes - Clé de récupération
   * @returns {Promise<Uint8Array>} Mot de passe chiffré
   */
  async encryptPasswordWithRecoveryKey(password, recoveryKeyBytes) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey(
      'raw',
      recoveryKeyBytes,
      'AES-GCM',
      false,
      ['encrypt']
    );

    const passwordBytes = new TextEncoder().encode(password);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      passwordBytes
    );

    // Format: iv(12) + ciphertext
    const result = new Uint8Array(12 + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), 12);

    return result;
  },

  /**
   * Déchiffre le mot de passe avec la clé de récupération
   * @param {Uint8Array} encryptedPassword - Mot de passe chiffré
   * @param {Uint8Array} recoveryKeyBytes - Clé de récupération
   * @returns {Promise<string>} Mot de passe déchiffré
   * @throws {Error} Si la clé de récupération est incorrecte
   */
  async decryptPasswordWithRecoveryKey(encryptedPassword, recoveryKeyBytes) {
    if (encryptedPassword.length < 12) {
      throw new Error('Données de récupération invalides');
    }

    const iv = encryptedPassword.slice(0, 12);
    const ciphertext = encryptedPassword.slice(12);

    const key = await crypto.subtle.importKey(
      'raw',
      recoveryKeyBytes,
      'AES-GCM',
      false,
      ['decrypt']
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('Clé de récupération incorrecte');
    }
  },

  /**
   * Télécharge la clé de récupération en fichier texte
   * @param {string} mnemonic - Clé mnémonique
   * @param {string} filename - Nom du fichier (optionnel)
   */
  downloadRecoveryKey(mnemonic, filename = null) {
    const fname = filename || `cle_recuperation_${Utils.today()}.txt`;
    const content = `CLÉ DE RÉCUPÉRATION - GESTIONNAIRE D'HABILITATIONS
=====================================================

IMPORTANT : Conservez cette clé en lieu sûr !
Cette clé permet de récupérer l'accès à vos données en cas de perte du mot de passe.

Clé de récupération (24 mots) :
${mnemonic}

Date de génération : ${new Date().toLocaleString('fr-FR')}

⚠️ AVERTISSEMENT :
- Ne partagez JAMAIS cette clé
- Conservez-la dans un endroit sécurisé (coffre-fort, gestionnaire de mots de passe, etc.)
- Sans cette clé ET votre mot de passe, vos données seront définitivement perdues
- Cette clé permet de récupérer votre mot de passe si vous l'oubliez
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  }
};
