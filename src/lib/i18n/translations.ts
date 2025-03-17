export type Language = 'en' | 'fr';

export const translations = {
  en: {
    hero: {
      title: 'RobotCocktail',
      description: 'The modern solution for automated cocktail mixing. Create perfect drinks every time with precision and style.',
      register: 'Register',
      seeCocktails: 'See My Cocktails',
      viewGithub: 'View on GitHub'
    },
    features: {
      perfectDrinks: {
        title: 'Perfect Drinks',
        description: 'Precise measurements and consistent pours ensure the perfect drink every time.'
      },
      smartHardware: {
        title: 'Smart Hardware',
        description: 'Built with modern hardware like ESP32 and Raspberry Pi for reliable operation.'
      },
      modernStack: {
        title: 'Modern Stack',
        description: 'Built with SvelteKit and Tailwind CSS for a responsive and fast user experience.'
      }
    },
    footer: {
      text: 'RobotCocktail - Open Source Automated Bartending'
    },
    language: {
      en: 'English',
      fr: 'Français'
    },
    header: {
      cocktails: 'My Cocktails',
      devices: 'My Devices',
      profile: 'My Profile',
      logout: 'Logout'
    },
    cocktails: {
      title: 'Cocktail Recipes',
      viewDetails: 'View Details',
      backToCocktails: '← Back to Cocktails',
      createdBy: 'Created by',
      addedOn: 'Added on',
      createNew: 'Create New Cocktail',
      instructions: 'Instructions',
      filterAll: 'All Cocktails',
      filterMine: 'My Cocktails',
      ingredients: 'Ingredients',
      edit: 'Edit',
      editCocktail: 'Edit Cocktail',
      saveChanges: 'Save Changes',
      addIngredient: 'Add Ingredient',
      remove: 'Remove',
      cancel: 'Cancel',
      selectIngredient: 'Select Ingredient',
      chooseIngredient: 'Choose an ingredient',
      quantity: 'Quantity',
      backToCocktail: '← Back to Cocktail'
    },
    devices: {
      title: 'My Devices',
      registerNew: 'Flash New Device',
      noDevices: 'No devices registered yet',
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
    },
    createCocktail: {
      title: 'Create New Cocktail',
      name: 'Cocktail Name',
      description: 'Description',
      instructions: 'Instructions',
      create: 'Create Cocktail',
      namePlaceholder: 'Enter cocktail name',
      descriptionPlaceholder: 'Enter a brief description',
      instructionsPlaceholder: 'Enter preparation instructions'
    },
    auth: {
      login: 'Login',
      register: 'Register',
      username: 'Username',
      password: 'Password',
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: 'Already have an account?',
      backToHome: '← Back to Home'
    },
    profile: {
      unverified: {
        title: 'Unverified Profile',
        message: 'Your profile is pending verification by an administrator. This process helps us maintain the quality and security of our platform.',
        checkBack: 'Please check back later. Once your profile is verified, you will have full access to create and manage cocktails and devices.'
      },
      title: 'My Profile',
      artistName: 'Artist Name',
      artistNamePlaceholder: 'Enter your artist name',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      updateProfile: 'Update Profile',
      changePassword: 'Change Password',
      passwordMismatch: 'New passwords do not match',
      updateSuccess: 'Profile updated successfully',
      passwordSuccess: 'Password changed successfully'
    }
  },
  fr: {
    hero: {
      title: 'RobotCocktail',
      description: 'La solution moderne pour le mélange automatisé de cocktails. Créez des boissons parfaites à chaque fois avec précision et style.',
      register: "S'inscrire",
      seeCocktails: 'Voir Mes Cocktails',
      viewGithub: 'Voir sur GitHub'
    },
    features: {
      perfectDrinks: {
        title: 'Boissons Parfaites',
        description: 'Des mesures précises et des versements constants assurent une boisson parfaite à chaque fois.'
      },
      smartHardware: {
        title: 'Matériel Intelligent',
        description: 'Construit avec du matériel moderne comme ESP32 et Raspberry Pi pour un fonctionnement fiable.'
      },
      modernStack: {
        title: 'Stack Moderne',
        description: 'Construit avec SvelteKit et Tailwind CSS pour une expérience utilisateur réactive et rapide.'
      }
    },
    footer: {
      text: 'RobotCocktail - Barman Automatisé Open Source'
    },
    language: {
      en: 'English',
      fr: 'Français'
    },
    header: {
      cocktails: 'Mes Cocktails',
      devices: 'Mes Appareils',
      profile: 'Mon Profil',
      logout: 'Déconnexion'
    },
    cocktails: {
      title: 'Recettes de Cocktails',
      viewDetails: 'Voir les Détails',
      backToCocktails: '← Retour aux Cocktails',
      createdBy: 'Créé par',
      addedOn: 'Ajouté le',
      createNew: 'Créer un Nouveau Cocktail',
      instructions: 'Instructions',
      filterAll: 'Tous les Cocktails',
      filterMine: 'Mes Cocktails'
    },
    devices: {
      title: 'Mes Appareils',
      registerNew: 'Flasher un Nouvel Appareil',
      noDevices: 'Aucun appareil enregistré',
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
        step7: 'L\'appareil redémarrera automatiquement et se connectera à votre réseau'
      }
    },
    createCocktail: {
      title: 'Créer un Nouveau Cocktail',
      name: 'Nom du Cocktail',
      description: 'Description',
      instructions: 'Instructions',
      create: 'Créer le Cocktail',
      namePlaceholder: 'Entrez le nom du cocktail',
      descriptionPlaceholder: 'Entrez une brève description',
      instructionsPlaceholder: 'Entrez les instructions de préparation'
    },
    auth: {
      login: 'Connexion',
      register: 'Inscription',
      username: "Nom d'utilisateur",
      password: 'Mot de passe',
      dontHaveAccount: "Vous n'avez pas de compte ?",
      alreadyHaveAccount: 'Vous avez déjà un compte ?',
      backToHome: '← Retour'
    },
    profile: {
      unverified: {
        title: 'Profil Non Vérifié',
        message: 'Votre profil est en attente de vérification par un administrateur. Ce processus nous aide à maintenir la qualité et la sécurité de notre plateforme.',
        checkBack: 'Veuillez revenir plus tard. Une fois votre profil vérifié, vous aurez un accès complet pour créer et gérer des cocktails et des appareils.'
      },
      title: 'Mon Profil',
      artistName: 'Nom d\'artiste',
      artistNamePlaceholder: 'Entrez votre nom d\'artiste',
      currentPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le nouveau mot de passe',
      updateProfile: 'Mettre à jour le profil',
      changePassword: 'Changer le mot de passe',
      passwordMismatch: 'Les nouveaux mots de passe ne correspondent pas',
      updateSuccess: 'Profil mis à jour avec succès',
      passwordSuccess: 'Mot de passe changé avec succès'
    }
  }
} as const;
