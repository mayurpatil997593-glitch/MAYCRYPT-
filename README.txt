MAYCRYPT Cyber Academy - Complete Platform v2 (Flask + MySQL)
==============================================================

WHAT'S NEW IN v2
- Learning Hub: 6 courses x 3 lessons, "Mark as complete" progress saved in MySQL.
- Virtual Labs: simulated Linux lab and Network lab (safe, nothing runs on a real system).
  Lab tasks tick automatically and are saved per student.
- Certificates: one certificate per student per course (pass mark 70%, set PASS_PERCENT in .env).
  View / print certificate page + public "Verify a certificate" page (footer link).
- Games: answers are now checked on the SERVER (/api/game/answer, /api/phish/answer, /api/caesar),
  so points cannot be faked from the browser. 8 games including Phishing or Safe and Caesar Cipher.
- Quiz: answer review after submit. Dashboard shows lessons done and lab tasks.
- Removed: /api/game-score (client-sent points were easy to cheat).

SETUP (VS Code terminal)
1. python -m venv venv
   venv\Scripts\activate          (Windows)      source venv/bin/activate   (Mac/Linux)
2. pip install -r requirements.txt
3. Copy .env.example to .env and set DB_PASSWORD and FLASK_SECRET_KEY.
4. In MySQL:  CREATE DATABASE maycrypt;  then import schema.sql
   - Already have the old database?  Import ONLY migration_v2.sql (adds the 2 new tables).
5. python app.py   and open  http://127.0.0.1:5000
6. Admin user: register normally, then in MySQL run:
   UPDATE users SET is_admin=1 WHERE email='your@email.com';

NEW API ENDPOINTS
GET  /api/games                 quick games + phishing messages (no answers)
POST /api/game/answer           {game, choice}
POST /api/phish/answer          {index, choice}
GET  /api/caesar  POST /api/caesar   new cipher / check answer
GET  /api/progress              lessons + lab tasks done
POST /api/lesson-complete       {course_id, lesson}
POST /api/lab-task              {lab, task}
GET  /api/certificate/<code>    public certificate verification

NOTES
- Lesson text lives in static/app.js (LESSONS array). Edit it to add or change lessons.
- Quiz questions and courses live in MySQL (schema.sql).
- Never scan or attack systems you do not own. The labs are simulations for learning.
