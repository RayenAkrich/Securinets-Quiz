import os
import time
import random
import smtplib
import ssl
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
try:
    import oracledb  # optional: may not be installed in dev
    ORACLE_AVAILABLE = True
except Exception:
    oracledb = None
    ORACLE_AVAILABLE = False
    import logging
    logging.getLogger().warning('oracledb not available; running in dev mode (DB operations disabled)')


load_dotenv()
app = Flask(__name__)
CORS(app)  # allow cross-origin requests in dev

# Database configuration via environment variables
DB_USER = os.environ.get('ORACLE_DB_USER')
DB_PASS = os.environ.get('ORACLE_DB_PASS')
DB_DSN = os.environ.get('ORACLE_DB_DSN')

# Mail configuration (use Gmail app password)
MAIL_USER = os.environ.get('MAIL_USER')
MAIL_APP_PASSWORD = os.environ.get('MAIL_APP_PASSWORD')

# Ops flags and rate-limit config
MAX_VERIFY_ATTEMPTS = int(os.environ.get('MAX_VERIFY_ATTEMPTS', '5'))
LOCKOUT_SECONDS = int(os.environ.get('LOCKOUT_SECONDS', str(15 * 60)))

# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'please-change-this-secret')
JWT_ALGO = os.environ.get('JWT_ALGO', 'HS256')
JWT_EXP_SECONDS = int(os.environ.get('JWT_EXP_SECONDS', '14000'))
if JWT_SECRET == 'please-change-this-secret':
    app.logger.warning('Using default JWT_SECRET; set JWT_SECRET in environment for production')

# In-memory store for pending signups:
# { email: { full_name, password_hash, code_hash, expires_at, attempts, blocked_until } }
pending_signups = {}

from flask import abort
def admin_required():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        abort(401, description='Missing authorization token')
    token = auth.split(' ', 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception as e:
        app.logger.debug('JWT decode error: %s', e)
        abort(401, description='Invalid or expired token')
    if payload.get('role') != 'admin':
        abort(403, description='Forbidden')
    return payload
@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def api_admin_delete_user(user_id):
    payload = admin_required()
    data = request.get_json() or {}
    reason = (data.get('reason') or '').strip()
    if not reason:
        return jsonify({'ok': False, 'message': 'Reason is required'}), 400
    if not ORACLE_AVAILABLE:
        return jsonify({'ok': False, 'message': 'Database not available'}), 503
    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()
        # Get user info
        cur.execute("SELECT name, role FROM Users WHERE userID = :1", [user_id])
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'User not found'}), 404
        username, userrole = row
        if userrole == 'admin':
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'Cannot delete admin user'}), 403
        # Delete user
        cur.execute("DELETE FROM Users WHERE userID = :1", [user_id])
        # Log action
        action = f"delete {username}"
        log_reason = f"By {payload.get('name')} because of {reason}"
        cur.execute("INSERT INTO AdminLog (action, reason) VALUES (:1, :2)", [action, log_reason])
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'message': 'User deleted'}), 200
    except Exception as e:
        app.logger.exception('Error deleting user: %s', e)
        return jsonify({'ok': False, 'message': 'Database error'}), 500

@app.route('/api/admin/users/<int:user_id>/ban', methods=['PATCH'])
def api_admin_ban_user(user_id):
    payload = admin_required()
    data = request.get_json() or {}
    reason = (data.get('reason') or '').strip()
    if not reason:
        return jsonify({'ok': False, 'message': 'Reason is required'}), 400
    if not ORACLE_AVAILABLE:
        return jsonify({'ok': False, 'message': 'Database not available'}), 503
    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()
        # Get user info
        cur.execute("SELECT name, role FROM Users WHERE userID = :1", [user_id])
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'User not found'}), 404
        username, userrole = row
        if userrole == 'admin':
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'Cannot ban admin user'}), 403
        if userrole == 'banned':
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'User already banned'}), 400
        # Ban user
        cur.execute("UPDATE Users SET role = 'banned' WHERE userID = :1", [user_id])
        # Log action
        action = f"ban {username}"
        log_reason = f"By {payload.get('name')} because of {reason}"
        cur.execute("INSERT INTO AdminLog (action, reason) VALUES (:1, :2)", [action, log_reason])
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'message': 'User banned'}), 200
    except Exception as e:
        app.logger.exception('Error banning user: %s', e)
        return jsonify({'ok': False, 'message': 'Database error'}), 500

