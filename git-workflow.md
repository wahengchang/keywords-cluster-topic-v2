# Git Workflow

## Quick Steps
1. Draft issue → Create issue → Delete draft
2. Sync main → Create branch → Code → Commit → Push → PR → Merge

## Workflow

### 1. Create Issue
```bash
# Draft issue
echo "Create issue-[task-name].md and review"

# Create issue
gh issue create --title "[Title]" --body-file issue-[task-name].md
rm issue-[task-name].md
```

### 2. Start Development
```bash
# Sync main
git checkout main
git pull origin main

# Create branch
git checkout -b feature/issue-123-[task-name]

# Set commit template (optional)
git config commit.template commit-template.txt
```

### 3. Develop & Submit
```bash
# Commit with issue reference
git commit -m "feat: implement feature

- Add feature functionality
- Update components

Closes #123"

# Push and create PR
git push -u origin feature/issue-123-[task-name]
gh pr create --title "[Title]" --body "Closes #123"
```

### 4. After Merge
```bash
# Cleanup
git checkout main
git pull origin main
git branch -d feature/issue-123-[task-name]
```

## Templates

### Issue Template
```markdown
## Description
Brief description

## Acceptance Criteria
- [ ] Requirement 1
- [ ] Requirement 2

## Technical Notes
- Implementation details

## Definition of Done
- [ ] Code implemented
- [ ] Self-reviewed
- [ ] Tested manually
```

### Branch Naming
- `feature/issue-123-task-name`
- Always from latest main
- Reference issue number

### Commit Format
- `feat:`, `fix:`, `docs:`, `chore:`
- Include "Closes #123" to auto-close issue
- Use `commit-template.txt` for guidance (set with `git config commit.template commit-template.txt`)