# Ralph Guardrails (Signs)

> Lessons learned from past failures. **READ THESE BEFORE ACTING.**

## Core Signs

### Sign: Read Before Writing
- **Trigger**: Before modifying any file
- **Instruction**: Always read the existing file first to understand current implementation
- **Added after**: Core principle

### Sign: Test After Changes
- **Trigger**: After any code change
- **Instruction**: Run `npm run build` to verify nothing broke
- **Added after**: Core principle

### Sign: Commit Checkpoints
- **Trigger**: Before risky changes
- **Instruction**: Commit current working state first
- **Added after**: Core principle

### Sign: One Story At A Time
- **Trigger**: Starting work
- **Instruction**: Complete ONE story fully before moving to the next. Don't half-implement multiple things.
- **Added after**: Core principle

---

## Project-Specific Signs (Sourcify)

### Sign: HTS Code Formatting
- **Trigger**: Displaying HTS codes to users
- **Instruction**: Always use `formatHtsCode()` from `src/utils/htsFormatting.ts`. Codes are stored WITHOUT dots but displayed WITH dots.
- **Added after**: Initial setup - HTS display inconsistency

### Sign: Use V10 Classification Engine
- **Trigger**: Working with classification
- **Instruction**: There are multiple versions (V4-V10). ALWAYS use V10: `classificationEngineV10.ts`, `/api/classify-v10`, `ClassificationV10.tsx`
- **Added after**: Initial setup - Multiple engine versions exist

### Sign: Country Codes Are ISO Alpha-2
- **Trigger**: Working with country data
- **Instruction**: Use 2-letter codes (CN, VN, MX) not names. CountryTariffProfile model has full data.
- **Added after**: Initial setup - Country code format

### Sign: Prisma Client Location
- **Trigger**: Accessing database
- **Instruction**: Import from `src/lib/db.ts` NOT directly from @prisma/client
- **Added after**: Initial setup - Prisma singleton pattern

### Sign: Auth Session Access
- **Trigger**: Getting current user
- **Instruction**: Use `useSession()` from `src/lib/auth-client.ts` in client components
- **Added after**: Initial setup - Better Auth pattern

### Sign: Large Files Fill Context
- **Trigger**: Reading codebase files
- **Instruction**: Don't read files > 500 lines unless necessary. Read only the sections you need.
- **Added after**: Iteration loops - Context filled before implementing

---

## Learned Signs

(New signs will be added here as failures occur)

