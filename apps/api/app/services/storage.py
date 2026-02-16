import uuid
from pathlib import Path
from typing import BinaryIO, Optional

from app.core.config import settings

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover - handled at runtime when cloud mode is enabled
    boto3 = None
    ClientError = Exception


UPLOAD_CHUNK_SIZE = 1024 * 1024  # 1MB


class FileSizeLimitExceededError(Exception):
    """Raised when an upload exceeds the configured maximum file size."""


class _MaxSizeReader:
    """File-like wrapper that counts bytes and optionally enforces a max size."""

    def __init__(
        self,
        wrapped: BinaryIO,
        max_size: Optional[int],
        chunk_size: int = UPLOAD_CHUNK_SIZE,
    ):
        self._wrapped = wrapped
        self._max_size = max_size
        self._chunk_size = chunk_size
        self.bytes_read = 0

    def read(self, size: int = -1) -> bytes:
        if size is None or size < 0:
            size = self._chunk_size

        data = self._wrapped.read(size)
        if not data:
            return data

        self.bytes_read += len(data)
        if self._max_size is not None and self.bytes_read > self._max_size:
            raise FileSizeLimitExceededError(
                f"File size exceeds maximum allowed size of {self._max_size} bytes"
            )
        return data

    def seek(self, offset: int, whence: int = 0):
        return self._wrapped.seek(offset, whence)

    def tell(self) -> int:
        return self._wrapped.tell()


class StorageService:
    """File storage service supporting local and cloud (R2) storage"""
    
    def __init__(self):
        self.use_cloud = settings.USE_CLOUD_STORAGE
        
        if self.use_cloud:
            if boto3 is None:
                raise RuntimeError(
                    "Cloud storage is enabled but boto3 is not installed. "
                    "Install backend requirements or set USE_CLOUD_STORAGE=false."
                )
            required_settings = {
                "R2_ENDPOINT_URL": settings.R2_ENDPOINT_URL,
                "R2_ACCESS_KEY_ID": settings.R2_ACCESS_KEY_ID,
                "R2_SECRET_ACCESS_KEY": settings.R2_SECRET_ACCESS_KEY,
                "R2_BUCKET_NAME": settings.R2_BUCKET_NAME,
            }
            missing_settings = [
                key for key, value in required_settings.items() if not value
            ]
            if missing_settings:
                raise RuntimeError(
                    "Cloud storage is enabled but missing required R2 settings: "
                    f"{', '.join(missing_settings)}"
                )
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
        content_type: Optional[str] = None,
        max_size: Optional[int] = None
    ) -> tuple[str, str, int]:
        """
        Upload file to storage.
        Returns (storage_key, file_url, file_size)
        """
        storage_key = self._generate_storage_path(org_id, filename)
        file_size = 0
        
        if self.use_cloud:
            # Upload to R2
            try:
                extra_args = {}
                if content_type:
                    extra_args['ContentType'] = content_type

                # Always wrap stream to count size; max_size is enforced when provided.
                upload_source = _MaxSizeReader(file, max_size)
                
                self.s3_client.upload_fileobj(
                    upload_source,
                    self.bucket_name,
                    storage_key,
                    ExtraArgs=extra_args
                )
                file_size = upload_source.bytes_read
                
                # Generate URL: public URL when configured, otherwise presigned URL.
                if settings.R2_PUBLIC_URL:
                    file_url = f"{settings.R2_PUBLIC_URL.rstrip('/')}/{storage_key}"
                else:
                    file_url = self.generate_presigned_url(storage_key)
            except FileSizeLimitExceededError:
                raise
            except ClientError as e:
                raise Exception(f"Failed to upload to cloud storage: {str(e)}")
            except Exception as e:
                # boto3 may wrap stream read exceptions during transfer.
                if "File size exceeds maximum allowed size" in str(e):
                    raise FileSizeLimitExceededError(str(e))
                raise Exception(f"Failed to upload to cloud storage: {str(e)}")
        else:
            # Save to local storage
            file_path = self.upload_dir / storage_key
            file_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                with open(file_path, 'wb') as f:
                    while True:
                        chunk = file.read(UPLOAD_CHUNK_SIZE)
                        if not chunk:
                            break

                        file_size += len(chunk)
                        if max_size is not None and file_size > max_size:
                            raise FileSizeLimitExceededError(
                                f"File size exceeds maximum allowed size of {max_size} bytes"
                            )

                        f.write(chunk)
            except FileSizeLimitExceededError:
                if file_path.exists():
                    file_path.unlink()
                raise
            except Exception:
                if file_path.exists():
                    file_path.unlink()
                raise
            
            # Generate local URL
            file_url = f"/uploads/{storage_key}"
        
        return storage_key, file_url, file_size
    
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


_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Lazily initialize and return a singleton storage service instance."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
