from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=10
)

# Security scheme
security = HTTPBearer()


class TokenData:
    """Token payload data"""
    def __init__(self, user_id: str, vendor_id: str, email: str, role: str):
        self.user_id = user_id
        self.vendor_id = vendor_id
        self.email = email
        self.role = role


class AccessToken:
    """Access token management"""
    
    @staticmethod
    def create_access_token(
        user_id: str,
        vendor_id: str,
        email: str,
        role: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        expire = datetime.now(timezone.utc) + expires_delta
        
        to_encode = {
            "user_id": user_id,
            "vendor_id": vendor_id,
            "email": email,
            "role": role,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        }
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    
    @staticmethod
    def verify_access_token(token: str) -> TokenData:
        """Verify and decode access token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            user_id: str = payload.get("user_id")
            vendor_id: str = payload.get("vendor_id")
            email: str = payload.get("email")
            role: str = payload.get("role")
            token_type: str = payload.get("type")
            
            if user_id is None or token_type != "access":
                raise credentials_exception
            
            return TokenData(
                user_id=user_id,
                vendor_id=vendor_id,
                email=email,
                role=role
            )
        
        except JWTError as e:
            logger.error(f"JWT verification error: {str(e)}")
            raise credentials_exception


class RefreshToken:
    """Refresh token management"""
    
    @staticmethod
    def create_refresh_token(
        user_id: str,
        vendor_id: str,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT refresh token"""
        if expires_delta is None:
            expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        expire = datetime.now(timezone.utc) + expires_delta
        
        to_encode = {
            "user_id": user_id,
            "vendor_id": vendor_id,
            "email": email,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh"
        }
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    
    @staticmethod
    def verify_refresh_token(token: str) -> Dict[str, Any]:
        """Verify and decode refresh token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            token_type: str = payload.get("type")
            
            if token_type != "refresh":
                raise credentials_exception
            
            return payload
        
        except JWTError as e:
            logger.error(f"JWT verification error: {str(e)}")
            raise credentials_exception


class PasswordManager:
    """Password hashing and verification"""

    @staticmethod
    def _prepare(password: str) -> str:
        """bcrypt only supports the first 72 bytes; truncate safely so long
        passwords never raise. Encoding-aware so multibyte chars don't break."""
        if password is None:
            return ""
        pw_bytes = password.encode("utf-8")
        if len(pw_bytes) > 72:
            pw_bytes = pw_bytes[:72]
        return pw_bytes.decode("utf-8", "ignore")

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")

        return pwd_context.hash(PasswordManager._prepare(password))

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return pwd_context.verify(
                PasswordManager._prepare(plain_password), hashed_password
            )
        except Exception:
            return False


class APIKeyManager:
    """API Key generation and validation"""
    
    @staticmethod
    def generate_api_key(length: int = 32) -> str:
        """Generate a random API key"""
        import secrets
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash an API key for storage"""
        import hashlib
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    @staticmethod
    def verify_api_key(plain_key: str, hashed_key: str) -> bool:
        """Verify an API key"""
        import hashlib
        return hashlib.sha256(plain_key.encode()).hexdigest() == hashed_key


class AuthenticationError(Exception):
    """Custom authentication error"""
    pass


class AuthorizationError(Exception):
    """Custom authorization error"""
    pass


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    Dependency to get current authenticated user from Bearer token
    Usage: current_user: TokenData = Depends(get_current_user)
    """
    token = credentials.credentials
    return AccessToken.verify_access_token(token)


def get_current_vendor_id(current_user: TokenData = Depends(get_current_user)) -> str:
    """Get current vendor ID from token"""
    if not current_user.vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor context not found"
        )
    return current_user.vendor_id


def check_vendor_context(
    request_vendor_id: str,
    token_vendor_id: str
) -> None:
    """
    Enforce vendor isolation - ensure user can only access their vendor's data
    """
    if request_vendor_id != token_vendor_id:
        logger.warning(f"Vendor context mismatch: {request_vendor_id} vs {token_vendor_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied - vendor context mismatch"
        )


def require_role(*allowed_roles: str):
    """Dependency to check if user has required role"""
    async def check_role(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return check_role


def verify_api_key_header(api_key: str) -> str:
    """Verify API key from header"""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is required"
        )
    return api_key


# Rate limiting helper
class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, identifier: str, limit: int, window: int) -> bool:
        """Check if request is allowed based on rate limit"""
        now = datetime.now(timezone.utc)
        
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside the window
        cutoff_time = now - timedelta(seconds=window)
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > cutoff_time
        ]
        
        # Check limit
        if len(self.requests[identifier]) >= limit:
            return False
        
        # Add new request
        self.requests[identifier].append(now)
        return True


rate_limiter = RateLimiter()