@app.route('/api/admin/quizzes', methods=['GET'])
def api_admin_get_quizzes():
    """Return quizzes for admin panel. Returns quizID, title, description, timelimit, question_count"""
    # auth
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return jsonify({'ok': False, 'message': 'Missing authorization token'}), 401
    token = auth.split(' ', 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception as e:
        app.logger.debug('JWT decode error: %s', e)
        return jsonify({'ok': False, 'message': 'Invalid or expired token'}), 401
    if payload.get('role') != 'admin':
        return jsonify({'ok': False, 'message': 'Forbidden'}), 403

    if not ORACLE_AVAILABLE:
        return jsonify({'ok': True, 'quizzes': []})

    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()
        cur.execute("SELECT quizID, title, description, timelimit FROM Quiz ORDER BY created_at DESC")
        quizzes = []
        for row in cur.fetchall():
            quizID, title, description, timelimit = row
            # get question count
            qcur = conn.cursor()
            qcur.execute("SELECT COUNT(*) FROM Questions WHERE quizID = :1", [quizID])
            qc = qcur.fetchone()
            question_count = int(qc[0]) if qc else 0
            qcur.close()
            quizzes.append({'quizID': quizID, 'title': title, 'description': description, 'timelimit': timelimit, 'question_count': question_count})
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'quizzes': quizzes}), 200
    except Exception as e:
        app.logger.exception('DB error fetching quizzes: %s', e)
        return jsonify({'ok': False, 'message': 'Database error'}), 500


@app.route('/api/admin/quizzes/<int:quiz_id>', methods=['GET'])
def api_admin_get_quiz(quiz_id):
    """Return a single quiz with nested questions and answers for admin editing."""
    # admin check
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return jsonify({'ok': False, 'message': 'Missing authorization token'}), 401
    token = auth.split(' ', 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception as e:
        app.logger.debug('JWT decode error: %s', e)
        return jsonify({'ok': False, 'message': 'Invalid or expired token'}), 401
    if payload.get('role') != 'admin':
        return jsonify({'ok': False, 'message': 'Forbidden'}), 403

    if not ORACLE_AVAILABLE:
        return jsonify({'ok': True, 'quiz': None})

    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()
        cur.execute("SELECT quizID, title, description, timelimit FROM Quiz WHERE quizID = :1", [quiz_id])
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'Quiz not found'}), 404
        quizID, title, description, timelimit = row
        # get questions
        qcur = conn.cursor()
        qcur.execute("SELECT questionID, title, category, difficulty, points, description FROM Questions WHERE quizID = :1 ORDER BY questionID", [quizID])
        questions = []
        for qrow in qcur.fetchall():
            questionID, qtitle, qcategory, qdifficulty, qpoints, qdesc = qrow
            acur = conn.cursor()
            acur.execute("SELECT answerID, answer_text, is_correct FROM Answers WHERE questionID = :1 ORDER BY answerID", [questionID])
            answers = []
            for arow in acur.fetchall():
                answerID, answer_text, is_correct = arow
                answers.append({'answerID': answerID, 'text': answer_text, 'is_correct': True if is_correct == 'Y' else False})
            acur.close()
            questions.append({'questionID': questionID, 'title': qtitle, 'category': qcategory, 'difficulty': qdifficulty, 'points': qpoints, 'description': qdesc, 'answers': answers})
        qcur.close()
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'quiz': {'quizID': quizID, 'title': title, 'description': description, 'timelimit': timelimit, 'questions': questions}}), 200
    except Exception as e:
        app.logger.exception('DB error fetching quiz: %s', e)
        return jsonify({'ok': False, 'message': 'Database error'}), 500


