# Repository Guidelines

## Project Structure & Module Organization
- `src/main.tsx` bootstraps the React app.
- `src/App.tsx` provides the main layout and tab switching.
- `src/components/` contains feature modules such as `CurlModifier.tsx` and `SqlInConverter.tsx`.
- `src/index.css` holds global styles.
- Root config lives in `vite.config.ts` and `tsconfig.json`.
- `index.html` is the Vite entry, and `dist/` is generated build output (do not edit manually).
- CI/CD is defined in `.github/workflows/deploy.yml` for GitHub Pages deployment.

## Build, Test, and Development Commands
- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local dev server on `0.0.0.0:3000`.
- `npm run lint`: run TypeScript type checking (`tsc --noEmit`).
- `npm run build`: generate production assets in `dist/`.
- `npm run preview`: preview the production build locally.
- `npm run clean`: remove `dist/`.

## Coding Style & Naming Conventions
- Stack: TypeScript + React function components.
- Use 2-space indentation and semicolons.
- Keep import order stable: external packages first, then local modules.
- Use PascalCase for component files (`SqlInConverter.tsx`) and camelCase for variables/functions.
- Keep parsing/transform logic in small helper functions to keep components readable.

## Testing Guidelines
- No dedicated test framework is configured yet in this repository.
- Minimum quality gate for every change: `npm run lint` and `npm run build` must pass.
- For behavior changes, include manual verification steps in PRs (input, action, expected output).
- If you add non-trivial logic, introduce tests in a follow-up under a clear test directory (for example `src/__tests__/`).

## Commit & Pull Request Guidelines
- Follow the existing commit style: `feat: ...`, `fix: ...`, `chore: ...`.
- Keep commits focused; do not mix unrelated refactors and feature work.
- PRs should include:
  - a short summary of what changed and why
  - commands run for verification
  - screenshots for UI updates
  - linked issue/task when available

## Security & Configuration Tips
- Never commit secrets.
- Store local runtime secrets in `.env.local`; keep `.env.example` as the template.
- Keep GitHub Pages base-path behavior in `vite.config.ts` consistent with the repository path.
