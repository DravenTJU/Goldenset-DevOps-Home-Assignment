# CDK Architecture Description - Next.js Dashboard

This document provides detailed explanations of the AWS CDK infrastructure code architecture, design decisions, and best practices.

## Table of Contents

- [CDK Stack Architecture](#cdk-stack-architecture)
- [Dependencies](#dependencies)
- [Resource Naming Conventions](#resource-naming-conventions)
- [Stack Details](#stack-details)
- [Configuration Management](#configuration-management)
- [Cost Optimization Strategies](#cost-optimization-strategies)
- [Scaling Guide](#scaling-guide)

## CDK Stack Architecture

### Stack Organization Structure

```
NextJS Dashboard Application
│
├── NetworkStack (Network Layer)
│   ├── VPC
│   ├── Subnets
│   ├── Security Groups
│   └── VPC Endpoints
│
├── SecretsStack (Security Layer)
│   ├── Database Credentials
│   └── Authentication Secrets
│
├── DatabaseStack (Data Layer)
│   ├── RDS Instance
│   ├── Parameter Group
│   └── Monitoring Configuration
│
└── AmplifyStack (Application Layer)
    ├── Amplify Application
    ├── Branch Configuration
    ├── Domain Mapping
    └── Environment Variable Injection
```

### Design Principles

1. **Separation of Concerns**: Each Stack handles a single responsibility
2. **Loose Coupling**: Stacks connect through outputs/inputs
3. **Reusability**: Stacks can be used for multi-environment deployments
4. **Security First**: Secrets and credentials managed independently
5. **Cost Conscious**: Optimize free tier usage

## Dependencies

### Stack Dependency Graph

```
SecretsStack ──┐
               ├──> DatabaseStack ──┐
NetworkStack ──┘                    ├──> AmplifyStack
SecretsStack ────────────────────────┘
```

### Deployment Order

```bash
# Phase 1: Independent Stacks (can be parallel)
NetworkStack    # Create VPC and network resources
SecretsStack    # Create secrets

# Phase 2: Database Stack (depends on Phase 1)
DatabaseStack   # Requires NetworkStack and SecretsStack

# Phase 3: Application Stack (depends on Phase 2)
AmplifyStack    # Requires DatabaseStack and SecretsStack
```

### Dependency Declaration

```typescript
// cdk/bin/app.ts
databaseStack.addDependency(networkStack);
databaseStack.addDependency(secretsStack);
amplifyStack.addDependency(databaseStack);
amplifyStack.addDependency(secretsStack);
```

## Resource Naming Conventions

### Naming Pattern

All resources follow this naming pattern:

```
<Project>-<Environment>-<Service>-<Resource>-<Suffix>
```

Examples:
- VPC: `Dashboard-Production-VPC`
- RDS: `Dashboard-Production-PostgreSQL`
- Security Group: `Dashboard-Production-DB-SG`

### CDK Logical IDs

```typescript
// Format: <ResourceType><Purpose>
new ec2.Vpc(this, 'DashboardVPC', { ... });           // ✅ Clear
new ec2.SecurityGroup(this, 'DatabaseSecurityGroup'); // ✅ Descriptive
new rds.DatabaseInstance(this, 'PostgresInstance');   // ✅ Explicit
```

### Tagging Strategy

All resources are automatically tagged:

```typescript
cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
cdk.Tags.of(this).add('Environment', 'Production');
cdk.Tags.of(this).add('ManagedBy', 'AWS-CDK');
```

Purposes:
- **Cost Allocation**: Track costs by project and environment
- **Resource Management**: Quickly identify and filter resources
- **Compliance**: Meet organizational tagging requirements

## Stack Details

### NetworkStack

**Responsibility**: Provide network infrastructure

**Resources**:
```typescript
// VPC Configuration
const vpc = new ec2.Vpc(this, 'DashboardVPC', {
  maxAzs: 2,
  natGateways: 0,         // No NAT - saves $32/month
  subnetConfiguration: [
    {
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,
    },
    {
      name: 'Isolated',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      cidrMask: 24,
    },
  ],
});
```

**Design Decisions**:

| Decision | Reason | Cost Impact |
|----------|--------|-------------|
| No NAT Gateway | Amplify doesn't need it | -$32/month |
| PRIVATE_ISOLATED | RDS doesn't need internet access | $0 |
| S3 VPC Endpoint | Reduce data transfer costs | -$0.01/GB |

**Outputs**:
```typescript
vpc                    // VPC object
dbSecurityGroup        // RDS security group
amplifySecurityGroup   // Amplify security group
```

### SecretsStack

**Responsibility**: Manage sensitive credentials

**Resources**:
```typescript
// Database credentials
const dbCredentials = new rds.DatabaseSecret(this, 'DBCredentials', {
  username: 'dashboard_admin',
  secretName: 'nextjs-dashboard/db-credentials',
  excludeCharacters: '"@/\\\'',  // Avoid special character issues
});

// NextAuth secret
const authSecret = new secretsmanager.Secret(this, 'AuthSecret', {
  secretName: 'nextjs-dashboard/auth-secret',
  generateSecretString: {
    passwordLength: 32,
    excludeCharacters: '"@/\\\'',
  },
});
```

**Secret Format**:

Database credentials JSON:
```json
{
  "username": "dashboard_admin",
  "password": "generated strong password",
  "engine": "postgres",
  "host": "rds endpoint",
  "port": 5432,
  "dbname": "dashboard_db"
}
```

**Security Features**:
- ✅ Automatic password generation (meets complexity requirements)
- ✅ KMS encrypted storage
- ✅ Version control
- ✅ Audit logging
- 🔄 Support for automatic rotation (requires Lambda configuration)

**Cost**: $0.40/month (2 secrets)

### DatabaseStack

**Responsibility**: Provide PostgreSQL database

**Core Configuration**:
```typescript
const dbInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_16_6,
  }),
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.MICRO    // Free tier
  ),
  credentials: rds.Credentials.fromSecret(dbCredentials),
  allocatedStorage: 20,        // 20GB - free tier maximum
  storageType: rds.StorageType.GP2,
  multiAz: false,              // Single AZ - free tier
  backupRetention: cdk.Duration.days(7),
  deletionProtection: false,   // Development environment, recommend true for production
});
```

**Parameter Group**:
```typescript
const parameterGroup = new rds.ParameterGroup(this, 'DBParameterGroup', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_16_6,
  }),
  parameters: {
    'rds.force_ssl': '0',  // Simplified for development, recommend '1' for production
  },
});
```

**Monitoring Configuration**:
```typescript
monitoringInterval: cdk.Duration.seconds(60),  // Basic monitoring
cloudwatchLogsExports: ['postgresql'],         // Export logs
enablePerformanceInsights: false,              // Not supported in free tier
```

**Backup Strategy**:
- **Automatic Backup**: Daily
- **Retention Period**: 7 days
- **Backup Window**: AWS auto-selected
- **Maintenance Window**: AWS auto-selected
- **Deletion Protection**: Off (development environment)

**Cost**: $0 first year / $15-18 subsequent

### AmplifyStack

**Responsibility**: Host and deploy Next.js application

**Core Configuration**:
```typescript
const amplifyApp = new amplify.App(this, 'DashboardApp', {
  appName: 'nextjs-dashboard',
  sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
    owner: 'your-username',
    repository: 'nextjs-dashboard',
    oauthToken: cdk.SecretValue.unsafePlainText(githubToken),
  }),
  platform: amplify.Platform.WEB_COMPUTE,  // SSR support
  autoBranchDeletion: true,
});
```

**Environment Variable Injection**:
```typescript
// Static values
amplifyApp.addEnvironment('POSTGRES_HOST', dbEndpoint);
amplifyApp.addEnvironment('POSTGRES_PORT', '5432');

// Secrets Manager references
amplifyApp.addEnvironment(
  'DB_PASSWORD',
  `{{resolve:secretsmanager:${dbCredentialsArn}:SecretString:password}}`
);
```

**Build Specification**:
- **Frontend**: pnpm install → pnpm build
- **Cache**: node_modules, .next/cache
- **Artifacts**: .next directory
- **Timeout**: Default 15 minutes

**Domain Configuration**:
```typescript
const domain = amplifyApp.addDomain('draven.best');
domain.mapSubDomain(mainBranch, 'dashboard');
// Result: dashboard.draven.best
```

**Cost**: $15-25/month (build minutes + hosting)

## Configuration Management

### Environment Configuration

Support multi-environment configuration through CDK context:

```typescript
// cdk.json
{
  "context": {
    "dev": {
      "instanceType": "t3.micro",
      "multiAz": false,
      "deletionProtection": false
    },
    "prod": {
      "instanceType": "t3.small",
      "multiAz": true,
      "deletionProtection": true
    }
  }
}
```

Usage:
```bash
cdk deploy --context env=dev
cdk deploy --context env=prod
```

### Parameterized Configuration

Externalize configuration through environment variables:

```typescript
// cdk/bin/app.ts
const config = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION || 'ap-southeast-2',
  githubToken: process.env.GITHUB_TOKEN,
  githubRepo: process.env.GITHUB_REPO,
};
```

### Configuration Validation

Validate required configuration before deployment:

```typescript
if (!githubToken) {
  throw new Error('GITHUB_TOKEN environment variable not set');
}

if (!config.account) {
  throw new Error('AWS account ID not configured');
}
```

## Cost Optimization Strategies

### Free Tier Utilization

| Service | Free Allowance | Optimization Measures |
|---------|---------------|----------------------|
| RDS | 750h/month t3.micro | Single instance single AZ |
| Data Transfer | 1GB outbound | Use VPC endpoints |
| Amplify | 1000 build minutes | Cache dependencies |
| Secrets Manager | Free first 30 days | Minimize secret count |

### Architecture Optimization

#### 1. Network Costs
```typescript
// ❌ $32/month
natGateways: 1

// ✅ $0
natGateways: 0
subnetType: ec2.SubnetType.PRIVATE_ISOLATED
```

#### 2. Database Costs
```typescript
// ❌ $30+/month
multiAz: true
instanceType: ec2.InstanceType.of(
  ec2.InstanceClass.T3,
  ec2.InstanceSize.SMALL
)

// ✅ Free tier
multiAz: false
instanceType: ec2.InstanceType.of(
  ec2.InstanceClass.T3,
  ec2.InstanceSize.MICRO
)
```

#### 3. Monitoring Costs
```typescript
// ❌ $7/month
enablePerformanceInsights: true

// ✅ $0
enablePerformanceInsights: false
monitoringInterval: cdk.Duration.seconds(60)  // Basic monitoring
```

### Operational Optimization

#### Scheduled RDS Start/Stop (Development Environment)
```bash
# Start script
aws rds start-db-instance --db-instance-identifier <id>

# Stop script (max 7 days)
aws rds stop-db-instance --db-instance-identifier <id>
```

#### Build Cache Optimization
```yaml
# amplify.yml
cache:
  paths:
    - node_modules/**/*
    - .next/cache/**/*
    - .pnpm-store/**/*  # pnpm cache
```

### Cost Monitoring

Set up budget alerts:
```typescript
const budget = new budgets.CfnBudget(this, 'MonthlyBudget', {
  budget: {
    budgetName: 'NextJS-Dashboard-Monthly',
    budgetLimit: {
      amount: 50,
      unit: 'USD',
    },
    timeUnit: 'MONTHLY',
    budgetType: 'COST',
  },
  notificationsWithSubscribers: [{
    notification: {
      notificationType: 'ACTUAL',
      comparisonOperator: 'GREATER_THAN',
      threshold: 80,  // 80% alert
    },
    subscribers: [{
      subscriptionType: 'EMAIL',
      address: 'admin@example.com',
    }],
  }],
});
```

## Scaling Guide

### Adding New Stack

1. **Create Stack File**
   ```typescript
   // cdk/lib/cache-stack.ts
   export class CacheStack extends cdk.Stack {
     constructor(scope: Construct, id: string, props?: cdk.StackProps) {
       super(scope, id, props);
       // Resource definitions
     }
   }
   ```

2. **Register in app.ts**
   ```typescript
   const cacheStack = new CacheStack(app, 'CacheStack', { env });
   cacheStack.addDependency(networkStack);
   ```

3. **Deploy**
   ```bash
   cdk deploy CacheStack
   ```

### Adding ElastiCache (Redis)

For session storage and caching:

```typescript
// cdk/lib/cache-stack.ts
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

const subnetGroup = new elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
  description: 'Subnet group for Redis',
  subnetIds: vpc.isolatedSubnets.map(s => s.subnetId),
});

const redis = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
  cacheNodeType: 'cache.t3.micro',
  engine: 'redis',
  numCacheNodes: 1,
  cacheSubnetGroupName: subnetGroup.ref,
  vpcSecurityGroupIds: [securityGroup.securityGroupId],
});
```

Update AmplifyStack environment variables:
```typescript
amplifyApp.addEnvironment('REDIS_URL', `redis://${redis.attrRedisEndpointAddress}:6379`);
```

Cost: ~$13/month (cache.t3.micro)

### Adding CloudFront CDN

Although Amplify has built-in CDN, you can add custom CloudFront:

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

const distribution = new cloudfront.Distribution(this, 'CDN', {
  defaultBehavior: {
    origin: new origins.HttpOrigin(amplifyApp.defaultDomain),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
  domainNames: ['dashboard.draven.best'],
  certificate: certificate,
});
```

Advantages:
- More granular cache control
- More geographic nodes
- WAF integration

Cost: ~$1-10/month (depends on traffic)

### Multi-Region Deployment

Cross-region high availability architecture:

```typescript
// Primary region: ap-southeast-2
const primaryStack = new DatabaseStack(app, 'PrimaryDB', {
  env: { region: 'ap-southeast-2' },
});

// Secondary region: ap-southeast-1
const secondaryStack = new DatabaseStack(app, 'SecondaryDB', {
  env: { region: 'ap-southeast-1' },
  replicateFrom: primaryStack.dbInstance,
});
```

Requires configuration:
- Route 53 health checks
- Cross-region replication
- Failover strategy

Cost increase: ~100% (double resources)

### Adding Monitoring Alerts

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';

// SNS topic
const topic = new sns.Topic(this, 'AlertTopic');

// RDS CPU alert
const cpuAlarm = new cloudwatch.Alarm(this, 'DBHighCPU', {
  metric: dbInstance.metricCPUUtilization(),
  threshold: 80,
  evaluationPeriods: 2,
  alarmDescription: 'RDS CPU exceeds 80%',
});
cpuAlarm.addAlarmAction(new actions.SnsAction(topic));

// RDS storage alert
const storageAlarm = new cloudwatch.Alarm(this, 'DBLowStorage', {
  metric: dbInstance.metricFreeStorageSpace(),
  threshold: 2 * 1024 * 1024 * 1024,  // 2GB
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  evaluationPeriods: 1,
});
storageAlarm.addAlarmAction(new actions.SnsAction(topic));
```

Cost: $0.10/alert/month

## Best Practices

### Development Process

1. **Local Testing**: Validate code locally first
2. **CDK Diff**: Review changes before deployment
3. **Step-by-step Deployment**: Deploy critical changes stack by stack
4. **Verification Testing**: Verify after each stack deployment
5. **Rollback Plan**: Prepare quick rollback strategy

### Code Organization

```
cdk/
├── bin/
│   └── app.ts              # Application entry, stack orchestration
├── lib/
│   ├── network-stack.ts    # Network layer
│   ├── secrets-stack.ts    # Security layer
│   ├── database-stack.ts   # Data layer
│   ├── amplify-stack.ts    # Application layer
│   └── constructs/         # Reusable constructs (optional)
├── test/                   # Unit tests (optional)
├── package.json
├── tsconfig.json
└── cdk.json
```

### Version Control

```gitignore
# CDK outputs
cdk.out/
.cdk.staging/

# Compiled artifacts
*.js
*.d.ts

# Dependencies
node_modules/

# Environment variables
.env
```

### Documentation Maintenance

Each Stack should include:
- 📝 Top comment explaining purpose
- 📊 Resource inventory
- ⚠️ Important configuration notes
- 💰 Cost impact
- 🔗 Dependencies

Example:
```typescript
/**
 * DatabaseStack - Manage RDS PostgreSQL database
 *
 * Resources:
 * - RDS instance (db.t3.micro, single AZ)
 * - Parameter group (PostgreSQL 16.6)
 * - CloudWatch log group
 *
 * Dependencies:
 * - NetworkStack (VPC and security groups)
 * - SecretsStack (database credentials)
 *
 * Cost: $0 first year / ~$15/month subsequent
 */
export class DatabaseStack extends cdk.Stack {
  // ...
}
```

## Troubleshooting

### CDK Synthesis Failure

```bash
# Clear cache
rm -rf cdk.out

# Reinstall dependencies
cd cdk && rm -rf node_modules && npm install

# Check TypeScript errors
npm run build
```

### Deployment Stuck

```bash
# View CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name DatabaseStack \
  --region ap-southeast-2

# Cancel deployment
cdk destroy DatabaseStack
```

### Stack Dependency Errors

Ensure dependency declarations are correct:
```typescript
// ❌ Wrong
const amplifyStack = new AmplifyStack(app, 'AmplifyStack', {
  dbEndpoint: databaseStack.dbEndpoint,  // May not be initialized
});

// ✅ Correct
const amplifyStack = new AmplifyStack(app, 'AmplifyStack', {
  dbEndpoint: databaseStack.dbEndpoint,
});
amplifyStack.addDependency(databaseStack);  // Explicit dependency declaration
```

## Reference Resources

- [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Maintainer**: Draven