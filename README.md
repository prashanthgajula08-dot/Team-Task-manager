# Team Task Manager

A full-stack task management app where teams can create projects, assign work, and track progress with role-based access for `ADMIN` and `MEMBER`.

## What is included

- Signup and login with secure password hashing and cookie-based authentication
- Project creation and team membership management
- Task creation, assignment, priority, due dates, and status tracking
- Dashboard with assigned work, overdue tasks, and summary metrics
- Role-based access control:
  - `ADMIN`: create projects, add teammates, assign tasks, and update any task in their project
  - `MEMBER`: view shared projects and update the status of tasks assigned to them
- Native SQLite with relational foreign-key constraints
- Railway-ready deployment guidance

## Tech stack

- Backend: Node.js, Express
- Frontend: HTML, CSS, Vanilla JavaScript
- Database: SQLite
- Auth: JWT stored in HTTP-only cookies

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   copy .env.example .env
   ```

3. The database schema is created automatically on first app start.

4. Optional demo data:

   ```bash
   npm run db:seed
   ```

   Demo credentials after seeding:

   - Admin: `admin@demo.com` / `password123`
   - Member: `member@demo.com` / `password123`

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## API overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects/:projectId/members`
- `POST /api/projects/:projectId/tasks`

### Tasks

- `PATCH /api/tasks/:taskId`

### Dashboard

- `GET /api/dashboard`

## Railway deployment

This project is prepared for Railway using a persistent SQLite database file.

1. Push the code to GitHub.
2. Create a new Railway service from the repository.
3. Add these environment variables:

   - `NODE_ENV=production`
   - `JWT_SECRET=<your-long-random-secret>`
   - `DATABASE_URL=file:/data/team-task-manager.db`

4. Attach a Railway volume mounted at `/data`.
5. Railway will use the `npm start` script and create the SQLite schema automatically on boot.
6. Set the healthcheck path to `/health`.

## Notes

- SQLite is a valid SQL database and keeps the project easy to run locally.
- On Railway, attached-volume services may see brief downtime during redeploys because the volume can only be mounted to one active deployment at a time.
