"""Initialize MAYCRYPT PostgreSQL tables and sample courses.
Run with DATABASE_URL set: python init_db.py
"""
from pathlib import Path
from app import db

def main():
    sql = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
    statements = [part.strip() for part in sql.split(";") if part.strip()]
    conn = db()
    cur = conn.cursor()
    try:
        for statement in statements:
            cur.execute(statement)
        conn.commit()
        print(f"Database ready. {len(statements)} SQL statements executed.")
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
