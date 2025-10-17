import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly amplifySecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC - RDS requires at least 2 AZ subnets
    this.vpc = new ec2.Vpc(this, 'DashboardVPC', {
      maxAzs: 2, // RDS requires subnet group to cover at least 2 AZs
      natGateways: 0, // No NAT gateway to save costs
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Isolated subnet for RDS
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Create security group for RDS
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL database',
      allowAllOutbound: false, // No outbound traffic needed
    });

    // Create security group for Amplify (for VPC connector)
    this.amplifySecurityGroup = new ec2.SecurityGroup(this, 'AmplifySecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Amplify VPC connector',
      allowAllOutbound: true,
    });

    // Allow Amplify security group to access RDS PostgreSQL port
    this.dbSecurityGroup.addIngressRule(
      this.amplifySecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Amplify'
    );

    // Add VPC endpoint to reduce data transfer costs (optional)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Output VPC information
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

    // Tags
    cdk.Tags.of(this).add('Project', 'NextJS-Dashboard');
    cdk.Tags.of(this).add('Environment', 'Production');
  }
}
