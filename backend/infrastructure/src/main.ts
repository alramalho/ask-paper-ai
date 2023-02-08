#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainStack } from './main-stack';
import * as dotenv from 'dotenv'
dotenv.config({path: "../.env"})
function prettyError(s: string) {
  console.error(`\x1b[41m${s}\x1b[0m`)
}

const app = new cdk.App();

if (!process.env.OPENAI_KEY) {
  prettyError(" ❌ Environment variable OPENAI_KEY not provided.")
  process.exit(1)
}

if (!process.env.ENVIRONMENT || !['sandbox', 'production'].includes(process.env.ENVIRONMENT)) {
  prettyError(" ❌ Environment variable ENVIRONMENT not provided.")
  process.exit(1)
}


if (!process.env.LATEST_COMMIT_ID) {
  prettyError(" ❌ Environment variable LATEST_COMMIT_ID not provided.")
  process.exit(1)
}


new MainStack(app, `HippoPrototypeInfrastructureStack${process.env.ENVIRONMENT}`, {
  environment: process.env.ENVIRONMENT,
  openaiApiKey: process.env.OPENAI_KEY
});