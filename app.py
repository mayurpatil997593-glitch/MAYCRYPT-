import os
import secrets
import string
import tempfile

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, session
from mysql.connector import Error, IntegrityError, connect
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()
app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "change-this-local-development-key"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "0") == "1",
)

PASS_PERCENT = int(os.getenv("PASS_PERCENT", "70"))
QUICK_GAMES = [
    {"name": "Hack the Password", "question": "Choose the strongest password.", "options": ["123456", "M@yCrypt!82#Blue", "password", "mayur123"], "answer": 1},
    {"name": "Hacker or Noob?", "question": "A message asks for your bank OTP. What should you do?", "options": ["Send it", "Never share it", "Post it online"], "answer": 1},
    {"name": "Cyber Bomb Defuse", "question": "You find an unknown USB drive. What is safest?", "options": ["Plug it in", "Do not plug it into your device", "Give it to a stranger"], "answer": 1},
    {"name": "Escape the Hacker Room", "question": "A pop-up says your files are locked and demands payment. What is this?", "options": ["Ransomware", "Printer driver", "Browser theme"], "answer": 0},
    {"name": "Virus Defender", "question": "What helps detect and remove malware?", "options": ["Trusted security software", "Calculator", "Wallpaper"], "answer": 0},
    {"name": "Cyber Memory Match", "question": "HTTPS is associated with which feature?", "options": ["Encrypted connection", "File deletion", "Screen brightness"], "answer": 0},
]
PHISH_MESSAGES = [
    {"text": "From: support@paypa1-secure.com\nSubject: Account suspended!\nVerify within 2 hours: http://paypa1-secure.com/login", "phishing": True, "why": "The domain uses the number 1 instead of l, plus urgent pressure."},
    {"text": "From: hr@yourcompany.com\nSubject: Team meeting moved to 3 PM\nThe meeting is now in Room 4.", "phishing": False, "why": "Expected, no link, no pressure."},
    {"text": "From: ceo.office@gmail.com\nSubject: Urgent task\nBuy 5 gift cards and send me the codes. Keep this confidential.", "phishing": True, "why": "Executive impersonation from a free address asking for gift cards."},
    {"text": "SMS: Your OTP is 482913. Never share it with anyone, including bank staff.", "phishing": False, "why": "A normal OTP message that warns you not to share the code."},
    {"text": "SMS: Parcel on hold. Pay Rs 25 customs fee at bit.ly/3xYzQ to release it.", "phishing": True, "why": "Shortened link and a small fee to steal card details."},
    {"text": "From: noreply@github.com\nSubject: New sign-in from Pune\nIf this was not you, change your password at github.com/settings.", "phishing": False, "why": "No urgent link; it tells you to visit the site yourself."},
]
CAESAR_WORDS = ["FIREWALL", "PHISHING", "MALWARE", "ENCRYPTION", "PASSWORD", "NETWORK", "SECURITY", "VIRUS", "HACKER", "PACKET", "TROJAN", "ROUTER"]
LAB_TASKS = {"linux": {"pwd", "mkdir", "create", "write"}, "net": {"ip", "ping", "dns", "scan"}}


def ssl_args():
    """Cloud MySQL (for example Aiven) needs SSL. Paste the CA certificate text into DB_SSL_CA_PEM."""
    pem = os.getenv("DB_SSL_CA_PEM", "").replace("\\n", "\n").strip()
    if not pem:
        return {}
    path = os.path.join(tempfile.gettempdir(), "maycrypt-db-ca.pem")
    with open(path, "w", encoding="utf8") as handle:
        handle.write(pem + "\n")
    return {"ssl_ca": path, "ssl_verify_cert": True}


def db():
    return connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "maycrypt"),
        connection_timeout=10,
        **ssl_args(),
    )


def run(sql, args=(), one=False, commit=False):
    conn = db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, args)
        if commit:
            conn.commit()
            return cur.lastrowid
        return cur.fetchone() if one else cur.fetchall()
    finally:
        cur.close()
        conn.close()


