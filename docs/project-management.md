# Project Management

This document describes how the Canvas Pet team manages work using GitHub Projects, issue labeling, and sprint workflows.

## GitHub Projects

We use [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects) (v2) as our primary project management tool.

### Board Setup

Create a project board with the following views:

#### Board View (Default)

| Column         | Purpose                                      |
|----------------|----------------------------------------------|
| **Backlog**    | Triaged issues not yet scheduled              |
| **Sprint**     | Issues committed to the current sprint        |
| **In Progress**| Actively being worked on (linked to a branch) |
| **In Review**  | PR open and awaiting review                   |
| **Done**       | Merged and verified                           |

#### Table View

Use a table view for sprint planning with these fields:
- **Status** (single select): Backlog, Sprint, In Progress, In Review, Done
- **Priority** (single select): Critical, High, Medium, Low
- **Sprint** (iteration): Two-week iterations
- **Estimate** (number): Story points (1, 2, 3, 5, 8)
- **Assignee** (person): Team member responsible

### Workflow Automation

Configure these automations in the project settings:
- When an issue is added to the project, set status to **Backlog**.
- When a PR is opened and linked to an issue, set status to **In Review**.
- When a PR is merged, set status to **Done**.

## Issue Labeling Strategy

Apply labels consistently to categorize and prioritize work.

### Type Labels

| Label            | Color     | Description                          |
|------------------|-----------|--------------------------------------|
| `type:feature`   | `#1d76db` | New functionality                    |
| `type:bug`       | `#d73a4a` | Something is broken                  |
| `type:docs`      | `#0075ca` | Documentation improvements           |
| `type:chore`     | `#e4e669` | Maintenance and tooling              |
| `type:test`      | `#bfd4f2` | Test additions or improvements       |
| `type:refactor`  | `#d4c5f9` | Code restructuring without behavior change |

### Priority Labels

| Label               | Color     | Description                       |
|----------------------|-----------|-----------------------------------|
| `priority:critical`  | `#b60205` | Blocks all other work             |
| `priority:high`      | `#d93f0b` | Must be in the current sprint     |
| `priority:medium`    | `#fbca04` | Should be addressed soon          |
| `priority:low`       | `#0e8a16` | Nice to have                      |

### Status Labels

| Label              | Color     | Description                        |
|--------------------|-----------|-------------------------------------|
| `status:blocked`   | `#e11d48` | Cannot proceed (dependency/issue)   |
| `status:needs-info`| `#f9a825` | Requires more information           |
| `status:wontfix`   | `#737373` | Decided not to address              |

### Creating Labels via CLI

```bash
# Type labels
gh label create "type:feature" --color "1d76db" --description "New functionality"
gh label create "type:bug" --color "d73a4a" --description "Something is broken"
gh label create "type:docs" --color "0075ca" --description "Documentation improvements"
gh label create "type:chore" --color "e4e669" --description "Maintenance and tooling"
gh label create "type:test" --color "bfd4f2" --description "Test additions or improvements"
gh label create "type:refactor" --color "d4c5f9" --description "Code restructuring"

# Priority labels
gh label create "priority:critical" --color "b60205" --description "Blocks all other work"
gh label create "priority:high" --color "d93f0b" --description "Must be in current sprint"
gh label create "priority:medium" --color "fbca04" --description "Should be addressed soon"
gh label create "priority:low" --color "0e8a16" --description "Nice to have"

# Status labels
gh label create "status:blocked" --color "e11d48" --description "Cannot proceed"
gh label create "status:needs-info" --color "f9a825" --description "Requires more information"
gh label create "status:wontfix" --color "737373" --description "Decided not to address"
```

## Sprint Workflow

We use **two-week sprints** to plan and deliver work.

### Sprint Ceremonies

| Ceremony           | When                     | Duration | Purpose                              |
|--------------------|--------------------------|----------|--------------------------------------|
| Sprint Planning    | First day of sprint      | 1 hour   | Select and estimate work for sprint  |
| Daily Standup      | Every weekday            | 15 min   | Share progress and blockers          |
| Sprint Review      | Last day of sprint       | 30 min   | Demo completed work to stakeholders  |
| Sprint Retrospective | Last day of sprint    | 30 min   | Reflect on process improvements      |

### Sprint Planning Process

1. **Review the backlog.** Ensure issues are triaged, labeled, and estimated.
2. **Set sprint goals.** Define 1-2 measurable objectives for the sprint.
3. **Select issues.** Move issues from Backlog to Sprint based on priority and capacity.
4. **Assign owners.** Each issue should have a single assignee.
5. **Verify estimates.** Confirm story point estimates are realistic.

### During the Sprint

- Move issues to **In Progress** when you start working on them.
- Create a feature branch and link it to the issue.
- Move issues to **In Review** when a PR is opened.
- Address review feedback promptly.
- Move issues to **Done** when the PR is merged.

### End of Sprint

- All **Done** items are reviewed in the Sprint Review.
- Incomplete items are moved back to **Backlog** or carried to the next sprint.
- The team discusses process improvements in the Retrospective.
