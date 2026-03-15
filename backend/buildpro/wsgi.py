"""
WSGI config for BuildPro project.

DJANGO_SETTINGS_MODULE must be set explicitly in the environment.
manage.py sets it for CLI use. Production containers set it via env_file.
If unset, this refuses to start rather than silently using dev settings.
"""
import os
import sys

from django.core.wsgi import get_wsgi_application

if "DJANGO_SETTINGS_MODULE" not in os.environ:
    # manage.py always sets this. If we reach here via gunicorn without it,
    # something is wrong with the deployment config.
    print(
        "ERROR: DJANGO_SETTINGS_MODULE is not set. "
        "Set it explicitly (e.g. buildpro.settings.production) before starting.",
        file=sys.stderr,
    )
    sys.exit(1)

application = get_wsgi_application()
