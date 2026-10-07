# Auth Testing Playbook
- Login: POST /api/auth/login {email,password} -> returns {user, token}; also sets httpOnly cookies access_token/refresh_token.
- Use `Authorization: Bearer <token>` for all API calls.
- GET /api/auth/me returns current user.
- Brute force: 5 failed attempts per ip:email -> 15 min lockout (429).
- Credentials in /app/memory/test_credentials.md
- Mongo: db.users.findOne({role:"admin"}) password_hash starts with $2b$
