# Risk Management

This document defines the risk management framework for the Canvas Pet project, including how risks are identified, assessed, mitigated, and monitored throughout the project lifecycle.

## Risk Identification Process

Risks are identified through the following activities:

1. **Sprint Planning:** Review upcoming work for technical and schedule risks.
2. **Code Reviews:** Identify quality, security, and maintainability risks during PR reviews.
3. **Retrospectives:** Surface process and team risks during sprint retrospectives.
4. **Ad-Hoc Reporting:** Any team member can raise a risk at any time by creating a GitHub issue with the `risk` label.

### Risk Categories

| Category        | Description                                              |
|-----------------|----------------------------------------------------------|
| **Technical**   | Technology limitations, integration failures, bugs       |
| **Schedule**    | Delays, scope creep, underestimated effort               |
| **Resource**    | Team availability, skill gaps, tooling limitations       |
| **External**    | Third-party API changes, dependency vulnerabilities      |
| **Security**    | Data breaches, injection attacks, auth failures          |
| **Scope**       | Unclear requirements, feature creep, shifting priorities |

## Scoring Model

Each risk is scored using a **Probability x Impact** matrix to determine its severity.

### Probability Scale

| Score | Level      | Description                        |
|-------|------------|------------------------------------|
| 1     | Rare       | Unlikely to occur (<10%)          |
| 2     | Unlikely   | Could occur but not expected (10-30%) |
| 3     | Possible   | Reasonable chance of occurring (30-60%) |
| 4     | Likely     | More likely than not (60-85%)     |
| 5     | Almost Certain | Expected to occur (>85%)      |

### Impact Scale

| Score | Level      | Description                                    |
|-------|------------|------------------------------------------------|
| 1     | Negligible | Minimal effect on project objectives           |
| 2     | Minor      | Small delay or quality reduction               |
| 3     | Moderate   | Notable delay, budget impact, or quality issue |
| 4     | Major      | Significant impact on delivery or functionality|
| 5     | Critical   | Project failure or complete rework required    |

### Risk Score Calculation

```
Risk Score = Probability x Impact
```

### Severity Thresholds

| Score Range | Severity | Action Required                              |
|-------------|----------|----------------------------------------------|
| 1 - 4       | Low      | Accept and monitor                           |
| 5 - 9       | Medium   | Develop mitigation plan                      |
| 10 - 15     | High     | Active mitigation required, escalate to lead |
| 16 - 25     | Critical | Immediate action, escalate to stakeholders   |

## Mitigation Strategies

For each identified risk, apply one of the following strategies:

| Strategy      | Description                                          | When to Use                          |
|---------------|------------------------------------------------------|--------------------------------------|
| **Avoid**     | Eliminate the risk by changing approach               | High probability, high impact        |
| **Mitigate**  | Reduce probability or impact through specific actions | Medium-high risks with clear actions |
| **Transfer**  | Shift risk to a third party (e.g., use managed service)| External dependency risks           |
| **Accept**    | Acknowledge and monitor without active intervention   | Low severity risks                   |

### Mitigation Plan Template

For each medium-or-higher risk, document:

1. **Risk ID:** Unique identifier (e.g., `R-001`).
2. **Description:** What could go wrong.
3. **Trigger:** How we will know the risk is materializing.
4. **Mitigation Actions:** Specific steps to reduce probability or impact.
5. **Contingency Plan:** What we will do if the risk occurs despite mitigation.
6. **Owner:** Team member responsible for monitoring this risk.

## Monitoring Process

### Ongoing Monitoring

- **Weekly Risk Review:** Review the risk register during team meetings.
- **Sprint Retrospective:** Assess whether any new risks emerged during the sprint.
- **Automated Alerts:** Use GitHub Dependabot for dependency vulnerability monitoring.
- **CI Pipeline:** Automated tests catch regressions and quality risks early.

### Risk Register Updates

The risk register (below) is a living document. Update it when:
- A new risk is identified.
- A risk's probability or impact changes.
- A mitigation action is completed.
- A risk is resolved or accepted.

### Escalation Path

1. **Risk Owner** monitors and mitigates assigned risks.
2. **Team Lead** reviews high-severity risks weekly.
3. **Stakeholders** are notified of critical risks immediately.

## Risk Register

| ID    | Risk Description                          | Category  | Prob | Impact | Score | Severity | Strategy | Mitigation                                    | Owner       | Status |
|-------|-------------------------------------------|-----------|------|--------|-------|----------|----------|-----------------------------------------------|-------------|--------|
| R-001 | Canvas API performance on low-end devices | Technical | 3    | 4      | 12    | High     | Mitigate | Implement frame rate throttling and LOD system| Dev Lead    | Open   |
| R-002 | Scope creep from additional pet features  | Scope     | 4    | 3      | 12    | High     | Avoid    | Define MVP scope in project proposal; defer non-essential features to backlog | PM | Open   |
| R-003 | Key team member unavailable mid-sprint    | Resource  | 2    | 4      | 8     | Medium   | Mitigate | Cross-train team members; document all decisions | Team Lead | Open   |
| R-004 | Third-party asset licensing issues        | External  | 2    | 3      | 6     | Medium   | Avoid    | Use only MIT/CC0-licensed assets; verify before integration | Dev Lead | Open   |
| R-005 | Browser compatibility issues with Canvas  | Technical | 3    | 3      | 9     | Medium   | Mitigate | Test on Chrome, Firefox, Safari, Edge; add polyfills as needed | QA Lead | Open   |
| R-006 | CI pipeline becomes slow as tests grow    | Technical | 3    | 2      | 6     | Medium   | Mitigate | Parallelize test suites; cache dependencies   | DevOps      | Open   |
| R-007 | Data loss if local storage is cleared     | Technical | 2    | 2      | 4     | Low      | Accept   | Document limitation; consider cloud save in v2 | Dev Lead   | Open   |
