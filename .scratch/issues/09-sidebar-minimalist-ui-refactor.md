---
title: Sidebar Minimalist UI Refactor
labels: [ready-for-agent]
---

## Problem Statement

The current `Sidebar` component in the RAG PDF Chatbot uses the `lucide-react` icon library and a fully-rounded (`rounded-full`) avatar for the user profile. According to the strict Premium Utilitarian Minimalism UI Architect protocol (`/minimalist-ui`), generic thin-line icon libraries like Lucide are banned, as are fully rounded pill shapes for primary UI components. This creates an inconsistent visual aesthetic that feels like a generic SaaS template rather than a premium, editorial, minimalist interface.

## Solution

Refactor the `Sidebar` to strictly adhere to the `/minimalist-ui` guidelines:
1. Migrate all `lucide-react` icons in the Sidebar to `@radix-ui/react-icons`.
2. Update the user profile avatar to use `rounded-md` instead of `rounded-full`, creating a sharper, more structural bento-box feel.
3. Ensure the `Sidebar` maintains its excellent accessibility standards (`/web-design-guidelines`) while updating the aesthetic layer.

## User Stories

1. As a user, I want to see crisp, technical, and slightly thicker icons in the sidebar, so that the application feels like a premium, utilitarian tool rather than a generic SaaS app.
2. As a user, I want the UI elements like my profile avatar to have subtle, sharp corners (`rounded-md`), so that the interface feels cohesive with a minimalist bento-grid aesthetic.
3. As a developer, I want to use `@radix-ui/react-icons` for the sidebar, so that I comply with the `/minimalist-ui` protocol and ensure a consistent stroke width and aesthetic across the UI.

## Implementation Decisions

- **Icon Library**: We will install `@radix-ui/react-icons` into the frontend package.
- **Module Modifications**:
  - `frontend/src/components/Sidebar.tsx` will be modified.
  - The following Lucide icons will be mapped to their Radix equivalents:
    - `FileText` -> `FileTextIcon`
    - `LogOut` -> `ExitIcon`
    - `MessageSquare` -> `ChatBubbleIcon`
    - `Plus` -> `PlusIcon`
    - `Settings` -> `GearIcon`
    - `Trash2` -> `TrashIcon`
- **Avatar Styling**: Change the avatar container classes from `rounded-full` to `rounded-md`.
- **Accessibility Constraints**: Preserve all `aria-label`, `aria-hidden="true"`, and `title` attributes on the replacement icons to maintain compliance with `/web-design-guidelines`.

## Testing Decisions

- **What makes a good test**: We are verifying visual rendering and dependency resolution. The test must ensure the app builds successfully with the new icon library and that no missing import errors occur.
- **Modules to test**: The build process for `frontend/src/components/Sidebar.tsx`.
- **Prior Art**: Since this is a UI aesthetic update, manual verification of the Next.js dev server rendering is required, alongside running `npm run lint` and `npm run build` in the frontend directory to ensure TypeScript compilation passes.

## Out of Scope

- Changing the color palette or typography of the Sidebar, as they already meet the `/minimalist-ui` constraints.
- Refactoring icons across the entire codebase. This spec focuses *only* on the `Sidebar` component for now, to ensure a scoped, safe iteration.

## Further Notes

- If Radix UI icons look too small compared to Lucide, we may need to adjust their standard sizes (e.g., from `w-3.5 h-3.5` to `w-4 h-4`) to ensure they fill the optical space properly. We will evaluate this during execution.
