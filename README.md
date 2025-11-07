# Securinets-Quiz

## Project Description

Securinets-Quiz is an online platform developed for the SecurinetsFST organization. It is designed to host tests in the form of quizzes, allowing users to participate in exams and receive instant feedback on their results.

### Features
- **User Login:** Users can securely log in to the platform.
- **Take Exams:** Users can attempt quizzes and receive a pass or fail result based on their performance.
- **Admin Supervision:** Administrators can supervise users, monitor their activity, and check their marks.

### Technologies Used
- **Frontend:** Angular
- **Backend:** Flask
- **Database:** Oracle

This project provides a robust and interactive environment for both participants and administrators, ensuring a smooth and secure quiz experience.

## Running the project locally

Backend (Flask)

1. Open a terminal and activate the backend virtual environment:

```cmd
cd backend
venv\Scripts\activate
```

2. Install dependencies (if not already done):

```cmd
pip install -r requirements.txt
```

3. (Required) Create a `.env` file in the `backend` folder to securely store your Oracle DB credentials:

```
ORACLE_DB_USER=your_oracle_username
ORACLE_DB_PASS=your_oracle_password
ORACLE_DB_DSN=your_oracle_dsn
```

Replace the values with your actual Oracle credentials. The `.env` file should not be committed to version control.

4. Start the Flask app:

```cmd
set FLASK_APP=app.py
flask run
```

Frontend (Angular)

1. In a separate terminal, from the project root start the Angular dev server with a proxy so API calls are forwarded to Flask:

```cmd
cd frontend
npx ng serve --proxy-config proxy.conf.json --open
```