@app.route('/api/admin/quizzes/<int:quiz_id>', methods=['PUT'])
def api_admin_update_quiz(quiz_id):
    """Update an existing quiz (replace questions/answers). Expects same JSON shape as create."""
    try:
        admin_payload = admin_required()
    except Exception:
        raise

    payload = request.get_json() or {}
    title = (payload.get('title') or '').strip()
    description = payload.get('description') or ''
    timelimit = payload.get('timelimit')
    questions = payload.get('questions') or []

    if not title:
        return jsonify({'ok': False, 'message': 'Quiz title is required'}), 400

    if not ORACLE_AVAILABLE:
        return jsonify({'ok': False, 'message': 'Database not available'}), 503

    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()
        # Ensure quiz exists
        cur.execute("SELECT quizID FROM Quiz WHERE quizID = :1", [quiz_id])
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'Quiz not found'}), 404

        # Update quiz metadata
        cur.execute("UPDATE Quiz SET title = :1, description = :2, timelimit = :3 WHERE quizID = :4", [title, description, timelimit, quiz_id])

        # Remove existing answers and questions for this quiz
        try:
            # Delete answers linked to questions of this quiz
            cur.execute("DELETE FROM Answers WHERE questionID IN (SELECT questionID FROM Questions WHERE quizID = :1)", [quiz_id])
            # Delete questions
            cur.execute("DELETE FROM Questions WHERE quizID = :1", [quiz_id])
        except Exception:
            # If DB doesn't support subqueries for delete or other edge cases, attempt safer fallback
            app.logger.exception('Error deleting old questions/answers; continuing')

        # Insert new questions and answers
        for q in questions:
            qtitle = (q.get('title') or '').strip()
            qcategory = q.get('category') or None
            qdifficulty = q.get('difficulty') or None
            qpoints = q.get('points') if q.get('points') is not None else None
            qdesc = q.get('description') or None
            if not qtitle:
                continue
            qid_var = cur.var(oracledb.NUMBER)
            cur.execute(
                "INSERT INTO Questions (quizID, title, category, difficulty, points, description) VALUES (:1, :2, :3, :4, :5, :6) RETURNING questionID INTO :7",
                [quiz_id, qtitle, qcategory, qdifficulty, qpoints, qdesc, qid_var]
            )
            question_id = int(qid_var.getvalue()[0])
            answers = q.get('answers') or []
            for a in answers:
                atext = (a.get('text') or '').strip()
                if not atext:
                    continue
                is_correct = 'Y' if a.get('is_correct') else 'N'
                cur.execute(
                    "INSERT INTO Answers (questionID, answer_text, is_correct) VALUES (:1, :2, :3)",
                    [question_id, atext, is_correct]
                )

        # Log admin action: Quiz Updated
        try:
            action = 'Quiz Updated'
            log_reason = f"By {admin_payload.get('name')}"
            cur.execute("INSERT INTO AdminLog (action, reason) VALUES (:1, :2)", [action, log_reason])
        except Exception:
            app.logger.exception('Failed to write AdminLog for quiz update')

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'message': 'Quiz updated', 'quizID': quiz_id}), 200

    except Exception as e:
        app.logger.exception('Error updating quiz: %s', e)
        return jsonify({'ok': False, 'message': 'Database error while updating quiz'}), 500

@app.route('/api/admin/quizzes/<int:quiz_id>', methods=['DELETE'])
def api_admin_delete_quiz(quiz_id):
    """Delete a quiz and its dependent questions/answers (DB cascade expected)."""
    try:
        admin_payload = admin_required()
    except Exception:
        raise

    if not ORACLE_AVAILABLE:
        return jsonify({'ok': False, 'message': 'Database not available'}), 503

    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()
        # Fetch quiz title for logging
        cur.execute("SELECT title FROM Quiz WHERE quizID = :1", [quiz_id])
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'Quiz not found'}), 404
        title = row[0]

        # Delete quiz (should cascade to Questions/Answers if foreign keys set)
        cur.execute("DELETE FROM Quiz WHERE quizID = :1", [quiz_id])

        # Log admin action
        try:
            action = f"Quiz Deleted: {title}"
            log_reason = f"By {admin_payload.get('name')}"
            cur.execute("INSERT INTO AdminLog (action, reason) VALUES (:1, :2)", [action, log_reason])
        except Exception:
            app.logger.exception('Failed to write AdminLog for quiz deletion')

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'message': 'Quiz deleted'}), 200
    except Exception as e:
        app.logger.exception('Error deleting quiz: %s', e)
        return jsonify({'ok': False, 'message': 'Database error while deleting quiz'}), 500
    
