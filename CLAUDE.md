# Claude Code Configuration - SyncEngine TDD Environment

## 🚨 CRITICAL: TEST-DRIVEN DEVELOPMENT (TDD) MANDATORY

**ABSOLUTE TDD RULES**:
1. **TESTS FIRST, ALWAYS** - Write tests before implementation code
2. **RED-GREEN-REFACTOR** - Follow the TDD cycle strictly
3. **NO CODE WITHOUT TESTS** - Every feature, bug fix, and refactor requires tests
4. **COMPREHENSIVE COVERAGE** - Aim for 90%+ test coverage minimum
5. **ALL operations MUST be concurrent/parallel in a single message**
6. **NEVER save working files, text/mds and tests to the root folder**

### 🧪 TDD Workflow (MANDATORY)

**Every development task MUST follow this cycle:**

1. **RED Phase** - Write failing test first
   ```javascript
   // ✅ CORRECT: Test defines behavior BEFORE implementation
   [Single Message]:
     Write "tests/feature.test.js" // Failing test
     Bash "npm test -- feature.test.js" // Verify it fails
     TodoWrite { todos: ["Write failing test", "Implement feature", "Refactor"] }
   ```

2. **GREEN Phase** - Minimal code to pass test
   ```javascript
   // ✅ CORRECT: Implement just enough to pass
   [Single Message]:
     Write "src/feature.js" // Minimal implementation
     Bash "npm test -- feature.test.js" // Verify it passes
   ```

3. **REFACTOR Phase** - Clean up while tests pass
   ```javascript
   // ✅ CORRECT: Improve code quality
   [Single Message]:
     Edit "src/feature.js" // Refactor
     Bash "npm test" // Verify all tests still pass
   ```

### ⚡ GOLDEN RULE: "TEST FIRST, ALWAYS IN PARALLEL"

**MANDATORY TDD PATTERNS:**
- **TodoWrite**: ALWAYS include test tasks FIRST (write test, run test, implement, refactor)
- **Task tool**: Spawn tdd-london-swarm agent for mock-driven development
- **File operations**: ALWAYS create test file BEFORE implementation file
- **Test execution**: ALWAYS run tests in parallel with implementation

### 🎯 TDD Agent Execution Pattern

```javascript
// ✅ CORRECT: TDD-focused agent workflow
[Single Message - TDD Swarm]:
  // Spawn TDD specialist agents concurrently
  Task("TDD Spec Agent", "Write comprehensive test specifications and test cases first", "tdd-london-swarm")
  Task("Implementation Agent", "Implement minimal code to pass tests only", "coder")
  Task("Refactor Agent", "Refactor while maintaining green tests", "reviewer")
  Task("Coverage Agent", "Verify 90%+ coverage and add missing tests", "tester")

  // Batch ALL TDD todos
  TodoWrite { todos: [
    {content: "Write failing unit tests", status: "in_progress", activeForm: "Writing failing unit tests"},
    {content: "Verify tests fail (RED)", status: "pending", activeForm: "Verifying tests fail"},
    {content: "Implement minimal code", status: "pending", activeForm: "Implementing minimal code"},
    {content: "Verify tests pass (GREEN)", status: "pending", activeForm: "Verifying tests pass"},
    {content: "Refactor code", status: "pending", activeForm: "Refactoring code"},
    {content: "Verify tests still pass", status: "pending", activeForm: "Verifying tests still pass"},
    {content: "Check test coverage", status: "pending", activeForm: "Checking test coverage"},
    {content: "Add integration tests", status: "pending", activeForm: "Adding integration tests"}
  ]}

  // Parallel file operations - TESTS FIRST
  Write "tests/unit/feature.test.js"
  Write "tests/integration/feature.integration.test.js"
  Bash "npm test -- --coverage"
```

### 📁 File Organization Rules (TDD-Focused)

**Test Directory Structure (MANDATORY):**
```
/tests
  /unit           - Unit tests (test individual functions/classes)
  /integration    - Integration tests (test component interactions)
  /e2e            - End-to-end tests (test full user flows)
  /fixtures       - Test data and mocks
  /helpers        - Test utilities
```

