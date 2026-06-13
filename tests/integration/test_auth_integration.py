"""
Comprehensive test file for signup/login authentication flow.
This file tests all auth and vendor signup endpoints with real scenarios.

Run with: python -m pytest test_auth_integration.py -v
"""

import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from main import app
from app.database import Base, get_db
from app.models import User, Vendor
from app.security import PasswordManager


# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestVendorSignup:
    """Test vendor signup endpoint"""
    
    def test_signup_success(self):
        """Test successful vendor signup"""
        response = client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "FitPro Gym",
                "subdomain": "fitpro",
                "email": "gym@fitpro.com",
                "phone": "9876543210",
                "owner_name": "John Doe",
                "owner_email": "owner@fitpro.com",
                "owner_password": "SecurePass123!",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["vendor_name"] == "FitPro Gym"
        assert data["subdomain"] == "fitpro"
        assert data["status"] == "trial"
        print("✓ Vendor signup successful")
    
    def test_signup_duplicate_subdomain(self):
        """Test signup with duplicate subdomain"""
        # First signup
        client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Gym 1",
                "subdomain": "gym1",
                "email": "gym1@test.com",
                "phone": "9876543210",
                "owner_name": "Owner 1",
                "owner_email": "owner1@test.com",
                "owner_password": "SecurePass123!"
            }
        )
        
        # Second signup with same subdomain
        response = client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Gym 2",
                "subdomain": "gym1",
                "email": "gym2@test.com",
                "phone": "9876543210",
                "owner_name": "Owner 2",
                "owner_email": "owner2@test.com",
                "owner_password": "SecurePass123!"
            }
        )
        
        assert response.status_code == 409
        assert "Subdomain already taken" in response.json()["detail"]
        print("✓ Duplicate subdomain blocked")
    
    def test_signup_duplicate_gym_email(self):
        """Test signup with duplicate gym email"""
        # First signup
        client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Gym 1",
                "subdomain": "gym1",
                "email": "gym@test.com",
                "phone": "9876543210",
                "owner_name": "Owner 1",
                "owner_email": "owner1@test.com",
                "owner_password": "SecurePass123!"
            }
        )
        
        # Second signup with same gym email
        response = client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Gym 2",
                "subdomain": "gym2",
                "email": "gym@test.com",
                "phone": "9876543210",
                "owner_name": "Owner 2",
                "owner_email": "owner2@test.com",
                "owner_password": "SecurePass123!"
            }
        )
        
        assert response.status_code == 409
        assert "already registered" in response.json()["detail"]
        print("✓ Duplicate gym email blocked")
    
    def test_signup_weak_password(self):
        """Test signup with weak password"""
        response = client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Test Gym",
                "subdomain": "testgym",
                "email": "test@gym.com",
                "phone": "9876543210",
                "owner_name": "Test Owner",
                "owner_email": "testowner@gym.com",
                "owner_password": "weak"  # Too short
            }
        )
        
        assert response.status_code == 400
        assert "8 characters" in response.json()["detail"]
        print("✓ Weak password rejected")


class TestUserLogin:
    """Test user login endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_vendor(self):
        """Create a vendor and owner for testing"""
        response = client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Test Gym",
                "subdomain": "testgym",
                "email": "testgym@test.com",
                "phone": "9876543210",
                "owner_name": "Test Owner",
                "owner_email": "testowner@test.com",
                "owner_password": "SecurePass123!",
            }
        )
        assert response.status_code == 200
        self.vendor_id = response.json()["id"]
    
    def test_login_success(self):
        """Test successful login"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "testowner@test.com",
                "password": "SecurePass123!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        print("✓ Login successful - tokens generated")
    
    def test_login_invalid_email(self):
        """Test login with invalid email"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@test.com",
                "password": "SomePassword123!"
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
        print("✓ Invalid email rejected")
    
    def test_login_wrong_password(self):
        """Test login with wrong password"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "testowner@test.com",
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
        print("✓ Wrong password rejected")


