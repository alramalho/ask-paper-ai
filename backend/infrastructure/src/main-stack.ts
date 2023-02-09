import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import {DynamoDbTableConstruct} from "./constructs/dynamo-table";
interface MainStackProps {
  environment: string
  openaiApiKey: string
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id);

    const fastApiLambda = new lambda.Function(this, 'FastAPILambda', {
      functionName: `HippoPrototypeFastAPI-${props.environment}`,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'build.zip')),
      handler: 'main.handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.seconds(90),
      memorySize: 256,
      environment: {
        OPENAI_KEY: props.openaiApiKey,
        ENVIRONMENT: props.environment,
        LATEST_COMMIT_ID: process.env.LATEST_COMMIT_ID!,
        DYNAMODB_PAPER_TABLENAME: "HippoPrototypeJsonPapers",
        FILESYSTEM_BASE: '/tmp',
        GROBID_URL: "https://cloud.science-miner.com/grobid", // todo use this only for PoC
      }
    });
    const lambdaUrl = fastApiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE
    });

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

    new cdk.CfnOutput(this, `FastAPILambdaURL${props.environment}`, {
      value: lambdaUrl.url,
    });
  }
}
