import boto3

def _dev_session(service: str):
    session = boto3.session.Session(region_name='eu-central-1',
                                    aws_access_key_id='testUser',
                                    aws_secret_access_key='testAccessKey')
    return session.client(service,
                          endpoint_url='http://localhost:4566')

def _session(service: str):
    # TODO retrieve from env variable instead of ~/.aws
    session = boto3.session.Session()
    return session.client(service)

aws_client = {
    'dev': _dev_session,
    'sandbox': _session,
    'production': _session
}
