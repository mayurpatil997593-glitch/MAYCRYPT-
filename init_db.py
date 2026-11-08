"""Create all MAYCRYPT tables in the database named in .env (works for local MySQL and cloud MySQL).
Usage:  python init_db.py
"""
import re

from app import db


def main():
    sql = open("schema.sql", encoding="utf8").read()
    # The cloud database already exists, so skip CREATE DATABASE and USE lines.
    sql = re.sub(r"(?im)^\s*(CREATE DATABASE|USE)\b[^;]*;", "", sql)
    statements = [part.strip() for part in sql.split(";") if part.strip()]
    conn = db()
    cur = conn.cursor()
    try:
        for statement in statements:
            cur.execute(statement)
        conn.commit()
        print(f"Done. {len(statements)} statements executed.")
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
