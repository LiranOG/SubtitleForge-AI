# Contributing to SubtitleForge

First off, thank you for considering contributing to SubtitleForge! 🎉

Every contribution helps make subtitle generation more accessible for NotebookLM users worldwide. Whether it's fixing a typo, adding a new language, or improving the UI — we appreciate it.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#-reporting-bugs)
  - [Suggesting Features](#-suggesting-features)
  - [Submitting Code](#-submitting-code)
- [Code Guidelines](#code-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

By participating in this project, you agree to uphold a welcoming and respectful environment for everyone. We expect all contributors to:

- Be respectful and constructive in discussions
- Focus on what is best for the community
- Show empathy towards other community members
- Gracefully accept constructive criticism

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/subtitle-forge.git
   cd subtitle-forge
   ```
3. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```
5. **Set up your environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

---

## Development Setup

### Prerequisites

- **Node.js** 18+ (we recommend 20+)
- **OpenAI API Key** for testing transcription and translation
- **Git** for version control

### Running Locally

```bash
# Start with auto-restart on file changes
npm run dev

# Or start normally
npm start
```

The server will be available at `http://localhost:3000`.

### Testing Your Changes

Currently, testing is done manually:

1. Start the dev server
2. Upload a test `.m4a` or `.mp4` file
3. Verify the transcription and translation pipeline works
4. Check the UI renders correctly
5. Download SRT/VTT files and verify format

> **Tip:** For quick iteration, you can test with short audio clips (10-30 seconds) to save API costs.

---

## Project Architecture

Understanding the codebase structure will help you contribute effectively:

```
server.js          → Express server, routes, async job management
lib/
├── transcriber.js → Whisper API calls, segment splitting logic
├── translator.js  → GPT-4o translation, batch processing, response parsing
├── formatter.js   → SRT/VTT timestamp formatting and file generation
└── media.js       → FFmpeg audio extraction configuration
public/
├── index.html     → Page structure, sections, ARIA attributes
├── styles.css     → Design tokens, components, responsive layout
└── app.js         → Upload flow, job polling, player, subtitle sync
```

### Key Patterns

- **Async Job Model:** Upload returns immediately with a `jobId`. The client polls `/api/job/:id` for progress. This prevents HTTP timeouts.
- **Pipeline Steps:** Extract → Transcribe → Translate → Format. Each step updates `job.progress` and `job.stage`.
- **Subtitle Segments:** The universal data format is `{ start: number, end: number, text: string }` used across all modules.
- **Batch Translation:** Segments are sent to GPT-4o in batches of 20 with numbered input/output for reliable parsing.

---

## How to Contribute

### 🐛 Reporting Bugs

Found a bug? Please [open an issue](../../issues/new?template=bug_report.md) with:

- **Clear title** describing the problem
- **Steps to reproduce** (be specific)
- **Expected behavior** vs. **actual behavior**
- **File type** used (`.m4a`, `.mp4`, `.webm`)
- **Browser and OS** information
- **Console errors** if available (browser DevTools + server terminal)

### 💡 Suggesting Features

Have an idea? [Open a feature request](../../issues/new?template=feature_request.md) with:

- **Problem description** — What limitation are you hitting?
- **Proposed solution** — How do you think it should work?
- **Alternatives considered** — What else did you think about?

### 🔧 Submitting Code

1. **Check existing issues** — Someone may already be working on it
2. **Open an issue first** for significant changes to discuss the approach
3. **Keep PRs focused** — One feature or fix per PR
4. **Update documentation** if your change affects the API or UI

---

## Code Guidelines

### JavaScript

- Use **ES Modules** (`import`/`export`) — the project is `"type": "module"`
- Use `const` by default, `let` when needed, never `var`
- Use **template literals** for string interpolation
- Use **async/await** over raw Promises
- Add **JSDoc comments** for public functions
- Use descriptive variable names (no single-letter variables except in loops)

### CSS

- Use **CSS Custom Properties** (design tokens) defined in `:root`
- Follow the existing naming convention: `.component-name`, `.component-element`, `.modifier`
- Keep responsive rules in `@media` blocks at the bottom
- Add transitions for interactive elements

### HTML

- Use **semantic elements** (`section`, `header`, `main`, `button`, etc.)
- Add **ARIA attributes** where needed for accessibility
- Give all interactive elements unique **`id`** attributes
- Use the `hidden` attribute for initial visibility control

### File Organization

- Backend logic goes in `lib/` as separate modules
- Frontend assets go in `public/`
- Each module should have a single clear responsibility

---

## Commit Messages

We follow the **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | CSS/formatting (no logic change) |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |

### Examples

```
feat(translator): add Arabic language support
fix(player): seekbar not updating on mobile Safari
docs(readme): add deployment instructions for Docker
style(css): improve subtitle overlay contrast ratio
refactor(transcriber): extract timestamp parsing to utility
```

---

## Pull Request Process

1. **Update your branch** with the latest `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Ensure your changes work:**
   - Server starts without errors
   - Upload flow completes successfully
   - UI renders correctly on desktop and mobile
   - No console errors in browser

3. **Fill out the PR template** completely

4. **Request a review** — maintainers will review within a few days

5. **Address feedback** — push additional commits as needed

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-reviewed my own code
- [ ] Added comments for complex logic
- [ ] Updated documentation if needed
- [ ] No new warnings or errors

---

## 🙏 Thank You

Your contributions make SubtitleForge better for everyone. Whether it's a one-line fix or a major feature — every contribution counts!
