# AWS Deployment Documentation

Complete documentation for deploying the Next.js Dashboard project to AWS.

## Documentation Index

### 📋 [AWS_DEPLOYMENT_PLAN.md](./AWS_DEPLOYMENT_PLAN.md)
**Complete Deployment Plan and Architecture**

Contents:
- AWS Architecture Diagram
- Service Configuration Details
- Network and Security Architecture
- Environment Variable Configuration
- Cost Estimates
- Scaling Recommendations

**Target Audience**: Architects, Technical Leads, Operations Teams

**When to Read**: Before deployment, to understand the overall architecture

---

### 🏗️ [CDK_ARCHITECTURE.md](./CDK_ARCHITECTURE.md)
**CDK Code Architecture and Best Practices**

Contents:
- CDK Stack Design
- Dependency Relationships
- Resource Naming Conventions
- Cost Optimization Strategies
- Detailed Stack Documentation
- Extension Guide

**Target Audience**: Developers, DevOps Engineers

**When to Read**: When developing or modifying CDK code

---

### 📖 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
**Step-by-Step Deployment Manual**

Contents:
- Prerequisites Checklist
- Environment Preparation Steps
- Detailed Deployment Workflow
- Verification and Testing
- Troubleshooting Guide
- Daily Operations

**Target Audience**: Operations Staff, Deployment Operators

**When to Read**: During actual deployment execution

---

### 🚀 [SETUP.md](./SETUP.md)
**Local Development Setup Guide**

Contents:
- Local environment setup
- Docker PostgreSQL configuration
- Development server startup
- Database initialization

**Target Audience**: Developers

**When to Read**: Setting up local development environment

---

### 🐳 [DOCKER-SETUP.md](./DOCKER-SETUP.md)
**Docker Database Configuration**

Contents:
- Docker Compose setup
- PostgreSQL container configuration
- Connection details
- Volume management

**Target Audience**: Developers

**When to Read**: Configuring local database

---

## Quick Navigation

### Where Should I Start?

```
┌─────────────────────────────────────────────┐
│         What is your role/need?              │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   I'm an architect  I'm a dev   I need to deploy
   want to know      modifying   to AWS
   architecture      code
        │            │            │
        ▼            ▼            ▼
  AWS_DEPLOYMENT  CDK_ARCH.    DEPLOYMENT
     _PLAN.md     ITECTURE.md   _GUIDE.md
```

### Recommended Reading Order by Role

**Architect/Technical Lead**:
1. AWS_DEPLOYMENT_PLAN.md (full read)
2. CDK_ARCHITECTURE.md (key sections)
3. DEPLOYMENT_GUIDE.md (understand workflow)

**DevOps Engineer/Developer**:
1. CDK_ARCHITECTURE.md (full read)
2. DEPLOYMENT_GUIDE.md (full read)
3. AWS_DEPLOYMENT_PLAN.md (architecture reference)

**Operations Staff/Deployment Operator**:
1. DEPLOYMENT_GUIDE.md (full read, follow along)
2. AWS_DEPLOYMENT_PLAN.md (troubleshooting reference)

**Developer (Local Setup)**:
1. SETUP.md (full read)
2. DOCKER-SETUP.md (reference)

## Deployment Workflow Overview

```
1. Preparation Phase (10 minutes)
   ├── Install tools (AWS CLI, CDK CLI)
   ├── Configure AWS credentials
   ├── Set environment variables
   └── Clone repository

2. Deployment Phase (20-30 minutes)
   ├── Bootstrap CDK environment
   ├── Deploy NetworkStack (VPC)
   ├── Deploy SecretsStack (Secrets)
   ├── Deploy DatabaseStack (RDS)
   └── Deploy AmplifyStack (Application)

3. Verification Phase (10 minutes)
   ├── Check Stack status
   ├── Verify RDS connection
   ├── Access application
   ├── Initialize database
   └── Test login

4. Configuration Phase (Optional, 15 minutes)
   ├── Configure DNS
   ├── Setup monitoring alerts
   ├── Enable backups
   └── Configure notifications
```

**Total Time**: Approximately 40-65 minutes

## Core Concepts

### AWS Service Mapping

| Local Development | AWS Service | Purpose |
|-------------------|-------------|---------|
| Docker PostgreSQL | Amazon RDS | Managed Database |
| Next.js dev server | AWS Amplify | App Hosting + CI/CD |
| .env.local | Secrets Manager | Secret Management |
| localhost | CloudFront CDN | Global Acceleration |
| - | Amazon VPC | Network Isolation |

### Technology Stack

**Infrastructure as Code**:
- AWS CDK 2.x (TypeScript)
- CloudFormation

**Application**:
- Next.js 15 (App Router, SSR)
- PostgreSQL 16
- NextAuth v5

