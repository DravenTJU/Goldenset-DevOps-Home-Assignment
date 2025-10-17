import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class SecretsStack extends cdk.Stack {
  public readonly dbCredentials: secretsmanager.Secret;
  public readonly authSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create database credentials secret
    this.dbCredentials = new secretsmanager.Secret(this, 'DBCredentials', {
      secretName: 'nextjs-dashboard/db-credentials',
      description: 'Database credentials for NextJS Dashboard',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dashboard_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'', // Exclude characters that may cause issues
        passwordLength: 32,
      },
    });

    // Create NextAuth secret
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

    // Output secret ARNs
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

    // Tags
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
  }
}
