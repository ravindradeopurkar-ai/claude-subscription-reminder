# 🤖 AI-Powered GitHub Actions Pipeline

An autonomous 4-stage CI pipeline powered by Claude AI. You write a requirement — the pipeline plans, reviews, and merges it automatically.

## Pipeline Flow

```
You push requirement.md          GitHub Actions takes over
to a feature branch
        │
        ▼
┌───────────────────┐
│  Stage 1          │  Trigger: push  (paths: requirement.md)
│  Generate Plan    │  Claude reads requirement → writes plan.md
│  01-generate-     │  → commits plan.md to your branch
│  plan.yml         │
└────────┬──────────┘
         │ workflow_run: completed
         ▼
┌───────────────────┐
│  Stage 2          │  Trigger: workflow_run (Stage 1 success)
│  Create PR        │  gh pr create  feature-branch → master
│  02-create-pr.yml │  PR title pulled from plan.md H1 heading
└────────┬──────────┘
         │ pull_request: opened
         ▼
┌───────────────────┐
│  Stage 3          │  Trigger: pull_request opened/synchronize
│  Review PR        │  Claude reviews plan.md vs requirement.md
│  03-review-pr.yml │  Posts scorecard comment (0-100)
│                   │  Score ≥ 80 → label: review-approved   ✅
│                   │  Score < 80 → label: review-changes-needed ⚠️
└────────┬──────────┘
         │ pull_request: labeled  (review-approved)
         ▼
┌───────────────────┐
│  Stage 4          │  Trigger: label == "review-approved"
│  Auto-Merge       │  Squash-merges PR into master
│  04-auto-merge.   │  Leaves audit trail in merge commit body
│  yml              │
└───────────────────┘
```

---

## ⚙️ One-Time Setup

### 1. Add GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value | Why needed |
|---|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Claude API calls in Stage 1 & 3 |
| `PAT` | GitHub Personal Access Token | Allows PR creation to trigger Stage 3, and label to trigger Stage 4 |

> **Why PAT instead of GITHUB_TOKEN for PR/labels?**
> GitHub blocks workflow-to-workflow event chains when `GITHUB_TOKEN` is used to create PRs or labels. A PAT bypasses this so the pipeline can chain stages automatically.

### 2. Create a PAT

1. Go to GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scopes: ✅ `repo` (Full control of private repositories)
4. Copy the token and save it as the `PAT` secret above

### 3. Allow GitHub Actions to push to your repo

Go to **Settings → Actions → General → Workflow permissions**
→ Select **"Read and write permissions"** → Save

---

## 🚀 How to Use

1. **Create a feature branch** from master:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Write your requirement** in `requirement.md`:
   ```markdown
   # Add dark mode toggle

   The app should have a dark/light mode toggle in the top-right corner.
   State should persist in localStorage. Should respect the OS preference on first load.
   ```

3. **Push the branch**:
   ```bash
   git add requirement.md
   git commit -m "Add requirement: dark mode toggle"
   git push -u origin feature/my-new-feature
   ```

4. **Watch the pipeline run** in the **Actions** tab:
   - Stage 1 runs → `plan.md` appears on your branch
   - Stage 2 runs → PR is auto-created
   - Stage 3 runs → Claude posts a review comment with score
   - If score ≥ 80 → Stage 4 runs → PR is auto-merged ✅

---

## 🔁 If Review Requests Changes (score < 80)

1. Edit `plan.md` on your branch to address the issues
2. Push the updated `plan.md`
3. Stage 3 re-runs and re-scores the plan
4. When score reaches ≥ 80, Stage 4 auto-merges

---

## Models Used

| Stage | Model | Reason |
|---|---|---|
| Stage 1 (plan) | `claude-opus-4-5` | High-quality structured output |
| Stage 3 (review) | `claude-3-5-haiku-20241022` | Fast, cost-effective review |
