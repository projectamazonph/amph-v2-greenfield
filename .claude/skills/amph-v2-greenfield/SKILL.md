```markdown
# amph-v2-greenfield Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `amph-v2-greenfield` TypeScript codebase. You will learn about file naming, import/export styles, commit message conventions, and how to structure and run tests. This guide is intended to help contributors maintain consistency and quality in the project.

## Coding Conventions

### File Naming
- All files use **kebab-case**.
- Example:  
  ```
  user-profile.ts
  order-service.test.ts
  ```

### Import Style
- Use **relative imports** for referencing modules.
- Example:
  ```typescript
  import { fetchUser } from './user-service';
  import { calculateTotal } from '../utils/math';
  ```

### Export Style
- Use **named exports** exclusively.
- Example:
  ```typescript
  // In user-service.ts
  export function fetchUser(id: string) { ... }
  export const USER_ROLE = 'admin';

  // Importing
  import { fetchUser, USER_ROLE } from './user-service';
  ```

### Commit Message Conventions
- Use **Conventional Commits** format.
- Prefixes observed: `docs`
- Example:
  ```
  docs: update README with setup instructions
  ```

## Workflows

### Documentation Updates
**Trigger:** When updating or adding documentation files.
**Command:** `/update-docs`

1. Edit or add documentation files as needed.
2. Use a conventional commit message with the `docs` prefix.
   ```
   docs: add API usage examples to README
   ```
3. Push your changes and open a pull request if required.

## Testing Patterns

- Test files follow the pattern: `*.test.*`
  - Example: `user-service.test.ts`
- The testing framework is **unknown**, so check existing test files for structure and assertions.
- To add a test:
  1. Create a new file following the naming pattern.
  2. Use named exports for test utilities if needed.
  3. Place tests alongside the module they test or in a dedicated `tests/` directory, as per project structure.

## Commands
| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /update-docs   | Standardize documentation update workflow    |

```