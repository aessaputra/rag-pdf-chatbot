## Problem Statement

The authentication page (`frontend/src/app/login/page.tsx`) currently handles both "Login" and "Register" functionalities in a single file and route. This violates Clean Code principles:
1. **Meaningful Names**: A route named `/login` that also handles registration is misleading.
2. **Single Responsibility Principle (SRP)**: A single page is handling two distinct authentication intents.
3. **God Component**: The file spans almost 180 lines, mixing UI presentation, state management, API interactions, and routing logic.

## Solution

We will separate the Login and Register routes and completely decouple the business logic from the presentation layer. We will utilize a shared layout for the `(auth)` group to eliminate UI duplication (backgrounds, theme toggles) and create dedicated pages for each responsibility.

## User Stories

1. As a user, I want distinct URLs for logging in (`/login`) and registering (`/register`) so that the navigation is intuitive and standard.
2. As a developer, I want the authentication API logic separated from the UI presentation, so that I can easily maintain or modify how we authenticate.
3. As a developer, I want complex, deeply nested UI elements extracted into their own modular components, so that they can be tested and reused independently.

## Implementation Decisions

- **Route Separation & Grouping**: 
  - Create `(auth)/login/page.tsx` handling ONLY sign-in.
  - Create `(auth)/register/page.tsx` handling ONLY sign-up.
- **Shared Layout**:
  - Create `(auth)/layout.tsx` to handle the centralized card layout, background effects, and Theme Toggle, removing this boilerplate from the pages.
- **Custom Hook (`useAuth`)**: Create a hook that handles the Supabase API calls.
- **UI Components Breakdown**: 
  - `frontend/src/components/auth/AuthHeader.tsx`: Handles the title and the navigation link to the alternative page (e.g., "Belum punya akun? Daftar").
  - `frontend/src/components/auth/AuthForm.tsx`: Handles the input fields and submit button.
  - `frontend/src/components/auth/AuthError.tsx`: Handles the rendering of the error alert.

## Testing Decisions

- **Seams**: The primary seam for testing is navigating between `/login` and `/register`, and submitting the form.
- **Execution**: Manual QA of:
  - Navigating to `/login` and checking the UI.
  - Navigating to `/register` and checking the UI.
  - Submitting empty or invalid forms to check error states.
  - Submitting valid credentials and verifying the successful redirect to `/`.

## Out of Scope

- Modifying the backend authentication logic or JWT parsing.
- Refactoring `middleware.ts`.
