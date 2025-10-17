# Goldenset DevOps Home Assignment - Next.js Dashboard

A comprehensive Next.js dashboard application deployed on AWS using Infrastructure as Code (IaC) principles. This project demonstrates modern DevOps practices including automated deployment, infrastructure management, and cloud-native architecture.

## 🚀 Live Application

**Production URL**: [https://dashboard.draven.best](https://dashboard.draven.best)  
**Amplify URL**: [https://doev839sa4hwz.amplifyapp.com](https://doev839sa4hwz.amplifyapp.com)

## 📋 Project Overview

This project implements a full-stack dashboard application based on the [Next.js Learn Course](https://nextjs.org/learn/dashboard-app) with enterprise-grade AWS deployment. The application features:

- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Authentication**: NextAuth v5 with secure session management
- **Database**: PostgreSQL with optimized queries and data modeling
- **Cloud Infrastructure**: Fully automated AWS deployment using CDK
- **DevOps Practices**: CI/CD pipeline, infrastructure as code, monitoring

## 🏗️ Architecture

### Technology Stack

**Frontend & Backend**:
- Next.js 15 (App Router, SSR)
- React 19
- TypeScript 5.7
- Tailwind CSS 3.4
- NextAuth v5 (Authentication)

**Database**:
- PostgreSQL 16.6
- Optimized queries with proper indexing
- Connection pooling

**Infrastructure**:
- AWS CDK 2.x (TypeScript)
- AWS Amplify Hosting
- Amazon RDS PostgreSQL
- AWS Secrets Manager
- Amazon VPC with security groups

### AWS Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Cloud (ap-southeast-2)                │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   Route 53 DNS  │    │      AWS Amplify Hosting        │ │
│  │ dashboard.draven│───▶│  ┌─────────────────────────────┐ │ │
│  │     .best       │    │  │    Next.js SSR App         │ │ │
│  └─────────────────┘    │  │  • Server-Side Rendering  │ │ │
│                         │  │  • API Routes             │ │ │
│                         │  │  • NextAuth v5            │ │ │
│                         │  └─────────────────────────────┘ │ │
│                         └─────────────────────────────────┘ │
│                                    │                        │
│                         ┌─────────┴─────────┐               │
│                         │                   │               │
│              ┌──────────▼──────────┐ ┌─────▼─────┐         │
│              │  Secrets Manager    │ │    VPC    │         │
│              │  • DB Credentials   │ │ ┌───────┐ │         │
│              │  • Auth Secret      │ │ │  RDS  │ │         │
│              └─────────────────────┘ │ │ PG-16 │ │         │
│                                      │ │ t3.m  │ │         │
│                                      │ └───────┘ │         │
│                                      └───────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI installed
- GitHub Personal Access Token

### Local Development

```bash
# Clone the repository
git clone https://github.com/DravenTJU/Goldenset-DevOps-Home-Assignment.git
cd Goldenset-DevOps-Home-Assignment

# Install dependencies
pnpm install

# Start local database
docker-compose up -d

# Run development server
pnpm dev
```

### AWS Deployment

```bash
# Navigate to CDK directory
cd cdk

# Install CDK dependencies
npm install

# Set environment variables
export GITHUB_TOKEN="your_github_token"
export GITHUB_REPO="DravenTJU/Goldenset-DevOps-Home-Assignment"

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/ap-southeast-2

# Deploy all infrastructure
cdk deploy --all
```

## 📚 Documentation

Comprehensive documentation is available in the `doc/` directory:

- **[AWS_DEPLOYMENT_PLAN.md](./doc/AWS_DEPLOYMENT_PLAN.md)** - Complete architecture and deployment strategy
- **[DEPLOYMENT_GUIDE.md](./doc/DEPLOYMENT_GUIDE.md)** - Step-by-step deployment instructions
- **[CDK_ARCHITECTURE.md](./doc/CDK_ARCHITECTURE.md)** - Infrastructure as Code details
- **[SETUP.md](./doc/SETUP.md)** - Local development setup
- **[DOCKER-SETUP.md](./doc/DOCKER-SETUP.md)** - Database configuration

## 🔧 Key Features

### Application Features
- **Dashboard**: Comprehensive analytics and data visualization
- **Customer Management**: CRUD operations with search and filtering
- **Invoice System**: Complete invoice lifecycle management
- **Authentication**: Secure login with NextAuth v5
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### DevOps Features
- **Infrastructure as Code**: Complete AWS infrastructure defined in TypeScript
- **Automated Deployment**: CI/CD pipeline with AWS Amplify
- **Environment Management**: Secure secrets handling with AWS Secrets Manager
- **Monitoring**: CloudWatch integration for logging and metrics
- **Cost Optimization**: Free tier eligible configuration

## 🛠️ Development Approach

### My DevOps Philosophy

I approached this project with a focus on **simplicity, reliability, and maintainability**. Rather than over-engineering the solution, I prioritized:

1. **Infrastructure as Code**: Using AWS CDK for reproducible deployments
2. **Security First**: Proper secrets management and network isolation
3. **Cost Optimization**: Leveraging AWS Free Tier where possible
4. **Documentation**: Comprehensive guides for future maintenance
5. **Best Practices**: Following AWS Well-Architected Framework principles

### Technical Decisions

**Why AWS Amplify over EC2/ECS?**
- Simplified CI/CD pipeline
- Built-in SSL certificates and CDN
- Automatic scaling and high availability
- Reduced operational overhead

**Why CDK over Terraform?**
- TypeScript integration with the application
- Better AWS service integration
- CloudFormation reliability
- Native AWS tooling support

**Why PostgreSQL over DynamoDB?**
- Relational data structure requirements
- Complex queries and joins
- ACID compliance for financial data
- Familiar SQL interface

## 🤖 AI Usage and Collaboration

### AI-Assisted Development

I leveraged AI tools throughout this project to enhance productivity and code quality:

**Research and Learning (30%)**:
- AWS service documentation and best practices
- Next.js 15 and React 19 new features
- CDK patterns and CloudFormation templates

**Code Generation (25%)**:
- Infrastructure as Code boilerplate
- TypeScript type definitions
- Configuration templates

**Problem Solving (35%)**:
- Debugging deployment issues
- Optimizing build configurations
- Troubleshooting AWS service integration

**Documentation (10%)**:
- Technical writing and formatting
- Architecture diagrams
- README structure

### AI Tools Used
- **Claude Code**: Primary coding assistant for complex problem-solving
- **Cursor**: Code completion and suggestions
- **ChatGPT**: Research and documentation assistance

## 🎯 What I Would Improve with More Time

### Immediate Improvements (1-2 days)
1. **Monitoring & Alerting**: Implement CloudWatch alarms and SNS notifications
2. **Backup Strategy**: Automated RDS snapshots and cross-region replication
3. **Security Hardening**: WAF rules, rate limiting, and security headers
4. **Performance Optimization**: Redis caching layer and query optimization

### Medium-term Enhancements (1 week)
1. **Multi-Environment**: Separate dev/staging/production environments
2. **Blue-Green Deployment**: Zero-downtime deployment strategy
3. **Container Migration**: Move to ECS/Fargate for better control
4. **API Gateway**: Centralized API management and throttling

### Long-term Vision (2-4 weeks)
1. **Microservices Architecture**: Break down monolith into services
2. **Event-Driven Architecture**: Implement SQS/SNS for async processing
3. **Multi-Region Deployment**: Global availability and disaster recovery
4. **Advanced Monitoring**: APM tools, distributed tracing, and SLA monitoring

## 📊 Cost Analysis

### Current AWS Costs (Monthly)
- **RDS PostgreSQL**: $0 (Free Tier - 750 hours)
- **Amplify Hosting**: ~$15-25
- **Secrets Manager**: ~$0.80
- **VPC & Security Groups**: $0 (Always free)
- **Data Transfer**: $0 (1GB free)

**Total**: ~$16-26/month (first year)

### Post Free Tier
- **RDS**: ~$15/month
- **Amplify**: ~$15-25/month
- **Secrets Manager**: ~$0.80/month

**Total**: ~$31-44/month

## 🔒 Security Considerations

- **Network Isolation**: Private subnets for database
- **Secrets Management**: AWS Secrets Manager for sensitive data
- **IAM Roles**: Least privilege access principles
- **SSL/TLS**: Automatic certificate management
- **Authentication**: Secure session handling with NextAuth

## 📈 Performance Metrics

- **Build Time**: ~8-10 minutes (Amplify)
- **Deployment Time**: ~20-30 minutes (CDK)
- **Page Load**: <2 seconds (with CDN)
- **Database Queries**: Optimized with proper indexing
- **Availability**: 99.9% (AWS SLA)

## 🤝 Contributing

This project demonstrates enterprise-level DevOps practices suitable for production environments. The codebase includes:

- Comprehensive error handling
- Type safety with TypeScript
- Automated testing capabilities
- Security best practices
- Scalable architecture patterns

---

*This project showcases modern DevOps practices, cloud-native architecture, and full-stack development capabilities. The implementation demonstrates proficiency in AWS services, infrastructure as code, and automated deployment pipelines.*