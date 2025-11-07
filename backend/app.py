import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
import oracledb


load_dotenv()
app = Flask(__name__)
CORS(app)  # allow cross-origin requests in dev

# Database configuration via environment variables
DB_USER = os.environ.get('ORACLE_DB_USER')
DB_PASS = os.environ.get('ORACLE_DB_PASS')
DB_DSN  = os.environ.get('ORACLE_DB_DSN')


@app.route('/')
def index():
    return "Hello from Flask"

if __name__ == '__main__':
    app.run(debug=True)