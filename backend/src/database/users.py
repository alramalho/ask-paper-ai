from pydantic import BaseModel
from database.db import DynamoDBGateway
from utils.constants import DB_GUEST_USERS, DB_DISCORD_USERS

class GuestUser(BaseModel):
    email: str
    remaining_trial_requests: int


class DiscordUser(BaseModel):
    email: str
    discord_id: str
    created_at: str


class UserDoesNotExistException(Exception):
    pass


class DiscordUsersGateway:
    def __init__(self):
        self.db_gateway = DynamoDBGateway(table_name=DB_DISCORD_USERS)

    def get_user_by_email(self, email: str) -> DiscordUser:
        data = self.db_gateway.read('email', email)
        if data is None:
            print("Discord user does not exist")
            raise UserDoesNotExistException()
        return DiscordUser(**data)
    
    def create_user(self, email: str, discord_id: str, created_at: str) -> DiscordUser:
        user = DiscordUser(email=email, discord_id=discord_id, created_at=created_at)
        self.db_gateway.write(user.dict())
        print(f"Discord user created for email {email}")
        return user
    
    
class GuestUsersGateway:
    def __init__(self):
        self.db_gateway = DynamoDBGateway(table_name=DB_GUEST_USERS)

    def get_user_by_email(self, email: str) -> GuestUser:
        data = self.db_gateway.read('email', email)
        if data is None:
            print("User does not exist")
            raise UserDoesNotExistException()
        return GuestUser(**data)

    def is_guest_user_allowed(self, email: str) -> bool:
        data = self.db_gateway.read('email', email)
        user = GuestUser(**data)
        return user.remaining_trial_requests > 0

    def create_user(self, email: str) -> GuestUser:
        user = GuestUser(email=email, remaining_trial_requests=5)
        self.db_gateway.write(user.dict())
        print("User created")
        return user

    def decrement_remaining_trial_requests(self, email: str) -> GuestUser:
        data = self.db_gateway.read('email', email)
        user = GuestUser(**data)
        user.remaining_trial_requests -= 1
        self.db_gateway.write(user.dict()) # todo: should be update instead of write
        return user
