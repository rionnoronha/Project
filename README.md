# EduTrack

EduTrack is a student-management dashboard designed to give academic and administrative teams a clear view of enrollment activity, student status, and department distribution. The project focuses on helping staff monitor records quickly, create new student profiles, and review basic academic summaries without needing a complex administrative workflow.

## Main objective

The primary goal of EduTrack is to provide a polished, easy-to-navigate interface for managing student information and presenting key operational insights in a single place.

## Key features

- Student dashboard with live summary cards
- Student roster view with search and filtering
- Add-new-student workflow
- Student deletion workflow
- Department-aware student display and reporting
- Responsive layout for desktop and smaller screens

## Student information captured

The interface is built around the following student details:

- Student ID
- Full name
- Department
- Admission year
- Academic status

## Frontend technology

The frontend is built with React and Vite for a fast development experience and modern component-based UI structure. Styling is handled with custom CSS and responsive layout rules.

## Backend technology

The UI is designed to communicate with a REST API for student and department data. In the current application flow, the frontend calls endpoints such as /students/ and /departments/ to load and update records.

## Database technology

The broader EduTrack application uses a relational data model for students and departments, allowing consistent department assignment and reporting across records.

## API structure

The current client expects the following API responsibilities:

- GET /students/ to retrieve the student list
- POST /students/ to create a new student profile
- DELETE /students/{student_id} to remove a student
- GET /departments/ to retrieve available departments

## How frontend and backend communicate

The React frontend sends HTTP requests to the backend API using the browser fetch API. The backend returns JSON payloads that the client maps into the dashboard views, forms, and reporting cards.

## Installation

Install frontend dependencies:

```bash
npm install
```

## Running the frontend

Start the Vite development server:

```bash
npm run dev
```

## Running the backend

If you are working with the companion backend service for the student and department API, start it from the backend project directory using your service's standard startup command, such as:

```bash
uvicorn app.main:app --reload
```

## Example API endpoint

Example request:

```bash
curl http://127.0.0.1:8000/students/
```

## Project folder structure

```text
src/
  App.jsx
  App.css
  main.jsx
  index.css
public/
docs/
README.md
package.json
vite.config.js
```

## Future improvements

Potential next steps include:

- Edit-student support
- Advanced filtering and pagination
- Authentication and role-based access
- Improved reporting charts and exports
- Better API error handling and validation feedback
