<img style="width: 100%; object-fit: cover" src="https://hippoai-assets.s3.eu-central-1.amazonaws.com/askpaperbanner.png"/>

Visit me on [askpaper.ai](https://askpaper.ai)!

## todo

- Refactor backend organization to Clean Architecture (https://github.com/lsoares/clean-architecture-sample)
- Fix linting
- Implement Lambda Python streaming (custom runtime?)
- move grobid to own repo and import as dependency


## ✅ Coordination 

We currently have our backlog in [this notion page](https://www.notion.so/hippoteam/Ask-Paper-Development-d724d73c83b54c01a5bedb32de6ad075)


## 🔧 Set up

### Fill project with correct environment variables value
* on `backend/.env`
```
OPENAI_API_KEY=<key>
ENVIRONMENT=<env>
```
* on `frontend/.env`
```
NEXT_PUBLIC_BACKEND_HTTP_APIURL="http://localhost:8000"

DISCORD_CLIENT_ID=<discord_id>
DISCORD_CLIENT_SECRET=<discord_secret>
DISCORD_CLIENT_BOT_TOKEN=<discort_bot_token>
HIPPOAI_DISCORD_SERVER_ID=1022781602893414410

NEXTAUTH_SECRET=<auth_secret>
NEXTAUTH_URL="http://localhost:3000/"
ENVIRONMENT=<env>
```
* on `infrastructure/.env` (in case you are working on infrastructure locally):
```
OPENAI_API_KEY=<key>
ENVIRONMENT=<env>
LATEST_COMMIT_ID=<commit_id>
```

* on `tests/e2e/.env`:
```
APP_URL=<frontend url>    # for dev env -> "http://127.0.0.1:3000"
ENVIRONMENT=<env>
```

### Install aws-cli and configure it
1. Make sure that you have `~/.aws` folder with config and credentials
> you can do by running `aws configure`

### Now you can bootstrap the project two ways:
1. Using python and yarn
1. Using docker (uses localstack)

## 💻 Run manually (has hot reloading)

### **Install dependencies**
1. for infrastructure
```shell
./start-infra-local.sh
```

PS: Notice that despite needing the backend build (zip), this is irrelevant as you will not be using the output of that build
You can optionally pass the `--no-build` flag to skip the backend build part.

1. for backend (noting that dependencies will be install on your local machine, consider using venv to install to a python virtual environment)
```shell
cd backend
pip install -r requirements.txt
```
1. for frontend
```shell
cd frontend
yarn
```

### **Start project**
1. for backend
```shell
cd backend
python src/api.py
```
1. for frontend
```shell
cd frontend
yarn dev
```

## 🚀 Run with docker

### **Start Project.**

#### To start, execute this:
```shell
docker-compose up -d
```

#### For no cache, execute this:
```shell
docker-compose build --no-cache
docker-compose up -d --force-recreate
```
or
```shell
docker-compose up -d --no-deps --build
```

### **Configure localstack**

#### Go to infrastructure folder
```shell
yarn
yarn build-backend-zip # builds the backend project onto build.zip 
yarn deploy-local # bootstraps and then deploys onto localstack
```

## 🧹 Docker clean up

1. **Check docker and images.**
```shell
docker ps -a
docker images -a
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

---
## ⚠️ Not in the repo
- Domain setup
  - this was done manually in EuroDNS and Netlify, and there is no way to include it here.
