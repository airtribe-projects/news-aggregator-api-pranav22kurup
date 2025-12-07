# News Aggregator API

Simple Express API with JWT authentication, user signup/login, preferences management, external NewsAPI integration, cache, read/favorite tracking, and search.

## Requirements
- Node.js 18+

## Installation
```powershell
npm install
```

## Run
```powershell
# optional: set env vars
$env:JWT_SECRET = "dev_jwt_secret"
$env:NEWS_API_KEY = "<your_newsapi_key>"  # defaults to a demo key in code

npm start        # start server
# or for hot reload
npm run dev
```

## Testing
```powershell
npm test
```

## Environment Variables
- `JWT_SECRET`: secret for signing JWTs (defaults to `dev_jwt_secret`)
- `NEWS_API_KEY`: API key for https://newsapi.org (code has a default, but you should set your own)

## API Overview

Authentication
- `POST /users/signup`: `{ name, email, password, preferences?: string[] }` → 200
- `POST /users/login`: `{ email, password }` → `{ token }`

Preferences (protected: `Authorization: Bearer <token>`)
- `GET /preferences` → `{ preferences: string[] }`
- `PUT /preferences`: `{ preferences: string[] }` → `{ preferences }`
	- Aliases also available at `/users/preferences` (GET/PUT)

News (protected)
- `GET /news` → `{ news: Array<{ id, title, description, url, source, publishedAt }> }`
	- Uses user preferences as keywords to query NewsAPI.
	- Results cached per user for 5 minutes; background refresh runs every 10 minutes.
- `POST /news/:id/read` → mark an article as read
- `POST /news/:id/favorite` → mark an article as favorite
- `GET /news/read` → all read articles
- `GET /news/favorites` → all favorite articles
- `GET /news/search/:keyword` → search cached articles; falls back to API

## Quick Usage (PowerShell)
Signup:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/users/signup -Method POST `
	-ContentType 'application/json' `
	-Body '{"name":"Clark","email":"clark@superman.com","password":"Krypt()n8","preferences":["movies","comics"]}'
```

Login and get token:
```powershell
$login = Invoke-RestMethod -Uri http://localhost:3000/users/login -Method POST `
	-ContentType 'application/json' `
	-Body '{"email":"clark@superman.com","password":"Krypt()n8"}';
$token = $login.token
```

Update preferences:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/preferences -Method PUT `
	-Headers @{ Authorization = "Bearer $token" } `
	-ContentType 'application/json' `
	-Body '{"preferences":["movies","comics","games"]}'
```

Fetch news:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/news -Headers @{ Authorization = "Bearer $token" }
```

Mark read/favorite and list:
```powershell
$n = Invoke-RestMethod -Uri http://localhost:3000/news -Headers @{ Authorization = "Bearer $token" }
$id = $n.news[0].id
Invoke-RestMethod -Uri http://localhost:3000/news/$id/read -Method POST -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri http://localhost:3000/news/$id/favorite -Method POST -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri http://localhost:3000/news/read -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri http://localhost:3000/news/favorites -Headers @{ Authorization = "Bearer $token" }
```

Search:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/news/search/movies -Headers @{ Authorization = "Bearer $token" }
```

## Notes
- Data and caches are in-memory for development/testing and reset on restart.
- Inputs are validated: email format, password length (>= 8), and preferences must be an array of non-empty strings.
- Errors: unauthorized requests return 401; invalid inputs return 400; external API issues return 502/500.

[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=21968727&assignment_repo_type=AssignmentRepo)