def json_body():
    return request.get_json(silent=True) or {}


def current_user():
    if not session.get("uid"):
        return None
    return run(
        "SELECT id, name, email, is_admin FROM users WHERE id=%s",
        (session["uid"],),
        one=True,
    )


def login_required():
    if not current_user():
        return jsonify(error="Please login first."), 401
    return None


def to_int(value, default=-1):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def add_score(uid, game_name, points):
    run("INSERT INTO game_scores(user_id,game_name,points) VALUES(%s,%s,%s)", (uid, game_name, points), commit=True)


def caesar_encode(word, shift):
    return "".join(chr((ord(ch) - 65 + shift) % 26 + 65) for ch in word)


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return jsonify(error="API endpoint not found. Open MAYCRYPT using http://127.0.0.1:5000."), 404
    return "Page not found", 404


@app.errorhandler(Exception)
def handle_unexpected(error):
    app.logger.exception("Unhandled application error: %s", error)
    if request.path.startswith("/api/"):
        # Keep API responses JSON even when MySQL is stopped or a query fails.
        if isinstance(error, Error):
            message = "Database connection/query failed. Check that MySQL is running and .env settings are correct."
        else:
            message = "Server error. Check the VS Code terminal for details."
        return jsonify(error=message), 500
    return "MAYCRYPT server error. Check the VS Code terminal.", 500


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    try:
        run("SELECT 1", one=True)
        return jsonify(status="ok", database="connected")
    except Error:
        app.logger.exception("Database health check failed")
        return jsonify(status="error", database="disconnected", error="MySQL is not connected. Start MySQL and check .env settings."), 503


@app.get("/api/me")
def me():
    return jsonify(user=current_user())


@app.post("/api/register")
def register():
    data = json_body()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not name or not email or len(password) < 8:
        return jsonify(error="Enter name, valid email and password (minimum 8 characters)."), 400
    try:
        uid = run(
            "INSERT INTO users(name,email,password_hash) VALUES(%s,%s,%s)",
            (name, email, generate_password_hash(password)),
            commit=True,
        )
        session["uid"] = uid
        return jsonify(message="Account created.", user={"name": name, "email": email, "is_admin": False}), 201
    except IntegrityError:
        return jsonify(error="This email is already registered. Please login."), 409


@app.post("/api/login")
def login():
    data = json_body()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not email or not password:
        return jsonify(error="Enter both email and password."), 400
    account = run("SELECT * FROM users WHERE email=%s", (email,), one=True)
    if not account or not check_password_hash(account["password_hash"], password):
        return jsonify(error="Invalid email or password."), 401
    session["uid"] = account["id"]
    return jsonify(
        message="Logged in.",
        user={"name": account["name"], "email": account["email"], "is_admin": bool(account["is_admin"])},
    )


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(message="Logged out.")


@app.get("/api/courses")
def courses():
    return jsonify(run("SELECT * FROM courses ORDER BY id"))


@app.get("/api/questions/<int:course_id>")
def questions(course_id):
    error = login_required()
    if error:
        return error
    return jsonify(run("SELECT id,question_text,a,b,c,d FROM questions WHERE course_id=%s ORDER BY id", (course_id,)))


