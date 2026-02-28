# Canvas Pet

An interactive virtual pet application built for the web. Canvas Pet brings a playful, engaging companion to your browser using modern web technologies and the HTML5 Canvas API.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Branch Strategy](#branch-strategy)
- [Pull Request Workflow](#pull-request-workflow)
- [Contributing](#contributing)
- [License](#license)

## Overview

Canvas Pet is a browser-based virtual pet that users can interact with, feed, play with, and watch grow over time. The application renders an animated pet on an HTML5 canvas, tracks pet stats (hunger, happiness, energy), and provides a responsive UI for interaction.

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript/TypeScript
- **Rendering:** HTML5 Canvas API
- **Build Tool:** Vite
- **Testing:** Vitest
- **CI/CD:** GitHub Actions
- **Version Control:** Git + GitHub

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/adv-andrew/canvas-pet.git
cd canvas-pet

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
canvas-pet/
├── .github/workflows/   # CI/CD pipeline definitions
├── docs/                # Project documentation
├── src/                 # Application source code
├── tests/               # Test files
├── .gitignore           # Git ignore rules
├── CONTRIBUTING.md      # Contribution guidelines
├── LICENSE              # MIT license
└── README.md            # This file
```

## Branch Strategy

This project follows a **trunk-based development** model with short-lived feature branches.

| Branch        | Purpose                          | Protected |
|---------------|----------------------------------|-----------|
| `main`        | Production-ready code            | Yes       |
| `feature/*`   | New features                     | No        |
| `bugfix/*`    | Bug fixes                        | No        |
| `hotfix/*`    | Urgent production fixes          | No        |
| `docs/*`      | Documentation updates            | No        |

- All work happens on feature branches created from `main`.
- Direct pushes to `main` are **not allowed**.
- See [docs/branching.md](docs/branching.md) for full details.

## Pull Request Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name main
   ```
2. Make your changes and commit with clear, descriptive messages.
3. Push your branch and open a pull request against `main`.
4. Ensure CI checks pass (linting, tests, build).
5. Request at least **one reviewer** to approve.
6. Squash-merge into `main` once approved.
7. Delete the feature branch after merge.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

