import datetime
import json
from typing import Dict, List, Optional, Union

from database.db import DynamoDBGateway
from nlp import ask_json
from pydantic import BaseModel
from utils.constants import DB_DISCORD_USERS, DB_GUEST_USERS


class GuestUser(BaseModel):
    email: str
    remaining_trial_requests: int
    created_at: str


class CustomPrompt(BaseModel):
    title: str
    prompt: str


class DiscordUser(BaseModel):
    email: str
    discord_id: str
    created_at: str
    datasets: Optional[Union[List[Dict], str]] = None
    custom_prompts: Optional[List[CustomPrompt]] = None


class UserDoesNotExistException(Exception):
    pass


class PromptAlreadyExistsException(Exception):
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
        return user

    def update_user_datasets(self, discord_id: str, new_datasets: List[Dict]) -> DiscordUser:
        print("Updating user datasets")
        user = self.get_user_by_id(discord_id)
        if user.datasets is None or user.datasets == '':
            user.datasets = new_datasets
        prompt = f"""Here's a JSON file (or a markdown table) representing several datasets and their charactersitics:
        {user.datasets}
        Your task is to update that information with these new datasets entries:
        {new_datasets}
        """
        user.datasets = ask_json(prompt)
        self.db_gateway.write(user.dict())
        print("User datasets updated")
        return user


    def save_user_custom_prompt(self, discord_id: str, title: str, prompt: str) -> DiscordUser:
        print("Saving user custom prompt")
        user = self.get_user_by_id(discord_id)
        obj = CustomPrompt(title=title, prompt=prompt)

        if user.custom_prompts is None:
            user.custom_prompts = [obj]
        else:
            if title not in [p.title for p in user.custom_prompts]:
                user.custom_prompts.append(obj)
            else:
                raise PromptAlreadyExistsException("Custom prompt with that title already exists")

        self.db_gateway.write(user.dict())
        print("User custom prompt saved")
        return user
    
    def delete_user_custom_prompt(self, discord_id: str, title: str) -> DiscordUser:
        print("Deleting user custom prompt")
        user = self.get_user_by_id(discord_id)
        if user.custom_prompts is not None:
            user.custom_prompts = [p for p in user.custom_prompts if p.title != title]
            
        self.db_gateway.write(user.dict())
        print("User custom prompt deleted")
        return user

        

class GuestUsersGateway:
    def __init__(self):
        self.db_gateway = DynamoDBGateway(table_name=DB_GUEST_USERS)

    def get_user_by_email(self, email: str) -> GuestUser:
        data = self.db_gateway.read('email', email)
        if data is None:
            print(f"User with email {email} does not exist")
            raise UserDoesNotExistException()
        return GuestUser(**data)

    def has_remaining_requests(self, email: str) -> bool:
        user = self.get_user_by_email(email)
        return user.remaining_trial_requests > 0

    def create_user(self, email: str) -> GuestUser:
        if email.endswith('@e2e.test'):
            demo_requests = 1000
        else:
            demo_requests = 5
        user = GuestUser(
            email=email,
            remaining_trial_requests=demo_requests,
            created_at=str(datetime.datetime.utcnow())
        )
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
        # todo: should be update instead of write
        self.db_gateway.write(user.dict())
        return user