@app.post("/api/quiz/submit")
def submit_quiz():
    error = login_required()
    if error:
        return error
    data = json_body()
    try:
        course_id = int(data.get("course_id"))
    except (TypeError, ValueError):
        return jsonify(error="Invalid course."), 400
    questions_for_course = run("SELECT id,answer FROM questions WHERE course_id=%s", (course_id,))
    if not questions_for_course:
        return jsonify(error="No quiz questions added for this course yet."), 404
    submitted = data.get("answers") or {}
    score = sum(1 for question in questions_for_course if submitted.get(str(question["id"])) == question["answer"])
    total = len(questions_for_course)
    percentage = round(score * 100 / total)
    uid = current_user()["id"]
    run(
        "INSERT INTO results(user_id,course_id,score,total,percentage) VALUES(%s,%s,%s,%s,%s)",
        (uid, course_id, score, total, percentage),
        commit=True,
    )
    certificate_code = None
    if percentage >= PASS_PERCENT:
        # One certificate per student per course. A better score only updates the percentage.
        existing = run("SELECT id,code,percentage FROM certificates WHERE user_id=%s AND course_id=%s ORDER BY id LIMIT 1", (uid, course_id), one=True)
        if existing:
            certificate_code = existing["code"]
            if percentage > existing["percentage"]:
                run("UPDATE certificates SET percentage=%s WHERE id=%s", (percentage, existing["id"]), commit=True)
        else:
            certificate_code = "MAY-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(10))
            run(
                "INSERT INTO certificates(user_id,course_id,code,percentage) VALUES(%s,%s,%s,%s)",
                (uid, course_id, certificate_code, percentage),
                commit=True,
            )
    review = {str(q["id"]): q["answer"] for q in questions_for_course}
    return jsonify(score=score, total=total, percentage=percentage, passed=percentage >= PASS_PERCENT, pass_percent=PASS_PERCENT, certificate=certificate_code, review=review)


@app.get("/api/games")
def games():
    return jsonify(
        quick=[{"id": i, "name": g["name"], "question": g["question"], "options": g["options"]} for i, g in enumerate(QUICK_GAMES)],
        phish=[{"id": i, "text": m["text"]} for i, m in enumerate(PHISH_MESSAGES)],
    )


@app.post("/api/game/answer")
def game_answer():
    error = login_required()
    if error:
        return error
    data = json_body()
    index, choice = to_int(data.get("game")), to_int(data.get("choice"))
    if not 0 <= index < len(QUICK_GAMES):
        return jsonify(error="Unknown game."), 404
    game = QUICK_GAMES[index]
    correct = choice == game["answer"]
    points = 10 if correct else 0
    add_score(current_user()["id"], game["name"], points)
    return jsonify(correct=correct, points=points, answer=game["options"][game["answer"]])


@app.post("/api/phish/answer")
def phish_answer():
    error = login_required()
    if error:
        return error
    data = json_body()
    index = to_int(data.get("index"))
    if not 0 <= index < len(PHISH_MESSAGES):
        return jsonify(error="Unknown message."), 404
    message = PHISH_MESSAGES[index]
    correct = (to_int(data.get("choice")) == 1) == message["phishing"]
    points = 10 if correct else 0
    add_score(current_user()["id"], "Phishing or Safe", points)
    return jsonify(correct=correct, points=points, why=message["why"])


@app.get("/api/caesar")
def caesar_new():
    error = login_required()
    if error:
        return error
    word = secrets.choice(CAESAR_WORDS)
    shift = secrets.randbelow(9) + 1
    session["caesar"] = {"word": word, "shift": shift}
    return jsonify(cipher=caesar_encode(word, shift), length=len(word), first_letter=word[0])


@app.post("/api/caesar")
def caesar_check():
    error = login_required()
    if error:
        return error
    challenge = session.get("caesar")
    if not challenge:
        return jsonify(error="Start a new word first."), 400
    answer = str(json_body().get("answer", "")).strip().upper()
    if answer != challenge["word"]:
        return jsonify(correct=False)
    session.pop("caesar", None)
    add_score(current_user()["id"], "Caesar Cipher", 15)
    return jsonify(correct=True, points=15, shift=challenge["shift"])


@app.get("/api/progress")
def progress():
    error = login_required()
    if error:
        return error
    uid = current_user()["id"]
    lessons, labs = {}, {}
    for row in run("SELECT course_id,lesson_no FROM lesson_progress WHERE user_id=%s", (uid,)):
        lessons.setdefault(str(row["course_id"]), []).append(row["lesson_no"])
    for row in run("SELECT lab,task FROM lab_progress WHERE user_id=%s", (uid,)):
        labs.setdefault(row["lab"], []).append(row["task"])
    return jsonify(lessons=lessons, labs=labs)


