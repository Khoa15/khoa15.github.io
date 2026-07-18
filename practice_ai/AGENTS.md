# Repository Guidelines

## Project Structure & Module Organization

This directory contains a dependency-free, single-page quiz application:

- `index.html` provides the page shell, metadata, font loading, and KaTeX CDN scripts.
- `app.js` owns UI state, rendering, navigation, scoring, and event handling.
- `questions.js` defines quiz topics, questions, answers, explanations, and formula cards through the global `quizTopics` data set.
- `styles.css` contains the responsive layout, component styles, themes, and reduced-motion rules.

Keep new assets near these files unless a category grows large enough to justify an `assets/` directory. Load scripts in dependency order: question data before application logic.

## Build, Test, and Development Commands

No build step or package installation is required. Serve the directory locally so browser and CDN behavior matches deployment:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`. Before committing JavaScript changes, run syntax checks:

```powershell
node --check app.js
node --check questions.js
```

Use `git diff --check` to catch whitespace errors.

## Coding Style & Naming Conventions

Use two-space indentation in HTML and JavaScript. Follow the existing JavaScript style: single quotes, semicolons, `const` by default, camelCase for variables/functions, and small rendering functions named by purpose (for example, `renderQuiz`). Use kebab-case CSS classes and group related component rules together. Preserve UTF-8 Vietnamese text and escape user- or data-derived HTML through the existing formatting helpers. Maintain keyboard labels, focus behavior, responsive layouts, and reduced-motion support.

## Testing Guidelines

There is no automated test framework or coverage threshold. Manually exercise every quiz mode, answer feedback, results, question navigation, formula-card flipping, swipe controls, and viewport layouts below and above the `700px` breakpoint. Confirm the browser console is clean and KaTeX renders after DOM updates.

## Commit & Pull Request Guidelines

Recent repository history uses short imperative summaries such as `update` and `add certificate`; prefer a more descriptive scoped subject, for example `quiz: improve formula navigation`. Keep commits focused. Pull requests should summarize behavior changes, list manual checks, link relevant issues, and include screenshots or a short recording for visible UI changes. Do not commit temporary screenshots or generated artifacts.
