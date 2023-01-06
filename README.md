## Usage

### Run Frontend express server

```zsh
cd app 
```
```zsh
yarn dev
```


### Run ChatGPT API

```zsh
cd chatgpt-api 
```
```zsh
yarn dev
```

### Run pdf2json API

```zsh
cd pdf2json-api 
```
```zsh
bash scripts/run_grobid.sh
```
```zsh
uvicorn main:app --reload
```
