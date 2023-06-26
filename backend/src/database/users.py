from pydantic import BaseModel
from database.db import DynamoDBGateway
from utils.constants import DB_GUEST_USERS, DB_DISCORD_USERS
from nlp import ask_json
from typing import List, Dict, Optional

class GuestUser(BaseModel):
    email: str
    remaining_trial_requests: int


class DiscordUser(BaseModel):
    email: str
    discord_id: str
    created_at: str
    datasets: Optional[List[Dict]]


class UserDoesNotExistException(Exception):
    pass


class DiscordUsersGateway:
    def __init__(self):
        self.db_gateway = DynamoDBGateway(table_name=DB_DISCORD_USERS)

    def get_user_by_id(self, id: str) -> DiscordUser:
        data = self.db_gateway.read('discord_id', id)
        if data is None:
            print("Discord user does not exist")
            raise UserDoesNotExistException()
        return DiscordUser(**data)

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
    
    
    def override_user_datasets(self, discord_id: str, new_datasets: List[Dict]) -> DiscordUser:
        print("Overriding user datasets")
        user = self.get_user_by_id(discord_id)
        if user.datasets is None or user.datasets == '':
            user.datasets = new_datasets
        prompt = f"""Here's a JSON file representing several datasets and their charactersitics:
        {user.datasets}
        Your task is to update that JSON information with these new datasets entries:
        {new_datasets}
        """
        user.datasets = ask_json(prompt)
        self.db_gateway.write(user.dict())
        print("User datasets updated")


    def update_user_datasets(self, discord_id: str, new_datasets: List[Dict]) -> DiscordUser:
        print("Updating user datasets")
        user = self.get_user_by_id(discord_id)
        if user.datasets is None or user.datasets == '':
            user.datasets = new_datasets
        prompt = f"""Here's a JSON file representing several datasets and their charactersitics:
        {user.datasets}
        Your task is to update that JSON information with these new datasets entries:
        {new_datasets}
        """
        user.datasets = ask_json(prompt)
        self.db_gateway.write(user.dict())
        print("User datasets updated")

    
    
class GuestUsersGateway:
    def __init__(self):
        self.db_gateway = DynamoDBGateway(table_name=DB_GUEST_USERS)

    def get_user_by_email(self, email: str) -> GuestUser:
        data = self.db_gateway.read('email', email)
        if data is None:
            print(f"User with email {email} does not exist")
            raise UserDoesNotExistException()
        return GuestUser(**data)

    def is_guest_user_allowed(self, email: str) -> bool:
        try:
            user = self.get_user_by_email(email)
        except UserDoesNotExistException:
            print("User does not exist")
            return False
        return user.remaining_trial_requests > 0

    def create_user(self, email: str) -> GuestUser:
        if email.endswith('@e2e.test'):
            demo_requests = 1000
        else:
            demo_requests = 5    
        user = GuestUser(email=email, remaining_trial_requests=demo_requests)
        self.db_gateway.write(user.dict())
        print("User created")
        return user

    def decrement_remaining_trial_requests(self, email: str) -> GuestUser:
        print("Decrementing remaining trial requests")
        data = self.db_gateway.read('email', email)
        user = GuestUser(**data)
        if user.remaining_trial_requests == 0:
            print("User has no remaining trial requests")
            return user
        user.remaining_trial_requests -= 1
        self.db_gateway.write(user.dict()) # todo: should be update instead of write
        return user
