# News Aggregator API

Simple Express API with JWT auth, user signup/login, preferences, and a sample news endpoint.

## Prerequisites
- Node.js 18+
- PowerShell (commands below are PowerShell-friendly)

## Install & Run
```powershell
npm install
npm test
npm start   # or: npm run dev   (uses nodemon)
```

Set a custom JWT secret (optional):
```powershell
$env:JWT_SECRET = "your-strong-secret"; npm start
```

## Endpoints

- `POST /users/signup`
	- Body: `{ name, email, password, preferences?: string[] }`
	- Creates user with bcrypt-hashed password. Returns 200.

- `POST /users/login`
	- Body: `{ email, password }`
	- Returns `{ token }` (JWT, 1h expiry).

- `GET /users/preferences` (protected)
	- Header: `Authorization: Bearer <token>`
	- Returns `{ preferences: string[] }`.

- `PUT /users/preferences` (protected)
	- Header: `Authorization: Bearer <token>`
	- Body: `{ preferences: string[] }`
	- Updates and returns `{ preferences }`.

- `GET /preferences` (protected)
	- Same as `GET /users/preferences`.

- `PUT /preferences` (protected)
	- Same as `PUT /users/preferences`.

- `GET /news` (protected)
	- Header: `Authorization: Bearer <token>`
	- Returns `{ news: Array<{ title, category }> }`.

## Quick Test (PowerShell)

Signup:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/users/signup -Method POST \
	-ContentType 'application/json' \
	-Body '{"name":"Clark","email":"clark@superman.com","password":"Krypt()n8","preferences":["movies","comics"]}'
```

Login (capture token):
```powershell
$login = Invoke-RestMethod -Uri http://localhost:3000/users/login -Method POST \
	-ContentType 'application/json' \
	-Body '{"email":"clark@superman.com","password":"Krypt()n8"}';
$token = $login.token; $token
```

Get preferences:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/preferences -Headers @{ Authorization = "Bearer $token" }
```

Update preferences:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/preferences -Method PUT \
	-Headers @{ Authorization = "Bearer $token" } \
	-ContentType 'application/json' \
	-Body '{"preferences":["movies","comics","games"]}'
```

Get news:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/news -Headers @{ Authorization = "Bearer $token" }
```

## Notes
- User data is stored in-memory for development and tests; it resets on server restart.
- Passwords are hashed with `bcrypt` (10 rounds).
- JWT is signed with `JWT_SECRET` (defaults to `dev_jwt_secret`).

## Scripts
- `npm test` — runs tap tests.
- `npm start` — starts the server.
- `npm run dev` — starts with nodemon for hot reload.

[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=21968727&assignment_repo_type=AssignmentRepo)
