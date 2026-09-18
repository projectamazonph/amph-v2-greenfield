# 🤖 Automation Workflows

This document describes the automation scripts and workflows available in AMPH v2 for managing repetitive tasks related to curriculum content, database seeding, validation, and visual enrichment.

## 📋 Overview

The AMPH v2 project includes several automation scripts that save time on repetitive tasks:

| Script                       | Purpose                   | Time Saved           |
| ---------------------------- | ------------------------- | -------------------- |
| `seed-orchestrator.ts`       | Unified database seeding  | 30-60 min per setup  |
| `apply-enrichment.ts`        | Visual content enrichment | 3-5 hrs per wave     |
| `audit-runner.ts`            | Unified validation        | 1-2 hrs weekly       |
| `validate-simulator-data.ts` | Simulator data validation | 30 min per change    |
| `Makefile`                   | Development workflows     | 20 min daily         |
| Husky hooks                  | Pre-commit validation     | 15-30 min per commit |

**Total estimated savings: 8-14 hours per week**

---

## 🚀 Quick Start

### Setup New Development Environment

```bash
# Complete setup (migrate + seed all data)
pnpm db:setup

# Or manually
pnpm prisma:migrate
pnpm db:seed

# Validate everything
pnpm audit
```

### Common Workflows

```bash
# Apply visual enrichment to lessons
pnpm enrich:apply --dry-run    # Preview changes
pnpm enrich:apply              # Apply changes

# Run all validations
pnpm audit

# Run specific validations
pnpm validate:curriculum
pnpm validate:lesson-production
pnpm validate:simulators

# Seed specific data
pnpm db:seed:tiers
pnpm db:seed:policies
pnpm db:seed:scenarios
```

---

## 📊 Database Seeding

### Seed Orchestrator

The unified seed orchestrator (`scripts/seed-orchestrator.ts`) runs all seed scripts in dependency order.

#### Usage

```bash
# Run all seeds in order
pnpm db:seed

# Dry run (show what would be done)
pnpm db:seed --dry-run

# Force re-seed all (continue on errors)
pnpm db:seed --force

# Run only specific seeds
pnpm db:seed --only tiers,policies

# Skip specific seeds
pnpm db:seed --skip admin

# Verbose output
pnpm db:seed --verbose
```

#### Seed Order

Seeds run in this order to respect dependencies:

1. **tiers** - Pricing tier definitions
2. **admin** - Admin user (optional)
3. **policies** - Simulator scoring policies
4. **scenarios** - Simulator scenario data
5. **resources** - Download center resources
6. **curriculum** - Courses, modules, lessons from MDX
7. **allContent** - Comprehensive content seed (alternative)

#### Individual Seed Commands

| Command                   | Description              |
| ------------------------- | ------------------------ |
| `pnpm db:seed:tiers`      | Seed pricing tiers       |
| `pnpm db:seed:admin`      | Create admin user        |
| `pnpm db:seed:policies`   | Seed simulator policies  |
| `pnpm db:seed:scenarios`  | Seed simulator scenarios |
| `pnpm db:seed:resources`  | Seed download resources  |
| `pnpm db:seed:curriculum` | Seed curriculum from MDX |

All seed scripts support `--dry-run` flag for preview.

---

## 🎨 Visual Enrichment

### Enrichment Pipeline

The visual enrichment pipeline (`scripts/apply-enrichment.ts`) applies visual blocks to MDX lesson files based on a YAML configuration.

#### Configuration

All enrichment rules are defined in `scripts/enrichment-config.yaml`:

```yaml
enrichment:
  default_insert_before: "## Your turn"
  default_insert_after: "## Key Takeaways"
  skip_if_contains:
    - 'id="decision-flow"'
    - 'id="formula-ladder"'

rules:
  - file: "content/curriculum/modules/1-foundations/1.1-*.mdx"
    insert: |
      :::decision-flow{id="read-before-change-flow" title="..."}
      {...}
      :::
    before: "## Your turn"
```

#### Usage

```bash
# Apply all enrichments
pnpm enrich:apply

# Preview changes without applying
pnpm enrich:apply --dry-run

# Force overwrite existing blocks
pnpm enrich:apply --force

# Filter by file pattern
pnpm enrich:apply --only "1-foundations/*"

# Verbose output
pnpm enrich:apply --verbose
```

