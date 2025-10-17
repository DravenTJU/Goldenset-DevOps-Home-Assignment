# AWS Deployment Plan - Next.js Dashboard

This document provides detailed instructions on how to deploy the Next.js Dashboard project and PostgreSQL database to AWS using AWS CDK through Amplify.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [AWS Services List](#aws-services-list)
- [Network Architecture](#network-architecture)
- [Database Configuration](#database-configuration)
- [Application Hosting](#application-hosting)
- [Security Configuration](#security-configuration)
- [Environment Variables](#environment-variables)
- [Deployment Process](#deployment-process)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud (ap-southeast-2)                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Route 53 DNS                           │ │
│  │              dashboard.draven.best → Amplify                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    AWS Amplify Hosting                      │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              Next.js SSR Application                  │  │ │
│  │  │  • Server-Side Rendering                             │  │ │
│  │  │  • API Routes                                        │  │ │
│  │  │  • NextAuth Authentication                           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                              │                              │ │
│  └──────────────────────────────┼──────────────────────────────┘ │
│                                 │                                 │
│                    ┌────────────┴────────────┐                   │
│                    │                         │                   │
│         ┌──────────▼──────────┐   ┌─────────▼─────────┐         │
│         │  Secrets Manager    │   │        VPC        │         │
│         │  • DB Credentials   │   │  ┌──────────────┐ │         │
│         │  • Auth Secret      │   │  │   Private    │ │         │
│         └─────────────────────┘   │  │   Subnet     │ │         │
│                                   │  │              │ │         │
│                                   │  │  ┌────────┐  │ │         │
│                                   │  │  │  RDS   │  │ │         │
│                                   │  │  │ PG-16  │  │ │         │
│                                   │  │  │ (t3.m) │  │ │         │
│                                   │  │  └────────┘  │ │         │
│                                   │  └──────────────┘ │         │
│                                   │                   │         │
│                                   └───────────────────┘         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     CloudWatch Monitoring                   │ │
│  │  • RDS Performance   • Amplify Builds   • Application Logs  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## AWS Services List

### Core Services

1. **AWS Amplify Hosting**
   - Purpose: Next.js SSR application hosting and CI/CD
   - Features: Auto build, deploy, global CDN, HTTPS
   - Region: ap-southeast-2 (Sydney)

2. **Amazon RDS for PostgreSQL**
   - Version: PostgreSQL 16.6
   - Instance: db.t3.micro (free tier)
   - Storage: 20GB GP2 SSD
   - Deployment: Single availability zone
   - Backup: 7-day automatic backup

3. **AWS Secrets Manager**
   - Store database credentials (auto-generated passwords)
   - Store NextAuth secrets
   - Support for automatic key rotation

4. **Amazon VPC**
   - 2 availability zones configuration
   - Public subnets (Amplify access)
   - Isolated subnets (RDS)
   - Security group isolation

5. **Amazon Route 53**
   - DNS management
   - Domain: dashboard.draven.best
   - SSL certificate: ACM (*.draven.best)

6. **Amazon CloudWatch**
   - RDS performance monitoring
   - Amplify build logs
   - Application log aggregation

## Network Architecture

### VPC Configuration

```
VPC (10.0.0.0/16)
│
├── Availability Zone A (ap-southeast-2a)
│   ├── Public Subnet (10.0.0.0/24)
│   │   └── Amplify VPC Connector
│   │
│   └── Isolated Private Subnet (10.0.1.0/24)
│       └── RDS PostgreSQL Instance
│
├── Availability Zone B (ap-southeast-2b)
│   ├── Public Subnet (10.0.2.0/24)
│   │   └── Reserved for future use
│   │
│   └── Isolated Private Subnet (10.0.3.0/24)
│       └── Reserved for future use
│
└── S3 VPC Endpoint (reduce data transfer costs)
```

### Security Group Rules

#### RDS Security Group
- **Inbound Rules**:
  - TCP 5432 (PostgreSQL) ← Amplify Security Group
- **Outbound Rules**: None (not required)

#### Amplify Security Group
- **Inbound Rules**: Managed by Amplify
- **Outbound Rules**: Allow all (access to RDS)

## Database Configuration

### RDS Instance Specifications

| Configuration | Value | Description |
|---------------|-------|-------------|
| Engine | PostgreSQL 16.6 | Latest stable version |
| Instance Type | db.t3.micro | Free tier, 1 vCPU, 1GB RAM |
| Storage | 20 GB GP2 | Free tier maximum |
| Multi-AZ | No | Single AZ to comply with free tier |
| Public Access | No | VPC-only access |
| Backup Retention | 7 days | Automatic backup |
| Monitoring Interval | 60 seconds | Basic monitoring |
| Performance Insights | No | Not supported in free tier |

### Parameter Group Configuration

```ini
rds.force_ssl = 0  # Simplified for development, recommend enabling for production
```

### Database Initialization

After database creation, the following objects will be automatically created during the first application deployment:

- **Extensions**: uuid-ossp (UUID generation)
- **Tables**:
  - users (user table)
  - customers (customer table)
  - invoices (invoice table)
  - revenue (revenue table)

After the first deployment, you need to access `https://dashboard.draven.best/seed` to populate initial data.

## Application Hosting

### Amplify Configuration

**Build Specification** (amplify.yml):
```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          - npm install -g pnpm
          - pnpm install
        build:
          - pnpm build
      artifacts:
        baseDirectory: .next
        files: '**/*'
      cache:
        - node_modules/**/*
        - .next/cache/**/*
```

**Environment Variables** (auto-injected):
- `POSTGRES_URL` - Complete database connection string
- `POSTGRES_HOST` - RDS endpoint
- `POSTGRES_PORT` - 5432
- `POSTGRES_DATABASE` - dashboard_db
- `POSTGRES_USER` - Read from Secrets Manager
- `DB_PASSWORD` - Read from Secrets Manager
- `AUTH_SECRET` - Read from Secrets Manager
- `AUTH_URL` - https://dashboard.draven.best/api/auth

### Custom Domain

- **Main Domain**: draven.best
- **Subdomain**: dashboard.draven.best
- **SSL Certificate**: Use existing *.draven.best certificate
- **DNS**: Automatically configure CNAME records

## Security Configuration

### Secret Management

#### 1. Database Credentials (nextjs-dashboard/db-credentials)
```json
{
  "username": "dashboard_admin",
  "password": "<auto-generated strong password>",
  "engine": "postgres",
  "host": "<rds-endpoint>",
  "port": 5432,
  "dbname": "dashboard_db"
}
```

#### 2. NextAuth Secret (nextjs-dashboard/auth-secret)
```json
{
  "username": "auth",
  "secret": "<32-character random secret>"
}
```

### IAM Permissions

Amplify service role requires the following permissions:
- `secretsmanager:GetSecretValue` - Read secrets
- `rds:DescribeDBInstances` - Query database information
- `logs:CreateLogGroup` - Create log groups
- `logs:CreateLogStream` - Create log streams
- `logs:PutLogEvents` - Write logs

### Network Security

1. **RDS Not Publicly Accessible**: VPC-only access
2. **Security Group Minimum Permissions**: Only allow necessary ports
3. **Secret Encryption**: Secrets Manager encrypted storage
4. **HTTPS Enforcement**: Amplify automatically enforces HTTPS
5. **WAF** (Optional): Can add Web Application Firewall

## Environment Variables

### Environment Variables Required for Deployment

```bash
# GitHub Configuration
export GITHUB_TOKEN="your_github_personal_access_token"
export GITHUB_REPO="your-username/nextjs-dashboard"

# AWS Configuration
export AWS_PROFILE="your-aws-profile"  # or use default
export AWS_REGION="ap-southeast-2"
export CDK_DEFAULT_ACCOUNT="your-aws-account-id"
```

### Application Runtime Environment Variables

These are automatically configured by CDK into Amplify:

| Variable Name | Source | Example Value |
|---------------|--------|---------------|
| POSTGRES_URL | CDK Generated | postgresql://user:pass@host:5432/db |
| POSTGRES_HOST | RDS Endpoint | xxx.rds.amazonaws.com |
| POSTGRES_PORT | Fixed Value | 5432 |
| POSTGRES_DATABASE | Configuration Value | dashboard_db |
| POSTGRES_USER | Secrets Manager | dashboard_admin |
| DB_PASSWORD | Secrets Manager | <auto-generated> |
| AUTH_SECRET | Secrets Manager | <auto-generated> |
| AUTH_URL | Configuration Value | https://dashboard.draven.best/api/auth |

## Deployment Process

### Phase 1: Preparation

1. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter Access Key, Secret Key, Region (ap-southeast-2)
   ```

2. **Create GitHub Personal Access Token**
   - Visit: https://github.com/settings/tokens
   - Permissions: repo (full repository access)
   - Save token for later use

3. **Install CDK CLI**
   ```bash
   npm install -g aws-cdk
   cdk --version
   ```

### Phase 2: Initialize CDK

```bash
cd cdk
npm install
cdk bootstrap aws://ACCOUNT-ID/ap-southeast-2
```

### Phase 3: Deploy Infrastructure

```bash
# Set environment variables
export GITHUB_TOKEN="your_token"
export GITHUB_REPO="your-username/nextjs-dashboard"

# Preview resources to be deployed
cdk diff

# Deploy all Stacks (recommended)
cdk deploy --all

# Or deploy step by step
cdk deploy NetworkStack
cdk deploy SecretsStack
cdk deploy DatabaseStack
cdk deploy AmplifyStack
```

### Phase 4: Verify Deployment

1. **Check RDS Status**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier <instance-id> \
     --region ap-southeast-2
   ```

2. **Check Amplify Build**
   - Visit AWS Amplify Console
   - View build logs
   - Confirm successful deployment

3. **Initialize Database**
   ```bash
   curl https://dashboard.draven.best/seed
   ```

4. **Test Application**
   - Visit: https://dashboard.draven.best
   - Login with default credentials (see app/lib/placeholder-data.ts)

### Phase 5: Configure Domain

If DNS is not in Route 53:
1. Get CNAME record from Amplify Console
2. Add DNS record at domain provider:
   ```
   dashboard.draven.best  CNAME  <amplify-domain>
   ```

## Troubleshooting

### RDS Connection Failure

**Symptoms**: Application cannot connect to database

**Check Steps**:
```bash
# 1. Check RDS status
aws rds describe-db-instances --region ap-southeast-2

# 2. Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id>

# 3. View Amplify logs
# Check build and runtime logs in Amplify Console
```

**Solutions**:
- Ensure RDS status is "available"
- Verify security group allows port 5432
- Check environment variables are configured correctly

### Amplify Build Failure

**Common Causes**:
1. pnpm installation failure → Check package.json
2. Build timeout → Increase Amplify build timeout
3. Missing environment variables → Verify all required variables

**View Logs**:
```bash
aws amplify list-apps --region ap-southeast-2
aws amplify get-job --app-id <app-id> --branch-name main --job-id <job-id>
```

### Secret Access Failure

**Symptoms**: Application reports unable to read secrets

**Solutions**:
```bash
# Check if secrets exist
aws secretsmanager list-secrets --region ap-southeast-2

# Test secret access
aws secretsmanager get-secret-value \
  --secret-id nextjs-dashboard/db-credentials \
  --region ap-southeast-2

# Verify IAM permissions
aws iam get-role --role-name <amplify-role-name>
```

## Cost Estimation

### Monthly Costs (ap-southeast-2 region)

| Service | Configuration | First Year (Free Tier) | Subsequent |
|---------|---------------|------------------------|------------|
| RDS PostgreSQL | db.t3.micro, 20GB, Single AZ | $0 | ~$15-18 |
| Amplify Hosting | Build time + Hosting | ~$15-25 | ~$15-25 |
| Secrets Manager | 2 secrets | ~$0.40 | ~$0.40 |
| Data Transfer | Outbound traffic | 1GB free | ~$0.09/GB |
| CloudWatch | Basic monitoring | $0 | $0 |
| Route 53 | Hosted zone + queries | ~$0.50 | ~$0.50 |
| **Monthly Total** | | **~$16-26** | **~$31-44** |
| **Annual Total** | | **~$192-312** | **~$372-528** |

### Cost Optimization Recommendations

1. **Maximize Free Tier**
   - RDS: 750 hours/month db.t3.micro (first year)
   - Data transfer: 1GB outbound free
   - Amplify: 1000 build minutes free/month

2. **Cost Reduction Methods**
   - Use RDS scheduled start/stop (development environment)
   - Enable Amplify build caching
   - Optimize image and resource sizes
   - Use CloudFront CDN (built into Amplify)

3. **Monitor Costs**
   ```bash
   # View cost reports
   aws ce get-cost-and-usage \
     --time-period Start=2025-01-01,End=2025-01-31 \
     --granularity MONTHLY \
     --metrics "BlendedCost"
   ```

## Scaling and Optimization

### Production Environment Recommendations

1. **High Availability**
   - Enable RDS Multi-AZ deployment
   - Add VPC availability zones
   - Configure RDS read replicas

2. **Performance Optimization**
   - Upgrade to larger RDS instance (db.t3.small or larger)
   - Enable RDS Performance Insights
   - Add ElastiCache (Redis) for session storage

3. **Security Hardening**
   - Enable RDS SSL connections
   - Configure AWS WAF rules
   - Implement automatic secret rotation
   - Enable VPC Flow Logs

4. **Monitoring Alerts**
   - Set up CloudWatch alerts:
     - RDS CPU > 80%
     - RDS Storage < 20%
     - Amplify build failures
     - Application error rate > 5%

5. **Backup Strategy**
   - Increase backup retention (30 days)
   - Configure cross-region snapshot replication
   - Regular recovery testing

### Multi-Environment Deployment

Support for dev/staging/prod environments:

```bash
# Development environment
cdk deploy --all --context env=dev

# Staging environment
cdk deploy --all --context env=staging

# Production environment
cdk deploy --all --context env=prod
```

Each environment uses:
- Independent VPC and RDS instances
- Independent Amplify applications
- Independent secrets
- Different subdomains (dev.draven.best, staging.draven.best)

## Resource Cleanup

**Warning**: This operation will delete all resources and data!

```bash
# Delete all Stacks
cdk destroy --all

# Manual cleanup (if needed)
# 1. Delete RDS snapshots
aws rds describe-db-snapshots --region ap-southeast-2
aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>

# 2. Delete Secrets Manager secrets
aws secretsmanager delete-secret \
  --secret-id nextjs-dashboard/db-credentials \
  --force-delete-without-recovery

# 3. Clean up CloudWatch log groups
aws logs delete-log-group --log-group-name /aws/rds/instance/<instance-id>/postgresql
```

## Support and Resources

### Documentation Links

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- [Amazon RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

### Related Documentation

- [CDK Architecture Description](./CDK_ARCHITECTURE.md)
- [Deployment Operations Guide](./DEPLOYMENT_GUIDE.md)

### Getting Help

1. **AWS Support**: For AWS account issues
2. **GitHub Issues**: For application-related issues
3. **AWS Forums**: Community support

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Maintainer**: Draven