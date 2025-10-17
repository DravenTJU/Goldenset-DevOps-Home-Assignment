import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  dbCredentials: secretsmanager.Secret;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbEndpoint: string;
  public readonly dbPort: string;
  public readonly dbName: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { vpc, securityGroup, dbCredentials } = props;

    // Database name
    this.dbName = 'dashboard_db';

    // Create parameter group to enable uuid-ossp extension
    const parameterGroup = new rds.ParameterGroup(this, 'DBParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      description: 'Parameter group for NextJS Dashboard PostgreSQL',
      parameters: {
        'rds.force_ssl': '0', // 简化开发,生产环境建议启用
      },
    });

    // Create RDS PostgreSQL instance - free tier configuration
    this.dbInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO // db.t3.micro - free tier
      ),
      credentials: rds.Credentials.fromUsername(
        dbCredentials.secretValueFromJson('username').unsafeUnwrap(),
        {
          password: dbCredentials.secretValueFromJson('password'),
        }
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [securityGroup],
      databaseName: this.dbName,
      allocatedStorage: 20, // 20GB - free tier maximum
      storageType: rds.StorageType.GP2, // General purpose SSD
      multiAz: false, // Single AZ - free tier
      publiclyAccessible: false, // Not publicly accessible
      backupRetention: cdk.Duration.days(7), // 7-day backup retention
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // Create snapshot on deletion
      deletionProtection: false, // Can be deleted in dev environment, recommend true for production
      parameterGroup,
      enablePerformanceInsights: false, // Not supported in free tier
      monitoringInterval: cdk.Duration.seconds(60), // Basic monitoring
      cloudwatchLogsExports: ['postgresql'], // Export logs to CloudWatch
    });

    // Store endpoint information
    this.dbEndpoint = this.dbInstance.dbInstanceEndpointAddress;
    this.dbPort = this.dbInstance.dbInstanceEndpointPort;

    // Output database information
    new cdk.CfnOutput(this, 'DBEndpoint', {
      value: this.dbEndpoint,
      description: 'Database endpoint',
      exportName: 'DashboardDbEndpoint',
    });

    new cdk.CfnOutput(this, 'DBPort', {
      value: this.dbPort,
      description: 'Database port',
      exportName: 'DashboardDbPort',
    });

    new cdk.CfnOutput(this, 'DBName', {
      value: this.dbName,
      description: 'Database name',
      exportName: 'DashboardDbName',
    });

    new cdk.CfnOutput(this, 'DBInstanceIdentifier', {
      value: this.dbInstance.instanceIdentifier,
      description: 'Database instance identifier',
    });

    // Build connection string output (without password)
    const connectionStringTemplate = `postgresql://<username>:<password>@${this.dbEndpoint}:${this.dbPort}/${this.dbName}`;
    new cdk.CfnOutput(this, 'ConnectionStringTemplate', {
      value: connectionStringTemplate,
      description: 'PostgreSQL connection string template',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('Database', 'PostgreSQL-16');
  }
}
