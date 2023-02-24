import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as path from "path";
import {DynamoDbTableConstruct} from "./constructs/dynamo-table";
import { ApiStack } from './api-stack';
interface MainStackProps {
  environment: string
  openaiApiKey: string
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id);

    const destinationBucketName = `hippo-prototype-papers-${props.environment}`;
    const paperBucket = new s3.Bucket(this, 'PaperBucket', {
        bucketName: destinationBucketName,
    })
        
    const {fastApiLambda} = new ApiStack(this, 'ApiStack', {
      environment: props.environment,
      openaiApiKey: props.openaiApiKey,
      destinationBucketName: destinationBucketName,
    })
    paperBucket.grantReadWrite(fastApiLambda);

    new DynamoDbTableConstruct(this, 'PapersTable', {
      name: `HippoPrototypeJsonPapers-${props.environment}`,
      indexFields: ['email'],
      writableBy: [fastApiLambda],
      readableBy: [fastApiLambda],
    })

    new DynamoDbTableConstruct(this, 'FeedbackTable', {
      name: `HippoPrototypeFeedback-${props.environment}`,
      indexFields: ['email', 'message'],
      writableBy: [fastApiLambda],
      readableBy: [fastApiLambda],
    })

    new DynamoDbTableConstruct(this, 'InvocationsTable', {
      name: `HippoPrototypeFunctionInvocations-${props.environment}`,
      indexFields: ['function_path'],
      writableBy: [fastApiLambda],
      readableBy: [fastApiLambda],
    })

  }
}
