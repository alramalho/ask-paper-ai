import * as cdk from 'aws-cdk-lib';
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs';
import * as path from "path";
import { CAMEL_CASE_PREFIX, PASCAL_CASE_PREFIX } from './utils/constants';

interface ApiStackProps {
    environment: string
    openaiApiKey: string
    destinationBucketName: string
}

export class ApiStack extends cdk.Stack {
    readonly fastApiLambda: lambda.Function


    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id);


        this.fastApiLambda = new lambda.Function(this, 'FastAPILambda', {
            functionName: `${CAMEL_CASE_PREFIX}FastAPI${props.environment}`,
            code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'backend', 'build.zip')),
            handler: 'run_lambda.sh',
            runtime: lambda.Runtime.PYTHON_3_8,
            timeout: cdk.Duration.seconds(150),
            memorySize: 3008,
            environment: {
                OPENAI_API_KEY: props.openaiApiKey,
                ENVIRONMENT: props.environment,
                LATEST_COMMIT_ID: process.env.LATEST_COMMIT_ID!,
                FILESYSTEM_BASE: '/tmp',
                S3_BUCKET_NAME: props.destinationBucketName,
                HIPPOAI_DISCORD_SERVER_ID: process.env.HIPPOAI_DISCORD_SERVER_ID!,
                DISCORD_CLIENT_BOT_TOKEN: process.env.DISCORD_CLIENT_BOT_TOKEN!,
                ASK_PAPER_BYPASS_AUTH_TOKEN: process.env.ASK_PAPER_BYPASS_AUTH_TOKEN!,
                AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
                AWS_LWA_READINESS_CHECK_PATH: '/health',
                AWS_LWA_INVOKE_MODE: 'response_stream',
                PORT: "8000",
            },
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(
                    this,
                    'LambdaAdapterLayer',
                    `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerX86:16`
                ),
            ],
        });
        this.fastApiLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'SES:SendRawEmail'],
            resources: ['*'],
            effect: iam.Effect.ALLOW,
        }));


        const lambdaUrl = this.fastApiLambda.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
        });


        new cdk.CfnOutput(this, `${PASCAL_CASE_PREFIX}BackendHTTPURL${props.environment}`, {
            value: lambdaUrl.url,
        });
    }
}
