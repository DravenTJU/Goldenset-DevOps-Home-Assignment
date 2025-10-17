# Deployment Operations Guide - Next.js Dashboard

This document provides detailed step-by-step deployment instructions, including prerequisites, configuration steps, verification methods, and troubleshooting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Preparation](#environment-preparation)
- [Deployment Steps](#deployment-steps)
- [Verification Testing](#verification-testing)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Troubleshooting](#troubleshooting)
- [Operations Management](#operations-management)

## Prerequisites

### Required Tools

| Tool | Minimum Version | Check Command | Installation Link |
|------|----------------|---------------|-------------------|
| Node.js | 18.x | `node --version` | [nodejs.org](https://nodejs.org) |
| npm | 8.x | `npm --version` | Installed with Node.js |
| AWS CLI | 2.x | `aws --version` | [AWS CLI Installation](https://aws.amazon.com/cli/) |
| AWS CDK | 2.167+ | `cdk --version` | `npm install -g aws-cdk` |
| Git | 2.x | `git --version` | [git-scm.com](https://git-scm.com) |

### AWS Account Requirements

- ✅ Valid AWS account
- ✅ IAM user or role with the following permissions:
  - AdministratorAccess (recommended) or
  - Custom policy (see below)
- ✅ AWS account not exceeding service quotas
- ✅ Billing information configured

### Minimum IAM Permissions

If not using AdministratorAccess, the following permissions are required:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "ec2:*",
        "rds:*",
        "secretsmanager:*",
        "amplify:*",
        "iam:*",
        "s3:*",
        "cloudwatch:*",
        "logs:*",
        "ssm:GetParameter"
      ],
      "Resource": "*"
    }
  ]
}
```

### GitHub Requirements

- ✅ GitHub account
- ✅ Project repository (fork or create new)
- ✅ Personal Access Token with permissions:
  - `repo` (full repository access)
  - `admin:repo_hook` (webhooks)

Create Token: https://github.com/settings/tokens/new

### Domain Requirements

- ✅ Registered domain: draven.best
- ✅ ACM certificate: *.draven.best (ap-southeast-2 region)
- ✅ DNS access permissions (to add CNAME records)

## Environment Preparation

### Step 1: Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter the following information:
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: ap-southeast-2
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### Step 2: Set Environment Variables

Create configuration file `~/.aws/dashboard-config`:

```bash
# AWS configuration
export AWS_ACCOUNT_ID="your-aws-account-id"
export AWS_REGION="ap-southeast-2"
export CDK_DEFAULT_ACCOUNT="your-aws-account-id"
export CDK_DEFAULT_REGION="ap-southeast-2"

# GitHub configuration
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
export GITHUB_REPO="your-username/nextjs-dashboard"

# Project configuration
export PROJECT_NAME="nextjs-dashboard"
export ENVIRONMENT="production"
```

Load configuration:
```bash
source ~/.aws/dashboard-config

# Verify
echo $AWS_ACCOUNT_ID
echo $GITHUB_TOKEN
```

### Step 3: Clone Project

```bash
# Clone repository
git clone https://github.com/$GITHUB_REPO.git
cd nextjs-dashboard

# Check project structure
ls -la

# Expected to see:
# - cdk/          CDK infrastructure code
# - app/          Next.js application
# - amplify.yml   Amplify build configuration
```

### Step 4: Install CDK Dependencies

```bash
# Enter CDK directory
cd cdk

# Install dependencies
npm install

# Verify installation
npm list aws-cdk-lib
```

### Step 5: Bootstrap CDK

First-time CDK usage requires bootstrapping:

```bash
# Bootstrap CDK environment
cdk bootstrap aws://$AWS_ACCOUNT_ID/ap-southeast-2

# Expected output:
#  ⏳  Bootstrapping environment aws://123456789012/ap-southeast-2...
#  ✅  Environment aws://123456789012/ap-southeast-2 bootstrapped
```

This creates:
- S3 bucket (CDK asset storage)
- IAM roles (deployment permissions)
- CloudFormation stack (CDKToolkit)

## Deployment Steps

### Overview

Deployment is divided into 4 phases:

1. **Network Layer** (NetworkStack) - ~2 minutes
2. **Security Layer** (SecretsStack) - ~1 minute
3. **Database Layer** (DatabaseStack) - ~10-15 minutes
4. **Application Layer** (AmplifyStack) - ~5-10 minutes

Total time: **Approximately 20-30 minutes**

### Phase 1: Preview Changes

Before actual deployment, first view the resources to be created:

```bash
cd cdk

# Synthesize CloudFormation templates
cdk synth

# View differences (first deployment will show all new resources)
cdk diff
```

Output example:
```
Stack NetworkStack
Resources
[+] AWS::EC2::VPC DashboardVPC DashboardVPCXXXXXXXX
[+] AWS::EC2::SecurityGroup DatabaseSecurityGroup XXXXX
...

Stack SecretsStack
Resources
[+] AWS::SecretsManager::Secret DBCredentials XXXXX
[+] AWS::SecretsManager::Secret AuthSecret XXXXX
...
```

### Phase 2: Deploy All Stacks

#### Option A: One-Click Deployment (Recommended)

```bash
# Deploy all stacks
cdk deploy --all --require-approval never

# Or interactive confirmation
cdk deploy --all
```

#### Option B: Step-by-Step Deployment

##### 2.1 Deploy Network Layer

```bash
cdk deploy NetworkStack

# Wait for completion
# ✅  NetworkStack

# Verify VPC creation
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=NextJS-Dashboard"
```

##### 2.2 Deploy Security Layer

```bash
cdk deploy SecretsStack

# Wait for completion
# ✅  SecretsStack

# Verify secret creation
aws secretsmanager list-secrets --region ap-southeast-2
```

##### 2.3 Deploy Database Layer

```bash
cdk deploy DatabaseStack

# This step takes 10-15 minutes
# Progress indicators:
# DatabaseStack: creating... [0/3]
# DatabaseStack: creating... [1/3]
# ...
# ✅  DatabaseStack

# Verify RDS instance
aws rds describe-db-instances \
  --region ap-southeast-2 \
  --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address]'
```

##### 2.4 Deploy Application Layer

```bash
cdk deploy AmplifyStack

# Wait for completion
# ✅  AmplifyStack

# Verify Amplify application
aws amplify list-apps --region ap-southeast-2
```

### Phase 3: Record Outputs

After deployment completion, CDK will output important information:

```bash
Outputs:
NetworkStack.VpcId = vpc-xxxxx
NetworkStack.DatabaseSecurityGroupId = sg-xxxxx
SecretsStack.DBCredentialsArn = arn:aws:secretsmanager:...
SecretsStack.AuthSecretArn = arn:aws:secretsmanager:...
DatabaseStack.DBEndpoint = xxx.rds.amazonaws.com
DatabaseStack.DBPort = 5432
DatabaseStack.DBName = dashboard_db
AmplifyStack.AmplifyAppId = dxxxxxxxxxxxxx
AmplifyStack.AmplifyDefaultDomain = dxxxxx.amplifyapp.com
AmplifyStack.CustomDomain = https://dashboard.draven.best
```

**Save these output values**, they will be needed for subsequent configuration.

### Phase 4: Wait for Initial Build

After deploying AmplifyStack, Amplify will automatically trigger the initial build:

```bash
# Check build status
aws amplify list-jobs \
  --app-id <amplify-app-id> \
  --branch-name main \
  --region ap-southeast-2

# Or visit Amplify console
echo "https://ap-southeast-2.console.aws.amazon.com/amplify/home?region=ap-southeast-2#/<app-id>"
```

Build phases:
1. **Provision** (1 minute) - Allocate build resources
2. **Build** (3-5 minutes) - Execute amplify.yml
3. **Deploy** (1-2 minutes) - Deploy to CDN
4. **Verify** (< 1 minute) - Health check

## Verification Testing

### 1. Check All Stack Status

```bash
# List all stacks
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE \
  --region ap-southeast-2 \
  --query 'StackSummaries[?contains(StackName, `Stack`)].{Name:StackName, Status:StackStatus}'
```

Expected output:
```json
[
  {
    "Name": "NetworkStack",
    "Status": "CREATE_COMPLETE"
  },
  {
    "Name": "SecretsStack",
    "Status": "CREATE_COMPLETE"
  },
  {
    "Name": "DatabaseStack",
    "Status": "CREATE_COMPLETE"
  },
  {
    "Name": "AmplifyStack",
    "Status": "CREATE_COMPLETE"
  }
]
```

### 2. Verify RDS Connection

```bash
# Get database credentials
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id nextjs-dashboard/db-credentials \
  --region ap-southeast-2 \
  --query SecretString \
  --output text)

DB_HOST=$(echo $DB_SECRET | jq -r .host)
DB_USER=$(echo $DB_SECRET | jq -r .username)
DB_PASS=$(echo $DB_SECRET | jq -r .password)
DB_NAME=$(echo $DB_SECRET | jq -r .dbname)

echo "Database: $DB_HOST"

# Test connection (requires psql client)
PGPASSWORD=$DB_PASS psql \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -c "SELECT version();"
```

If psql client is not available, use AWS Systems Manager Session Manager or EC2 bastion host.

### 3. Access Application

```bash
# Get Amplify domain
AMPLIFY_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name AmplifyStack \
  --region ap-southeast-2 \
  --query 'Stacks[0].Outputs[?OutputKey==`AmplifyDefaultDomain`].OutputValue' \
  --output text)

