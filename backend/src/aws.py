import boto3
from botocore.exceptions import ClientError
from utils.aws_client import aws_resource, AWSResource
from utils.constants import ENVIRONMENT, S3_BUCKET_NAME

def ses_send_email(recipient: str, subject: str, html_body: str, sender: str):
    # TODO: https://docs.localstack.cloud/user-guide/aws/ses/
    if ENVIRONMENT not in ['production', 'sandbox']:
        print("Not sending email because not in production or sandbox")
        return {'MessageId': 'local'}

    # TODO use aws_resource
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
    if ENVIRONMENT not in ['dev', 'production', 'sandbox']:
        print("Not storing paper in S3 because not in dev, production or sandbox")
        return

    print('Storing paper in S3')
    resource = aws_resource.get(ENVIRONMENT)
    s3 = resource(AWSResource.S3)
    
    if '.pdf' not in pdf_file_name:
        pdf_file_name = f'{pdf_file_name}.pdf'
    try:
        s3.Bucket(S3_BUCKET_NAME).put_object(Key=f"papers/{pdf_file_name}", Body=pdf_file)
    except ClientError as e:
        print(f'Error putting file onto {S3_BUCKET_NAME}')
        raise e