# Contributing to RobotCocktail

Thank you for your interest in contributing to RobotCocktail! This document provides guidelines and information for contributors.

## Project Structure

```
robotcocktail/
├── web/                    # Web platform code
│   ├── src/               # Source code
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   └── styles/       # Tailwind CSS styles
│   ├── public/           # Static assets
│   └── tests/            # Web platform tests
├── hardware/              # Hardware implementation code
│   ├── esp32/            # ESP32 implementation
│   ├── raspberry/        # Raspberry Pi implementation
│   └── tests/            # Hardware tests
├── api/                   # API documentation and specs
└── docs/                 # Project documentation
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