@app.route('/api/admin/quizzes', methods=['POST'])
def api_admin_create_quiz():
    """Create a quiz with questions and answers. Expects JSON:
    { title, description, timelimit, questions: [ { title, category, difficulty, points, description, answers: [{ text, is_correct }] } ] }
    """
    payload = request.get_json() or {}
    title = (payload.get('title') or '').strip()
    description = payload.get('description') or ''
    timelimit = payload.get('timelimit')
    questions = payload.get('questions') or []

    if not title:
        return jsonify({'ok': False, 'message': 'Quiz title is required'}), 400
    if not isinstance(questions, list) or len(questions) == 0:
        return jsonify({'ok': False, 'message': 'At least one question is required'}), 400

    # admin check
    try:
        admin_payload = admin_required()
    except Exception as e:
        # admin_required will abort with proper code
        raise

    if not ORACLE_AVAILABLE:
        return jsonify({'ok': False, 'message': 'Database not available'}), 503

    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()

        # Insert quiz and get generated quizID
        try:
            quiz_id_var = cur.var(oracledb.NUMBER)
            cur.execute(
                "INSERT INTO Quiz (title, description, timelimit) VALUES (:1, :2, :3) RETURNING quizID INTO :4",
                [title, description, timelimit, quiz_id_var]
            )
            quiz_id = int(quiz_id_var.getvalue()[0])
        except Exception:
            # Fallback: insert without returning and select last inserted by title (less safe)
            cur.execute("INSERT INTO Quiz (title, description, timelimit) VALUES (:1, :2, :3)", [title, description, timelimit])
            conn.commit()
            # Attempt to retrieve recent quiz with same title
            cur.execute("SELECT quizID FROM (SELECT quizID FROM Quiz WHERE title = :1 ORDER BY created_at DESC) WHERE ROWNUM = 1", [title])
            row = cur.fetchone()
            quiz_id = int(row[0]) if row else None

        if not quiz_id:
            cur.close()
            conn.close()
            return jsonify({'ok': False, 'message': 'Failed to create quiz'}), 500

        # Insert questions and answers
        for q in questions:
            qtitle = (q.get('title') or '').strip()
            qcategory = q.get('category') or None
            qdifficulty = q.get('difficulty') or None
            qpoints = q.get('points') if q.get('points') is not None else None
            qdesc = q.get('description') or None
            if not qtitle:
                continue
            qid_var = cur.var(oracledb.NUMBER)
            cur.execute(
                "INSERT INTO Questions (quizID, title, category, difficulty, points, description) VALUES (:1, :2, :3, :4, :5, :6) RETURNING questionID INTO :7",
                [quiz_id, qtitle, qcategory, qdifficulty, qpoints, qdesc, qid_var]
            )
            question_id = int(qid_var.getvalue()[0])
            answers = q.get('answers') or []
            for a in answers:
                atext = (a.get('text') or '').strip()
                if not atext:
                    continue
                is_correct = 'Y' if a.get('is_correct') else 'N'
                cur.execute(
                    "INSERT INTO Answers (questionID, answer_text, is_correct) VALUES (:1, :2, :3)",
                    [question_id, atext, is_correct]
                )

        # Log admin action: Quiz Added
        try:
            action = 'Quiz Added'
            log_reason = f"By {admin_payload.get('name')}"
            cur.execute("INSERT INTO AdminLog (action, reason) VALUES (:1, :2)", [action, log_reason])
        except Exception:
            app.logger.exception('Failed to write AdminLog for quiz creation')

        # Commit everything
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'ok': True, 'message': 'Quiz created', 'quizID': quiz_id}), 201

    except Exception as e:
        app.logger.exception('Error creating quiz: %s', e)
        return jsonify({'ok': False, 'message': 'Database error while creating quiz'}), 500

