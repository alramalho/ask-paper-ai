import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {DynamoDbTableConstruct} from "./constructs/dynamo-table";
import * as iam from "aws-cdk-lib/aws-iam";
import { SNAKE_CASE_PREFIX } from './utils/constants';

interface MainStackProps {
  environment: string
  writableBy?: iam.IGrantable[],
  readableBy?: iam.IGrantable[]
}

export class DbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id);

    new DynamoDbTableConstruct(this, 'PapersTable', {
      name: `${SNAKE_CASE_PREFIX}_json_papers_${props.environment}`,
      // todo: this demands recreation, but we should use `hash` instead of `id` to be consistant with backend/frontend & other tables
      // partitionKey: {name: 'hash', type: dynamodb.AttributeType.STRING},
      indexFields: ['email'],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'FeedbackTable', {
      name: `${SNAKE_CASE_PREFIX}_feedback_${props.environment}`,
      indexFields: ['email', 'message'],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'InvocationsTable', {
      name: `${SNAKE_CASE_PREFIX}_function_invocations_${props.environment}`,
      indexFields: [],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'EmailsSentTable', {
      name: `${SNAKE_CASE_PREFIX}_emails_sent_${props.environment}`,
      indexFields: ['email'], // this field is not being used
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'GuestUsersTable', {
      name: `${SNAKE_CASE_PREFIX}_guest_users_${props.environment}`,
      partitionKey: {name: 'email', type: dynamodb.AttributeType.STRING},
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })

    new DynamoDbTableConstruct(this, 'DiscordtUsersTable', {
      name: `${SNAKE_CASE_PREFIX}_discord_users_${props.environment}`,
      partitionKey: {name: 'discord_id', type: dynamodb.AttributeType.STRING},
      indexFields: ['email'],
      writableBy: props.writableBy,
      readableBy: props.readableBy,
    })
  }
}
