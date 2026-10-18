# 🚀 Commit Guidelines | TrueStub

This guideline establishes clear conventions for commit messages and branch naming in this project. Following these conventions ensures a consistent and readable commit history.

---

## 🛠️ General Rules

- **ALL BRANCHES AND COMMIT MESSAGES SHOULD BE IN LOWERCASE.**
- Keep commit messages short and descriptive (less than 72 characters).

---

## 🌳 Branch Naming Convention

Use the following branch prefixes based on the type of change:

- `feat/` 🌟: For new features
- `fix/` 🐛: For bug fixes
- `remove/` 🗑️: For file removals
- `docs/` 📖: For documentation updates
- `style/` 🎨: For style changes (formatting, spacing, etc.)
- `refactor/` ♻️: For code refactoring (no functional changes)
- `perf/` ⚡: For performance improvements
- `test/` 🧪: For adding or fixing tests
- `build/` 🏗️: For build system changes
- `ci/` 🔄: For CI/CD configuration changes
- `change/` ✏️: For small changes or tweaks
- `chore/` 🛠️: For maintenance tasks

### Example Branch Names

- `feat/user-registration` 🌟
- `fix/product-price-validation` 🐛
- `docs/readme-update` 📖
- `style/button-styling` 🎨

---

## ✍️ Commit Message Convention

### Commit Message Format

Each commit message should follow this structure:

```text
<type>: <short description>
```

### Commit Types

- `feat` 🌟: A new feature
- `fix` 🐛: A bug fix
- `docs` 📖: Documentation changes
- `style` 🎨: Changes that do not affect code behavior (e.g., formatting)
- `refactor` ♻️: Code changes without affecting functionality
- `perf` ⚡: Performance improvements
- `test` 🧪: Adding or fixing tests
- `build` 🏗️: Changes to the build system or external dependencies
- `ci` 🔄: Changes to CI/CD scripts
- `change` ✏️: Small changes or tweaks
- `remove` 🗑️: File removals
- `chore` 🛠️: Maintenance tasks or other minor changes

These are exactly the types `commitlint.config.js` accepts. The `commit-msg`
hook and CI reject anything else.

---

### Writing Commit Messages

1. **Keep It Short:** Less than 72 characters for the title.
2. **Be Clear:** Explain what was done and why (if necessary).
3. **Use Present Tense:** Write commit messages as if you're giving commands.

### Example Commit Messages

- `feat: add user registration support` 🌟
- `fix: resolve price validation bug` 🐛
- `docs: update API usage instructions` 📖
- `style: adjust button alignment` 🎨
- `perf: optimize database queries` ⚡

---

## 🙏 Thank You for Following the Guidelines

By adhering to these guidelines, you help maintain a clean and professional repository. Let's build great things together! 🚀
