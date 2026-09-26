FROM python:3.12-slim

WORKDIR /app

COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt psycopg2-binary

COPY apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "tejax.main:app", "--host", "0.0.0.0", "--port", "8000"]