echo "Access: https://$AMPLIFY_DOMAIN"
```

Or directly access custom domain:
```
https://dashboard.draven.best
```

### 4. Initialize Database

```bash
# After first deployment, execute seed to initialize data
curl https://dashboard.draven.best/seed

# Expected response
{"message": "Database seeded successfully"}
```

### 5. Test Login

1. Visit https://dashboard.draven.best
2. View default user credentials:
   ```bash
   cat ../app/lib/placeholder-data.ts | grep -A 5 "const users"
   ```
3. Login with default credentials:
   - Email: user@nextmail.com
   - Password: 123456

### 6. Health Check Checklist

- [ ] All CloudFormation stacks status is CREATE_COMPLETE
- [ ] RDS instance status is available
- [ ] Amplify build status is SUCCEED
- [ ] Secrets exist in Secrets Manager
- [ ] Application accessible via HTTPS
- [ ] Database seed successful
- [ ] User can successfully login
- [ ] Dashboard displays data

## Post-Deployment Configuration

### Configure DNS (if DNS is not in Route 53)

1. Get Amplify CNAME:
   ```bash
   aws amplify get-domain-association \
     --app-id <app-id> \
     --domain-name draven.best \
     --region ap-southeast-2
   ```

2. Add record at DNS provider:
   ```
   Type: CNAME
   Name: dashboard
   Value: <amplify-cname-value>
   TTL: 300
   ```

3. Wait for DNS propagation (up to 48 hours, usually 5-10 minutes)

4. Verify DNS:
   ```bash
   dig dashboard.draven.best
   nslookup dashboard.draven.best
   ```

### Configure Environment Variables (Manual)

Although CDK has automatically configured most environment variables, sensitive values need to be manually verified in Amplify console:

1. Visit Amplify console
2. Select app → main branch → Environment variables
3. Verify the following variables exist:
   - `POSTGRES_URL`
   - `DB_PASSWORD`
   - `AUTH_SECRET`
   - `AUTH_URL`

### Enable Amplify Notifications

Set up build notifications:

```bash
# Create SNS topic
aws sns create-topic --name amplify-build-notifications

