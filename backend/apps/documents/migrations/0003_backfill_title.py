"""Data migration: copy name -> title for existing documents."""
from django.db import migrations


def backfill_title(apps, schema_editor):
    Document = apps.get_model("documents", "Document")
    for doc in Document.objects.filter(title=""):
        doc.title = doc.name
        doc.save(update_fields=["title"])


def reverse_backfill(apps, schema_editor):
    pass  # No reverse needed


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0002_document_code_document_current_version_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_title, reverse_backfill),
    ]
