import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as apigatewayv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as path from "path";
import * as apigatewayv2Integrations from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
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
            functionName: `HippoPrototypeFastAPI-${props.environment}`,
            code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'build.zip')),
            handler: 'api.handler',
            runtime: lambda.Runtime.PYTHON_3_8,
            timeout: cdk.Duration.seconds(90),
            memorySize: 1024,
            environment: {
                OPENAI_KEY: props.openaiApiKey,
                ENVIRONMENT: props.environment,
                LATEST_COMMIT_ID: process.env.LATEST_COMMIT_ID!,
                DYNAMODB_PAPER_TABLENAME: "HippoPrototypeJsonPapers",
                FILESYSTEM_BASE: '/tmp',
                S3_BUCKET_NAME: props.destinationBucketName,
            },
        });

        const lambdaUrl = this.fastApiLambda.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE
        });

        const webSocketApi = new apigatewayv2.WebSocketApi(this, 'MyWebSocketApi', {
            apiName: 'My WebSocket API',
        });
        const webSocketStage = new apigatewayv2.WebSocketStage(this, 'MyWebSocketStage', {
            webSocketApi,
            stageName: props.environment,
            autoDeploy: true,
        })

        // Add a Lambda integration for the WebSocket API
        webSocketApi.addRoute('$default', {
            integration: new apigatewayv2Integrations.WebSocketLambdaIntegration('MyWebSocketLambdaIntegration', this.fastApiLambda),
        });


        new cdk.CfnOutput(this, `AskPaperBackendHTTPURL${props.environment}`, {
            value: lambdaUrl.url,
        });
        new cdk.CfnOutput(this, `AskPaperBackendWSURL${props.environment}`, {
            value: webSocketStage.url,
        });
    }
}
