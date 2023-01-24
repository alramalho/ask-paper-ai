import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
interface MainStackProps {
  openaiApiKey: string
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id);

    const fastApiLambda = new lambda.Function(this, 'FastAPILambda', {
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'src.zip')),
      handler: 'main.handler',
      runtime: lambda.Runtime.PYTHON_3_9,
      environment: {
        OPENAI_KEY: props.openaiApiKey,
        FILESYSTEM_BASE: '/tmp',
        GROBID_URL: "https://cloud.science-miner.com/grobid", // todo use this only for PoC
      }
    });
    const lambdaUrl = fastApiLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE
    });

    new cdk.CfnOutput(this, 'FastAPILambdaURL', {
      value: lambdaUrl.url,
    });
  }
}
