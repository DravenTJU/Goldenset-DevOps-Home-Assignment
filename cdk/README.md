# AWS CDK Infrastructure - Next.js Dashboard

AWS CDK infrastructure code for deploying the Next.js Dashboard application on AWS.

## Quick Start

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/ap-southeast-2

# Set environment variables
export GITHUB_TOKEN="your_github_token"
export GITHUB_REPO="DravenTJU/Goldenset-DevOps-Home-Assignment"

# Deploy all stacks
cdk deploy --all
```

## Stack Overview

| Stack | Purpose | Deployment Time |
|-------|---------|-----------------|
| NetworkStack | VPC with 2 AZs | ~2 minutes |
| SecretsStack | Secrets Manager for DB & Auth | ~1 minute |
| DatabaseStack | RDS PostgreSQL 16 (single-AZ) | ~10-15 minutes |
| AmplifyStack | Application hosting with SSR | ~5-10 minutes |

## Project Structure

```
cdk/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   ├── network-stack.ts    # VPC with 2 AZs configuration
│   ├── secrets-stack.ts    # Secrets Manager (DB + Auth)
│   ├── database-stack.ts   # RDS PostgreSQL configuration
│   └── amplify-stack.ts    # Amplify Hosting (no inline buildSpec)
├── package.json
├── tsconfig.json
├── cdk.json
└── README.md
```

## Common Commands

```bash
# View changes before deployment
npm run diff

# Deploy all stacks
npm run deploy

# Deploy individual stacks
npm run deploy:network
npm run deploy:secrets
npm run deploy:database
npm run deploy:amplify

# Synthesize CloudFormation templates
npm run synth

