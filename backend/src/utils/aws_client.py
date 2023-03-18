import boto3
from enum import Enum

class AWSResource(Enum):
    S3 = 's3'
    DYNAMODB = 'dynamodb'

def _dev_resource(resource):
    return boto3.resource(resource.value, endpoint_url='http://localstack:4566')

def _resource(resource):
    return boto3.resource(resource.value)

aws_resource = {
    'dev': _dev_resource,
    'sandbox': _resource,
    'production': _resource
}
