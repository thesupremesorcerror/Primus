# Primus — Autonomous AIOps Incident-Response Platform

An AI-powered platform that detects infrastructure incidents, investigates them using an
autonomous tool-calling agent, retrieves relevant knowledge via adaptive RAG, proposes
risk-scored remediation actions, and executes low-risk fixes automatically while routing
high-risk actions through human approval.

## Architecture

- **backend/** — Spring Boot (Java 25) service: incident lifecycle, JWT auth, policy engine,
  tool gateway, Gemini-powered diagnosis/agent loop, RAG, incident memory
- **frontend/** — React + TypeScript (Vite) dashboard: login, incident list, live investigation,
  remediation candidate review and approval

## Core flow

Detect → Diagnose (LLM + adaptive RAG) → Investigate (tool-calling agent: metrics, logs,
runbooks, incident memory) → Propose remediation candidates with risk/recovery scores →
Auto-execute low-risk actions or route high-risk actions to human approval → Verify recovery →
Store as incident memory for future retrieval

## Tech stack

Java 25, Spring Boot 4, PostgreSQL, Flyway, Google Gemini (function-calling), React, TypeScript,
JWT auth, Vite

## Running locally

**Backend:** requires PostgreSQL and a `GEMINI_API_KEY` environment variable.