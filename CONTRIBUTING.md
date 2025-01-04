# Contributing to RobotCocktail

Thank you for your interest in contributing to RobotCocktail! This document provides guidelines and information for contributors.

## Project Structure

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
│       ├── auth/         # Authentication pages
│       ├── cocktails/    # Cocktail management
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
- Support OTA update capability

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit PR with clear description

## Development Setup

Instructions for setting up development environment coming soon.

## Questions?

Feel free to open an issue for any questions or concerns.
