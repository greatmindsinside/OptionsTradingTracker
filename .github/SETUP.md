# GitHub Repository Setup Guide

This guide will help you configure the GitHub repository with the proper branch protection rules and settings.

## Branch Protection Rules

To enable branch protection for the `master` branch, follow these steps:

### 1. Navigate to Branch Protection Settings

1. Go to your GitHub repository: `https://github.com/greatmindsinside/OptionsTradingTracker`
2. Click on **Settings** tab
3. Click on **Branches** in the left sidebar
4. Click **Add branch protection rule**

### 2. Configure Branch Protection Rule

Fill in the following settings:

**Branch name pattern:** `master`

**Protect matching branches:**

- [x] **Require a pull request before merging**
  - [x] Require approvals: `1`
  - [x] Dismiss stale reviews when new commits are pushed
  - [x] Require review from code owners (if you create a CODEOWNERS file)
- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Required status checks (add these as they become available):
    - `lint` (Lint & Format Check)
    - `test` (Unit & Component Tests)
    - `e2e` (End-to-End Tests)
    - `accessibility` (Accessibility Tests)
    - `build` (Build & Deploy Check)
    - `security` (Security Audit)
- [x] **Require conversation resolution before merging**
- [x] **Require signed commits** (optional but recommended)
- [x] **Require linear history** (optional, prevents merge commits)
- [x] **Include administrators** (applies rules to repo admins too)
- [ ] **Allow force pushes** (keep disabled)
- [ ] **Allow deletions** (keep disabled)

### 3. Additional Repository Settings

#### Enable Security Features

1. Go to **Settings** > **Security & analysis**
2. Enable:
   - [x] **Dependency graph**
   - [x] **Dependabot alerts**
   - [x] **Dependabot security updates**
   - [x] **Secret scanning**
   - [x] **Push protection** (prevents committing secrets)

#### Configure Actions Permissions

1. Go to **Settings** > **Actions** > **General**
2. Set **Actions permissions** to: "Allow all actions and reusable workflows"
3. Set **Workflow permissions** to: "Read repository contents and packages permissions"
4. Enable: "Allow GitHub Actions to create and approve pull requests"

## Setting Up Status Checks

After the first CI run, GitHub will show available status checks. Add these to the branch protection rule:

1. Go back to **Settings** > **Branches**
2. Click **Edit** on your branch protection rule
3. Under "Require status checks to pass before merging", add:
   - `lint`
   - `test`
   - `e2e`
   - `accessibility`
   - `build`
   - `security` (optional, may be flaky)

## Verification

To verify everything is working:

1. Create a test branch: `git checkout -b test/branch-protection`
2. Make a small change and commit it
3. Push the branch: `git push -u origin test/branch-protection`
4. Create a pull request
5. Verify that:
   - CI checks run automatically
   - You cannot merge until all checks pass
   - Direct pushes to master are blocked

## Troubleshooting

### CI Checks Not Running

If GitHub Actions aren't running:

1. Check **Settings** > **Actions** > **General**
2. Ensure actions are enabled
3. Check the `.github/workflows/ci.yml` file is in the master branch
4. Look at **Actions** tab for error details

### Status Checks Not Required

If you can merge without status checks:

1. Verify the branch protection rule is active
2. Check that status check names match exactly
3. Ensure "Require status checks to pass before merging" is enabled

### Permission Issues

If you get permission errors:

1. Verify you have admin access to the repository
2. Check that the GITHUB_TOKEN has necessary permissions
3. For organization repos, check organization settings

## Security Best Practices

1. **Enable signed commits** for additional security
2. **Use CODEOWNERS file** to require specific reviewers
3. **Enable secret scanning** to prevent credential leaks
4. **Regular security audits** with Dependabot
5. **Limit who can approve PRs** using branch protection

## Next Steps

After setting up branch protection:

1. Test the workflow with a sample PR
2. Train team members on the new workflow
3. Document any project-specific review requirements
4. Consider adding automated testing for critical paths

---

**Important:** These settings protect your main branch and ensure code quality. Do not disable them without good reason!
