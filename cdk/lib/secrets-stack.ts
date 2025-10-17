import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class SecretsStack extends cdk.Stack {
  public readonly dbCredentials: secretsmanager.Secret;
  public readonly authSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 创建数据库凭证密钥
    this.dbCredentials = new secretsmanager.Secret(this, 'DBCredentials', {
      secretName: 'nextjs-dashboard/db-credentials',
      description: 'Database credentials for NextJS Dashboard',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dashboard_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'', // 排除可能导致问题的字符
        passwordLength: 32,
      },
    });

    // 创建NextAuth密钥
    this.authSecret = new secretsmanager.Secret(this, 'AuthSecret', {
      secretName: 'nextjs-dashboard/auth-secret',
      description: 'NextAuth authentication secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'auth' }),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\\'',
        passwordLength: 32,
      },
    });

    // 输出密钥ARN
    new cdk.CfnOutput(this, 'DBCredentialsArn', {
      value: this.dbCredentials.secretArn,
      description: 'Database credentials secret ARN',
      exportName: 'DashboardDbCredentialsArn',
    });

    new cdk.CfnOutput(this, 'AuthSecretArn', {
      value: this.authSecret.secretArn,
      description: 'NextAuth secret ARN',
      exportName: 'DashboardAuthSecretArn',
    });

    // 标签
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
  }
}