@app.post("/api/lesson-complete")
def lesson_complete():
    error = login_required()
    if error:
        return error
    data = json_body()
    course_id, lesson_no = to_int(data.get("course_id")), to_int(data.get("lesson"))
    if not 0 <= lesson_no < 20 or not run("SELECT id FROM courses WHERE id=%s", (course_id,), one=True):
        return jsonify(error="Invalid lesson."), 400
    run("INSERT IGNORE INTO lesson_progress(user_id,course_id,lesson_no) VALUES(%s,%s,%s)", (current_user()["id"], course_id, lesson_no), commit=True)
    return jsonify(message="Lesson saved.")


@app.post("/api/lab-task")
def lab_task():
    error = login_required()
    if error:
        return error
    data = json_body()
    lab, task = str(data.get("lab", "")), str(data.get("task", ""))
    if task not in LAB_TASKS.get(lab, set()):
        return jsonify(error="Unknown lab task."), 400
    run("INSERT IGNORE INTO lab_progress(user_id,lab,task) VALUES(%s,%s,%s)", (current_user()["id"], lab, task), commit=True)
    return jsonify(message="Lab task saved.")


@app.get("/api/certificate/<code>")
def certificate(code):
    # Public on purpose: anyone with the code can verify a certificate.
    row = run(
        "SELECT u.name,c.title,x.code,x.percentage,x.created_at FROM certificates x "
        "JOIN users u ON u.id=x.user_id JOIN courses c ON c.id=x.course_id WHERE x.code=%s",
        (code.strip().upper(),),
        one=True,
    )
    if not row:
        return jsonify(error="Certificate not found. Check the code and try again."), 404
    return jsonify(row)


@app.get("/api/dashboard")
def dashboard():
    error = login_required()
    if error:
        return error
    uid = current_user()["id"]
    return jsonify(
        user=current_user(),
        points=run("SELECT COALESCE(SUM(points),0) n,COUNT(*) plays FROM game_scores WHERE user_id=%s", (uid,), one=True),
        results=run("SELECT c.title,r.percentage,r.created_at FROM results r JOIN courses c ON c.id=r.course_id WHERE r.user_id=%s ORDER BY r.id DESC LIMIT 8", (uid,)),
        lessons=run("SELECT COUNT(*) n FROM lesson_progress WHERE user_id=%s", (uid,), one=True)["n"],
        labs=run("SELECT COUNT(*) n FROM lab_progress WHERE user_id=%s", (uid,), one=True)["n"],
        certs=run("SELECT c.title,x.code,x.percentage,x.created_at FROM certificates x JOIN courses c ON c.id=x.course_id WHERE x.user_id=%s ORDER BY x.id DESC", (uid,)),
    )


@app.get("/api/leaderboard")
def leaderboard():
    return jsonify(run("SELECT u.name,COALESCE(SUM(g.points),0) points FROM users u LEFT JOIN game_scores g ON g.user_id=u.id GROUP BY u.id,u.name ORDER BY points DESC LIMIT 20"))


@app.post("/api/contact")
def contact():
    data = json_body()
    if not all(str(data.get(key, "")).strip() for key in ("name", "email", "message")):
        return jsonify(error="Complete all contact form fields."), 400
    run(
        "INSERT INTO contact_messages(name,email,message) VALUES(%s,%s,%s)",
        (data["name"].strip(), data["email"].strip(), data["message"].strip()),
        commit=True,
    )
    return jsonify(message="Message submitted successfully.")


@app.get("/api/admin")
def admin():
    account = current_user()
    if not account:
        return jsonify(error="Please login first."), 401
    if not account["is_admin"]:
        return jsonify(error="Admin access required."), 403
    return jsonify(
        students=run("SELECT COUNT(*) n FROM users WHERE is_admin=0", one=True)["n"],
        courses=run("SELECT COUNT(*) n FROM courses", one=True)["n"],
        results=run("SELECT COUNT(*) n FROM results", one=True)["n"],
        certificates=run("SELECT COUNT(*) n FROM certificates", one=True)["n"],
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "1") == "1")
