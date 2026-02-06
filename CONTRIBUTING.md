# Contributing to Canvas Pet

Thank you for your interest in contributing to Canvas Pet. This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contri  bute

### Reporting Bugs

1. Check the [issue tracker](https://github.com/your-org/canvas-pet/issues) to see if the bug has already been reported.
2. If not, open a new issue using the **Bug Report** template.
3. Include steps to reproduce, expected behavior, actual behavior, and screenshots if applicable.

### Suggesting Features

1. Open a new issue using the **Feature Request** template.
2. Describe the feature, its use case, and any proposed implementation details.

### Submitting Code Changes

1. **Fork the repository** and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name main
   ```

2. **Write your code** following the project's coding standards:
   - Use consistent formatting (Prettier/ESLint configs are provided).
   - Write meaningful variable and function names.
   - Add comments only where the logic is non-obvious.

3. **Write tests** for new functionality in the `tests/` directory.

4. **Commit your changes** with clear, descriptive messages:
   ```
   feat: add hunger decay mechanic to pet stats
   fix: resolve canvas rendering flicker on resize
   docs: update setup instructions for Node 18
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format.

5. **Push your branch** and open a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Fill out the PR template** completely, linking any related issues.

### Pull Request Requirements

- All CI checks must pass.
- At least one approving review is required.
- PR description must explain **what** changed and **why**.
- Keep PRs focused and small. Large PRs should be broken into smaller, logical chunks.

## Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

## Branch Naming Conventions

| Prefix      | Use Case            | Example                        |
|-------------|---------------------|--------------------------------|
| `feature/`  | New features        | `feature/pet-animations`       |
| `bugfix/`   | Bug fixes           | `bugfix/stats-not-saving`      |
| `hotfix/`   | Urgent fixes        | `hotfix/crash-on-load`         |
| `docs/`     | Documentation       | `docs/api-reference`           |

## Questions?

If you have questions about contributing, open a discussion or reach out to the maintainers.
