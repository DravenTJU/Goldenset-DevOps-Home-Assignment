#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { SecretsStack } from '../lib/secrets-stack';
import { DatabaseStack } from '../lib/database-stack';
import { AmplifyStack } from '../lib/amplify-stack';

const app = new cdk.App();

// 配置AWS区域和账户
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-southeast-2', // 悉尼区域
};

// 从环境变量或上下文获取GitHub配置
const githubToken = process.env.GITHUB_TOKEN || app.node.tryGetContext('githubToken');
const githubRepo = process.env.GITHUB_REPO || app.node.tryGetContext('githubRepo') || 'your-username/nextjs-dashboard';

if (!githubToken) {
  console.warn('⚠️  警告: 未设置GITHUB_TOKEN环境变量。AmplifyStack将无法部署。');
  console.warn('   设置方法: export GITHUB_TOKEN=your_github_personal_access_token');
}

// 1. 创建网络基础设施
const networkStack = new NetworkStack(app, 'NetworkStack', {
  env,
  description: 'VPC and networking infrastructure for Next.js Dashboard',
});

// 2. 创建密钥管理
const secretsStack = new SecretsStack(app, 'SecretsStack', {
  env,
  description: 'Secrets Manager for database and authentication',
});

// 3. 创建数据库
const databaseStack = new DatabaseStack(app, 'DatabaseStack', {
  env,
  description: 'RDS PostgreSQL database instance',
  vpc: networkStack.vpc,
  securityGroup: networkStack.dbSecurityGroup,
  dbCredentials: secretsStack.dbCredentials,
});

// 添加依赖关系
databaseStack.addDependency(networkStack);
databaseStack.addDependency(secretsStack);

// 4. 创建Amplify应用（仅在提供GitHub token时）
if (githubToken) {
  const amplifyStack = new AmplifyStack(app, 'AmplifyStack', {
    env,
    description: 'AWS Amplify hosting for Next.js Dashboard',
    dbEndpoint: databaseStack.dbEndpoint,
    dbPort: databaseStack.dbPort,
    dbName: databaseStack.dbName,
    dbCredentials: secretsStack.dbCredentials,
    authSecret: secretsStack.authSecret,
    githubToken,
    githubRepo,
    branchName: 'main',
  });

  // 添加依赖关系
  amplifyStack.addDependency(databaseStack);
  amplifyStack.addDependency(secretsStack);
} else {
  console.warn('⚠️  跳过AmplifyStack部署（缺少GITHUB_TOKEN）');
  console.warn('   部署网络、密钥和数据库Stack后，设置GITHUB_TOKEN并单独部署Amplify:');
  console.warn('   export GITHUB_TOKEN=your_token && cdk deploy AmplifyStack');
}

// 添加全局标签
cdk.Tags.of(app).add('ManagedBy', 'AWS-CDK');
cdk.Tags.of(app).add('Project', 'NextJS-Dashboard');

app.synth();
