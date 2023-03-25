# delete all items sandbox dynamo tables. 
# Dont use sh as it is a pain in the ass

# just setup a project. Try poetry since you're at it
# just rember this MUST RUN IN GITHUB ACTIONS

import boto3

# Create a DynamoDB client
dynamodb_resource = boto3.resource('dynamodb')
dynamodb_client = boto3.client('dynamodb')

# Define the table names
table_names = ['ask_paper_emails_sent_sandbox',
               'ask_paper_feedback_sandbox',
               'ask_paper_function_invocations_sandbox',
               'ask_paper_guest_users_sandbox',
               'ask_paper_discord_users_sandbox',
               'ask_paper_json_papers_sandbox']


# Delete all items in each table
for table_name in table_names:
    print(f"Deleting all entries from {table_name}.")
    table = dynamodb_resource.Table(table_name)
    response = dynamodb_client.scan(TableName=table_name)
    items = response.get('Items', [])
    if table_name == "ask_paper_guest_users_sandbox":
        print(items)
    while items:
        with table.batch_writer() as batch:
            for item in items:
                try:
                    item = {'id': item.get('id').get('S')}
                except Exception as e:
                    print("Couldn't find id, trying email")
                    item = {'email': item.get('email').get('S')}
                print(item)
                batch.delete_item(Key=item)
                if response.get('LastEvaluatedKey'):
                    response = dynamodb_client.scan(TableName=table_name, ExclusiveStartKey=response.get('LastEvaluatedKey'))
                else:
                    response = dynamodb_client.scan(TableName=table_name)
        items = response.get('Items', [])
