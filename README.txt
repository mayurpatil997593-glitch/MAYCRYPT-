MAYCRYPT Cyber Academy - Render + PostgreSQL Edition
=====================================================

Existing project features retained:
- Registration, login and logout
- Six courses and sample quiz questions
- Quiz scoring and 70% pass certificates
- Learning Hub and saved lesson progress
- Simulated Linux and networking Virtual Labs
- Games with server-side score checking
- Dashboard, leaderboard, profile, contact and admin overview

DATABASE
- PostgreSQL is used in this deployment edition.
- The app reads DATABASE_URL.
- schema.sql is PostgreSQL-compatible.
- init_db.py creates tables and starter course/questions safely.

LOCAL RUN (requires PostgreSQL installed and running)
1. Create a PostgreSQL database named maycrypt.
2. Copy .env.example to .env and set DATABASE_URL to your local PostgreSQL URL.
3. In PowerShell:
     py -m venv venv
     .\venv\Scripts\Activate.ps1
     python -m pip install -r requirements.txt
     python init_db.py
     python app.py
4. Open http://127.0.0.1:5000

RENDER DEPLOYMENT
Follow DEPLOY.txt. Add DATABASE_URL in Render Environment.
The Render start command runs init_db.py before Gunicorn.

SECURITY
- Use a strong FLASK_SECRET_KEY.
- Never commit .env or publish DATABASE_URL.
- The labs are simulated learning activities; they do not run commands on
  the server or scan external systems.
