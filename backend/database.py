import sqlite3
import os

DATABASE_URL = os.getenv("DATABASE_URL")
DB_PATH = "crash_dashboard.db"

def get_db_connection():
    if DATABASE_URL and (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")):
        import psycopg2
        from psycopg2.extras import RealDictCursor
        # Heroku/Render use postgres:// but psycopg2 prefers postgresql://
        url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(url)
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    is_postgres = hasattr(conn, 'cursor_factory') # Simple check for psycopg2
    
    # Create Users table
    # Using Serial for Postgres, AutoIncrement for SQLite
    id_type = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
    
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS users (
        id {id_type},
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)
    
    # Create Datasets table
    cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS datasets (
        id {id_type},
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        processed_dir TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Insert default users if not exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (username, password, role) VALUES (%s, %s, %s)" if is_postgres else "INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ('admin', 'admin123', 'admin'))
        cursor.execute("INSERT INTO users (username, password, role) VALUES (%s, %s, %s)" if is_postgres else "INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ('user', 'user123', 'user'))
        
    conn.commit()
    conn.close()

class DBWrapper:
    def __init__(self, conn):
        self.conn = conn
        self.is_postgres = not hasattr(conn, 'row_factory')

    def execute(self, query, params=()):
        # Convert ? to %s for Postgres
        if self.is_postgres:
            query = query.replace('?', '%s')
            from psycopg2.extras import RealDictCursor
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        else:
            cursor = self.conn.cursor()
        
        cursor.execute(query, params)
        return cursor

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

    def cursor(self):
        return self.conn.cursor()

# Re-defining get_db to return the wrapper
def get_db():
    conn = get_db_connection()
    return DBWrapper(conn)

if not os.path.exists(DB_PATH) and not DATABASE_URL:
    init_db()
elif DATABASE_URL:
    init_db()
