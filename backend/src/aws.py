import boto3
from utils.aws_client import aws_client

from utils.constants import ENVIRONMENT, S3_BUCKET_NAME

def ses_send_email(recipient: str, subject: str, html_body: str, sender: str):
    # TODO for local dev we can use aws-ses mock to see if it was sent.
    # Example of mock server can be found in:
    # https://github.com/shenggwang/docker-mail-server-mock
    if ENVIRONMENT not in ['production', 'sandbox']:
        print("Not sending email because not in production or sandbox")
        return {'MessageId': 'local'}

    # TODO use aws_client
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
    session = aws_client.get(ENVIRONMENT)
    s3 = session(ENVIRONMENT)
    
    if '.pdf' not in pdf_file_name:
        pdf_file_name = f'{pdf_file_name}.pdf'

    s3.Bucket(S3_BUCKET_NAME).put_object(Key=f"papers/{pdf_file_name}", Body=pdf_file)
