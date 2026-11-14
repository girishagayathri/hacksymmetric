FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

COPY services/intelligence/requirements.txt ./services/intelligence/requirements.txt
RUN pip install --no-cache-dir -r services/intelligence/requirements.txt

COPY services/intelligence ./services/intelligence

EXPOSE 8000
CMD ["uvicorn", "services.intelligence.main:app", "--host", "0.0.0.0", "--port", "8000"]