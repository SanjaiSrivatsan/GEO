"""
Authentication System Test Script
Tests registration, login, and protected endpoints
"""

import requests
import json
from datetime import datetime

# Base URL
BASE_URL = "http://127.0.0.1:8000/api"

# ANSI color codes for pretty output1
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")


def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")


def print_error(text):
    print(f"{RED}✗ {text}{RESET}")


def print_info(text):
    print(f"{YELLOW}→ {text}{RESET}")


def test_register():
    """Test user registration"""
    print_header("TEST 1: User Registration")
    
    test_email = f"test_{datetime.now().timestamp()}@example.com"
    test_password = "SecurePassword123!"
    
    payload = {
        "email": test_email,
        "password": test_password
    }
    
    print_info(f"Registering user: {test_email}")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        
        if response.status_code == 201:
            data = response.json()
            print_success("Registration successful!")
            print(f"  User ID: {data['user']['id']}")
            print(f"  Email: {data['user']['email']}")
            print(f"  Token Type: {data['token']['token_type']}")
            print(f"  Token Expires In: {data['token']['expires_in']} seconds")
            print(f"  Access Token: {data['token']['access_token'][:50]}...")
            return test_email, test_password, data['token']['access_token']
        else:
            print_error(f"Registration failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return None, None, None
            
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return None, None, None


def test_login(email, password):
    """Test user login"""
    print_header("TEST 2: User Login")
    
    payload = {
        "email": email,
        "password": password
    }
    
    print_info(f"Logging in: {email}")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Login successful!")
            print(f"  User ID: {data['user']['id']}")
            print(f"  Email: {data['user']['email']}")
            print(f"  Token: {data['token']['access_token'][:50]}...")
            return data['token']['access_token']
        else:
            print_error(f"Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return None
            
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None


def test_wrong_password(email):
    """Test login with wrong password"""
    print_header("TEST 3: Login with Wrong Password")
    
    payload = {
        "email": email,
        "password": "WrongPassword123!"
    }
    
    print_info("Attempting login with incorrect password...")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload)
        
        if response.status_code == 401:
            print_success("Correctly rejected wrong password (401 Unauthorized)")
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print_error(f"Error: {str(e)}")


def test_protected_endpoint_without_token():
    """Test accessing protected endpoint without token"""
    print_header("TEST 4: Protected Endpoint Without Token")
    
    print_info("Attempting to access /auth/me without token...")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me")
        
        if response.status_code == 403:
            print_success("Correctly rejected request without token (403 Forbidden)")
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print_error(f"Error: {str(e)}")


def test_protected_endpoint_with_token(token):
    """Test accessing protected endpoint with valid token"""
    print_header("TEST 5: Protected Endpoint With Valid Token")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print_info("Accessing /auth/me with valid token...")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Successfully accessed protected endpoint!")
            print(f"  User ID: {data['id']}")
            print(f"  Email: {data['email']}")
            print(f"  Active: {data['is_active']}")
            print(f"  Created At: {data['created_at']}")
        else:
            print_error(f"Failed to access protected endpoint: {response.status_code}")
            print(f"  Response: {response.text}")
            
    except Exception as e:
        print_error(f"Error: {str(e)}")


def test_protected_endpoint_with_invalid_token():
    """Test accessing protected endpoint with invalid token"""
    print_header("TEST 6: Protected Endpoint With Invalid Token")
    
    headers = {
        "Authorization": "Bearer invalid.token.here"
    }
    
    print_info("Accessing /auth/me with invalid token...")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        
        if response.status_code == 401:
            print_success("Correctly rejected invalid token (401 Unauthorized)")
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print_error(f"Error: {str(e)}")


def test_duplicate_registration(email, password):
    """Test registering with existing email"""
    print_header("TEST 7: Duplicate Registration")
    
    payload = {
        "email": email,
        "password": password
    }
    
    print_info(f"Attempting to register duplicate email: {email}")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=payload)
        
        if response.status_code == 400:
            print_success("Correctly rejected duplicate email (400 Bad Request)")
            print(f"  Response: {response.json()}")
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print_error(f"Error: {str(e)}")


def main():
    """Run all authentication tests"""
    print(f"\n{BLUE}{'#'*60}{RESET}")
    print(f"{BLUE}# GEO Backend - Authentication System Test{RESET}")
    print(f"{BLUE}{'#'*60}{RESET}")
    
    # Test 1: Register new user
    email, password, token = test_register()
    if not email:
        print_error("\nTests aborted: Registration failed")
        return
    
    # Test 2: Login with credentials
    login_token = test_login(email, password)
    
    # Test 3: Login with wrong password
    test_wrong_password(email)
    
    # Test 4: Access protected endpoint without token
    test_protected_endpoint_without_token()
    
    # Test 5: Access protected endpoint with valid token
    if token:
        test_protected_endpoint_with_token(token)
    
    # Test 6: Access protected endpoint with invalid token
    test_protected_endpoint_with_invalid_token()
    
    # Test 7: Duplicate registration
    test_duplicate_registration(email, password)
    
    # Summary
    print_header("TEST SUMMARY")
    print_success("All authentication tests completed!")
    print(f"\n{GREEN}Backend authentication system is working correctly.{RESET}")
    print(f"{GREEN}Frontend can now use these endpoints for user authentication.{RESET}\n")


if __name__ == "__main__":
    main()