def send_verification_email(to_email: str, code: str) -> None:
    """Send a simple verification email containing the 5-digit code using Gmail SMTP.

    Requires MAIL_USER and MAIL_APP_PASSWORD set in environment.
    """
    if not MAIL_USER or not MAIL_APP_PASSWORD:
        app.logger.warning("Mail credentials not configured; skipping send for %s", to_email)
        return

    subject = "Your SecuriQuiz verification code"
    body = f"Your SecuriQuiz verification code is: {code}\n\nThis code expires in 10 minutes."
    message = f"From: {MAIL_USER}\r\nTo: {to_email}\r\nSubject: {subject}\r\n\r\n{body}"

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as server:
            server.login(MAIL_USER, MAIL_APP_PASSWORD)
            server.sendmail(MAIL_USER, to_email, message)
        app.logger.info("Sent verification email to %s", to_email)
    except Exception as e:
        app.logger.exception("Failed to send verification email: %s", e)


def _cleanup_expired():
    """Remove expired entries from pending_signups."""
    now = time.time()
    expired = [email for email, v in pending_signups.items() if v['expires_at'] <= now]
    for email in expired:
        pending_signups.pop(email, None)

@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json() or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not full_name or not email or not password:
        return jsonify({'ok': False, 'message': 'full_name, email and password are required'}), 400

    _cleanup_expired()

    # If DB is available, check whether the email already exists in Users
    if ORACLE_AVAILABLE:
        try:
            conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
            cur = conn.cursor()
            cur.execute("SELECT userID FROM Users WHERE email = :1", [email])
            existing = cur.fetchone()
            cur.close()
            conn.close()
        except Exception as e:
            app.logger.exception('DB error checking existing user: %s', e)
            return jsonify({'ok': False, 'message': 'Database error while checking existing user'}), 500

        if existing:
            return jsonify({'ok': False, 'message': 'A user with this email already exists'}), 409

    # If already pending, allow resending a new code
    code = str(random.randint(10000, 99999))
    password_hash = generate_password_hash(password)
    code_hash = generate_password_hash(code)
    pending_signups[email] = {
        'full_name': full_name,
        'password_hash': password_hash,
        'code_hash': code_hash,
        'expires_at': time.time() + 10 * 60,  # 10 minutes
        'attempts': 0,
        'blocked_until': 0
    }

    # Send email (best-effort)
    try:
        send_verification_email(email, code)
    except Exception:
        app.logger.exception('Error sending verification email')

    # Log creation (do not log the verification code)
    app.logger.info('Pending signup created for %s, expires_in=10m', email)

    # If mail isn't configured, return a generic acknowledgment (do not return the code)
    if not MAIL_USER or not MAIL_APP_PASSWORD:
        return jsonify({'ok': True, 'message': 'Verification code generated'}), 200

    return jsonify({'ok': True, 'message': 'Verification code sent to email'}), 200


