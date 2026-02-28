# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-28
**Project:** md2journal - Markdown → Chinese Journal PDF Converter

## OVERVIEW

Node.js CLI tool for converting Markdown (with LaTeX + Mermaid) to Chinese academic journal PDFs. Dual-mode: CLI + GUI.

## STRUCTURE

```
./
├── cli.js           # CLI entry (file/build/watch commands)
├── converter.js    # Core engine (markdown→PDF)
├── gui.js          # GUI server (HTTP on port 3456)
├── browser-pool.js # Browser instance pool for performance
├── *.css           # 3 built-in styles (journal, cornell-notes, normal-a4)
├── gui/            # Static GUI (index.html only)
├── tests/          # Test files (vitest)
├── scripts/        # Shell scripts
├── demo/           # Sample .md files
├── input/          # Default input directory
└── output/         # Default output directory
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| CLI commands | cli.js | commander.js-based, 3 subcommands |
| PDF conversion | converter.js | marked → katex → mermaid → puppeteer |
| GUI server | gui.js | Express-lite HTTP, serves static |
| Styles | \*.css (root) | 3 PDF templates |
| Browser pool | browser-pool.js | Puppeteer instance reuse |
| Tests | tests/ | Vitest, 10 test cases |

## CONVENTIONS (DEVIATIONS FROM STANDARD)

- **Flat root** - No `src/` directory (unusual for Node.js)
- **CSS at root** - Styles in root, not `styles/` subdir
- **ES Modules** - `"type": "module"` in package.json

## ANTI-PATTERNS (THIS PROJECT)

- No anti-pattern comments found (clean codebase)

## COMMANDS

```bash
npm test            # Run tests (vitest)
npm run test:run   # Run tests once
npm run lint       # ESLint code check
npm run format     # Prettier formatting
npm run format:check # Check formatting
npm run build       # Batch convert ./input → ./output
npm run watch       # Auto-convert on file changes
npm run demo        # Build demo files
npm run gui         # Launch GUI (port 3456)
npm run build:all  # All 3 styles output
```

## DEPENDENCIES

- marked (markdown)
- katex (LaTeX)
- mermaid (diagrams)
- puppeteer (PDF)
- gray-matter (YAML front-matter)
- chokidar (watch mode)
- commander (CLI)
- vitest (testing)
- eslint (linting)
- prettier (formatting)

## CONFIG FILES

```
.eslintrc.json     # ESLint config (legacy)
eslint.config.js  # ESLint flat config
.prettierrc       # Prettier config
vitest.config.js  # Vitest config
.github/workflows/ci.yml  # GitHub Actions CI
```

## NOTES

- Entry: cli.js (CLI) or gui.js (GUI)
- No `src/` - all JS at root level
- Styles: journal.css (default), cornell-notes.css, normal-a4.css
- Multi-style: `--all-styles` flag generates all 3 PDF variants
- Browser pool: browser-pool.js for Puppeteer instance reuse
- Vendor assets cached to /tmp for performance

## TEST CASES

| Group | Coverage |
|-------|----------|
| escapeHtml | HTML escaping, null handling, Chinese chars |
| Output path generation | Path generation, multi-style, custom pattern |
| Style path resolution | Default style, all styles, presets, deduplication |
