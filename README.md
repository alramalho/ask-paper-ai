# Ask paper
Visite me on [askpaper.ai](https://askpaper.ai)!

## 🔧 Set up

### Fill project with correct environment variables value
1. on `backend/.env`
```
OPENAI_API_KEY=<key>
ENVIRONMENT=<env>
```
1. on `frontend/.env`
```
NEXT_PUBLIC_BACKEND_HTTP_APIURL="http://localhost:8000"
DISCORD_BYPASS_LOGIN_TOKEN=<discord_token>

DISCORD_CLIENT_ID=<discord_id>
DISCORD_CLIENT_SECRET=<discord_secret>
DISCORD_CLIENT_BOT_TOKEN=<discort_bot_token>
NEXT_PUBLIC_HIPPOAI_DISCORD_SERVER_ID=1022781602893414410

NEXTAUTH_SECRET=<auth_secret>
NEXTAUTH_URL="http://localhost:3000/"
ENVIRONMENT=<env>
```

### Install aws-cli and configure it
1. Make sure that you have `~/.aws` folder with config and credentials

### Now you can bootstrap the project two ways:
1. Using python and yarn
1. Using docker

## 💻 Run with python and yarn

1. **install dependencies**
  1. for backend (noting that dependencies will be install on your local machine, consider using venv to install to a python virtual environment)
```shell
cd backend && pip install -r requirements.txt
```
  1. for frontend
```shell
cd frontend && yarn
```

1. **start project**
  1. for backend
```shell
cd backend && python src/api.py
```
  1. for frontend
```shell
cd frontend && yarn dev
```

## 🚀 Run with docker

1. **Start Project.**

### To start, execute this:
```shell
docker-compose up -d
```

### For no cache, execute this:
```shell
docker-compose build --no-cache
docker-compose up -d --force-recreate
```
or
```shell
docker-compose up -d --no-deps --build
```

## 🧹 Docker clean up

1. **Check docker and images.**
```shell
docker ps -a
docekr images -a
```

1. **Stop and remove container.**
```shell
docker stop $(docker ps -aq --filter name="ask-paper")
docker rm $(docker ps -aq --filter name="ask-paper")
```

1. **Remove dangling.**
```shell
docker rmi $(docker images -q -f dangling=true)
```

1. **Remove all images.**
```shell
docker image prune -a
```
