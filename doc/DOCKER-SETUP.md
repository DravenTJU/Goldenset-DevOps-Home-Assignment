# Docker Database Setup Summary

Summary of Docker-based PostgreSQL configuration for local development.

## Completed Setup

1. **Created docker-compose.yml** - PostgreSQL 16 container configuration
2. **Created .env.local** - Database connection configuration and auth keys
3. **Created app/lib/db.ts** - Unified database connection module with optional SSL support
4. **Updated all database connection code**:
   - app/lib/data.ts
   - app/lib/actions.ts
   - app/seed/route.ts
   - app/query/route.ts
   - auth.ts

## Database Configuration

- **Image**: postgres:16-alpine
- **Container Name**: nextjs-dashboard-db
- **Port**: 5432
- **Database**: dashboard_db
- **Username**: dashboard_user
- **Password**: dashboard_password

## Quick Commands

```bash
# Start database
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres

# Stop database
docker-compose down

# Connect to database
docker exec -it nextjs-dashboard-db psql -U dashboard_user -d dashboard_db

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Initialize database (visit in browser)
http://localhost:3000/seed
```

## Key Improvements

### Smart SSL Configuration
Database connection now automatically determines SSL usage based on URL parameters:
- With `sslmode=disable` parameter: No SSL (local development)
- Without this parameter: SSL required (production environment)

### Unified Database Connection
All files now import the sql instance from `app/lib/db.ts`, making it easier to maintain and configure.

Example usage:
```typescript
import { sql } from '@/app/lib/db';

const result = await sql`SELECT * FROM users`;
```

## Important Notes

1. If system PostgreSQL service is running, stop it first: `sudo systemctl stop postgresql`
2. Data is persisted in Docker volume; removing volume will delete data: `docker-compose down -v`
3. You must start the development server before accessing the `/seed` endpoint to initialize the database

## Docker Compose Configuration

The `docker-compose.yml` file includes:
- PostgreSQL 16 Alpine image (minimal size)
- Named volume for data persistence
- Port mapping to localhost:5432
- Health check configuration
- Automatic restart policy

## Environment Variables

The `.env.local` file contains:
- `POSTGRES_URL` - Full connection string with `sslmode=disable` for local development
- `AUTH_SECRET` - NextAuth secret key
- `AUTH_URL` - Authentication callback URL

## Troubleshooting

### Container Won't Start
- Check if port 5432 is already in use: `lsof -i :5432`
- Check container logs: `docker-compose logs postgres`
- Verify Docker is running: `docker ps`

### Connection Refused
- Ensure container is healthy: `docker-compose ps`
- Wait a few seconds after starting for PostgreSQL to be ready
- Verify connection string in `.env.local`

### Data Loss After Restart
- Don't use `docker-compose down -v` unless you want to delete data
- Use `docker-compose down` (without `-v`) to preserve data
- Data is stored in Docker volume: `nextjs-dashboard-db-data`

## Related Documentation

- [SETUP.md](SETUP.md) - Complete setup guide
- [README.md](README.md) - Project overview
- [../docker-compose.yml](../docker-compose.yml) - Docker configuration file

---

**Last Updated**: 2025-10-18
**Purpose**: Local Development Database
**Maintainer**: Draven
