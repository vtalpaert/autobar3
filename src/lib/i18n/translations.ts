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
    }
  }
} as const;