**AWS Services**:
- Amplify Hosting (Web Compute)
- RDS PostgreSQL
- Secrets Manager
- VPC + Security Groups
- CloudWatch

### Free Tier Optimization

This deployment is optimized for AWS Free Tier:

✅ **Free Items**:
- RDS db.t3.micro (750 hours/month first year)
- VPC and Security Groups (always free)
- Data Transfer (1GB outbound/month)
- CloudWatch Basic Monitoring (always free)

💰 **Paid Items**:
- Amplify Build Minutes (first 1000 minutes free)
- Amplify Hosting (~$15-25/month)
- Secrets Manager (~$0.80/month)
- RDS after free tier (~$15/month)

**First Year Cost**: ~$16-26/month
**Ongoing Cost**: ~$31-44/month

## Current Deployment Status

### Production Deployment
- **Region**: ap-southeast-2 (Sydney)
- **App ID**: doev839sa4hwz
- **URLs**:
  - Default: https://doev839sa4hwz.amplifyapp.com
  - Custom: https://dashboard.draven.best
- **Database**: RDS PostgreSQL 16.6 (db.t3.micro, Single-AZ)
- **Status**: ✅ Deployed and Running

### Key Configuration
- VPC with 2 Availability Zones (required for RDS subnet groups)
- Single-AZ RDS instance (free tier eligible)
- Amplify Web Compute platform (SSR enabled)
- Standalone Next.js build output
- URL-encoded database passwords for special characters

## Frequently Asked Questions

### Q: Do I need to use the draven.best domain?
A: No. You can modify the domain configuration in CDK code or use Amplify's default domain.

### Q: Can I deploy to other AWS regions?
A: Yes. Modify the `region` configuration in `cdk/bin/app.ts`. Note that ACM certificates must be in the same region.

### Q: How do I add dev/test environments?
A: See [CDK_ARCHITECTURE.md](./CDK_ARCHITECTURE.md#multi-environment-deployment) for multi-environment configuration.

### Q: How do I rollback failed deployments?
A: Run `cdk destroy <StackName>` to delete the failed stack, fix the issue, and redeploy.

### Q: How do I update application code?
A: Git push to the main branch - Amplify automatically triggers build and deployment.

### Q: How does database backup work?
A: RDS automatically backs up daily with 7-day retention. You can also create manual snapshots.

### Q: How do I monitor costs?
A: Use AWS Cost Explorer or set up budget alerts. See cost monitoring section in documentation.

### Q: Why is the page blank after deployment?
A: The database needs initialization. Run `curl https://dashboard.draven.best/seed` after first deployment.

## Important Notes

### Next.js Configuration
- **Output Mode**: `standalone` (required for Amplify Web Compute)
- **Dynamic Rendering**: All dashboard pages use `export const dynamic = 'force-dynamic'`
- **Build Artifacts**: `baseDirectory: .next/standalone` in amplify.yml
- **Static Files**: Copied to standalone directory during build

### Known Issues Fixed
1. ✅ TypeScript compilation errors (excluded `cdk/` and `doc/` directories)
2. ✅ Database connection errors during build (enabled dynamic rendering)
3. ✅ Environment variable template strings (fixed with URL-encoded POSTGRES_URL)
4. ✅ Amplify build artifacts configuration (corrected for standalone output)
5. ✅ VPC AZ coverage (changed from 1 AZ to 2 AZs for RDS subnet groups)
6. ✅ Circular dependency (used secretsmanager.Secret instead of rds.DatabaseSecret)

## Resources

### Official Documentation
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- [Amazon RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Next.js Documentation](https://nextjs.org/docs)

### Tutorials and Guides
- [AWS CDK Workshop](https://cdkworkshop.com/)
- [Next.js Learn](https://nextjs.org/learn)
- [AWS Free Tier](https://aws.amazon.com/free/)

### Tools
- [AWS CLI Installation](https://aws.amazon.com/cli/)
- [CDK CLI Installation](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
- [GitHub Token Creation](https://github.com/settings/tokens)

## Getting Help

Having issues?

1. 📖 Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#troubleshooting)
2. 🔍 Search [GitHub Repository Issues](https://github.com/DravenTJU/Goldenset-DevOps-Home-Assignment/issues)
3. 💬 AWS Support (if you have a support plan)
4. 📧 Contact DevOps Team

## Documentation Maintenance

### Version Information
- **Documentation Version**: 1.0
- **Last Updated**: 2025-10-18
- **Maintainer**: DevOps Team
- **Region**: ap-southeast-2 (Sydney)

### Change Log
- 2025-10-18: Initial version with complete AWS deployment documentation
- 2025-10-18: Updated with actual deployment status and fixes

### Contributing
When updating documentation:
1. Maintain consistent formatting
2. Update modification dates
3. Record in change log
4. Test all commands

---

**Tip**: We recommend reading at least one complete document before deployment. During deployment, keep [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) open for quick reference.
