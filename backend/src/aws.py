import boto3
import os
import uuid
import datetime

ENVIRONMENT = os.getenv("ENVIRONMENT", 'local')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', None)
LATEST_COMMIT_ID = os.getenv("LATEST_COMMIT_ID", 'local')


def store_paper_in_s3(pdf_file: bytes, pdf_file_name: str):
    print('Storing paper in S3')
    if ENVIRONMENT not in ['production', 'sandbox']:
        return

    s3 = boto3.resource('s3')
    s3.Bucket(S3_BUCKET_NAME).put_object(Key=f"papers/{pdf_file_name}", Body=pdf_file)


def write_to_dynamo(table_name: str, data: dict):
    print('Writing to dynamo')
    if ENVIRONMENT.lower() not in table_name.lower():
        table_name = f"{table_name}-{ENVIRONMENT}"

    if ENVIRONMENT == 'production' or ENVIRONMENT == 'sandbox':
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)

        if 'id' not in data:
            data['id'] = str(uuid.uuid4())

        if 'created_at' not in data:
            data['created_at'] = str(datetime.datetime.now())

        data['latest_commit_id'] = LATEST_COMMIT_ID

        response = table.put_item(
            ReturnConsumedCapacity='TOTAL',
            Item=data)
        print(response)
    else:
        # todo: currently no logging, but consider using moto for local aws env
        return