#### Supported Actions

- **insert**: Add a new visual block
- **add_attribute**: Add an attribute to existing block
- **remove_block**: Remove a block by ID

#### Block Types

The following directive blocks are supported:

- `decision-flow` - Step-by-step decision workflows
- `formula-ladder` - Mathematical/calculation sequences
- `comparison-table` - Side-by-side comparisons
- `classification-board` - Categorization exercises
- `timeline-calendar` - Temporal workflows
- `hierarchy-builder` - Tree/hierarchy visualizations
- `funnel-canvas` - Funnel/flow diagrams
- `annotated-listing` - Listing annotations
- `competitive-gap-matrix` - Gap analysis matrices
- `insight-router` - Insight routing
- `lesson-pathway` - Lesson pathways
- `portfolio-map` - Portfolio mappings
- `seasonal-calendar` - Seasonal planning
- `evidence-ledger` - Evidence tracking
- `sov-positioner` - Share of voice positioning

---

## ✅ Validation

### Audit Runner

The unified audit runner (`scripts/audit-runner.ts`) executes all validation scripts and aggregates results.

#### Usage

```bash
# Run all validators
pnpm audit

# Strict mode (treat warnings as errors)
pnpm audit:strict

# Attempt auto-fixes
pnpm audit:fix

# Run specific validators only
pnpm audit --only curriculum-inventory,lesson-production

# Skip specific validators
pnpm audit --skip lint

# Verbose output
pnpm audit --verbose
```

#### Available Validators

| Validator              | Category       | Description                          | Fixable |
| ---------------------- | -------------- | ------------------------------------ | ------- |
| `curriculum-inventory` | curriculum     | Validates inventory.json against MDX | ❌      |
| `lesson-production`    | curriculum     | Validates lesson structure           | ❌      |
| `target-provenance`    | curriculum     | Validates target provenance          | ❌      |
| `deck-manifest`        | curriculum     | Validates teaching deck manifest     | ❌      |
| `simulator-policies`   | simulator      | Validates policy definitions         | ❌      |
| `simulator-scenarios`  | simulator      | Validates scenario definitions       | ❌      |
| `prisma-validate`      | infrastructure | Validates Prisma schema              | ❌      |
| `typecheck`            | infrastructure | TypeScript type checking             | ❌      |
| `lint`                 | infrastructure | ESLint validation                    | ✅      |
| `file-audit`           | content        | File structure audit                 | ❌      |
| `sentence-length`      | content        | Sentence length validation           | ❌      |
| `voice-audit`          | content        | Voice consistency audit              | ❌      |

### Simulator Data Validator

Validates simulator scenario and policy data consistency.

```bash
# Validate all simulator data
pnpm validate:simulators

# Validate only scenarios
pnpm validate:simulators --scenarios

# Validate only policies
pnpm validate:simulators --policies

# Strict mode
pnpm validate:simulators --strict

# Verbose output
pnpm validate:simulators --verbose
```

#### Validation Checks

- Policy weight sums must equal 1.0
- No negative or invalid weights
- Scenario IDs are unique
- Simulator IDs are valid
- Scenario/policy alignment
- Passing scores are in range (0-100)

---

## 🎛️ Makefile

The `Makefile` provides convenient shortcuts for common development tasks.

### Usage

```bash
# Show all available targets
make help

# Database operations
make db-setup      # Migrate + seed
make db-migrate    # Run migrations only
make db-seed       # Seed data only
make db-reset      # Reset + migrate + seed

# Validation
make validate          # Run all validations
make validate-strict  # Strict mode
make validate-curriculum
make validate-lessons
make validate-simulators

# Code quality
make lint         # Run linting
make lint-fix     # Lint with auto-fix
make format       # Format all files
make typecheck    # TypeScript type checking

# Testing
make test         # Run all tests
make test-unit    # Unit tests only
make test-e2e     # E2E tests only
make test-watch   # Watch mode

# Content
make enrich       # Apply visual enrichment
make enrich-dry   # Preview enrichment

# Cleanup
make clean        # Clean build artifacts
make clean-all    # Clean everything
```

### Common Workflows

