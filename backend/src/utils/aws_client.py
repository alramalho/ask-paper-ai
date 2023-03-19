import boto3
from enum import Enum
from utils.constants import LOCALSTACK_URL
class AWSResource(Enum):
    S3 = 's3'
    DYNAMODB = 'dynamodb'

def _dev_resource(resource):
    return boto3.resource(resource.value, endpoint_url=LOCALSTACK_URL)

def _resource(resource):
    return boto3.resource(resource.value)

aws_resource = {
    'dev': _dev_resource,
    'sandbox': _resource,
    'production': _resource
}
