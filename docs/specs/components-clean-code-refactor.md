# Spec: Components Clean Code Refactor

## Problem Statement

The React component structure under the `components/` directory is cluttered. While some domain folders exist (`auth/`, `chat/`, `document-manager/`, `settings/`), many domain-specific files (such as `ChatWindow`, `Sidebar`, `ThemeToggle`, `DocumentManagerModal`) reside at the root level of `components/`. This violates Clean Code and Screaming Architecture principles which dictate that files should be grouped by feature/domain. Furthermore, an unused `DocumentManager` component exists, adding needless complexity (dead code).

## Solution

Reorganize the `components/` folder by moving feature-specific components into their respective domain directories (`chat/`, `document-manager/`, `layout/`, `theme/`). Delete any unused components. Update all dependent import statements across the application to reflect the new structure.

## User Stories

1. As a developer, I want to find chat-related components inside the `chat/` directory, so that I don't have to search through a cluttered root folder.
2. As a developer, I want to find layout-related components (like `Sidebar`) inside the `layout/` directory, so that the application skeleton is logically isolated.
3. As a developer, I want to find theme-related components inside the `theme/` directory, so that design configuration logic is encapsulated.
4. As a developer, I want dead code to be removed from the codebase, so that the repository remains lean and maintainable.
5. As a developer, I want the build process to verify that all component paths are correctly linked, so that refactoring does not break the application.

## Implementation Decisions

- **Domain: Chat (`components/chat/`)**: The `ChatMessageItem`, `ChatWindow`, and `CitationPanel` components will be moved here since they are tightly coupled with the chat interface.
- **Domain: Document Manager (`components/document-manager/`)**: The `DocumentManagerModal` will be moved here to join its subcomponents.
- **Domain: Layout (`components/layout/`)**: A new directory will be created to house the `Sidebar` component.
- **Domain: Theme (`components/theme/`)**: A new directory will be created to house `ThemeProvider` and `ThemeToggle`.
- **Dead Code**: The `DocumentManager` component is verified as unused (it has been replaced by the modal version) and will be deleted.
- **Imports Management**: All consumer files (e.g., `app/layout.tsx`, `app/(main)/page.tsx`, `app/(auth)/layout.tsx`) and internal component dependencies will have their relative/absolute import paths updated to match the new locations.

## Testing Decisions

- This is a pure structural refactor with no changes to business logic or component behavior.
- **Verification Method**: Testing will rely on the TypeScript compiler. Running `npm run build` will verify that all module imports resolve correctly and type checks pass.
- No new logical seams are introduced.

## Out of Scope

- Refactoring the internal state or logic of any component.
- Changing component names, prop interfaces, or component rendering logic.
- Extracting new sub-components.

## Further Notes

- This refactor aligns with the `/clean-code` skill's emphasis on maintainability, specifically the step-down rule and minimizing cognitive load by ensuring that the folder structure "screams" its architecture.
