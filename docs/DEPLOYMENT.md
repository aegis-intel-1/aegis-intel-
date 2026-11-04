# Setup and deployment

## On your PC

Install Node 24+. Download this repository using GitHub's green Code button, Download ZIP, and extract it. Open a terminal in the extracted folder.

Run npm install, npm run browser:install, and copy .env.example to .env. On Windows PowerShell use Copy-Item .env.example .env; on macOS/Linux use cp .env.example .env. Run npm run dev and open http://localhost:5173.

Development uses demo.sqlite, with a clearly labeled fictional case. User queries and imported files are real. Do not expose demo mode to the internet.

## Production pilot

Use a dedicated persistent container host. Configure:

- NODE_ENV=production and AEGIS_DEMO=false.
- APP_URL with the exact HTTPS origin served by your reverse proxy.
- OWNER_EMAIL and a unique OWNER_PASSWORD of at least 14 characters.
- Private DATA_DIR on persistent storage. Use separate storage from every other OSINT application.
- Keep ALLOW_REGISTRATION=false unless deliberate onboarding is needed.

Run docker compose up --build -d. Host port 4310 binds to loopback; terminate HTTPS with a reverse proxy on that host. TRUST_PROXY=1 is appropriate only behind that single trusted proxy. The bootstrap owner is inserted only on an empty database; changing the environment password does not rotate an existing password.

This reconstruction has a fresh schema and should use a fresh data directory. Do not point it at an old pilot database without a reviewed migration.

Use exactly one application process. SQLite, scheduled monitors and capture queue controls are not designed for multiple replicas. Back up the database using SQLite's online backup mechanism or stop the service while copying the database and original directories together. Test restoration and original verification. Never copy only an active SQLite main file without considering its WAL.

Do not deploy the current persistent filesystem and browser-worker backend to an ephemeral Vercel-style function. Configure network egress at the container boundary and isolate browser workers for production. Application checks reject private/reserved addresses, credentials, custom ports and unsafe redirects; browser HTTP requests use the same pinned client and WebSockets are blocked.

## Proxy, providers and costs

A trusted egress proxy may be configured through AEGIS_HTTPS_PROXY or HTTPS_PROXY. Install organization CA trust normally; never disable TLS verification. The Docker base image can be selected using NODE_IMAGE, including an official mirror when Docker Hub throttles pulls.

Provider keys are server-side only: HIBP_API_KEY, SHODAN_API_KEY and optionally OPENAI_API_KEY. The AI draft button explicitly asks to share case descriptions, identifiers, notes and artifact metadata. Original file bytes are not sent. Validate provider licensing, data residency, request costs and retention before enabling paid services.

Stripe webhook signature verification and idempotent event intake are included, but subscription entitlement enforcement is incomplete. Checkout deliberately returns a disabled response. No products, subscriptions, charges or paid hosting were created.

## Browser companion

Download the repository ZIP. In Chrome, open chrome://extensions, enable Developer mode, select Load unpacked, and choose the extension folder. Generate a seven-day pairing token in Aegis Settings. Open the companion, enter the workspace URL/token, connect, and select a case.

Workspace and source-origin permissions are requested explicitly. The debugger permission enables full-page screenshots; pageCapture preserves MHTML. Tokens grant account API access: keep them private and revoke them in Settings when no longer needed.

Keep the source tab active. Optional comment expansion is limited and best effort. Captures may contain incomplete, dynamic or lazily loaded content. Inspect every original. Browser-store distribution and live platform completeness validation are pending.