**Implementation Directory Structure:**
```
/src            - Source code files
/docs           - Documentation and markdown files
/config         - Configuration files
/scripts        - Utility scripts
/examples       - Example code
```

## 🚀 SPARC TDD Workflow

### Core TDD Commands
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npm run test` - Run all tests
- `npm run test:watch` - Watch mode for TDD
- `npm run test:coverage` - Coverage reports
- `npm run test:unit` - Unit tests only
- `npm run test:integration` - Integration tests only
- `npm run test:e2e` - E2E tests only

### SPARC TDD Phases

1. **Specification** - Write test specifications first
   ```bash
   npx claude-flow sparc run spec-pseudocode "Define test cases for <feature>"
   ```

2. **Pseudocode** - Design test algorithms
   ```bash
   # Tests define the algorithm behavior
   ```

3. **Architecture** - Design testable architecture
   ```bash
   npx claude-flow sparc run architect "Design testable components"
   ```

4. **Refinement** - TDD RED-GREEN-REFACTOR cycle
   ```bash
   npx claude-flow sparc tdd "<feature>"
   ```

5. **Completion** - Integration tests pass
   ```bash
   npx claude-flow sparc run integration "Verify all tests pass"
   ```

## 🧪 Test Quality Standards

### MANDATORY Test Requirements:

1. **Unit Tests**
   - Test individual functions in isolation
   - Use mocks for dependencies
   - 100% coverage of business logic
   - Fast execution (<100ms per test)

2. **Integration Tests**
   - Test component interactions
   - Use test databases/APIs
   - Cover critical user paths
   - Reasonable execution time (<5s per test)

3. **E2E Tests**
   - Test complete user workflows
   - Use Playwright/Cypress
   - Cover happy paths + edge cases
   - Acceptable execution time (<30s per test)

4. **Test Structure** (AAA Pattern)
   ```javascript
   test('feature does something', () => {
     // Arrange - Set up test data and mocks
     const input = { /* test data */ };

     // Act - Execute the code under test
     const result = featureFunction(input);

     // Assert - Verify expected behavior
     expect(result).toBe(expected);
   });
   ```

## 🎯 TDD Best Practices

### ✅ DO:
- Write tests BEFORE implementation
- Keep tests simple and focused
- Test behavior, not implementation
- Use descriptive test names
- Mock external dependencies
- Run tests frequently
- Maintain test independence
- Refactor tests like production code

### ❌ DON'T:
- Write implementation before tests
- Test implementation details
- Create interdependent tests
- Skip the RED phase
- Commit code with failing tests
- Ignore test coverage reports
- Write tests after implementation
- Leave commented-out tests

## 🚀 Available TDD-Focused Agents

### Primary TDD Agents
- `tdd-london-swarm` - London School TDD specialist (mock-driven)
- `tester` - Comprehensive test creation
- `production-validator` - Production readiness verification

### Supporting Agents
- `coder` - Implementation following TDD
- `reviewer` - Code review with test focus
- `code-analyzer` - Test coverage analysis
- `system-architect` - Testable architecture design

## 🎯 Claude Code TDD Execution Flow

### The TDD Pattern:

```javascript
// Step 1: Initialize TDD swarm (optional coordination)
[Single Message - Optional Setup]:
  mcp__claude-flow__swarm_init { topology: "hierarchical", maxAgents: 4 }

