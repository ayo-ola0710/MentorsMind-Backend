# Contributing to MentorMinds Backend

We follow a consistent development workflow to ensure high-quality code and smooth collaboration.

## Branch Naming Conventions
- **feature/** - For new features (e.g., `feature/issue-10-user-authentication`)
- **bugfix/** - For bug fixes (e.g., `bugfix/issue-5-fix-login-error`)
- **refactor/** - For code refactoring (e.g., `refactor/api-response-handler`)
- **docs/** - For documentation changes

## PR Conventions
- **PR Title**: `[Issue #X] Description`
- **PR Description**: Mention the issue number it closes/fixes.
- **Review**: At least one approval is required before merging.

## PR Checklist
- [ ] Branch follows naming convention
- [ ] Linting and formatting pass (`npm run lint` and `npm run format`)
- [ ] TypeScript build passes (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] Documentation updated if necessary

## Development Workflow
1. Create a branch from `main`.
2. Commit your changes.
3. Push to your fork or the main repository.
4. Open a PR.
5. Ensure linting and tests pass.

## Code Style
- Use TypeScript strict mode.
- Use ESLint and Prettier (enforced via pre-commit hooks).
- Prefer async/await over callbacks.
- Use Zod for validation.