```bash
# Setup new environment
make dev-setup

# Full build pipeline
make deploy-build

# Quick development start
make dev-quick
```

---

## 🔒 Git Hooks

### Pre-commit Hook

Runs automatically before each commit:

1. **lint-staged** - Lints and formats staged files
2. **curriculum validation** - Validates curriculum structure

To skip pre-commit hooks:

```bash
git commit --no-verify
```

### Pre-push Hook

Runs automatically before each push:

1. **curriculum-inventory validation**
2. **lesson-production validation**

To skip pre-push hooks:

```bash
git push --no-verify
```

### Managing Hooks

```bash
# Reinstall hooks (after adding new ones)
pnpm prepare

# Bypass hooks for a single commit
HUSKY=0 git commit -m "message"
```

---

## 📁 File Structure

```
project-root/
├── scripts/
│   ├── seed-orchestrator.ts        # Unified seed runner
│   ├── apply-enrichment.ts         # Visual enrichment pipeline
│   ├── audit-runner.ts             # Unified audit runner
│   ├── validate-simulator-data.ts  # Simulator validation
│   ├── enrichment-config.yaml      # Enrichment rules
│   ├── seed-simulator-policies.ts  # Policy seeder (with --dry-run)
│   ├── seed-simulator-scenarios.ts # Scenario seeder (with --dry-run)
│   └── ...
├── Makefile                        # Development shortcuts
├── .husky/
│   ├── pre-commit                  # Pre-commit hook
│   └── pre-push                    # Pre-push hook
└── package.json                    # New scripts
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Ensure DATABASE_URL is set
cp .env.example .env.local
# Edit .env.local with your database URL

# Test connection
pnpm prisma:studio
```

### Seed Script Failures

```bash
# Run in dry-run mode first
pnpm db:seed --dry-run

# Run individual seeds
pnpm db:seed:tiers
pnpm db:seed:policies

# Check database state
pnpm prisma:studio
```

### Validation Failures

```bash
# Run specific validator
pnpm validate:curriculum

# Check output for errors
pnpm validate:curriculum 2>&1 | grep -i error

# Run in verbose mode
pnpm audit --verbose
```

### Enrichment Issues

```bash
# Preview changes first
pnpm enrich:apply --dry-run

# Check for duplicate blocks
grep -r "id=\"decision-flow\"" content/curriculum/modules/

# Remove duplicate blocks manually or update config
```

---

## 📚 Examples

### Example 1: Fresh Environment Setup

```bash
# Clone repository
git clone <repository>
cd amph-v2-greenfield

# Install dependencies
pnpm install

# Setup database
make db-setup

# Validate everything
pnpm audit

# Start development server
pnpm dev
```

### Example 2: Content Update Workflow

```bash
# Make changes to MDX files
vim content/curriculum/modules/1-foundations/1.1-*.mdx

# Validate changes
pnpm validate:curriculum
pnpm validate:lesson-production

# Apply enrichment if needed
pnpm enrich:apply --dry-run
pnpm enrich:apply

# Commit changes
git add .
git commit -m "Update foundation lessons"
```

### Example 3: Database Migration

```bash
# Create new migration
pnpm prisma:migrate

# Seed new data
pnpm db:seed:tiers
pnpm db:seed:resources

# Validate
pnpm validate:simulators
```

### Example 4: Weekly Maintenance

```bash
# Run all validations
pnpm audit

# Check for issues
pnpm audit --strict

# Fix any issues
pnpm audit:fix

# Update content if needed
pnpm enrich:apply --dry-run
```

---

## 🔧 Customization

### Adding New Seed Scripts

1. Create new seed script in `scripts/seed-*.ts`
2. Add to `SEEDS` object in `seed-orchestrator.ts`
3. Add to `DEPENDENCY_ORDER` array
4. Add npm script in `package.json`

### Adding New Validators

1. Add validator config in `VALIDATORS` object in `audit-runner.ts`
2. Add npm script in `package.json`

### Adding New Enrichment Rules

1. Edit `scripts/enrichment-config.yaml`
2. Add new rule with file pattern, insert content, and position

---

## 📖 Related Documentation

- [Prisma Documentation](https://pris.ly/d/prisma-schema)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
