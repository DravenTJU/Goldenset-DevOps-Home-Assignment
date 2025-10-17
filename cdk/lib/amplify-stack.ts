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
  githubToken: string; // Must be passed through environment variables or parameters
  githubRepo: string;  // Format: owner/repo
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

    // Create Amplify application
    this.amplifyApp = new amplify.App(this, 'DashboardApp', {
      appName: 'nextjs-dashboard',
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: githubRepo.split('/')[0],
        repository: githubRepo.split('/')[1],
        oauthToken: cdk.SecretValue.unsafePlainText(githubToken),
      }),
      platform: amplify.Platform.WEB_COMPUTE, // SSR support
      autoBranchDeletion: true,
      // Use amplify.yml from repository instead of inline buildSpec
    });

    // Create main branch
    this.mainBranch = this.amplifyApp.addBranch(branchName, {
      autoBuild: true,
      stage: 'PRODUCTION',
      branchName,
    });

    // Add environment variables
    // Read database password from Secrets Manager
    const dbPasswordArn = dbCredentials.secretArn;
    const authSecretArn = authSecret.secretArn;

    // Database connection environment variables
    this.amplifyApp.addEnvironment('POSTGRES_HOST', dbEndpoint);
    this.amplifyApp.addEnvironment('POSTGRES_PORT', dbPort);
    this.amplifyApp.addEnvironment('POSTGRES_DATABASE', dbName);
    this.amplifyApp.addEnvironment('POSTGRES_USER', dbCredentials.secretValueFromJson('username').unsafeUnwrap());

    // Build complete PostgreSQL URL
    // Note: Amplify will resolve these values at runtime
    const postgresUrl = `postgresql://\${POSTGRES_USER}:\${DB_PASSWORD}@${dbEndpoint}:${dbPort}/${dbName}`;
    this.amplifyApp.addEnvironment('POSTGRES_URL', postgresUrl);
    this.amplifyApp.addEnvironment('POSTGRES_PRISMA_URL', postgresUrl);
    this.amplifyApp.addEnvironment('POSTGRES_URL_NON_POOLING', postgresUrl);

    // NextAuth environment variables
    this.amplifyApp.addEnvironment('AUTH_URL', `https://dashboard.draven.best/api/auth`);

    // Add sensitive environment variable references (requires manual configuration in Amplify console)
    // Add placeholders here to remind manual setup
    this.amplifyApp.addEnvironment('DB_PASSWORD', `{{resolve:secretsmanager:${dbPasswordArn}:SecretString:password}}`);
    this.amplifyApp.addEnvironment('AUTH_SECRET', `{{resolve:secretsmanager:${authSecretArn}:SecretString:secret}}`);

    // Add IAM permissions for Amplify to access Secrets Manager
    const amplifyRole = new iam.Role(this, 'AmplifyRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      description: 'Role for Amplify to access secrets',
    });

    dbCredentials.grantRead(amplifyRole);
    authSecret.grantRead(amplifyRole);

    // Configure custom domain
    const domain = this.amplifyApp.addDomain('draven.best', {
      enableAutoSubdomain: false,
      autoSubdomainCreationPatterns: [],
    });

    // Map subdomain to main branch
    domain.mapSubDomain(this.mainBranch, 'dashboard');

    // Outputs
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

    // Tags
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
  }
}
