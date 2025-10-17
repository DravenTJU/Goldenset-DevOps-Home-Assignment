import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly amplifySecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 创建VPC - 优化免费套餐配置(单AZ)
    this.vpc = new ec2.Vpc(this, 'DashboardVPC', {
      maxAzs: 1, // 单可用区 - 免费套餐优化
      natGateways: 0, // 不使用NAT网关以节省成本
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // 隔离子网用于RDS
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // 为RDS创建安全组
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL database',
      allowAllOutbound: false, // 不需要出站流量
    });

    // 为Amplify创建安全组(用于VPC连接器)
    this.amplifySecurityGroup = new ec2.SecurityGroup(this, 'AmplifySecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Amplify VPC connector',
      allowAllOutbound: true,
    });

    // 允许Amplify安全组访问RDS的PostgreSQL端口
    this.dbSecurityGroup.addIngressRule(
      this.amplifySecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Amplify'
    );

    // 添加VPC端点以减少数据传输成本(可选)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // 输出VPC信息
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'DashboardVpcId',
    });

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.dbSecurityGroup.securityGroupId,
      description: 'Database Security Group ID',
      exportName: 'DashboardDbSecurityGroupId',
    });

    new cdk.CfnOutput(this, 'AmplifySecurityGroupId', {
      value: this.amplifySecurityGroup.securityGroupId,
      description: 'Amplify Security Group ID',
      exportName: 'DashboardAmplifySecurityGroupId',
    });

    // 标签
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
  }
}
