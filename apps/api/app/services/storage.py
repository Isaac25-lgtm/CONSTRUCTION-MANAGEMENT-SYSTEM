import os
import uuid
from pathlib import Path
from typing import BinaryIO, Optional
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


class StorageService:
    """File storage service supporting local and cloud (R2) storage"""
    
    def __init__(self):
        self.use_cloud = settings.USE_CLOUD_STORAGE
        
        if self.use_cloud:
            # Initialize R2 client
            self.s3_client = boto3.client(
                's3',
                endpoint_url=settings.R2_ENDPOINT_URL,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name='auto'
            )
            self.bucket_name = settings.R2_BUCKET_NAME
        else:
            # Use local storage
            self.upload_dir = Path(settings.UPLOAD_DIR)
            self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def _generate_storage_path(self, org_id: str, filename: str) -> str:
        """Generate unique storage path for file"""
        # Create unique filename to avoid collisions
        file_ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4()}{file_ext}"
        
        # Organize by organization
        return f"{org_id}/{unique_name}"
    
    async def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        org_id: str,
        content_type: Optional[str] = None
    ) -> tuple[str, str]:
        """
        Upload file to storage.
        Returns (storage_path, file_url)
        """
        storage_path = self._generate_storage_path(org_id, filename)
        
        if self.use_cloud:
            # Upload to R2
            try:
                extra_args = {}
                if content_type:
                    extra_args['ContentType'] = content_type
                
                self.s3_client.upload_fileobj(
                    file,
                    self.bucket_name,
                    storage_path,
                    ExtraArgs=extra_args
                )
                
                # Generate public URL
                file_url = f"{settings.R2_PUBLIC_URL}/{storage_path}"
                
            except ClientError as e:
                raise Exception(f"Failed to upload to cloud storage: {str(e)}")
        else:
            # Save to local storage
            file_path = self.upload_dir / storage_path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'wb') as f:
                f.write(file.read())
            
            # Generate local URL
            file_url = f"/uploads/{storage_path}"
        
        return storage_path, file_url
    
    async def download_file(self, storage_path: str) -> bytes:
        """Download file from storage"""
        if self.use_cloud:
            # Download from R2
            try:
                response = self.s3_client.get_object(
                    Bucket=self.bucket_name,
                    Key=storage_path
                )
                return response['Body'].read()
            except ClientError as e:
                raise Exception(f"Failed to download from cloud storage: {str(e)}")
        else:
            # Read from local storage
            file_path = self.upload_dir / storage_path
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {storage_path}")
            
            with open(file_path, 'rb') as f:
                return f.read()
    
    async def delete_file(self, storage_path: str) -> None:
        """Delete file from storage"""
        if self.use_cloud:
            # Delete from R2
            try:
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=storage_path
                )
            except ClientError as e:
                raise Exception(f"Failed to delete from cloud storage: {str(e)}")
        else:
            # Delete from local storage
            file_path = self.upload_dir / storage_path
            if file_path.exists():
                file_path.unlink()
    
    def generate_presigned_url(self, storage_path: str, expiration: int = 3600) -> str:
        """Generate presigned URL for temporary access (cloud only)"""
        if not self.use_cloud:
            # For local storage, return direct path
            return f"/uploads/{storage_path}"
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': storage_path
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")


# Singleton instance
storage_service = StorageService()
