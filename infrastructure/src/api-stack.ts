import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
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
            handler: 'api.handler',
            runtime: lambda.Runtime.PYTHON_3_8,
            timeout: cdk.Duration.seconds(150),
            memorySize: 3008,
            environment: {
                OPENAI_API_KEY: props.openaiApiKey,
                ENVIRONMENT: props.environment,
                LATEST_COMMIT_ID: process.env.LATEST_COMMIT_ID!,
                FILESYSTEM_BASE: '/tmp',
                S3_BUCKET_NAME: props.destinationBucketName,
            },
        });
        this.fastApiLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'SES:SendRawEmail'],
            resources: ['*'],
            effect: iam.Effect.ALLOW,
        }));


        const lambdaUrl = this.fastApiLambda.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE
        });


        new cdk.CfnOutput(this, `${PASCAL_CASE_PREFIX}BackendHTTPURL${props.environment}`, {
            value: lambdaUrl.url,
        });
    }
}
