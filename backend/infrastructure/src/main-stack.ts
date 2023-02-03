import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import {DynamoDbTableConstruct} from "./constructs/dynamo-table";
interface MainStackProps {
  openaiApiKey: string
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id);

    const fastApiLambda = new lambda.Function(this, 'FastAPILambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'build.zip')),
      handler: 'main.handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.seconds(90),
      memorySize: 512,
      environment: {
        OPENAI_KEY: props.openaiApiKey,
        DYNAMODB_PAPER_TABLENAME: "HippoPrototypeJsonPapers",
        FILESYSTEM_BASE: '/tmp',
        GROBID_URL: "https://cloud.science-miner.com/grobid", // todo use this only for PoC
      }
    });
    const lambdaUrl = fastApiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE
    });

    new DynamoDbTableConstruct(this, 'PapersTable', {
      name: "HippoPrototypeJsonPapers",
      indexFields: ['email'],
      writableBy: [fastApiLambda],
      readableBy: [fastApiLambda],
    })

    new DynamoDbTableConstruct(this, 'FeedbackTable', {
      name: "HippoPrototypeFeedback",
      indexFields: ['email'],
      writableBy: [fastApiLambda],
      readableBy: [fastApiLambda],
    })

    new cdk.CfnOutput(this, 'FastAPILambdaURL', {
      value: lambdaUrl.url,
    });
  }
}
