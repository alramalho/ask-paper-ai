# delete all items sandbox dynamo tables.
# Dont use sh as it is a pain in the ass

# just setup a project. Try poetry since you're at it
# just rember this MUST RUN IN GITHUB ACTIONS

import boto3

# Create a DynamoDB client
dynamodb_resource = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')

# Define the table names
tables = [{"name": 'ask_paper_emails_sent_sandbox', "key": "id"},
          {"name": 'ask_paper_feedback_sandbox', "key": "id"},
          {"name": 'ask_paper_function_invocations_sandbox', "key": "id"},
          {"name": 'ask_paper_guest_users_sandbox', "key": "email"},
          {"name": 'ask_paper_discord_users_sandbox', "key": "discord_id"},
          {"name": 'ask_paper_json_papers_sandbox', "key": "id"}]


# Delete all items in each table
for table in tables:
    print(f"Deleting all entries from {table['name']}.")
    dtable = dynamodb_resource.Table(table['name'])
    response = dynamodb_client.scan(TableName=table['name'])
    items = response.get('Items', [])
    while items:
        with dtable.batch_writer() as batch:
            for item in items:
                key = table['key']
                item = {key: item.get(key).get('S')}
                print(item)
                batch.delete_item(Key=item)
                if response.get('LastEvaluatedKey'):
                    response = dynamodb_client.scan(
                        TableName=table['name'], ExclusiveStartKey=response.get('LastEvaluatedKey'))
                else:
                    response = dynamodb_client.scan(TableName=table['name'])
        items = response.get('Items', [])
