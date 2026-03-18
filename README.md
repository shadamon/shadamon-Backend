# shadamon-backend

Express + MongoDB backend for Shadamon.

## Local run

1. Create `.env` (see `.env.example`)
2. Install deps: `npm ci`
3. Start: `npm run dev` (or `npm start`)

## Production (VPS) quick notes

- Run behind Nginx and proxy to `127.0.0.1:5000` (Socket.io supported).
- Use PM2 with `ecosystem.config.cjs`.
- Keep production secrets out of Git; store them on the server (`.env`).

Deployment docs: see the step-by-step instructions in the chat, and sample configs in `deploy/`.

