from botocore.exceptions import ClientError
from boto3.dynamodb.types import TypeSerializer
from utils.constants import ENVIRONMENT, LATEST_COMMIT_ID
from utils.aws_client import aws_client
import uuid
import datetime


class DynamoDBGateway:

    def __init__(self, table_name: str):
        self.table_name = table_name

        if ENVIRONMENT.lower() not in self.table_name.lower():
            self.table_name = f"{self.table_name}_{ENVIRONMENT}"

        session = aws_client.get(ENVIRONMENT)
        self.dynamodb = session('dynamodb')

    def read(self, key_name: str, key_value: str):

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
        print('Writing to dynamo')

        if 'id' not in data:
            data['id'] = str(uuid.uuid4())

        if 'created_at' not in data:
            data['created_at'] = str(datetime.datetime.now())

        data['latest_commit_id'] = LATEST_COMMIT_ID

        response = self.dynamodb.put_item(
            TableName=self.table_name,
            ReturnConsumedCapacity='TOTAL',
            Item=DynamoDBGateway._serielize_object(data))
        print(response)

    def _read_from_dynamo_key(self, key_name: str, key_value: str):
        print('Reading from dynamo key')

        try:
            result = self.dynamodb.get_item(
                TableName=self.table_name,
                Key={
                    key_name: key_value
                }
            )
            return result
        except ClientError as e:
            print(e.response['Error']['Message'])
            return

    def _read_from_dynamo_index(self, key_name: str, key_value: str):
        print('Reading from dynamo index')

        try:
            result = self.dynamodb.query(
                TableName=self.table_name,
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

    @staticmethod
    def _serielize_object(data):
        serializer = TypeSerializer()
        # TODO need to serielize nested object
        serialized_item = serializer.serialize(data)

        return serialized_item