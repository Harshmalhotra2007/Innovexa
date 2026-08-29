# Innovexa Ops Console Testing Strategy

## Overview
This document outlines the testing strategy for the Innovexa Ops Console, an AI-powered meeting intelligence platform. The strategy covers unit testing, integration testing, and end-to-end testing to ensure code quality, reliability, and maintainability.

## Testing Philosophy
- **Test Early, Test Often**: Implement tests alongside feature development
- **Test What Matters**: Focus on critical user flows and business logic
- **Maintainable Tests**: Write clear, focused tests that are easy to understand and update
- **Fast Feedback**: Prioritize quick-running unit tests while maintaining comprehensive coverage

## Test Categories

### 1. Unit Tests
Test individual functions, components, and utilities in isolation.

**Scope**:
- Utility functions (`src/lib/` directory)
- Custom hooks (`src/hooks/` directory)
- Component helpers and pure functions
- AI extraction logic
- Date/time utilities
- String manipulation functions

**Tools**:
- Jest (already configured)
- React Testing Library for component unit tests
- Mocking for external dependencies

**Examples**:
- `ai-engine.ts`: Test transcript processing with various inputs
- `ai-agent-engine.ts`: Test agent state transitions
- `config.ts`: Test configuration loading and validation
- Custom hooks: Test state changes and side effects

### 2. Integration Tests
Test interactions between components, services, and APIs.

**Scope**:
- API route handlers (`src/app/api/` directory)
- Database interactions with Prisma
- Service layer interactions
- Authentication and authorization flows
- WebSocket/LiveKit integrations (mocked)

**Tools**:
- Jest with Supertest for API testing
- Prisma mocking or test database
- MSW (Mock Service Worker) for API mocking

**Examples**:
- Meeting creation API endpoint
- AI agent triggering and status updates
- Task SLA monitoring and escalation
- Notification creation and retrieval
- Analytics data aggregation

### 3. End-to-End (E2E) Tests
Test complete user flows from UI to database.

**Scope**:
- Critical user journeys:
  1. Meeting scheduling and hosting
  2. AI agent dispatch and meeting participation
  3. Transcription processing and action item extraction
  4. Task management and SLA tracking
  5. Decision audit trail and knowledge base search
  6. Analytics dashboard viewing

**Tools**:
- Playwright or Cypress (choose one for consistency)
- Test data seeding and cleanup
- Environment-specific configuration

**Examples**:
- Schedule a meeting → Host meeting → AI agent joins → Verify transcription → Check action items appear in task board
- Create meeting with specific transcript → Verify decision extraction → Check decisions page
- Overdue task → Wait for SLA escalation → Verify notification created

## Testing Guidelines

### Code Coverage Targets
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 85%+
- **Lines**: 80%+

### Test Organization
- Place tests alongside source files using `.test.ts` or `.test.tsx` extension
- For complex components, create dedicated test directories
- Use descriptive test names following the pattern: `should [expected behavior] when [condition]`

### Mocking Strategy
- Mock external APIs (OpenAI, LiveKit, Resend, etc.)
- Mock database operations for unit tests
- Use real Prisma client with test database for integration tests
- Mock browser APIs (localStorage, sessionStorage) where needed

### Test Data Management
- Use factories or builders for test data creation
- Clean up test data after each test
- Use transactions or test database isolation where possible
- Seed essential reference data (departments, roles) for integration tests

### Continuous Integration
- Run unit tests on every pull request
- Run integration tests on staging branch
- Run E2E tests on main branch or before deployment
- Fail builds on test failures
- Generate and publish test coverage reports

## Specific Test Cases by Module

### AI Engine (`src/lib/ai-engine.ts`)
- Test transcript parsing with various formats
- Test decision extraction heuristics
- Test action item detection and owner assignment
- Test priority and deadline estimation
- Test LLM fallback mechanism
- Test edge cases (empty transcripts, malformed input)

### AI Agent Engine (`src/lib/ai-agent-engine.ts`)
- Test agent state transitions
- Test idempotency protection
- Test circuit breaker integration
- Test error handling and recovery
- Test meeting URL extraction logic

### Database Layer (`src/lib/db.ts`)
- Test Prisma client singleton pattern
- Test connection handling in different environments

### Configuration (`src/lib/config.ts`)
- Test environment variable loading
- Test validation of required variables
- Test default value application
- Test feature flag calculations

### Components
#### AIAgentPanel (`src/components/AIAgentPanel.tsx`)
- Test status display and transitions
- Test tab switching functionality
- Test task filtering and status updates
- Test local recording controls
- Test AI agent dispatch and meeting controls

#### Navigation (`src/components/Navigation.tsx`)
- Test notification fetching and display
- Test mark as read functionality
- Test role-based UI rendering
- Test audit trigger functionality

#### LiveKitRoom (`src/components/LiveKitRoom.tsx`)
- Test WebRTC connection states
- Test media controls integration
- Test transcript display
- Test recording controls

### API Routes
#### Meetings (`src/app/api/meetings/route.ts`)
- Test meeting creation with validation
- Test meeting retrieval with filtering
- Test meeting updates and deletions
- Test transcript processing integration

#### AI Agent (`src/app/api/ai-agent/`)
- Test join/leave endpoints
- Test role-based access control
- Test error handling

#### Tasks (`src/app/api/tasks/`)
- Test CRUD operations
- Test SLA monitoring triggers
- Test assignment and status updates

#### Analytics (`src/app/api/analytics/`)
- Test data aggregation accuracy
- Test department-based filtering
- Test trend calculations

## Test Environment Setup

### Test Database
- Use a separate test database or schema
- Run migrations before test suite
- Use transactions for test isolation where supported
- Clear data between tests

### Environment Variables
- Create `.env.test` file with test-specific values
- Use mock values for external services
- Set NODE_ENV=test for test-specific behavior

### CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: Tests

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x]
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm test -- --coverage
      - name: Run integration tests
        run: npm run test:integration
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/*.json
          flags: unittests
          name: codecov-umbrella
          fail-ci-if-error: true
```

## Maintenance Guidelines

### Test Reviews
- Include test review in code review process
- Ensure new features come with adequate test coverage
- Remove or update tests when features are deprecated
- Watch for brittle tests that need refactoring

### Test Performance
- Keep unit tests fast (<1ms per test ideal)
- Use mocking to avoid slow operations
- Parallelize test execution where possible
- Monitor test suite execution time

### Documentation
- Keep this strategy document updated
- Document test setup instructions in README
- Add comments to complex test cases explaining intent
- Maintain examples of good test patterns

## Tools and Dependencies

### Dev Dependencies
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "@types/jest": "^29.0.0",
    "msw": "^1.0.0",
    "supertest": "^6.0.0",
    "playwright": "^1.0.0" // or cypress
  }
}
```

### Setup Commands
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest ts-jest jest-environment-jsdom @types/jest msw supertest playwright

# Add test scripts to package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test"
  }
}
```

## Conclusion
This testing strategy provides a comprehensive approach to ensuring the quality and reliability of the Innovexa Ops Console. By implementing tests at multiple levels and maintaining strict coverage standards, we can confidently refactor, extend, and maintain the codebase while preventing regressions.

Start by implementing unit tests for the most critical utility functions and gradually expand test coverage across the codebase. Regularly review and update tests to ensure they remain valuable and effective.