# Subscribe email
aws sns subscribe \
  --topic-arn <topic-arn> \
  --protocol email \
  --notification-endpoint your-email@example.com

# Configure Amplify notifications
aws amplify update-app \
  --app-id <app-id> \
  --enable-notification \
  --notifications-arn <topic-arn>
```

### Configure Backup Plan

```bash
# Create backup plan
aws backup create-backup-plan \
  --backup-plan '{
    "BackupPlanName": "DashboardDailyBackup",
    "Rules": [{
      "RuleName": "DailyBackup",
      "TargetBackupVaultName": "Default",
      "ScheduleExpression": "cron(0 2 * * ? *)",
      "Lifecycle": {
        "DeleteAfterDays": 30
      }
    }]
  }'

# Assign RDS instance to backup plan
aws backup create-backup-selection \
  --backup-plan-id <plan-id> \
  --backup-selection '{
    "SelectionName": "RDSInstance",
    "IamRoleArn": "arn:aws:iam::<account>:role/service-role/AWSBackupDefaultServiceRole",
    "Resources": [
      "arn:aws:rds:ap-southeast-2:<account>:db:<db-identifier>"
    ]
  }'
```

### Set Up CloudWatch Alerts

See [CDK_ARCHITECTURE.md](./CDK_ARCHITECTURE.md#adding-monitoring-alerts)

## Troubleshooting

### Issue 1: CDK Bootstrap Failure

**Error**: `This stack cannot be deployed because of bootstrapping errors.`

**Cause**: CDK environment not initialized

**Solution**:
```bash
cdk bootstrap aws://$AWS_ACCOUNT_ID/ap-southeast-2 --force
```

### Issue 2: RDS Deployment Timeout

**Error**: `Resource creation cancelled`

**Cause**: RDS creation takes 10-15 minutes, may timeout

**Solution**:
```bash
# Check RDS status
aws rds describe-db-instances --region ap-southeast-2

