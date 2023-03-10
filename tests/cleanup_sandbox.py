# delete all items sandbox dynamo tables. 
# Dont use sh as it is a pain in the ass

# just setup a project. Try poetry since you're at it
# just rember this MUST RUN IN GITHUB ACTIONS

import boto3

# Create a DynamoDB client
dynamodb_resource = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')

# Define the table names
table_names = ['HippoPrototypeFeedback-sandbox',
               'HippoPrototypeFunctionInvocations-sandbox',
               'HippoPrototypeJsonPapers-sandbox']


# Delete all items in each table
for table_name in table_names:
    print(f"Deleting all entries from {table_name}.")
    table = dynamodb_resource.Table(table_name)
    response = dynamodb_client.scan(TableName=table_name)
    items = response.get('Items', [])
    while items:
        with table.batch_writer() as batch:
            for item in items:
                item = {'id': item.get('id').get('S')}
                print(item)
                batch.delete_item(Key=item)
                if response.get('LastEvaluatedKey'):
                    response = dynamodb_client.scan(TableName=table_name, ExclusiveStartKey=response.get('LastEvaluatedKey'))
                else:
                    response = dynamodb_client.scan(TableName=table_name)
        items = response.get('Items', [])