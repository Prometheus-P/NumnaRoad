# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Order detail API (#70)
- Order retry/refund API (#71)
- Products CRUD completion (#72)
- Dashboard chart API (#74)
- Provider management API (#75)
- SmartStore mapping API (#76)
- Settings management API (#77)

## [0.2.0] - 2025-12-29

### Added
- Admin dashboard with real-time statistics (orders, revenue, pending/failed counts)
- Admin orders management page with filterable list view
- Admin products management page with MUI DataGrid
- Admin providers monitoring page with Circuit Breaker status
- Admin SmartStore integration page with sync status
- Admin settings page structure (General, Payment, Email, Notification)
- Admin authentication middleware with JWT verification
- QueryClientProvider for React Query in admin layout

### Fixed
- Products API field mapping to match PocketBase schema
  - `data_limit`, `duration`, `retail_price`, `wholesale_price`, `provider`, `provider_product_id`
- Orders API field mapping
  - `product` relation (was `product_id`)
  - `amount` field (was `total_price`)
  - `order_id` field (was `order_number`)
- Orders API empty filter parameter causing 400 errors
- Dashboard stats API simplified for collections without `created` field
- Providers API graceful fallback when `esim_providers` collection doesn't exist

### Infrastructure
- Oracle Cloud PocketBase server configured with Caddy reverse proxy
- Cloudflare HTTPS proxy enabled for `numnaroad.ondacoreana.com`
- Port 443 opened in Oracle Cloud iptables
- PocketBase superuser password reset

### Known Issues
- Orders collection missing `created` autodate field (#73)
- `esim_providers` collection needs to be created in PocketBase (#73)
- SSL certificate auto-renewal with Cloudflare needs configuration (#78)

## [0.1.0] - 2024-12-01

### Added
- Initial project structure
- Comprehensive documentation
  - README with project overview
  - ARCHITECTURE - System design and workflow
  - PLANNING - Business plan and market analysis
  - ROADMAP - Development timeline
  - DEPLOYMENT - Deployment guide
  - CONTRIBUTING - Contribution guidelines
  - API_DOCS - API reference
  - DATABASE_SCHEMA - Database structure
- Project renamed from eSIM Vault to NumnaRoad
- Configuration files
  - package.json with project dependencies
  - .gitignore for version control
  - .env.example for environment variables
  - CODE_OF_CONDUCT for community guidelines
- MIT License

### Changed
- Project name: eSIM Vault → NumnaRoad
- Repository: Updated to Prometheus-P/NumnaRoad
- Domain references: esimvault.com → numnaroad.com

## Release Strategy

### MVP (Version 0.2.0) - Completed
- [x] PocketBase setup and Collections
- [x] Next.js frontend basic structure
- [x] Single eSIM provider integration (Airalo)
- [x] Admin dashboard
- [x] Order management system

### Phase 2 (Version 0.3.0) - In Progress
- [ ] Order detail view and actions (retry/refund)
- [ ] Products CRUD operations
- [ ] Provider management with Circuit Breaker
- [ ] SmartStore product mapping
- [ ] Dashboard charts and analytics

### Phase 3 (Version 1.0.0) - Planned
- [ ] Multiple eSIM provider support
- [ ] Automatic provider failover
- [ ] Production optimization
- [ ] Monitoring and alerting
- [ ] Marketing automation

---

**Note**: This is a living document. As the project evolves, changes will be documented here following semantic versioning principles.
