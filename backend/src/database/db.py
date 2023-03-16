from botocore.exceptions import ClientError
from utils.constants import ENVIRONMENT, LATEST_COMMIT_ID
import boto3
import uuid
import datetime


class DynamoDBGateway:

    def __init__(self, table_name: str):
        self.table_name = table_name

        if ENVIRONMENT not in ['production', 'sandbox']:
            print("Not writing to dynamo because not in production or sandbox")
            self.mock = True

        if ENVIRONMENT.lower() not in self.table_name.lower():
            self.table_name = f"{self.table_name}_{ENVIRONMENT}"

    def read(self, key_name: str, key_value: str):
        if hasattr(self, 'mock') and self.mock: return  # todo: remove when implementing localstack

        response = self._read_from_dynamo_key(key_name, key_value)
        if response and 'Item' in response:
            result = response['Item']
        else:
            response = self._read_from_dynamo_index(key_name, key_value)
            if response and 'Items' in response and len(response['Items']) > 0:
                result = response['Items'][0]
            else:
                return None

        return result

    def write(self, data: dict):
        if hasattr(self, 'mock') and self.mock: return  # todo: remove when implementing localstack
        print('Writing to dynamo')

        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(self.table_name)

        if 'id' not in data:
            data['id'] = str(uuid.uuid4())

        if 'created_at' not in data:
            data['created_at'] = str(datetime.datetime.now())

        data['latest_commit_id'] = LATEST_COMMIT_ID

        response = table.put_item(
            ReturnConsumedCapacity='TOTAL',
            Item=data)
        print(response)

    def _read_from_dynamo_key(self, key_name: str, key_value: str):
        if hasattr(self, 'mock') and self.mock: return  # todo: remove when implementing localstack
        print('Reading from dynamo key')

        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(self.table_name)

        try:
            result = table.get_item(
                Key={
                    key_name: key_value
                }
            )
            return result
        except ClientError as e:
            print(e.response['Error']['Message'])
            return

    def _read_from_dynamo_index(self, key_name: str, key_value: str):
        if hasattr(self, 'mock') and self.mock: return  # todo: remove when implementing localstack

        print('Reading from dynamo index')

        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(self.table_name)
        try:
            result = table.query(
                IndexName=f"{key_name}-index",
                KeyConditionExpression=f"{key_name} = :{key_name}",
                ExpressionAttributeValues={
                    f':{key_name}': key_value
                }
            )
            return result
        except ClientError as e:
            print('HEEEEEEY')
            return