# If status is creating, wait for completion and redeploy
cdk deploy DatabaseStack
```

### Issue 3: Amplify Build Failure

**Error**: Build failed

**Cause**: Various possibilities, need to check logs

**Solution**:
```bash
# Get build logs
aws amplify get-job \
  --app-id <app-id> \
  --branch-name main \
  --job-id <job-id> \
  --region ap-southeast-2

# Common issues:
# 1. pnpm installation failure → Check package.json
# 2. Missing environment variables → Check in Amplify console
# 3. Build timeout → Increase timeout settings
```

### Issue 4: Database Connection Failure

**Error**: Application cannot connect to database

**Check Steps**:

1. RDS status:
   ```bash
   aws rds describe-db-instances \
     --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address]'
   ```

2. Security group rules:
   ```bash
   aws ec2 describe-security-groups --group-ids <db-sg-id>
   ```

3. Environment variables:
   Check in Amplify console if POSTGRES_URL is correct

4. Secret content:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id nextjs-dashboard/db-credentials
   ```

### Issue 5: Domain Not Accessible

**Error**: DNS_PROBE_FINISHED_NXDOMAIN

**Check Steps**:

1. DNS records:
   ```bash
   dig dashboard.draven.best
   ```

2. Amplify domain status:
   Check domain verification status in Amplify console

3. SSL certificate:
   Confirm *.draven.best certificate is in ap-southeast-2 region

**Solution**: Wait for DNS propagation (up to 48 hours)

### Issue 6: Seed Failure

**Error**: Database seed error

**Cause**: UUID extension or data conflicts

**Solution**:
```bash
# Method 1: Reset database
curl https://dashboard.draven.best/reset
curl https://dashboard.draven.best/seed

# Method 2: Manually connect to database and clean up
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME
DROP TABLE IF EXISTS invoices, customers, users, revenue CASCADE;
\q

# Then reseed
curl https://dashboard.draven.best/seed
```

### Getting Help

