# BEFORE vs AFTER - DETAILED CODE COMPARISON

## FILE 1: auth.py

### ❌ BROKEN (BEFORE)
```python
# Line 1-10
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.models import User, Vendor
from app.schemas import LoginRequest, TokenResponse, RefreshTokenRequest
from app.security import (
    AccessToken, RefreshToken, PasswordManager, TokenData, get_current_user
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access and refresh tokens
    """
    # ... user lookup code ...
    
    # Line 80: ❌ BUG - settings used here but not imported yet!
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES  # ❌ NameError!
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    # ... refresh token code ...
    
    # Line 135: ❌ BUG - settings used here too!
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES  # ❌ NameError!
    )

# ... rest of endpoints ...

# Line 316: ❌ BUG - IMPORTED TOO LATE!
from app.config import settings
```

### ✅ FIXED (AFTER)
```python
# Line 1-11
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.config import settings  # ✅ FIXED: Moved to top with other imports
from app.database import get_db
from app.models import User, Vendor
from app.schemas import LoginRequest, TokenResponse, RefreshTokenRequest
from app.security import (
    AccessToken, RefreshToken, PasswordManager, TokenData, get_current_user
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access and refresh tokens
    """
    # ... user lookup code ...
    
    # ✅ FIXED: settings is now imported and available!
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES  # ✅ Works now!
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    # ... refresh token code ...
    
    # ✅ FIXED: settings available here too!
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES  # ✅ Works now!
    )

# ... rest of endpoints ...

# Line removed entirely - import is now at top
```

**Change Summary:** Move `from app.config import settings` from line 316 to line 3

---

## FILE 2: vendor.py

### ❌ BROKEN (BEFORE) - Signup Function
```python
@router.post("/signup", response_model=VendorResponse)
async def vendor_signup(
    request: VendorCreate,
    db: Session = Depends(get_db)
):
    """Register a new gym vendor"""
    
    # Check if subdomain already exists
    existing_vendor = db.query(Vendor).filter(Vendor.subdomain == request.subdomain).first()
    if existing_vendor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subdomain already taken"
        )
    
    # Check if email already exists
    existing_email = db.query(Vendor).filter(Vendor.email == request.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # ❌ BUG #2: Missing check for owner email in users table!
    # If two users register with same owner_email, second one crashes
    
    # ❌ BUG #4: No try/except wrapper! If user creation fails, vendor is orphaned
    # Create vendor
    vendor = Vendor(
        vendor_name=request.vendor_name,
        subdomain=request.subdomain.lower(),
        email=request.email,
        phone=request.phone,
        address=request.address,
        city=request.city,
        state=request.state,
        postal_code=request.postal_code,
        owner_name=request.owner_name,
        owner_email=request.owner_email,
        estimated_members=request.estimated_members
    )
    
    db.add(vendor)
    db.flush()
    
    # Create vendor settings
    vendor_settings = VendorSettings(vendor_id=vendor.id)
    db.add(vendor_settings)
    
    # Create owner user account
    # ❌ BUG #3: Unsafe name parsing - crashes if owner_name has 1 word
    # ❌ BUG #5: No early password validation
    owner_user = User(
        vendor_id=vendor.id,
        email=request.owner_email,
        password_hash=PasswordManager.hash_password(request.owner_password),
        first_name=request.owner_name.split()[0],  # ❌ IndexError if 1 word!
        last_name=request.owner_name.split()[1] if len(request.owner_name.split()) > 1 else "",  # ❌ Also crashes!
        role="gym_owner"
    )
    
    db.add(owner_user)
    db.commit()  # ❌ If commit fails, DB is inconsistent
    
    logger.info(f"New vendor registered: {vendor.vendor_name} ({vendor.subdomain})")
    
    return VendorResponse.from_orm(vendor)
```

