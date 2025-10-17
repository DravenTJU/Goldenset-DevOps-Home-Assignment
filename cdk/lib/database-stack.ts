import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  dbCredentials: rds.DatabaseSecret;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbEndpoint: string;
  public readonly dbPort: number;
  public readonly dbName: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { vpc, securityGroup, dbCredentials } = props;

    // 数据库名称
    this.dbName = 'dashboard_db';

    // 创建参数组以启用uuid-ossp扩展
    const parameterGroup = new rds.ParameterGroup(this, 'DBParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      description: 'Parameter group for NextJS Dashboard PostgreSQL',
      parameters: {
        'rds.force_ssl': '0', // 简化开发,生产环境建议启用
      },
    });

    // 创建RDS PostgreSQL实例 - 免费套餐配置
    this.dbInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_6,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO // db.t3.micro - 免费套餐
      ),
      credentials: rds.Credentials.fromSecret(dbCredentials),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [securityGroup],
      databaseName: this.dbName,
      allocatedStorage: 20, // 20GB - 免费套餐最大值
      storageType: rds.StorageType.GP2, // 通用SSD
      multiAz: false, // 单AZ - 免费套餐
      publiclyAccessible: false, // 不公开访问
      backupRetention: cdk.Duration.days(7), // 7天备份保留
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // 删除时创建快照
      deletionProtection: false, // 开发环境可删除,生产环境建议true
      parameterGroup,
      enablePerformanceInsights: false, // 免费套餐不支持
      monitoringInterval: cdk.Duration.seconds(60), // 基础监控
      cloudwatchLogsExports: ['postgresql'], // 导出日志到CloudWatch
    });

    // 存储端点信息
    this.dbEndpoint = this.dbInstance.dbInstanceEndpointAddress;
    this.dbPort = this.dbInstance.dbInstanceEndpointPort;

    // 输出数据库信息
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

    // 构建连接字符串输出(不包含密码)
    const connectionStringTemplate = `postgresql://<username>:<password>@${this.dbEndpoint}:${this.dbPort}/${this.dbName}`;
    new cdk.CfnOutput(this, 'ConnectionStringTemplate', {
      value: connectionStringTemplate,
      description: 'PostgreSQL connection string template',
    });

    // 标签
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('Database', 'PostgreSQL-16');
  }
}