@app.route('/api/verify', methods=['POST'])
def api_verify():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    code = (data.get('code') or '').strip()

    if not email or not code:
        return jsonify({'ok': False, 'message': 'email and code are required'}), 400

    _cleanup_expired()

    pending = pending_signups.get(email)
    if not pending:
        return jsonify({'ok': False, 'message': 'No pending signup for this email or code expired'}), 400

    now = time.time()
    # Check expiry
    if pending.get('expires_at', 0) <= now:
        # clean-up will remove it later; remove now to be explicit
        pending_signups.pop(email, None)
        return jsonify({'ok': False, 'message': 'No pending signup for this email or code expired'}), 400

    # Check lockout
    if pending.get('blocked_until', 0) > now:
        return jsonify({'ok': False, 'message': 'Too many attempts. Try again later.'}), 429

    # Verify using the stored hashed code
    if 'code_hash' not in pending:
        # Defensive: if no code_hash present treat as expired/missing
        pending_signups.pop(email, None)
        return jsonify({'ok': False, 'message': 'No pending signup for this email or code expired'}), 400

    try:
        valid = check_password_hash(pending['code_hash'], code)
    except Exception:
        valid = False

    if not valid:
        # increment attempts and possibly lock
        pending['attempts'] = pending.get('attempts', 0) + 1
        if pending['attempts'] >= MAX_VERIFY_ATTEMPTS:
            pending['blocked_until'] = now + LOCKOUT_SECONDS
            app.logger.warning('Pending signup for %s locked due to too many failed attempts', email)
        return jsonify({'ok': False, 'message': 'Invalid verification code'}), 400

    # Create user in the database (if driver available)
    if not ORACLE_AVAILABLE:
        app.logger.warning('oracledb not available; skipping DB insert for %s (dev mode)', email)
    else:
        try:
            conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
            cur = conn.cursor()
            insert_sql = "INSERT INTO Users (name, email, password, role) VALUES (:1, :2, :3, :4)"
            cur.execute(insert_sql, [pending['full_name'], email, pending['password_hash'], 'member'])
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            app.logger.exception('Failed to create user: %s', e)
            return jsonify({'ok': False, 'message': 'Failed to create user (maybe duplicate email)'}), 500

    # remove pending
    pending_signups.pop(email, None)

    return jsonify({'ok': True, 'message': 'Email verified and account created'}), 200


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'ok': False, 'message': 'email and password are required'}), 400

    # If Oracle driver is available, check persistent Users table
    if ORACLE_AVAILABLE:
        try:
            conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
            cur = conn.cursor()
            cur.execute("SELECT userID, name, email, password, role FROM Users WHERE email = :1", [email])
            row = cur.fetchone()
            cur.close()
            conn.close()
        except Exception as e:
            app.logger.exception('DB error during login: %s', e)
            return jsonify({'ok': False, 'message': 'Database error during login'}), 500

        if not row:
            return jsonify({'ok': False, 'message': 'Invalid email or password'}), 401

        userID, name, email_db, pw_hash, role = row
        if not check_password_hash(pw_hash, password):
            return jsonify({'ok': False, 'message': 'Invalid email or password'}), 401

        user = {'userID': userID, 'name': name, 'email': email_db, 'role': role}
        # Issue JWT
        payload = {
            'sub': userID,
            'name': name,
            'email': email_db,
            'role': role,
            'exp': datetime.utcnow() + timedelta(seconds=JWT_EXP_SECONDS)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
        return jsonify({'ok': True, 'message': 'Logged in', 'user': user, 'token': token}), 200

    return jsonify({'ok': False, 'message': 'Database not available or invalid credentials'}), 503


@app.route('/api/me', methods=['GET'])
def api_me():
    """Return authenticated user info when provided a valid Bearer JWT."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return jsonify({'ok': False, 'message': 'Missing authorization token'}), 401
    token = auth.split(' ', 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception as e:
        app.logger.debug('JWT decode error: %s', e)
        return jsonify({'ok': False, 'message': 'Invalid or expired token'}), 401

    user = {'userID': payload.get('sub'), 'name': payload.get('name'), 'email': payload.get('email'), 'role': payload.get('role')}
    return jsonify({'ok': True, 'user': user}), 200

@app.route('/api/admin/users', methods=['GET'])
def api_admin_users():
    """Return all users for admin panel (admin only)."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return jsonify({'ok': False, 'message': 'Missing authorization token'}), 401
    token = auth.split(' ', 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception as e:
        app.logger.debug('JWT decode error: %s', e)
        return jsonify({'ok': False, 'message': 'Invalid or expired token'}), 401
    if payload.get('role') != 'admin':
        return jsonify({'ok': False, 'message': 'Forbidden'}), 403
    if not ORACLE_AVAILABLE:
        return jsonify({'ok': True, 'users': []})
    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=DB_DSN)
        cur = conn.cursor()
        cur.execute("SELECT userID, name, email, role FROM Users")
        users = [
            {'userID': row[0], 'name': row[1], 'email': row[2], 'role': row[3]}
            for row in cur.fetchall()
        ]
        cur.close()
        conn.close()
    except Exception as e:
        app.logger.exception('DB error fetching users: %s', e)
        return jsonify({'ok': False, 'message': 'Database error'}), 500
    return jsonify({'ok': True, 'users': users})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)