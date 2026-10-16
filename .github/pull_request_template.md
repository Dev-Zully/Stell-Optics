# Pull Request for TrueStub - Close Issue

❗ **Pull Request Information**

<!-- Briefly describe the purpose of the pull request. Explain the problem being solved or the functionality being implemented. -->

Add here some information

## 🌀 Summary of Changes

<!-- List the main changes made in the code. Include new features, bug fixes, or refactored components. -->

- **Add here the changes**:
- **More changes**:

## 🛠 Testing

### Evidence Before Solution

<!-- Describe the behavior or issue before applying the solution. Use Loom to record a video showing the problem. Provide a link to the video. -->

- **Video**: [Link to Loom video](https://loom.com)

### Evidence After Solution

<!-- Explain how the issue was fixed and demonstrate the corrected functionality. Use Loom to record another video showing the solution. Provide a link to the video. -->

- **Video**: [Link to Loom video](https://loom.com)

## 📂 Related Issue

<!-- Link the related issue so it automatically closes when this pull request is merged. -->

This pull request will **close # [Issue Number]** upon merging.

---

## ✅ Pre-merge Checklist

- [ ] My branch is up to date with `main` and there are no unresolved conflicts.
- [ ] I have run the relevant workspace checks (`lint`, `typecheck`, `test`) locally and they pass.
- [ ] I have filled in the Summary of Changes and linked the related issue above.

### 🗄️ Database Migration Check

> Complete this section if your PR adds or modifies any file under
> `apps/backend/src/db/migrations/`. Skip it (strike through or delete) if
> your PR does not touch migrations.

- [ ] **This PR does NOT touch any migration files.** _(skip the items below)_

  — OR —

- [ ] I checked that my new migration file's number (prefix) does not collide
      with any existing migration file in `apps/backend/src/db/migrations/`.
      _(List every file in the directory, sort them, and confirm your number
      comes after the current highest one — do not rely on your local branch
      view, which may be behind `main`.)_
- [ ] I verified the sequence is correct by running the migration runner
      locally against a clean database: `yarn workspace @truestub/backend migrate:up`.
- [ ] I have not renumbered or renamed any previously-merged migration file.
      _(Renaming applied migrations breaks the runner for everyone.)_

---

### Make sure to follow the Git Guidelines for Atomic Commits and read Contributing Guide

The Pull request needs to have the format mentioned below in the Git Guideline

- [Contributing Guide](../CONTRIBUTING.md)
- [Git Guidelines](../docs/GIT_GUIDELINE.md)

🎉 Thank you for reviewing this PR! 🎉
