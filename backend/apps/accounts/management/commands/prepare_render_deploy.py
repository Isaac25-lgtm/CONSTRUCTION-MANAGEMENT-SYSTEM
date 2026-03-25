"""
Prepare a Render deploy in a single pre-deploy command.

Render executes `preDeployCommand` as one command invocation, so shell
operators like `&&` are not reliable here. This command wraps the required
deploy-time steps in one Django management command.
"""
import os

from django.core.management import BaseCommand, call_command


class Command(BaseCommand):
    help = "Run deploy-time tasks for Render: migrate, then seed the env admin."

    def handle(self, *args, **options):
        call_command("migrate", interactive=False)
        call_command("seed_env_admin")
        if os.getenv("SEED_DEMO_PROJECTS", "").strip().lower() in {"1", "true", "yes", "on"}:
            call_command("seed_demo_projects")
        self.stdout.write(self.style.SUCCESS("Render deploy preparation complete!"))
