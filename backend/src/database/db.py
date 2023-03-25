from botocore.exceptions import ClientError
from utils.constants import ENVIRONMENT, LATEST_COMMIT_ID
from utils.aws_client import aws_resource, AWSResource
import datetime


class DynamoDBGateway:

    def __init__(self, table_name: str):

        if ENVIRONMENT.lower() not in table_name.lower():
            table_name = f"{table_name}_{ENVIRONMENT}"

        resource = aws_resource.get(ENVIRONMENT)
        self.table = resource(AWSResource.DYNAMODB).Table(table_name)

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

        if 'created_at' not in data:
            data['created_at'] = str(datetime.datetime.now())

        data['latest_commit_id'] = LATEST_COMMIT_ID
        try:
            response = self.table.put_item(
                ReturnConsumedCapacity='TOTAL',
                Item=data)
            print(response)
        except ClientError as e:
            print('Fail putting item on dynamodb')
            raise e   

    def _read_from_dynamo_key(self, key_name: str, key_value: str):
        print('Reading from dynamo key')
        try:
            result = self.table.get_item(
                Key={
                    key_name: key_value
                }
            )
            return result
        except ClientError as e:
            print(f"fail reading from dynamodb via key {e.response['Error']['Message']}")
            return

    def _read_from_dynamo_index(self, key_name: str, key_value: str):
        print('Reading from dynamo index')

        try:
            result = self.table.query(
                IndexName=f"{key_name}-index",
                KeyConditionExpression=f"{key_name} = :{key_name}",
                ExpressionAttributeValues={
                    f':{key_name}': key_value
                }
            )
            return result
        except ClientError as e:
            print(f"fail reading from dynamodb via index {e.response['Error']['Message']}")
            return