class TestTokenRefresh:
    """Test token refresh endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_with_tokens(self):
        """Create a vendor and get tokens"""
        # Signup
        signup_response = client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Test Gym",
                "subdomain": "testgym",
                "email": "testgym@test.com",
                "phone": "9876543210",
                "owner_name": "Test Owner",
                "owner_email": "testowner@test.com",
                "owner_password": "SecurePass123!",
            }
        )
        assert signup_response.status_code == 200
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "testowner@test.com",
                "password": "SecurePass123!"
            }
        )
        assert login_response.status_code == 200
        
        self.access_token = login_response.json()["access_token"]
        self.refresh_token = login_response.json()["refresh_token"]
    
    def test_refresh_token_success(self):
        """Test successful token refresh"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": self.refresh_token
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["access_token"] != self.access_token  # Should be different
        print("✓ Token refresh successful")
    
    def test_refresh_invalid_token(self):
        """Test refresh with invalid token"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={
                "refresh_token": "invalid.token.here"
            }
        )
        
        assert response.status_code == 401
        print("✓ Invalid refresh token rejected")


class TestGetCurrentUser:
    """Test get current user endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_with_token(self):
        """Create a vendor and get access token"""
        # Signup
        client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Test Gym",
                "subdomain": "testgym",
                "email": "testgym@test.com",
                "phone": "9876543210",
                "owner_name": "John Doe",
                "owner_email": "john@test.com",
                "owner_password": "SecurePass123!",
            }
        )
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "john@test.com",
                "password": "SecurePass123!"
            }
        )
        
        self.access_token = login_response.json()["access_token"]
    
    def test_get_current_user_success(self):
        """Test getting current user info"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "john@test.com"
        assert data["first_name"] == "John"
        assert data["role"] == "gym_owner"
        assert data["is_active"] == True
        print("✓ Current user info retrieved")
    
    def test_get_current_user_without_token(self):
        """Test getting current user without token"""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == 403
        print("✓ Request without token rejected")
    
    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        
        assert response.status_code == 401
        print("✓ Invalid token rejected")


class TestLogout:
    """Test logout endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_with_token(self):
        """Create a vendor and get access token"""
        # Signup
        client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Test Gym",
                "subdomain": "testgym",
                "email": "testgym@test.com",
                "phone": "9876543210",
                "owner_name": "Test Owner",
                "owner_email": "testowner@test.com",
                "owner_password": "SecurePass123!",
            }
        )
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "testowner@test.com",
                "password": "SecurePass123!"
            }
        )
        
        self.access_token = login_response.json()["access_token"]
    
    def test_logout_success(self):
        """Test successful logout"""
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        
        assert response.status_code == 200
        assert "Successfully logged out" in response.json()["message"]
        print("✓ Logout successful")


class TestCompleteSignupFlow:
    """Test complete signup and login flow"""
    
    def test_complete_flow(self):
        """Test: Signup → Login → Get User → Refresh Token"""
        
        # Step 1: Signup
        print("\n1. Testing signup...")
        signup_response = client.post(
            "/api/v1/vendors/signup",
            json={
                "vendor_name": "Elite Fitness",
                "subdomain": "elitefitness",
                "email": "info@elitefitness.com",
                "phone": "9876543210",
                "owner_name": "Sarah Johnson",
                "owner_email": "sarah@elitefitness.com",
                "owner_password": "ComplexPass123!",
                "city": "Bangalore",
                "state": "Karnataka",
                "postal_code": "560001"
            }
        )
        assert signup_response.status_code == 200
        vendor = signup_response.json()
        assert vendor["vendor_name"] == "Elite Fitness"
        print(f"  ✓ Signup successful - Vendor ID: {vendor['id'][:8]}...")
        
        # Step 2: Login
        print("2. Testing login...")
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "sarah@elitefitness.com",
                "password": "ComplexPass123!"
            }
        )
        assert login_response.status_code == 200
        tokens = login_response.json()
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]
        print(f"  ✓ Login successful")
        print(f"    - Access Token: {access_token[:20]}...")
        print(f"    - Refresh Token: {refresh_token[:20]}...")
        
        # Step 3: Get current user
        print("3. Testing get current user...")
        user_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert user_response.status_code == 200
        user = user_response.json()
        assert user["email"] == "sarah@elitefitness.com"
        print(f"  ✓ User retrieved: {user['first_name']} {user['last_name']}")
        
        # Step 4: Refresh token
        print("4. Testing token refresh...")
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert refresh_response.status_code == 200
        new_tokens = refresh_response.json()
        new_access_token = new_tokens["access_token"]
        print(f"  ✓ Token refreshed")
        print(f"    - New Access Token: {new_access_token[:20]}...")
        
        # Step 5: Use new access token
        print("5. Testing new access token...")
        verify_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert verify_response.status_code == 200
        print(f"  ✓ New access token works")
        
        # Step 6: Logout
        print("6. Testing logout...")
        logout_response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {new_access_token}"}
        )
        assert logout_response.status_code == 200
        print(f"  ✓ Logout successful")
        
        print("\n✓ COMPLETE FLOW TEST PASSED")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("GymBook Auth Integration Tests")
    print("="*60)
    
    # Run signup tests
    print("\n--- SIGNUP TESTS ---")
    test_signup = TestVendorSignup()
    test_signup.test_signup_success()
    test_signup.test_signup_duplicate_subdomain()
    test_signup.test_signup_duplicate_gym_email()
    test_signup.test_signup_weak_password()
    
    # Run complete flow test
    print("\n--- COMPLETE FLOW TEST ---")
    test_flow = TestCompleteSignupFlow()
    test_flow.test_complete_flow()
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED SUCCESSFULLY")
    print("="*60 + "\n")
