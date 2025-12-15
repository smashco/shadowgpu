# Client User Journey: "White Glove" Audit Service

This document outlines the workflow where **We (The Consultants)** do the heavy lifting for the client. All the client does is install the probe.

## Phase 1: Onboarding (Day 1)
**Goal:** Get the agent installed with zero friction.

1.  **Kickoff Call**: We meet the client and explain the goal (10% savings or free).
2.  **The "One-Liner"**: We send them a single installation command (or a script) via Slack/Email.
    ```bash
    helm install shadow-agent oci://registry.shadowgpu.com/agent --set apiKey=CLIENT_SPECIFIC_KEY
    ```
3.  **Installation**: The client runs this command.
    *   *Alternative:* We ask for temporary `kubectl` access and run it ourselves.

## Phase 2: Internal Analysis (Day 1-2)
**Goal:** We watch their data flow into OUR internal dashboard.

-   **Data Flow**: The agent sends metrics to the Shadow Dashboard (running on our infrastructure).
-   **Monitoring**:
    -   *We* log in to `admin.shadowgpu.com` (The Next.js App we built).
    -   We see "Client A" usage patterns.
    -   We spot the idle GPUs and inefficient jobs using the "Recommendations" view.

## Phase 3: The Report (Day 3)
**Goal:** Deliver the "Paper" Report.

1.  **Export**: We look at the Dashboard Recommendations.
2.  **Drafting**: We open the **Audit Report Template** (`docs/Audit_Report_Template.md`).
3.  **Fill & Polish**:
    -   We copy the charts/stats from the Dashboard into the document.
    -   We add expert commentary (e.g., "We noticed you're using A100s for inference, switching to T4s saves $800.").
4.  **Delivery**: We send the final PDF to the client.

## Phase 4: Remediation (The Upsell)
**Goal:** Get paid to fix it.

-   **Client Reaction**: "Wow, we are wasting $5k/month. How do we fix it?"
-   **Our Move**:
    -   "Here is the runbook (commands) to fix it yourself."
    -   **OR**: "For a flat fee, we will apply these fixes for you using our automation tools."

---
**Key Distinction**: The Client NEVER sees the raw Dashboard. They only see the polished PDF Report we send them. The Dashboard is *your* superpower tool.
