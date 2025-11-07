import os
import time
import random
import smtplib
import ssl
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash
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

# In-memory store for pending signups: { email: { full_name, password_hash, code, expires_at } }
pending_signups = {}


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


@app.route('/')
def index():
    return "Hello from Flask"


@app.route('/api/signup', methods=['POST'])
def api_signup():
    data = request.get_json() or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not full_name or not email or not password:
        return jsonify({'ok': False, 'message': 'full_name, email and password are required'}), 400

    _cleanup_expired()

    # If already pending, allow resending a new code
    code = str(random.randint(10000, 99999))
    password_hash = generate_password_hash(password)
    pending_signups[email] = {
        'full_name': full_name,
        'password_hash': password_hash,
        'code': code,
        'expires_at': time.time() + 10 * 60  # 10 minutes
    }

    # Send email (best-effort)
    try:
        send_verification_email(email, code)
    except Exception:
        app.logger.exception('Error sending verification email')

    # Log the code for local/dev debugging so you can test without mail configured
    app.logger.info('Pending signup created for %s (code=%s) expires_in=10m', email, code)

    # If mail isn't configured, return the code in the response for local testing only
    if not MAIL_USER or not MAIL_APP_PASSWORD:
        return jsonify({'ok': True, 'message': 'Verification code generated (mail not configured)', 'dev_code': code}), 200

    return jsonify({'ok': True, 'message': 'Verification code sent to email (if configured)'}), 200


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

    if pending['code'] != code:
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


if __name__ == '__main__':
    app.run(debug=True)