If the above methods cannot resolve the issue:

1. **View CloudFormation Events**:
   ```bash
   aws cloudformation describe-stack-events \
     --stack-name <stack-name> \
     --max-items 20
   ```

2. **View CloudWatch Logs**:
   - RDS logs: `/aws/rds/instance/<instance-id>/postgresql`
   - Amplify logs: Check in console

3. **Contact Support**:
   - AWS Support (if you have support plan)
   - GitHub Issues
   - AWS Forums

## Operations Management

### Daily Operations

#### View Application Logs

```bash
# Amplify build logs
aws amplify list-jobs --app-id <app-id> --branch-name main

# RDS logs
aws rds download-db-log-file-portion \
  --db-instance-identifier <instance-id> \
  --log-file-name error/postgresql.log.2025-01-18-00 \
  --output text
```

#### Update Application Code

```bash
# After local code modifications
git add .
git commit -m "Update feature X"
git push origin main

# Amplify automatically triggers build
# Check build status
aws amplify list-jobs --app-id <app-id> --branch-name main
```

#### Manually Trigger Build

```bash
aws amplify start-job \
  --app-id <app-id> \
  --branch-name main \
  --job-type RELEASE
```

#### Database Maintenance

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier <instance-id> \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier <instance-id>

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier <new-instance-id> \
  --db-snapshot-identifier <snapshot-id>
```

### Scaling Operations

#### Upgrade RDS Instance

```bash
# Modify instance type
aws rds modify-db-instance \
  --db-instance-identifier <instance-id> \
  --db-instance-class db.t3.small \
  --apply-immediately

# Or apply during maintenance window
aws rds modify-db-instance \
  --db-instance-identifier <instance-id> \
  --db-instance-class db.t3.small \
  --no-apply-immediately
```

#### Increase Storage Space

```bash
aws rds modify-db-instance \
  --db-instance-identifier <instance-id> \
  --allocated-storage 40 \
  --apply-immediately
```

### Resource Cleanup

**Warning**: This operation is irreversible and will delete all data!

```bash
# Delete all stacks
cdk destroy --all

# Confirm deletion
# Are you sure you want to delete: AmplifyStack, DatabaseStack, SecretsStack, NetworkStack (y/n)? y

# Manual cleanup of residual resources
# 1. RDS snapshots
aws rds describe-db-snapshots --query 'DBSnapshots[].DBSnapshotIdentifier'
aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>

# 2. Secrets Manager secrets
aws secretsmanager delete-secret \
  --secret-id nextjs-dashboard/db-credentials \
  --force-delete-without-recovery

# 3. CloudWatch log groups
aws logs describe-log-groups --query 'logGroups[].logGroupName' | grep dashboard
aws logs delete-log-group --log-group-name <log-group-name>
```

## Checklist

Pre-deployment checks:
- [ ] AWS CLI configured
- [ ] CDK CLI installed
- [ ] GitHub Token created
- [ ] Environment variables set
- [ ] Bootstrap completed

Post-deployment checks:
- [ ] All stacks deployed successfully
- [ ] RDS status is available
- [ ] Amplify build successful
- [ ] Application accessible
- [ ] Database initialized
- [ ] User can login

Production environment checks:
- [ ] DNS configured
- [ ] SSL certificate valid
- [ ] Backup plan enabled
- [ ] Monitoring alerts configured
- [ ] Cost alerts set up

## Next Steps

After completing deployment:

1. 📖 Read [AWS_DEPLOYMENT_PLAN.md](./AWS_DEPLOYMENT_PLAN.md) to understand architecture details
2. 📊 Review [CDK_ARCHITECTURE.md](./CDK_ARCHITECTURE.md) to learn CDK best practices
3. 🔐 Configure IAM minimum permissions
4. 📧 Set up notifications and alerts
5. 💰 Review cost reports
6. 🧪 Perform load testing
7. 📝 Write operations documentation

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Maintainer**: Draven