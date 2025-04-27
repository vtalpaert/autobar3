# Project Structure

```
/
├── src/                    # Source code
│   ├── lib/               # Shared libraries and components
│   │   ├── components/    # Reusable Svelte components
│   │   ├── i18n/         # Internationalization
│   │   └── server/       # Server-side code
│   │       ├── auth/     # Authentication logic
│   │       └── db/       # Database schema and queries
│   └── routes/           # SvelteKit routes
│       ├── admin/        # Admin panel
│       │   ├── orders/   # Order management
│       │   └── ...       # Other admin sections
│       ├── api/          # API endpoints
│       │   └── devices/  # Device API endpoints
│       ├── auth/         # Authentication pages
│       ├── bar/          # My Bar page for orders
│       ├── cocktails/    # Cocktail management with ingredients and doses
│       ├── collaborations/ # Artist collaboration system
│       ├── devices/      # Device management
│       └── profile/      # User profile pages
├── static/               # Static assets
│   └── firmware/        # Device firmware files
├── drizzle.config.ts    # Database configuration
├── svelte.config.js     # SvelteKit configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── vite.config.ts       # Vite bundler configuration
```

## Coding Conventions

### General

- Use clear, descriptive names for variables, functions, and classes
- Write self-documenting code with appropriate comments
- Follow language-specific style guides

### Web Platform

- Follow Tailwind CSS best practices
- Use functional components
- Implement responsive design
- Write unit tests for components

### Hardware

- Document pin configurations
- Include wiring diagrams for new features
- Test hardware changes thoroughly
- Test OTA update capability
