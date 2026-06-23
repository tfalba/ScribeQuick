@AGENTS.md
# ScribeQuick — CLAUDE.md

## What This Is
ScribeQuick is a React Native mobile app (Expo + TypeScript) that converts 
rough home health visit notes into structured SOAP notes using the OpenAI API. 
It is a portfolio project built to demonstrate React Native engineering skills 
in a clinical context.

## Project Owner
Tracy Falba — full-stack product engineer, health economics PhD. This project 
is intentionally scoped to mirror real clinical documentation workflows used in 
home health agencies (the kind served by companies like Olli Health).

## Current MVP Scope
- Free-text visit note input
- OpenAI-generated SOAP note (Subjective, Objective, Assessment, Plan)
- ICD-10 code suggestions alongside the note
- Copy full note to clipboard
- Save note history locally with AsyncStorage
- Note history home screen (most recent first)

## Planned Future Features
### Voice Input
Allow clinicians to speak rough notes instead of typing. Use Expo's 
expo-av or expo-speech. Transcription via OpenAI Whisper API. Priority: High.

### EHR Export Simulation
Generate a mock HL7 or FHIR-formatted output from the SOAP note. This is 
a simulation only — no real EHR connection. Useful for demonstrating 
understanding of healthcare data standards. Priority: Medium.

### Dark Mode + Accessibility
Full dark mode support via Appearance API. Accessible font sizes, sufficient 
color contrast (WCAG AA minimum), and screen reader labels on all interactive 
elements. Priority: Medium.

## Tech Stack
- Expo (latest) + Expo Router (file-based navigation)
- React Native + TypeScript (strict mode)
- AsyncStorage for local persistence
- Axios for HTTP
- expo-clipboard for copy functionality
- OpenAI API — gpt-4o-mini for SOAP generation, Whisper for voice (future)

## Key Files
- `services/openai.ts` — all OpenAI logic lives here, nowhere else
- `services/storage.ts` — all AsyncStorage logic lives here, nowhere else
- `constants/theme.ts` — single source of truth for colors, spacing, font sizes
- `.env` — contains EXPO_PUBLIC_OPENAI_API_KEY (never commit this)

## Coding Conventions
- Functional components only, no class components
- All API calls wrapped in try/catch with inline error states (no alert())
- JSON responses from OpenAI must be validated before rendering
- StyleSheet for all styling — no inline styles, no third-party UI libraries
- Keep components small and single-purpose

## Clinical Context
SOAP note format:
- **Subjective** — what the patient reports (symptoms, complaints, history)
- **Objective** — measurable findings (vitals, observations, test results)
- **Assessment** — clinical interpretation / working diagnosis
- **Plan** — next steps, treatments, follow-up instructions

ICD-10 codes are the standard diagnostic coding system used in US healthcare 
billing and documentation. Home health agencies are required to submit accurate 
ICD-10 codes for Medicare/Medicaid reimbursement.

## What NOT to Build
- No authentication or user accounts
- No real EHR connections
- No backend server — all API calls go directly from the app to OpenAI
- No third-party component libraries