export const devices = {
  en: {
    devices: {
      title: 'My Devices',
      registerNew: 'Flash New Device',
      noDevices: 'No devices registered yet',
      deviceName: 'Device Name',
      deviceId: 'ID',
      firmware: 'Firmware',
      added: 'Added',
      lastUsed: 'Last used',
      rename: 'Rename',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      friendlyName: 'Enter a friendly name',
      default: 'Default',
      setDefault: 'Set as Default',
      online: 'Online',
      offline: 'Offline',
      neverConnected: 'Never Connected',
      needsCalibration: 'Needs Calibration',
      lastSeen: 'Last seen',
      neverSeen: 'Never seen',
      neverUsed: 'Never used',
      
      // Delete device translations
      confirmDelete: 'Delete Device',
      deleteWarning: 'Are you sure you want to delete this device? Order history will be preserved, but the device will be permanently removed.',
      confirmDeleteButton: 'Delete Device',
      instructions: {
        title: 'Instructions',
        step1: 'Connect your ESP32 to your computer via USB',
        step2: 'Click the Install button below',
        step3: 'Select the correct USB port when prompted',
        step4: 'Wait for the installation to complete'
      },
      back: 'Back to Devices',
      installButton: 'Install Firmware',
      enroll: 'Enroll via WiFi',
      ap: {
        title: 'WiFi Setup Instructions',
        step1: 'Power on your ESP32 device',
        step2: 'Connect to the WiFi network "RobotCocktail" with password "configure"',
        step3: 'Open http://192.168.4.1 in your browser',
        step4: 'Enter your WiFi network credentials',
        step5: 'For the server URL, use either:\n- Development: https://192.168.1.x:5173\n- Production: https://robotcocktail.ovh',
        step6: 'Copy and paste the token shown below',
        step7: 'The device will restart automatically and connect to your network',
        token: {
            title: 'Device Token',
            description: 'Copy this token to the AP configuration page:',
            enroll: 'Enroll Device',
            success: 'Device enrolled successfully!'
        }
      }
    }
  },
  fr: {
    devices: {
      title: 'Mes Appareils',
      registerNew: 'Flasher un Nouvel Appareil',
      noDevices: 'Aucun appareil enregistré',
      deviceName: 'Nom de l\'appareil',
      deviceId: 'ID',
      firmware: 'Firmware',
      added: 'Ajouté le',
      lastUsed: 'Dernière utilisation',
      rename: 'Renommer',
      delete: 'Supprimer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      friendlyName: 'Entrez un nom convivial',
      default: 'Par défaut',
      setDefault: 'Définir par défaut',
      online: 'En ligne',
      offline: 'Hors ligne',
      neverConnected: 'Jamais connecté',
      needsCalibration: 'Calibrage requis',
      lastSeen: 'Vu pour la dernière fois',
      neverSeen: 'Jamais vu',
      neverUsed: 'Jamais utilisé',
      
      // Delete device translations
      confirmDelete: 'Supprimer l\'Appareil',
      deleteWarning: 'Êtes-vous sûr de vouloir supprimer cet appareil ? L\'historique des commandes sera préservé, mais l\'appareil sera définitivement supprimé.',
      confirmDeleteButton: 'Supprimer l\'Appareil',
      instructions: {
        title: 'Instructions',
        step1: 'Connectez votre ESP32 à votre ordinateur via USB',
        step2: 'Cliquez sur le bouton Installer ci-dessous',
        step3: 'Sélectionnez le bon port USB lorsque demandé',
        step4: "Attendez que l'installation soit terminée"
      },
      back: 'Retour aux Appareils',
      installButton: 'Installer le Firmware',
      enroll: 'Enregistrer via WiFi',
      ap: {
        title: 'Instructions de Configuration WiFi',
        step1: 'Allumez votre appareil ESP32',
        step2: 'Connectez-vous au réseau WiFi "RobotCocktail" avec le mot de passe "configure"',
        step3: 'Ouvrez http://192.168.4.1 dans votre navigateur',
        step4: 'Entrez vos identifiants WiFi',
        step5: 'Pour l\'URL du serveur, utilisez soit:\n- Développement: https://192.168.1.x:5173\n- Production: https://robotcocktail.ovh',
        step6: 'Copiez et collez le jeton affiché ci-dessous',
        step7: 'L\'appareil redémarrera automatiquement et se connectera à votre réseau',
        token: {
            title: 'Jeton d\'Appareil',
            description: 'Copiez ce jeton sur la page de configuration AP:',
            enroll: 'Enregistrer l\'Appareil',
            success: 'Appareil enregistré avec succès!'
        }
      }
    }
  }
};
