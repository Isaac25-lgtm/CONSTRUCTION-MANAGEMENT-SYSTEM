FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for psycopg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies -- production by default
COPY requirements/base.txt requirements/base.txt
COPY requirements/production.txt requirements/production.txt
RUN pip install --no-cache-dir -r requirements/production.txt

COPY . .

# Collect static files for production
RUN DJANGO_SETTINGS_MODULE=buildpro.settings.production \
    DJANGO_SECRET_KEY=collectstatic-placeholder \
    python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

# Default: Gunicorn for production. Override in docker-compose for dev.
CMD ["gunicorn", "buildpro.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120"]