# Destroy all stacks
npm run destroy
```

## Environment Variables

Required environment variables:

```bash
GITHUB_TOKEN         # GitHub Personal Access Token (with repo access)
GITHUB_REPO          # GitHub repository (format: owner/repo)
AWS_REGION           # AWS region (default: ap-southeast-2)
CDK_DEFAULT_ACCOUNT  # AWS account ID
```

## Pre-deployment Checklist

1. ✅ Install AWS CLI and configure credentials
2. ✅ Install Node.js 18+
3. ✅ Install AWS CDK CLI: `npm install -g aws-cdk`
4. ✅ Create GitHub Personal Access Token with `repo` scope
5. ✅ Verify ACM certificate exists for `*.draven.best` in ap-southeast-2
6. ✅ Ensure your GitHub repository is accessible

## Architecture Highlights

### Network Configuration
- **VPC**: 2 Availability Zones (required for RDS subnet groups)
- **Subnets**: Public and private isolated subnets
- **NAT Gateways**: Disabled to reduce costs
- **RDS Instance**: Single-AZ deployment (free tier eligible)

### Database Configuration
- **Engine**: PostgreSQL 16.6
- **Instance**: db.t3.micro (free tier eligible)
- **Storage**: 20GB gp3
- **Multi-AZ**: Disabled (single-AZ for cost savings)
- **Backup**: 7-day retention

### Secrets Management
- **Database Credentials**: Auto-generated 32-character password
- **Auth Secret**: Auto-generated for NextAuth.js
- **Type**: Uses `secretsmanager.Secret` (not `rds.DatabaseSecret` to avoid circular dependencies)

### Amplify Configuration
- **Platform**: Web Compute (supports SSR)
- **Build Spec**: Uses `amplify.yml` from repository (no inline buildSpec in CDK)
- **Custom Domain**: dashboard.draven.best
- **Branch**: main (auto-deploy enabled)
- **Environment Variables**: Automatically configured from Secrets Manager

## Current Deployment Status

### Deployed Resources
- ✅ **NetworkStack**: VPC with 2 AZs in ap-southeast-2
- ✅ **SecretsStack**: 2 secrets created (DB credentials + Auth secret)
- ✅ **DatabaseStack**: RDS PostgreSQL running, status "available"
- ✅ **AmplifyStack**: App ID `doev839sa4hwz`

### URLs
- **Default Domain**: https://doev839sa4hwz.amplifyapp.com
- **Custom Domain**: https://dashboard.draven.best

### Database Connection
The POSTGRES_URL environment variable has been configured with URL-encoded password to handle special characters correctly.

## Cost Estimate

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| RDS PostgreSQL | db.t3.micro, 20GB, Single-AZ | $0 first year / ~$15 after |
| Amplify Hosting | Build + Hosting (Web Compute) | ~$15-25 |
| Secrets Manager | 2 secrets | ~$0.80 |
| Data Transfer | Outbound traffic | ~$0.09/GB |
| **Total** | | **~$16-26 first year / $31-41 after** |

## Detailed Documentation

- [AWS Deployment Plan](../doc/AWS_DEPLOYMENT_PLAN.md) - Complete deployment planning and architecture
- [CDK Architecture Guide](../doc/CDK_ARCHITECTURE.md) - Stack design and best practices
- [Deployment Guide](../doc/DEPLOYMENT_GUIDE.md) - Step-by-step deployment tutorial

## Important Notes

### Next.js Configuration
The application uses:
- **Output Mode**: `standalone` (required for Amplify Web Compute)
- **Dynamic Routes**: All dashboard pages use `export const dynamic = 'force-dynamic'`
- **Build Artifacts**: Configured in `amplify.yml` with `baseDirectory: .next/standalone`

### Known Issues Fixed
1. ✅ TypeScript compilation errors (excluded `cdk/` and `doc/` directories)
2. ✅ Database connection errors during build (dynamic rendering enabled)
3. ✅ Environment variable template strings (fixed POSTGRES_URL with URL encoding)
4. ✅ Amplify build artifacts configuration (corrected to use standalone output)

### Database Initialization
After successful deployment, initialize the database:
```bash
curl https://dashboard.draven.best/seed
```

## Troubleshooting

### Bootstrap Failure
```bash
cdk bootstrap aws://ACCOUNT-ID/ap-southeast-2 --force
```

### Deployment Timeout
Check CloudFormation events:
```bash
aws cloudformation describe-stack-events --stack-name DatabaseStack
```

### AmplifyStack Deployment Requires GITHUB_TOKEN
If deploying AmplifyStack separately:
```bash
export GITHUB_TOKEN=your_token
cdk deploy AmplifyStack
```

### Clean Up Resources
```bash
# Destroy all stacks (in reverse dependency order)
cdk destroy --all

# Or destroy individually
cdk destroy AmplifyStack
cdk destroy DatabaseStack
cdk destroy SecretsStack
cdk destroy NetworkStack
```

## Technology Stack

- **AWS CDK**: 2.167+
- **TypeScript**: 5.7+
- **AWS Services**:
  - Amazon VPC
  - Amazon RDS (PostgreSQL 16.6)
  - AWS Secrets Manager
  - AWS Amplify Hosting (Web Compute platform)
  - Amazon CloudWatch

## Additional Resources

### Amplify Build Configuration
The build process is defined in `/amplify.yml`:
- Uses pnpm for dependency management
- Builds Next.js in standalone mode
- Copies static assets to standalone output directory
- Deploys from `.next/standalone` as base directory

### Security Considerations
- Database password uses URL encoding for special characters
- RDS instance is in private subnet (not publicly accessible)
- Secrets are managed through AWS Secrets Manager
- SSL/TLS required for database connections (except local with `sslmode=disable`)

## License

Private

## Support

For issues, please refer to:
- [Deployment Guide Troubleshooting](../doc/DEPLOYMENT_GUIDE.md#troubleshooting)
- GitHub Issues
- AWS Support

---

**Maintainer**: Draven
**Last Updated**: 2025-10-18
**Region**: ap-southeast-2 (Sydney)
