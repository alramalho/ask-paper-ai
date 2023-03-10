import boto3
import os
import uuid
import datetime

from constants import ENVIRONMENT, S3_BUCKET_NAME, LATEST_COMMIT_ID

def ses_send_email(recipient: str, subject: str, html_body: str, sender: str):
    if ENVIRONMENT not in ['production', 'sandbox']:
        print("Not sending email because not in production or sandbox")
        return {'MessageId': 'local'}

    client = boto3.client('ses', region_name='eu-central-1')


    return client.send_email(
        Destination={
            'ToAddresses': [
                recipient,
            ],
        },
        Message={
            'Body': {
                'Html': {
                    'Charset': 'UTF-8',
                    'Data': html_body,
                },
            },
            'Subject': {
                'Charset': 'UTF-8',
                'Data': subject,
            },
        },
        
        Source=sender,
    )


def store_paper_in_s3(pdf_file: bytes, pdf_file_name: str):
    if ENVIRONMENT not in ['production', 'sandbox']:
        print("Not storing paper in S3 because not in production or sandbox")
        return

    print('Storing paper in S3')
    s3 = boto3.resource('s3')
    if '.pdf' not in pdf_file_name:
        pdf_file_name = f'{pdf_file_name}.pdf'

    s3.Bucket(S3_BUCKET_NAME).put_object(Key=f"papers/{pdf_file_name}", Body=pdf_file)


def write_to_dynamo(table_name: str, data: dict):
    print('Writing to dynamo')

    if ENVIRONMENT == 'production' or ENVIRONMENT == 'sandbox':
        if ENVIRONMENT.lower() not in table_name.lower():
            table_name = f"{table_name}-{ENVIRONMENT}"

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
        print("Not writing to dynamo because not in production or sandbox")
        return

