"""Cloud storage service supporting Cloudflare R2 / AWS S3."""

import uuid
import logging
from typing import Optional, BinaryIO
from datetime import datetime

from app.core.config import settings

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover - handled at runtime when cloud mode is enabled
    boto3 = None
    Config = None
    ClientError = Exception

logger = logging.getLogger(__name__)


class CloudStorageService:
    """Service for handling file uploads to Cloudflare R2 or AWS S3."""
    
    def __init__(self):
        self.enabled = settings.USE_CLOUD_STORAGE and bool(settings.R2_ENDPOINT_URL)
        
        if self.enabled:
            if boto3 is None or Config is None:
                raise RuntimeError(
                    "Cloud storage is enabled but boto3 is not installed. "
                    "Install backend requirements or disable USE_CLOUD_STORAGE."
                )
            self.client = boto3.client(
                "s3",
                endpoint_url=settings.R2_ENDPOINT_URL,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                config=Config(
                    signature_version="s3v4",
                    retries={"max_attempts": 3, "mode": "standard"}
                )
            )
            self.bucket_name = settings.R2_BUCKET_NAME
            self.public_url = settings.R2_PUBLIC_URL
        else:
            self.client = None
            logger.warning("Cloud storage is disabled. Files will be stored locally.")
    
    def generate_unique_key(self, filename: str, project_id: Optional[str] = None) -> str:
        """Generate a unique key for the file in cloud storage."""
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        unique_id = uuid.uuid4().hex[:12]
        date_prefix = datetime.utcnow().strftime("%Y/%m")
        
        if project_id:
            return f"projects/{project_id}/{date_prefix}/{unique_id}.{ext}"
        return f"uploads/{date_prefix}/{unique_id}.{ext}"
    
    async def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        content_type: str,
        project_id: Optional[str] = None
    ) -> dict:
        """
        Upload a file to cloud storage.
        
        Returns:
            dict with 'key' and 'url' of the uploaded file
        """
        if not self.enabled:
            # Fallback to local storage
            return await self._save_locally(file, filename)
        
        key = self.generate_unique_key(filename, project_id)
        
        try:
            self.client.upload_fileobj(
                file,
                self.bucket_name,
                key,
                ExtraArgs={
                    "ContentType": content_type,
                    "ContentDisposition": f'inline; filename="{filename}"'
                }
            )
            
            url = f"{self.public_url}/{key}" if self.public_url else self._generate_presigned_url(key)
            
            logger.info(f"Uploaded file to cloud storage: {key}")
            
            return {
                "key": key,
                "url": url,
                "storage": "cloud"
            }
            
        except ClientError as e:
            logger.error(f"Failed to upload file to cloud storage: {e}")
            raise Exception(f"Cloud storage upload failed: {str(e)}")
    
    def _generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a presigned URL for accessing the file."""
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": key},
                ExpiresIn=expires_in
            )
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return ""
    
    async def delete_file(self, key: str) -> bool:
        """Delete a file from cloud storage."""
        if not self.enabled:
            return True
            
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"Deleted file from cloud storage: {key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete file from cloud storage: {e}")
            return False
    
    async def _save_locally(self, file: BinaryIO, filename: str) -> dict:
        """Fallback: save file locally when cloud storage is not configured."""
        import os
        
        upload_dir = settings.UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)
        
        unique_name = f"{uuid.uuid4().hex[:12]}_{filename}"
        filepath = os.path.join(upload_dir, unique_name)
        
        with open(filepath, "wb") as f:
            content = file.read()
            f.write(content)
        
        return {
            "key": unique_name,
            "url": f"/uploads/{unique_name}",
            "storage": "local"
        }


# Singleton instance
storage_service = CloudStorageService()
