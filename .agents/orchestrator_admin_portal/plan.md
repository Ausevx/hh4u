# Execution Plan: Healing Hands4U Web Admin Portal & Backend API

## Overview
This plan establishes the Dual-Track Project Pattern to develop the Web Admin Portal and Backend API, fulfilling all requirements (R1-R4) and satisfying all acceptance criteria with strict programmatic verification.

## Phase 0: Survey & Scope Mapping
- Dispatch 3 Explorers / Spec Miners in parallel:
  1. Explorer 1 (Backend & Data Layer): Inspect `/Users/aditya/workspace/hh4u`, `backend/.env`, existing database schemas, models, vector search setup, and MongoDB Atlas configuration.
  2. Spec Miner 2 (Excel Data & Ingestion): Inspect `database-dummy.xlsx`, examine the 3 sheets (`level1`, `ConsultationQueries`, `Answers`), row counts, column structures, schema mappings, and validation requirements.
  3. Explorer 3 (Frontend Admin Portal & Auth): Inspect existing frontend/web structure, tech stack (e.g. React/Next.js/Vite/Vue/HTML), auth conventions, dashboard UI requirements, table view, and bulk upload UX.
- Merge survey reports into `PROJECT.md` with full Architecture, Feature Inventory, Milestones, and Interface Contracts.

## Phase 1: Dual Track Launch
- **Track 1: E2E Testing Track**:
  - Independent E2E Testing Orchestrator.
  - Generates test harness, test runner, and test cases across Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner), Tier 3 (Cross-feature Combinations), Tier 4 (Real-world Scenarios).
  - Publishes `TEST_READY.md`.
- **Track 2: Implementation Track**:
  - Milestone M1: MongoDB Atlas Data Layer & Vector Search (Mongoose/PyMongo schemas, connection, Atlas Vector Search index, CRUD APIs).
  - Milestone M2: Excel Parser & Seed Script (multi-sheet parsing, validation, error handling, bulk upsert/seed).
  - Milestone M3: Admin Authentication & API Security (auth middleware, JWT/session or hardcoded MVP auth, route protection, 401 tests).
  - Milestone M4: Web Admin Portal UI & Bulk Import (dashboard, knowledge base tables, CRUD modals/forms, Excel upload with drag-and-drop).
  - Milestone M5: Final E2E Test Suite Pass (100% pass of Tiers 1-4) & Tier 5 Adversarial Coverage Hardening.

## Phase 2: Final Gate & Handoff
- Full acceptance criteria verification.
- Final forensic audit.
- Comprehensive handoff report to Sentinel.
