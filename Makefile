# AMPH v2 Greenfield - Development Makefile
# ============================================
# Common development tasks and automation shortcuts
#
# Usage:
#   make help              # Show all available targets
#   make db-setup          # Complete database setup (migrate + seed)
#   make db-reset          # Reset database and re-seed
#   make validate          # Run all validations
#   make lint              # Run linting and formatting
#   make test              # Run all tests
#   make enrich            # Apply visual enrichment to lessons
#

.PHONY: help db-setup db-migrate db-seed db-reset validate lint test enrich clean

# Color codes for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
CYAN := \033[0;36m
BLUE := \033[0;34m
NC := \033[0m # No Color

# ============================================
# DATABASE TARGETS
# ============================================

help: ## Show this help message
	@echo "AMPH v2 Development Makefile"
	@echo "=========================="
	@echo ""
	@echo "Database:"
	@echo "  $(GREEN)make db-setup$(NC)    - Migrate database and seed all data"
	@echo "  $(GREEN)make db-migrate$(NC)  - Run database migrations only"
	@echo "  $(GREEN)make db-seed$(NC)     - Seed database with all data"
	@echo "  $(GREEN)make db-reset$(NC)    - Reset database (drop + migrate + seed)"
	@echo "  $(GREEN)make db-seed-tiers$(NC)   - Seed pricing tiers only"
	@echo "  $(GREEN)make db-seed-admin$(NC)   - Seed admin user only"
	@echo "  $(GREEN)make db-seed-policies$(NC) - Seed simulator policies only"
	@echo "  $(GREEN)make db-seed-scenarios$(NC) - Seed simulator scenarios only"
	@echo "  $(GREEN)make db-seed-resources$(NC) - Seed download resources only"
	@echo "  $(GREEN)make db-seed-curriculum$(NC) - Seed curriculum content only"
	@echo ""
	@echo "Validation:"
	@echo "  $(GREEN)make validate$(NC)          - Run all validations"
	@echo "  $(GREEN)make validate-strict$(NC)  - Run validations in strict mode"
	@echo "  $(GREEN)make validate-curriculum$(NC) - Validate curriculum only"
	@echo "  $(GREEN)make validate-lessons$(NC)   - Validate lesson production"
	@echo "  $(GREEN)make validate-simulators$(NC) - Validate simulator data"
	@echo ""
	@echo "Code Quality:"
	@echo "  $(GREEN)make lint$(NC)             - Run linting"
	@echo "  $(GREEN)make lint-fix$(NC)        - Run linting with auto-fix"
	@echo "  $(GREEN)make format$(NC)           - Format all files"
	@echo "  $(GREEN)make typecheck$(NC)        - Run TypeScript type checking"
	@echo ""
	@echo "Testing:"
	@echo "  $(GREEN)make test$(NC)             - Run all tests"
	@echo "  $(GREEN)make test-unit$(NC)       - Run unit tests only"
	@echo "  $(GREEN)make test-e2e$(NC)        - Run E2E tests"
	@echo "  $(GREEN)make test-watch$(NC)      - Run tests in watch mode"
	@echo ""
	@echo "Content:"
	@echo "  $(GREEN)make enrich$(NC)          - Apply visual enrichment to lessons"
	@echo "  $(GREEN)make enrich-dry$(NC)      - Preview enrichment changes"
	@echo ""
	@echo "Cleanup:"
	@echo "  $(GREEN)make clean$(NC)            - Clean build artifacts"
	@echo "  $(GREEN)make clean-all$(NC)       - Clean all (node_modules, build, etc.)"
	@echo ""

# Database setup - migrate and seed
db-setup: db-migrate db-seed ## Setup database (migrate + seed all data)

# Database migration
db-migrate: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(NC)"
	pnpm prisma:migrate

# Database seeding
db-seed: ## Seed all database data
	@echo "$(CYAN)Seeding database...$(NC)"
	pnpm db:seed

# Complete database reset
db-reset: ## Reset database completely (drop + migrate + seed)
	@echo "$(RED)Resetting database...$(NC)"
	pnpm prisma migrate reset --force
	pnpm db:seed

# Individual seed targets
db-seed-tiers: ## Seed pricing tiers only
	pnpm db:seed:tiers

db-seed-admin: ## Seed admin user only
	pnpm db:seed:admin

db-seed-policies: ## Seed simulator policies only
	pnpm db:seed:policies

db-seed-scenarios: ## Seed simulator scenarios only
	pnpm db:seed:scenarios

db-seed-resources: ## Seed download resources only
	pnpm db:seed:resources

db-seed-curriculum: ## Seed curriculum content only
	pnpm db:seed:curriculum

# ============================================
# VALIDATION TARGETS
# ============================================

validate: validate-curriculum validate-lessons validate-simulators ## Run all validations

validate-strict: ## Run all validations in strict mode
	pnpm audit:strict

validate-curriculum: ## Validate curriculum inventory
	pnpm validate:curriculum

validate-lessons: ## Validate lesson production structure
	pnpm validate:lesson-production

validate-simulators: ## Validate simulator data
	pnpm validate:simulators

# ============================================
# CODE QUALITY TARGETS
# ============================================

lint: ## Run linting
	pnpm lint

lint-fix: ## Run linting with auto-fix
	pnpm lint --fix

format: ## Format all files
	pnpm format

typecheck: ## Run TypeScript type checking
	pnpm typecheck

# ============================================
# TESTING TARGETS
# ============================================

test: ## Run all tests
	pnpm test

test-unit: ## Run unit tests only
	pnpm test:unit

test-e2e: ## Run E2E tests
	pnpm test:e2e

test-watch: ## Run tests in watch mode
	pnpm test:watch

# ============================================
# CONTENT TARGETS
# ============================================

enrich: ## Apply visual enrichment to all lessons
	@echo "$(CYAN)Applying visual enrichment...$(NC)"
	pnpm enrich:apply

enrich-dry: ## Preview enrichment changes without applying
	@echo "$(CYAN)Previewing enrichment changes...$(NC)"
	pnpm enrich:apply --dry-run

# ============================================
# AUDIT TARGETS
# ============================================

audit: ## Run all audits
	pnpm audit

audit-fix: ## Run audits and attempt fixes
	pnpm audit:fix

# ============================================
# CLEANUP TARGETS
# ============================================

clean: ## Clean build artifacts
	rm -rf .next
	rm -rf node_modules/.vite

clean-all: ## Clean all (node_modules, build, cache)
	rm -rf .next
	rm -rf node_modules
	rm -rf .pnpm-store
	rm -rf dist
	rm -rf build
	pnpm store prune

# ============================================
# UTILITY TARGETS
# ============================================

# Generate Prisma client
gen-prisma: ## Generate Prisma client
	pnpm prisma:generate

# Open Prisma Studio
prisma-studio: ## Open Prisma Studio
	pnpm prisma:studio

# Generate secrets
gen-secret: ## Generate app secret
	pnpm gen:secret

# Import content
import-content: ## Import AMPH content
	pnpm import:content

# ============================================
# DEVELOPMENT WORKFLOW TARGETS
# ============================================

# Setup new development environment
dev-setup: db-setup gen-prisma ## Setup new dev environment

# Full build
deploy-build: clean typecheck lint test ## Run full build pipeline

# Quick dev start
dev-quick: db-setup dev ## Quick dev startup (setup + start dev server)
