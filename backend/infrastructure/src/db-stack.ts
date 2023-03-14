import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {DynamoDbTableConstruct} from "./constructs/dynamo-table";
import * as iam from "aws-cdk-lib/aws-iam";
interface MainStackProps {
  environment: string
  writableBy?: iam.IGrantable[],
  readableBy?: iam.IGrantable[]
}

export class DbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id);

    new DynamoDbTableConstruct(this, 'PapersTable', {
      name: `HippoPrototypeJsonPapers-${props.environment}`,
      indexFields: ['email'],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'FeedbackTable', {
      name: `HippoPrototypeFeedback-${props.environment}`,
      indexFields: ['email', 'message'],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'InvocationsTable', {
      name: `HippoPrototypeFunctionInvocations-${props.environment}`,
      indexFields: [],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'EmailsSentTable', {
      name: `HippoPrototypeEmailsSent-${props.environment}`,
      indexFields: ['email'],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'GuestUsersTable', {
      name: `HippoPrototypeGuestUsers-${props.environment}`,
      partitionKey: {name: 'email', type: dynamodb.AttributeType.STRING},
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

  }
}
