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
    cocktails: {
      title: 'Cocktail Recipes',
      viewDetails: 'View Details',
      backToCocktails: '← Back to Cocktails',
      createdBy: 'Created by',
      addedOn: 'Added on',
      createNew: 'Create New Cocktail',
      instructions: 'Instructions',
      filterAll: 'All Cocktails',
      filterMine: 'My Cocktails'
    },
    devices: {
      title: 'My Devices',
      registerNew: 'Register New Device',
      noDevices: 'No devices registered yet'
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
      registerNew: 'Enregistrer un Nouvel Appareil',
      noDevices: 'Aucun appareil enregistré'
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
    }
  }
} as const;
