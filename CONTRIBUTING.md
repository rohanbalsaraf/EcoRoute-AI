# Contributing to EcoRoute AI

First off, thank you for considering contributing to EcoRoute! It's people like you that make it a great tool for the planet.

## 🌈 Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct (be kind, basically).

## 🛠 Development Workflow

### Branch Naming
- `feat/feature-name` for new features.
- `fix/issue-description` for bug fixes.
- `docs/what-changed` for documentation updates.
- `perf/improvement` for performance refactors.

### Pull Requests
1. **Sync your fork**: Ensure your branch is up to date with `main`.
2. **Lint and Test**:
   ```bash
   pnpm run lint
   pnpm run test
   ```
3. **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: add carbon offset estimator`).
4. **Link Issues**: Reference any related issues in your PR description.

## 🎨 Coding Standards

### Rust
- Run `cargo fmt` before committing.
- Avoid `unwrap()` in production code; use proper error handling.

### Python
- We use `ruff` for linting and formatting.
- Follow PEP 8 guidelines.
- Use type hints for all public functions.

### TypeScript / Next.js
- Use functional components and hooks.
- Use Tailwind CSS for styling.
- Ensure all new components are responsive (mobile-first).

---

## 🐞 Reporting Bugs
Use the GitHub Issue tracker to report bugs. Please include:
- Steps to reproduce.
- Expected vs Actual behavior.
- Screenshots (if applicable).
- Your OS and browser version.

## 💡 Feature Requests
We love ideas! Open a "Feature Request" issue and explain the "why" behind the feature.

---

**Happy Coding!** 🌿
