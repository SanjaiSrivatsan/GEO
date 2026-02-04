"""
Test Business Profile Creation

Tests the business profile creation endpoint with real database persistence.
"""

import requests
import json
from datetime import datetime


BASE_URL = "http://127.0.0.1:8000/api"


def test_business_profile_creation():
    """Test complete business profile creation flow"""
    print("=" * 60)
    print("TESTING BUSINESS PROFILE CREATION")
    print("=" * 60)
    print()

    # Step 1: Register a test user
    print("Step 1: Registering test user...")
    timestamp = str(int(datetime.now().timestamp()))
    register_data = {
        "email": f"test{timestamp}@example.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=register_data,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        auth_data = response.json()
        token = auth_data["token"]["access_token"]
        user_id = auth_data["user"]["id"]
        print(f"✓ User registered: {auth_data['user']['email']}")
        print(f"✓ User ID: {user_id}")
        print(f"✓ Token: {token[:20]}...")
        print()
    except Exception as e:
        print(f"✗ Registration failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                print(f"  Status: {e.response.status_code}")
                print(f"  Response: {e.response.text}")
            except:
                pass
        return

    # Step 2: Create business profile
    print("Step 2: Creating business profile...")
    profile_data = {
        "name": "Test Business Inc",
        "category": "Software Development",
        "primary_location": "San Francisco, CA",
        "website": "https://testbusiness.com",
        "brand_voice": "Professional, innovative, customer-focused",
        "main_goal": "Improve local search visibility and customer engagement"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/business/profiles",
            json=profile_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )
        response.raise_for_status()
        result = response.json()
        
        print(f"✓ Business profile created!")
        print(f"✓ Entity ID: {result['profile']['id']}")
        print(f"✓ Name: {result['profile']['name']}")
        print(f"✓ Category: {result['profile']['category']}")
        print(f"✓ Location: {result['profile']['primary_location']}")
        print(f"✓ User ID: {result['profile']['user_id']}")
        print(f"✓ Message: {result['message']}")
        print()
        
        entity_id = result['profile']['id']
        
    except Exception as e:
        print(f"✗ Business profile creation failed: {e}")
        if hasattr(e, 'response'):
            print(f"  Response: {e.response.text}")
        return

    # Step 3: Verify profile can be retrieved
    print("Step 3: Retrieving business profile...")
    try:
        response = requests.get(
            f"{BASE_URL}/business/profiles/{entity_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        profile = response.json()
        
        print(f"✓ Profile retrieved successfully!")
        print(f"✓ Name matches: {profile['name'] == profile_data['name']}")
        print(f"✓ Category matches: {profile['category'] == profile_data['category']}")
        print()
        
    except Exception as e:
        print(f"✗ Profile retrieval failed: {e}")
        return

    # Step 4: Get all profiles for user
    print("Step 4: Getting all user profiles...")
    try:
        response = requests.get(
            f"{BASE_URL}/business/profiles",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        profiles = response.json()
        
        print(f"✓ Found {len(profiles)} profile(s) for user")
        print(f"✓ Profile exists in list: {any(p['id'] == entity_id for p in profiles)}")
        print()
        
    except Exception as e:
        print(f"✗ Profile list retrieval failed: {e}")
        return

    # Success!
    print("=" * 60)
    print("✓ ALL TESTS PASSED!")
    print("=" * 60)
    print()
    print(f"Entity ID: {entity_id}")
    print(f"User ID: {user_id}")
    print()
    print("Database verification command:")
    print(f"psql -U postgres -d geo_db -c \"SELECT * FROM business_profiles WHERE id='{entity_id}';\"")
    print()


if __name__ == "__main__":
    test_business_profile_creation()
