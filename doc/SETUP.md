# Project Setup Guide

Quick start guide for local development environment.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- pnpm package manager

## Quick Start

### 1. Stop System PostgreSQL Service (if running)

```bash
sudo systemctl stop postgresql
```

### 2. Start PostgreSQL Database

```bash
docker-compose up -d
```

This will start a PostgreSQL 16 container with the following configuration:
- Port: 5432
- Database: dashboard_db
- Username: dashboard_user
- Password: dashboard_password

Check database status:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f postgres
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Configure Environment Variables

Environment variables are already configured in `.env.local` file, including:
- PostgreSQL connection information
- NextAuth authentication keys

### 5. Start Development Server

```bash
pnpm dev
```

The application will run at http://localhost:3000

### 6. Initialize Database

Visit the following URL to create tables and seed data:
```
http://localhost:3000/seed
```

Or use curl:
```bash
curl http://localhost:3000/seed
```

Successful response:
```json
{"message": "Database seeded successfully"}
```

## Default Login Credentials

Check user information in `app/lib/placeholder-data.ts`

Default test account:
- Email: `user@nextmail.com`
- Password: `123456`

## Stop Services

Stop database:
```bash
docker-compose down
```

Stop database and remove data volumes:
```bash
docker-compose down -v
```

## Database Connection

To connect to the database directly:
```bash
docker exec -it nextjs-dashboard-db psql -U dashboard_user -d dashboard_db
```

## Database Management

### Reset Database

If you need to clear all tables and re-initialize:

```bash
# Visit reset endpoint
curl http://localhost:3000/reset

# Then re-seed
curl http://localhost:3000/seed
```

Or in browser, visit http://localhost:3000/reset then http://localhost:3000/seed

## Available Scripts

```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Troubleshooting

### Database Connection Failed
- Ensure Docker container is running: `docker-compose ps`
- Check if port 5432 is in use: `lsof -i :5432`
- View database logs: `docker-compose logs postgres`

### UUID Extension Error
If you encounter uuid-ossp extension error when accessing /seed, this is normal. The code already handles this situation and can be safely ignored.

### Dependency Installation Issues
- Clear cache: `pnpm store prune`
- Remove node_modules and reinstall: `rm -rf node_modules && pnpm install`

### Port Conflicts
If port 3000 or 5432 is already in use:
```bash
# For development server
PORT=3001 pnpm dev

# For PostgreSQL, modify docker-compose.yml ports section
```

## Development Tips

### Hot Reload
The development server supports hot reload. Changes to files will automatically refresh the browser.

### Database Queries
All database queries are located in:
- `app/lib/data.ts` - Read operations
- `app/lib/actions.ts` - Write operations (Server Actions)

### Environment Variables
For local development, edit `.env.local`:
```env
POSTGRES_URL="postgresql://dashboard_user:dashboard_password@localhost:5432/dashboard_db?sslmode=disable"
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3000/api/auth"
```

## Next Steps

- [AWS Deployment](AWS_DEPLOYMENT_PLAN.md) - Deploy to AWS using CDK
- [Docker Setup](DOCKER-SETUP.md) - Detailed Docker configuration
- [README](README.md) - Full project documentation

## Related Documentation

- [../README.md](../README.md) - Project overview
- [CDK README](../cdk/README.md) - Infrastructure as Code

---

**Last Updated**: 2025-10-18
**Environment**: Local Development
**Maintainer**: Draven
