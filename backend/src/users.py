from pydantic import BaseModel
from db import DynamoDBGateway
from constants import SNAKE_CASE_PREFIX

class GuestUser(BaseModel):
    email: str
    remaining_trial_requests: int


class UserDoesNotExistException(Exception):
    pass

class UserGateway:
    def __init__(self):
        self.db_gateway = DynamoDBGateway(table_name=f'{SNAKE_CASE_PREFIX}_guest_users')

    def get_user_by_email(self, email: str) -> GuestUser:
        data = self.db_gateway.read('email', email)
        if data is None:
            raise UserDoesNotExistException()
        return GuestUser(**data)

    def is_guest_user_allowed(self, email: str) -> bool:
        user = self.db_gateway.read('email', email)
        return user.remaining_trial_requests > 0

    def create_user(self, email: str) -> GuestUser:
        user = GuestUser(email=email, remaining_trial_requests=5)
        self.db_gateway.write(user.dict())
        return user

    def decrement_remaining_trial_requests(self, email: str) -> GuestUser:
        data = self.db_gateway.read('email', email)
        user = GuestUser(**data)
        user.remaining_trial_requests -= 1
        self.db_gateway.write(user.dict()) # todo: should be update instead of write
        return user
