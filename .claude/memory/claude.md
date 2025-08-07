# 🧠 Surgical AI Agent Workflow

This document outlines a general collaboration model for AI agents following the **Surgical Team Model** — an efficient, role-based workflow for solving complex tasks with minimal agent roles and maximal clarity.

This pattern applies to a wide range of domains such as code generation, design, planning, analysis, documentation, and more.

---

## 🧩 Agent Roles Overview

| Agent | Role |
|-------|------|
| **Surgeon Agent** | Leads and owns the task. Designs the structure, writes specs, and produces core output. |
| **Copilot Agent** | Supports by implementing, extending, or detailing components based on guidance from the Surgeon. |
| **Reviewer Agent** | Reviews the outputs for correctness, consistency, and quality. |
| **Doc Agent** | Documents the final results for internal or external use. |

Each agent focuses on a specific stage in the problem-solving pipeline.

---

## 🔁 General Workflow Phases

### 1. Task Setup & Planning
- **Surgeon Agent** receives the overall goal.
- Breaks down the task into structured components.
- Writes plans, outlines, or specifications to guide execution.

### 2. Execution & Implementation
- **Copilot Agent** takes the specs or direction from the Surgeon.
- Produces the supporting work: implementations, expansions, details, or subtasks.
- Works within the structure provided.

### 3. Review & Validation
- **Reviewer Agent** inspects the combined outputs.
- Ensures quality, coherence, and alignment with intent.
- Suggests corrections or improvements.

### 4. Finalization & Documentation
- **Surgeon Agent** incorporates critical feedback.
- **Doc Agent** writes clear and complete documentation or summaries:
  - Descriptions of what was built
  - How it works
  - How to use or extend it

---

## 🔄 Agent Interaction Pattern

1. **Surgeon Agent**
   - Defines the task
   - Creates the plan or structure
   - May do initial execution of core parts

2. **Copilot Agent**
   - Builds on the Surgeon’s foundation
   - Fills in details, executes components, or supports subtasks

3. **Reviewer Agent**
   - Evaluates the full output
   - Flags inconsistencies or unclear sections

4. **Surgeon Agent**
   - Integrates critical feedback
   - Ensures the output is aligned with the original goals

5. **Doc Agent**
   - Documents the final version
   - Produces reusable, reference-ready materials

---

## 🧠 Design Principles

- **Role Separation**: Each agent focuses on a distinct phase of the task.
- **Clarity Through Specs**: Communication happens through explicit specs or intermediate artifacts.
- **Tight Feedback Loops**: Agents work in small cycles to iterate quickly.
- **Final Ownership**: The Surgeon is always responsible for the final quality and coherence.

---

## ✅ When to Trigger Each Agent

| Phase | Agent |
|-------|-------|
| Task Decomposition, Planning | `surgeon-agent` |
| Implementation, Detailing | `copilot-agent` |
| Quality Control | `reviewer-agent` |
| Documentation | `doc-agent` |

Agents are invoked only for their relevant phase, using the outputs of prior phases as input.

---

This workflow enables AI teams to solve complex tasks in a modular, structured, and high-quality way — without human micro-management or role confusion.
