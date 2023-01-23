# Use an official Python runtime as the base image
FROM python:3.9

COPY . ./app
WORKDIR /app

# Install the necessary dependencies
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]