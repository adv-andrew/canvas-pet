# Branch Strategy

This document defines the branching strategy, pull request workflow, and review requirements for the Canvas Pet project.

## Branch Overview

```
main (protected)
 ├── feature/pet-rendering
 ├── feature/stats-system
 ├── bugfix/canvas-flicker
 └── docs/setup-guide
```

## Branch Rules

### `main` Branch

- **Protected.** Direct pushes are blocked.
- Represents the latest stable, production-ready code.
- Only receives changes through approved pull requests.
- All CI checks must pass before merge.
- Requires at least one approving review.

### Feature Branches (`feature/*`)

- Created from `main` for all new work.
- Naming format: `feature/short-description` (e.g., `feature/pet-animations`).
- Should be short-lived (ideally merged within a few days).
- Must be up to date with `main` before merging.

### Bugfix Branches (`bugfix/*`)

- Created from `main` to address non-critical bugs.
- Naming format: `bugfix/short-description` (e.g., `bugfix/stats-not-saving`).

### Hotfix Branches (`hotfix/*`)

- Created from `main` for urgent production issues.
- Naming format: `hotfix/short-description` (e.g., `hotfix/crash-on-load`).
- Follow an expedited review process (still requires one approval).

### Documentation Branches (`docs/*`)

- Created from `main` for documentation-only changes.
- Naming format: `docs/short-description` (e.g., `docs/api-reference`).

## Pull Request Workflow

### 1. Create a Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Develop and Commit

- Make small, focused commits.
- Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  ```
  feat: add hunger stat decay over time
  fix: correct canvas scaling on retina displays
  docs: add API endpoint documentation
  test: add unit tests for stat calculations
  ```

### 3. Push and Open a PR

```bash
git push -u origin feature/your-feature-name
```

Open a pull request on GitHub against `main`. Fill out the PR template:
- **Title:** Clear, concise summary of the change.
- **Description:** What changed, why, and how to test it.
- **Linked Issues:** Reference any related issues (`Closes #12`).

### 4. CI Checks

The following automated checks run on every PR:
- Dependency installation
- Linting
- Unit tests
- Build verification

All checks **must pass** before the PR can be merged.

### 5. Code Review

- Request at least **one reviewer** from the team.
- Reviewers should check for:
  - Correctness and completeness.
  - Code quality and readability.
  - Test coverage for new functionality.
  - No regressions introduced.
- Address all review comments before merging.

### 6. Merge

- Use **squash merge** to keep `main` history clean.
- Delete the feature branch after merge.
- GitHub will automatically close linked issues on merge.

## Review Requirements

| Criteria                    | Requirement                          |
|-----------------------------|--------------------------------------|
| Minimum approvals           | 1                                    |
| CI status checks            | Must pass                            |
| Branch up to date           | Required before merge                |
| Stale review dismissal      | Enabled (new pushes dismiss reviews) |
| Code owner review           | Required if CODEOWNERS file exists   |

## Conflict Resolution

If your branch has conflicts with `main`:

```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git rebase main
# Resolve conflicts, then:
git push --force-with-lease
```

Use `--force-with-lease` instead of `--force` to prevent overwriting others' work.
