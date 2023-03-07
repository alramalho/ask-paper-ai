FROM python:3.9-slim as python
# https://github.com/aws/amazon-sagemaker-examples/issues/319#issuecomment-405749895
ENV PYTHONUNBUFFERED=true
WORKDIR /app


FROM python as poetry
ENV POETRY_HOME=/opt/poetry
ENV POETRY_VIRTUALENVS_IN_PROJECT=true
ENV PATH="$POETRY_HOME/bin:$PATH"
RUN python -c 'from urllib.request import urlopen; print(urlopen("https://install.python-poetry.org").read().decode())' | python -
COPY . ./
RUN poetry install --no-interaction --no-ansi -vvv

FROM python as runtime
ENV PATH="/app/.venv/bin:$PATH"
COPY --from=poetry /app /app

# sleep infinity for debug purpose
# CMD ["sleep", "infinity"]
CMD ["python", "src/api.py"]
