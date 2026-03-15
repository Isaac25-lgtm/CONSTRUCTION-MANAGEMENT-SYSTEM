"""
Celery application for BuildPro.

DJANGO_SETTINGS_MODULE must be set explicitly in the environment.
Production containers set it via env_file/environment in docker-compose.
"""
import os
import sys

if "DJANGO_SETTINGS_MODULE" not in os.environ:
    print(
        "ERROR: DJANGO_SETTINGS_MODULE is not set. "
        "Set it explicitly before starting the Celery worker.",
        file=sys.stderr,
    )
    sys.exit(1)

from celery import Celery

app = Celery("buildpro")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
