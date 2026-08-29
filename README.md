# RunSync Garmin Frontend

## Local

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Acesse http://localhost:3000.

## Vercel

Configure:
`NEXT_PUBLIC_API_URL=https://SEU-BACKEND.onrender.com`

Depois faça deploy normalmente na Vercel.
