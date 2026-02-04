"""
Database setup script for GEO Backend
Creates PostgreSQL database if it doesn't exist
"""

import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from app.config import settings

def create_database():
    """Create the PostgreSQL database if it doesn't exist"""
    
    # Parse DATABASE_URL to get components
    # Format: postgresql://user:password@host:port/dbname
    db_url = settings.DATABASE_URL
    
    # Extract connection parameters
    parts = db_url.replace("postgresql://", "").split("@")
    user_pass = parts[0].split(":")
    host_port_db = parts[1].split("/")
    host_port = host_port_db[0].split(":")
    
    user = user_pass[0]
    password = user_pass[1]
    host = host_port[0]
    port = host_port[1] if len(host_port) > 1 else "5432"
    dbname = host_port_db[1].split("?")[0]  # Remove any query params
    
    print(f"Attempting to create database: {dbname}")
    print(f"Host: {host}:{port}")
    print(f"User: {user}")
    
    try:
        # Connect to PostgreSQL server (default 'postgres' database)
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{dbname}'")
        exists = cursor.fetchone()
        
        if exists:
            print(f"✓ Database '{dbname}' already exists")
        else:
            # Create database
            cursor.execute(f'CREATE DATABASE {dbname}')
            print(f"✓ Database '{dbname}' created successfully")
        
        cursor.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"✗ Database connection error: {e}")
        print("\nPlease ensure PostgreSQL is installed and running:")
        print("1. Download PostgreSQL from https://www.postgresql.org/download/windows/")
        print("2. Install and start the PostgreSQL service")
        print("3. Update the DATABASE_URL in your .env file with correct credentials")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("GEO Backend - Database Setup")
    print("=" * 60)
    print()
    
    success = create_database()
    
    if success:
        print()
        print("=" * 60)
        print("✓ Database setup complete!")
        print()
        print("Next steps:")
        print("1. Run: alembic revision --autogenerate -m 'Initial schema'")
        print("2. Run: alembic upgrade head")
        print("=" * 60)
        sys.exit(0)
    else:
        print()
        print("=" * 60)
        print("✗ Database setup failed")
        print("=" * 60)
        sys.exit(1)
