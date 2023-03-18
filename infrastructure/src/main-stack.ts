import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { ApiStack } from './api-stack';
import { DbStack } from "./db-stack";
import { KEBAB_CASE_PREFIX } from './utils/constants';

interface MainStackProps {
  environment: string
  openaiApiKey: string
}

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id);

    const destinationBucketName = `${KEBAB_CASE_PREFIX}-papers-${props.environment}`;
    const paperBucket = new s3.Bucket(this, 'PaperBucket', {
        bucketName: destinationBucketName,
    })
        
    const {fastApiLambda} = new ApiStack(this, 'ApiStack', {
      environment: props.environment,
      openaiApiKey: props.openaiApiKey,
      destinationBucketName: destinationBucketName,
    })
    paperBucket.grantReadWrite(fastApiLambda);

    new DbStack(this, 'DbStack', {
      environment: props.environment,
      writableBy: [fastApiLambda],
      readableBy: [fastApiLambda],
    })

  }
}