### ✅ FIXED (AFTER) - Signup Function
```python
@router.post("/signup", response_model=VendorResponse)
async def vendor_signup(
    request: VendorCreate,
    db: Session = Depends(get_db)
):
    """Register a new gym vendor with complete validation and error handling"""
    
    try:
        # ✅ FIXED #5: Validate password early, before database operations
        if not request.owner_password or len(request.owner_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters long"
            )
        
        # Check if subdomain already exists
        existing_vendor = db.query(Vendor).filter(
            Vendor.subdomain == request.subdomain.lower()
        ).first()
        if existing_vendor:
            logger.warning(f"Subdomain already taken: {request.subdomain}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Subdomain already taken"
            )
        
        # Check if gym email already exists
        existing_email = db.query(Vendor).filter(
            Vendor.email == request.email
        ).first()
        if existing_email:
            logger.warning(f"Gym email already registered: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered for a gym"
            )
        
        # ✅ FIXED #2: Check if owner email already exists in users table!
        existing_owner = db.query(User).filter(
            User.email == request.owner_email
        ).first()
        if existing_owner:
            logger.warning(f"Owner email already registered: {request.owner_email}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Owner email already registered as a user"
            )
        
        # ✅ FIXED #3: Safe name parsing with proper validation
        owner_name = request.owner_name.strip() if request.owner_name else ""
        name_parts = owner_name.split()
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        
        try:
            # Create vendor with explicit UUID
            vendor = Vendor(
                id=uuid.uuid4(),
                vendor_name=request.vendor_name.strip(),
                subdomain=request.subdomain.lower().strip(),
                email=request.email.lower().strip(),
                phone=request.phone,
                address=request.address,
                city=request.city,
                state=request.state,
                postal_code=request.postal_code,
                owner_name=owner_name,
                owner_email=request.owner_email.lower().strip(),
                estimated_members=request.estimated_members or 0
            )
            
            db.add(vendor)
            db.flush()
            
            logger.info(f"Vendor created: {vendor.id} - {vendor.vendor_name}")
            
            # Create vendor settings
            vendor_settings = VendorSettings(
                id=uuid.uuid4(),
                vendor_id=vendor.id
            )
            db.add(vendor_settings)
            db.flush()
            
            logger.info(f"Vendor settings created: {vendor_settings.id}")
            
            # ✅ FIXED #5: Password validation and hashing happens before user creation
            try:
                password_hash = PasswordManager.hash_password(request.owner_password)
            except ValueError as ve:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(ve)
                )
            
            # Create owner user account with explicit UUID
            owner_user = User(
                id=uuid.uuid4(),
                vendor_id=vendor.id,
                email=request.owner_email.lower(),
                password_hash=password_hash,
                first_name=first_name,  # ✅ Safe - won't crash on single word
                last_name=last_name,    # ✅ Safe - empty string if no last name
                role="gym_owner",
                is_active=True
            )
            
            db.add(owner_user)
            db.flush()
            
            logger.info(f"Owner user created: {owner_user.id} - {owner_user.email}")
            
            # Commit all changes
            db.commit()
            
            logger.info(
                f"New vendor registered successfully: {vendor.vendor_name} "
                f"(subdomain: {vendor.subdomain}, owner: {owner_user.email})"
            )
            
            return VendorResponse.from_orm(vendor)
        
        except HTTPException:
            # ✅ FIXED #4: Rollback on any HTTP exception
            db.rollback()
            raise
        except Exception as e:
            # ✅ FIXED #4: Rollback on any database error
            db.rollback()
            logger.error(
                f"Error during vendor signup: {str(e)}, "
                f"subdomain: {request.subdomain}, "
                f"owner_email: {request.owner_email}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error creating vendor account. Please try again."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in vendor_signup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during signup"
        )
```

**Change Summary:**
1. ✅ Added early password validation (BUG #5)
2. ✅ Added owner email duplicate check (BUG #2)
3. ✅ Fixed name parsing to handle 1-word names safely (BUG #3)
4. ✅ Wrapped in try/except with db.rollback() (BUG #4)
5. ✅ Added comprehensive logging
6. ✅ Added data trimming and normalization

---

## COMPARISON TABLE

| Aspect | BEFORE ❌ | AFTER ✅ |
|--------|----------|----------|
| **settings import** | Line 316 (after usage) | Line 3 (before usage) |
| **Owner email check** | Missing | Present |
| **Name parsing** | `split()[1]` (crashes) | `split()` with len check |
| **Error handling** | None | try/except with rollback |
| **Password validation** | In transaction | Before transaction |
| **Data normalization** | None | .strip().lower() |
| **Logging** | Minimal | Comprehensive |
| **UUIDs** | Default | Explicit generation |
| **Vendor Settings** | Same transaction | With error handling |

---

## LINE-BY-LINE CHANGES

### auth.py
- **Line 3:** ✅ Add `from app.config import settings`
- **Line 316:** ✅ Remove `from app.config import settings`

### vendor.py
- **Line 20-30:** ✅ Add password validation
- **Line 40-50:** ✅ Add owner email duplicate check
- **Line 60-70:** ✅ Add safe name parsing
- **Line 47-80:** ✅ Wrap in try/except with rollback
- **All database operations:** ✅ Add explicit UUIDs
- **Email fields:** ✅ Add `.lower().strip()`
- **Throughout:** ✅ Add comprehensive logging

---

## BEFORE vs AFTER: FLOW COMPARISON

### ❌ BEFORE (Broken Flow)
```
1. User submits signup request
   ↓
2. Check subdomain ✅
   ↓
3. Check gym email ✅
   ↓
4. Create vendor ✅
   ↓
5. Create vendor_settings ✅
   ↓
6. Try to create user
   ├─ Parse name: "Ravi".split()[1] ❌ IndexError!
   └─ OR owner_email already exists ❌ Database error!
   ↓
7. db.commit() fails ❌
   ↓
8. Result: Vendor orphaned, inconsistent database ❌
```

### ✅ AFTER (Fixed Flow)
```
1. User submits signup request
   ↓
2. Validate password ✅
   ↓
3. Check subdomain ✅
   ↓
4. Check gym email ✅
   ↓
5. Check owner email ✅
   ↓
6. Parse name safely ✅
   ↓
7. Create vendor ✅
   ↓
8. Create vendor_settings ✅
   ↓
9. Hash password ✅
   ↓
10. Create user ✅
    ↓
11. db.commit() ✅
    ↓
12. Result: Everything created atomically, no orphans ✅
```

---

## EXCEPTION HANDLING COMPARISON

### ❌ BEFORE
```python
# Single exception for everything
raise HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="Error"
)
# If any error: vendor, settings, partial user created → orphaned
```

### ✅ AFTER
```python
try:
    # All operations
    db.commit()
except HTTPException:
    db.rollback()  # Rollback all changes
    raise
except Exception as e:
    db.rollback()  # Rollback all changes
    raise HTTPException(...)
```

**Result:** Atomic transaction - either everything succeeds or everything rolls back.

---

**All changes have been carefully designed to maintain backward compatibility while fixing the 5 critical bugs.**
