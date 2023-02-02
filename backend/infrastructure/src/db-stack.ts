import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import {Construct} from 'constructs';

interface DbStackProps {
  writableBy?: iam.IGrantable[],
  readableBy?: iam.IGrantable[]
}

export class DbStack extends cdk.Stack {
  readonly dynamoTableTable: string;

  constructor(scope: Construct, id: string, props?: DbStackProps) {
    super(scope, id);

    const dynamoTable = new dynamodb.Table(this, 'MainTable', {
      tableName: `HippoPrototypeJsonPapers`,
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    dynamoTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: {name: 'email', type: dynamodb.AttributeType.STRING},
      projectionType: dynamodb.ProjectionType.ALL,
    });
    props?.writableBy?.forEach(resource => dynamoTable.grantWriteData(resource))
    props?.readableBy?.forEach(resource => dynamoTable.grantReadData(resource))
    dynamoTable.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

    this.dynamoTableTable = dynamoTable.tableName
    new cdk.CfnOutput(this, 'DynamoDbTableName', {value: dynamoTable.tableName});
  }
}