// Step 2: Execute TDD workflow concurrently
[Single Message - Parallel TDD Execution]:
  // All TDD agents spawned together
  Task("Test Spec Writer", `
    Write comprehensive test specifications for <feature>.
    Include unit tests, integration tests, and edge cases.
    Follow AAA pattern (Arrange, Act, Assert).
    Use hooks: npx claude-flow@alpha hooks pre-task
  `, "tdd-london-swarm")

  Task("Implementation Developer", `
    Wait for failing tests, then implement minimal code to pass.
    Do NOT over-engineer or add extra features.
    Use hooks: npx claude-flow@alpha hooks post-edit
  `, "coder")

  Task("Refactor Specialist", `
    Refactor code while keeping tests green.
    Improve readability and maintainability.
    Use hooks: npx claude-flow@alpha hooks post-task
  `, "reviewer")

  Task("Coverage Validator", `
    Verify 90%+ test coverage.
    Identify gaps and add missing tests.
    Generate coverage reports.
  `, "production-validator")

  // All todos in ONE call
  TodoWrite { todos: [
    {content: "Write test specifications", status: "in_progress", activeForm: "Writing test specifications"},
    {content: "Create failing unit tests", status: "pending", activeForm: "Creating failing unit tests"},
    {content: "Run tests - verify RED", status: "pending", activeForm: "Running tests - verifying RED"},
    {content: "Implement minimal code", status: "pending", activeForm: "Implementing minimal code"},
    {content: "Run tests - verify GREEN", status: "pending", activeForm: "Running tests - verifying GREEN"},
    {content: "Refactor implementation", status: "pending", activeForm: "Refactoring implementation"},
    {content: "Run tests - verify still GREEN", status: "pending", activeForm: "Running tests - verifying still GREEN"},
    {content: "Write integration tests", status: "pending", activeForm: "Writing integration tests"},
    {content: "Verify 90%+ coverage", status: "pending", activeForm: "Verifying 90%+ coverage"},
    {content: "Run full test suite", status: "pending", activeForm: "Running full test suite"}
  ]}

  // All file operations together - TESTS FIRST
  Bash "mkdir -p tests/{unit,integration,e2e,fixtures,helpers}"
  Write "tests/unit/feature.test.js"
  Write "tests/integration/feature.integration.test.js"
  Write "tests/fixtures/testData.js"
```

## 📋 TDD Coordination Protocol

### Every TDD Agent MUST:

**1️⃣ BEFORE Testing:**
```bash
npx claude-flow@alpha hooks pre-task --description "TDD: [feature]"
npx claude-flow@alpha hooks session-restore --session-id "tdd-[feature]"
```

**2️⃣ DURING Testing:**
```bash
# After writing each test
npx claude-flow@alpha hooks post-edit --file "tests/[test-file]" --memory-key "tdd/tests/[feature]"

# After implementation
npx claude-flow@alpha hooks post-edit --file "src/[impl-file]" --memory-key "tdd/impl/[feature]"

# After running tests
npx claude-flow@alpha hooks notify --message "Tests: [status]"
```

**3️⃣ AFTER TDD Cycle:**
```bash
npx claude-flow@alpha hooks post-task --task-id "tdd-[feature]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 TDD Example: Full Feature Implementation

### Example: Add User Authentication

