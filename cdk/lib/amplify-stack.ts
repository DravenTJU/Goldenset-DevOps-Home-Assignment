import * as cdk from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface AmplifyStackProps extends cdk.StackProps {
  dbEndpoint: string;
  dbPort: string;
  dbName: string;
  dbCredentials: secretsmanager.Secret;
  authSecret: secretsmanager.Secret;
  githubToken: string; // 需要通过环境变量或参数传入
  githubRepo: string;  // 格式: owner/repo
  branchName?: string;
}

export class AmplifyStack extends cdk.Stack {
  public readonly amplifyApp: amplify.App;
  public readonly mainBranch: amplify.Branch;

  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, props);

    const {
      dbEndpoint,
      dbPort,
      dbName,
      dbCredentials,
      authSecret,
      githubToken,
      githubRepo,
      branchName = 'main',
    } = props;

    // 创建Amplify应用
    this.amplifyApp = new amplify.App(this, 'DashboardApp', {
      appName: 'nextjs-dashboard',
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: githubRepo.split('/')[0],
        repository: githubRepo.split('/')[1],
        oauthToken: cdk.SecretValue.unsafePlainText(githubToken),
      }),
      platform: amplify.Platform.WEB_COMPUTE, // SSR支持
      autoBranchDeletion: true,
      customRules: [
        // 处理Next.js的动态路由
        {
          source: '/<*>',
          target: '/index.html',
          status: amplify.RedirectStatus.NOT_FOUND_REWRITE,
        },
      ],
      buildSpec: cdk.aws_codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: '.',
            frontend: {
              phases: {
                preBuild: {
                  commands: [
                    'npm install -g pnpm',
                    'pnpm install',
                  ],
                },
                build: {
                  commands: [
                    'pnpm build',
                  ],
                },
              },
              artifacts: {
                baseDirectory: '.next',
                files: ['**/*'],
              },
              cache: {
                paths: [
                  'node_modules/**/*',
                  '.next/cache/**/*',
                ],
              },
            },
          },
        ],
      }),
    });

    // 创建主分支
    this.mainBranch = this.amplifyApp.addBranch(branchName, {
      autoBuild: true,
      stage: 'PRODUCTION',
      branchName,
    });

    // 添加环境变量
    // 从Secrets Manager读取数据库密码
    const dbPasswordArn = dbCredentials.secretArn;
    const authSecretArn = authSecret.secretArn;

    // 数据库连接环境变量
    this.amplifyApp.addEnvironment('POSTGRES_HOST', dbEndpoint);
    this.amplifyApp.addEnvironment('POSTGRES_PORT', dbPort);
    this.amplifyApp.addEnvironment('POSTGRES_DATABASE', dbName);
    this.amplifyApp.addEnvironment('POSTGRES_USER', dbCredentials.secretValueFromJson('username').unsafeUnwrap());

    // 构建完整的PostgreSQL URL
    // 注意: Amplify会在运行时解析这些值
    const postgresUrl = `postgresql://\${POSTGRES_USER}:\${DB_PASSWORD}@${dbEndpoint}:${dbPort}/${dbName}`;
    this.amplifyApp.addEnvironment('POSTGRES_URL', postgresUrl);
    this.amplifyApp.addEnvironment('POSTGRES_PRISMA_URL', postgresUrl);
    this.amplifyApp.addEnvironment('POSTGRES_URL_NON_POOLING', postgresUrl);

    // NextAuth环境变量
    this.amplifyApp.addEnvironment('AUTH_URL', `https://dashboard.draven.best/api/auth`);

    // 添加敏感环境变量的引用(需要手动在Amplify控制台配置)
    // 这里添加占位符,提醒需要手动设置
    this.amplifyApp.addEnvironment('DB_PASSWORD', `{{resolve:secretsmanager:${dbPasswordArn}:SecretString:password}}`);
    this.amplifyApp.addEnvironment('AUTH_SECRET', `{{resolve:secretsmanager:${authSecretArn}:SecretString:secret}}`);

    // 为Amplify添加IAM权限以访问Secrets Manager
    const amplifyRole = new iam.Role(this, 'AmplifyRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      description: 'Role for Amplify to access secrets',
    });

    dbCredentials.grantRead(amplifyRole);
    authSecret.grantRead(amplifyRole);

    // 配置自定义域名
    const domain = this.amplifyApp.addDomain('draven.best', {
      enableAutoSubdomain: false,
      autoSubdomainCreationPatterns: [],
    });

    // 映射子域名到主分支
    domain.mapSubDomain(this.mainBranch, 'dashboard');

    // 输出
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: this.amplifyApp.appId,
      description: 'Amplify App ID',
      exportName: 'DashboardAmplifyAppId',
    });

    new cdk.CfnOutput(this, 'AmplifyDefaultDomain', {
      value: this.amplifyApp.defaultDomain,
      description: 'Amplify default domain',
    });

    new cdk.CfnOutput(this, 'CustomDomain', {
      value: 'https://dashboard.draven.best',
      description: 'Custom domain URL',
    });

    new cdk.CfnOutput(this, 'BranchName', {
      value: this.mainBranch.branchName,
      description: 'Main branch name',
    });

    // 标签
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
  }
}
