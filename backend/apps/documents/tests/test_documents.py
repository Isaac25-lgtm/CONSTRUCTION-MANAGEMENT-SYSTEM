"""Tests for documents: CRUD, versioning, validation, authorization."""
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from apps.accounts.models import User, Organisation, SystemRole
from apps.projects.models import Project, ProjectMembership
from apps.documents.models import Document

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00"
    b"\xff\xd9"
)


class DocumentBaseTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")
        self.admin_role = SystemRole.objects.create(name="Admin", permissions=["admin.full_access"])
        self.viewer_role = SystemRole.objects.create(name="Viewer", permissions=[])
        self.admin = User.objects.create_user(
            username="admin", password="pass123",
            organisation=self.org, system_role=self.admin_role, is_staff=True,
        )
        self.viewer = User.objects.create_user(
            username="viewer", password="pass123",
            organisation=self.org, system_role=self.viewer_role,
        )
        self.project = Project.objects.create(
            name="Doc Test Project", project_type="residential",
            contract_type="lump_sum", organisation=self.org,
        )
        ProjectMembership.objects.create(
            project=self.project, user=self.viewer, role="viewer",
            permissions=["project.view", "documents.view"],
        )


class DocumentCRUDTests(DocumentBaseTestCase):
    def test_create_document_with_file(self):
        self.client.force_login(self.admin)
        test_file = SimpleUploadedFile("test.pdf", PDF_BYTES, content_type="application/pdf")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Test Drawing", "category": "drawings", "file": test_file},
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["title"], "Test Drawing")
        self.assertEqual(r.json()["current_version_number"], 1)
        # Auto-generated code
        self.assertTrue(r.json()["code"].startswith("DOC-"))

    def test_create_document_with_name_fallback(self):
        """Backward compat: 'name' field still works as alias for title."""
        self.client.force_login(self.admin)
        test_file = SimpleUploadedFile("test.pdf", PDF_BYTES, content_type="application/pdf")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"name": "Legacy Name", "category": "other", "file": test_file},
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["title"], "Legacy Name")

    def test_list_documents(self):
        Document.objects.create(
            project=self.project, organisation=self.org, title="Drawing A",
            category="drawings", current_version_number=1,
            latest_file_name="drawing_a.pdf", latest_file_size=1024,
            created_by=self.admin, updated_by=self.admin,
        )
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/documents/{self.project.id}/documents/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()), 1)
        # Verify new fields are in response
        doc = r.json()[0]
        self.assertIn("code", doc)
        self.assertIn("status", doc)
        self.assertIn("discipline", doc)
        self.assertIn("status_display", doc)

    def test_document_summary(self):
        Document.objects.create(
            project=self.project, organisation=self.org, title="Drawing",
            category="drawings", created_by=self.admin, updated_by=self.admin,
        )
        Document.objects.create(
            project=self.project, organisation=self.org, title="Permit",
            category="permits", created_by=self.admin, updated_by=self.admin,
        )
        self.client.force_login(self.admin)
        r = self.client.get(f"/api/v1/documents/{self.project.id}/summary/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["total_documents"], 2)

    def test_viewer_can_list_but_not_upload(self):
        self.client.force_login(self.viewer)
        r = self.client.get(f"/api/v1/documents/{self.project.id}/documents/")
        self.assertEqual(r.status_code, 200)

        test_file = SimpleUploadedFile("test.pdf", b"content", content_type="application/pdf")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Forbidden", "category": "other", "file": test_file},
        )
        self.assertEqual(r.status_code, 403)


class DocumentVersionTests(DocumentBaseTestCase):
    def test_upload_new_version_with_supersedes(self):
        self.client.force_login(self.admin)
        file1 = SimpleUploadedFile("v1.pdf", PDF_BYTES, content_type="application/pdf")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Versioned Doc", "category": "drawings", "file": file1},
        )
        doc_id = r.json()["id"]
        self.assertEqual(r.json()["current_version_number"], 1)

        # Upload v2
        file2 = SimpleUploadedFile("v2.pdf", PDF_BYTES, content_type="application/pdf")
        r2 = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/{doc_id}/versions/",
            {"file": file2, "notes": "Updated calculations"},
        )
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(r2.json()["version_number"], 2)
        self.assertIsNotNone(r2.json()["supersedes"])  # should point to v1
        self.assertIn("approval_status", r2.json())
        self.assertEqual(r2.json()["approval_status"], "pending")

        # Check document was updated
        r3 = self.client.get(f"/api/v1/documents/{self.project.id}/documents/{doc_id}/")
        self.assertEqual(r3.json()["current_version_number"], 2)


class FileValidationTests(DocumentBaseTestCase):
    def test_reject_disallowed_extension(self):
        self.client.force_login(self.admin)
        bad_file = SimpleUploadedFile("malware.exe", b"bad content", content_type="application/x-msdownload")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Bad File", "category": "other", "file": bad_file},
        )
        self.assertEqual(r.status_code, 400)

    def test_reject_non_image_for_photos(self):
        self.client.force_login(self.admin)
        pdf_file = SimpleUploadedFile("doc.pdf", PDF_BYTES, content_type="application/pdf")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Not a photo", "category": "photos", "file": pdf_file},
        )
        self.assertEqual(r.status_code, 400)

    def test_accept_image_for_photos(self):
        self.client.force_login(self.admin)
        img = SimpleUploadedFile("photo.jpg", JPEG_BYTES, content_type="image/jpeg")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Site Photo", "category": "photos", "file": img},
        )
        self.assertEqual(r.status_code, 201)

    def test_accept_pdf_for_documents(self):
        self.client.force_login(self.admin)
        pdf = SimpleUploadedFile("drawing.pdf", PDF_BYTES, content_type="application/pdf")
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Normal PDF", "category": "drawings", "file": pdf},
        )
        self.assertEqual(r.status_code, 201)

    def test_reject_spoofed_pdf_content(self):
        self.client.force_login(self.admin)
        fake_pdf = SimpleUploadedFile(
            "drawing.pdf",
            b"MZ\x90\x00not-a-pdf",
            content_type="application/pdf",
        )
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Spoofed PDF", "category": "drawings", "file": fake_pdf},
        )
        self.assertEqual(r.status_code, 400)

    def test_reject_spoofed_photo_content(self):
        self.client.force_login(self.admin)
        fake_photo = SimpleUploadedFile(
            "photo.jpg",
            PDF_BYTES,
            content_type="image/jpeg",
        )
        r = self.client.post(
            f"/api/v1/documents/{self.project.id}/documents/",
            {"title": "Spoofed Photo", "category": "photos", "file": fake_photo},
        )
        self.assertEqual(r.status_code, 400)

    def test_unauthenticated_denied(self):
        r = self.client.get(f"/api/v1/documents/{self.project.id}/documents/")
        self.assertEqual(r.status_code, 403)