```javascript
// Single message - Complete TDD workflow
[Parallel TDD Execution]:

  // 1. Spawn all TDD agents concurrently
  Task("Auth Test Spec", `
    Create comprehensive test suite for user authentication:
    - Unit tests for password hashing
    - Unit tests for token generation
    - Integration tests for login flow
    - Integration tests for session management
    - E2E tests for complete auth workflow

    Write tests that FAIL first (RED phase).
    Use mocks for external dependencies.
    Hooks: npx claude-flow@alpha hooks pre-task --description "Auth TDD"
  `, "tdd-london-swarm")

  Task("Auth Implementation", `
    Implement MINIMAL code to pass failing tests:
    - Wait for RED tests
    - Implement password hashing (bcrypt)
    - Implement JWT token generation
    - Implement login endpoint
    - Implement session middleware

    Do NOT add extra features.
    Hooks: npx claude-flow@alpha hooks post-edit --file "src/auth/*"
  `, "coder")

  Task("Auth Refactor", `
    Refactor authentication code while tests stay GREEN:
    - Extract reusable functions
    - Improve error handling
    - Add input validation
    - Optimize performance

    Run tests after each refactor.
    Hooks: npx claude-flow@alpha hooks post-task --task-id "auth-refactor"
  `, "reviewer")

  Task("Auth Coverage", `
    Verify comprehensive test coverage:
    - Check 90%+ code coverage
    - Add tests for edge cases
    - Add tests for error paths
    - Generate coverage report

    Hooks: npx claude-flow@alpha hooks notify --message "Coverage: [%]"
  `, "production-validator")

  // 2. Batch all todos
  TodoWrite { todos: [
    {content: "Write auth test specifications", status: "in_progress", activeForm: "Writing auth test specifications"},
    {content: "Create failing password hash tests", status: "pending", activeForm: "Creating failing password hash tests"},
    {content: "Create failing token tests", status: "pending", activeForm: "Creating failing token tests"},
    {content: "Create failing login tests", status: "pending", activeForm: "Creating failing login tests"},
    {content: "Run tests - verify all RED", status: "pending", activeForm: "Running tests - verifying all RED"},
    {content: "Implement password hashing", status: "pending", activeForm: "Implementing password hashing"},
    {content: "Implement token generation", status: "pending", activeForm: "Implementing token generation"},
    {content: "Implement login endpoint", status: "pending", activeForm: "Implementing login endpoint"},
    {content: "Run tests - verify all GREEN", status: "pending", activeForm: "Running tests - verifying all GREEN"},
    {content: "Refactor auth module", status: "pending", activeForm: "Refactoring auth module"},
    {content: "Verify tests still GREEN", status: "pending", activeForm: "Verifying tests still GREEN"},
    {content: "Add integration tests", status: "pending", activeForm: "Adding integration tests"},
    {content: "Add E2E auth flow tests", status: "pending", activeForm: "Adding E2E auth flow tests"},
    {content: "Generate coverage report", status: "pending", activeForm: "Generating coverage report"},
    {content: "Verify 90%+ coverage achieved", status: "pending", activeForm: "Verifying 90%+ coverage achieved"}
  ]}

  // 3. Create all test files FIRST
  Bash "mkdir -p tests/{unit/auth,integration/auth,e2e/auth,fixtures/auth}"
  Write "tests/unit/auth/passwordHash.test.js"
  Write "tests/unit/auth/tokenGeneration.test.js"
  Write "tests/integration/auth/login.test.js"
  Write "tests/integration/auth/session.test.js"
  Write "tests/e2e/auth/authFlow.test.js"
  Write "tests/fixtures/auth/testUsers.js"

  // 4. Run tests to verify RED
  Bash "npm test -- tests/unit/auth --coverage"
```

## 🚨 TDD Quality Gates

### MANDATORY Checks Before Committing:

```bash
# All must pass
npm run test              # All tests green
npm run test:coverage     # 90%+ coverage
npm run lint              # No lint errors
npm run typecheck         # No type errors
npm run build             # Build succeeds
```

### Pre-commit Hook (Recommended):

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test && npm run lint && npm run typecheck"
    }
  }
}
```

## Performance Benefits with TDD

- **Fewer bugs in production** - Catch issues early
- **Faster debugging** - Tests isolate problems
- **Better design** - Testable code is better code
- **Refactor confidence** - Tests prevent regressions
- **Living documentation** - Tests show how code works

## Code Style & Best Practices

- **Test-First Development**: Always write tests before implementation
- **Modular Design**: Small, testable units (<500 lines)
- **Mocking**: Isolate dependencies in tests
- **Coverage Goals**: 90%+ minimum, 100% for critical paths
- **Clean Tests**: Tests should be as clean as production code
- **Fast Tests**: Unit tests run in milliseconds
- **Independent Tests**: No test dependencies or shared state

## Support

- SPARC Documentation: https://github.com/ruvnet/claude-flow
- TDD Best Practices: https://martinfowler.com/bliki/TestDrivenDevelopment.html
- Testing Library: https://testing-library.com/

---

**Remember: TEST FIRST, CODE SECOND. NO EXCEPTIONS.**

## Important Instruction Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files unless explicitly requested
- Never save working files, text/mds and tests to the root folder
- **ALWAYS write tests BEFORE implementation code**
