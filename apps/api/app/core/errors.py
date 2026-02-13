from typing import Optional, Any


class APIError(Exception):
    """Base API Error"""
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400,
        details: Optional[Any] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


# Authentication Errors
class AuthenticationError(APIError):
    def __init__(self, message: str = "Authentication failed", details: Optional[Any] = None):
        super().__init__(message, "AUTHENTICATION_ERROR", 401, details)


class InvalidCredentialsError(APIError):
    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(message, "INVALID_CREDENTIALS", 401)


class TokenExpiredError(APIError):
    def __init__(self, message: str = "Token has expired"):
        super().__init__(message, "TOKEN_EXPIRED", 401)


class InvalidTokenError(APIError):
    def __init__(self, message: str = "Invalid token"):
        super().__init__(message, "INVALID_TOKEN", 401)


# Authorization Errors
class PermissionDeniedError(APIError):
    def __init__(self, message: str = "Permission denied", details: Optional[Any] = None):
        super().__init__(message, "PERMISSION_DENIED", 403, details)


class NotProjectMemberError(APIError):
    def __init__(self, message: str = "You are not a member of this project"):
        super().__init__(message, "NOT_PROJECT_MEMBER", 403)


# Resource Errors
class NotFoundError(APIError):
    def __init__(self, resource: str = "Resource", details: Optional[Any] = None):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404, details)


class AlreadyExistsError(APIError):
    def __init__(self, resource: str = "Resource", details: Optional[Any] = None):
        super().__init__(f"{resource} already exists", "ALREADY_EXISTS", 409, details)


# Validation Errors
class ValidationError(APIError):
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, "VALIDATION_ERROR", 422, details)


# Business Logic Errors
class CircularDependencyError(APIError):
    def __init__(self, message: str = "Circular dependency detected"):
        super().__init__(message, "CIRCULAR_DEPENDENCY", 400)


class BudgetExceededError(APIError):
    def __init__(self, message: str = "Budget limit exceeded"):
        super().__init__(message, "BUDGET_EXCEEDED", 400)


class InvalidStateTransitionError(APIError):
    def __init__(self, message: str):
        super().__init__(message, "INVALID_STATE_TRANSITION", 400)


# Rate Limiting
class RateLimitError(APIError):
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, "RATE_LIMIT_EXCEEDED", 429)


# Aliases
UnauthorizedError = AuthenticationError
ForbiddenError = PermissionDeniedError
