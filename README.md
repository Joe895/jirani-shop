# Jirani Shop 🇰🇪

**Good things. Closer to you.** A modern full-stack Kenyan e-commerce portfolio project with product browsing, cart, customer accounts, checkout, an admin dashboard, inventory management, and **Safaricom M-Pesa Daraja STK Push** integration.

> **Portfolio demonstration.** Catalog listings, prices, delivery fees, and the M-Pesa mock mode are for demonstration. No merchandise is available for purchase from this repository. Real payments are **not** possible until you configure your own approved Safaricom credentials and HTTPS callback address. Do not use a demo installation as a commercial production system without the additional hardening noted below.

## Stack

| Layer | Technologies |
| --- | --- |
| Storefront | React 19, TypeScript, Vite 6, React Router, handcrafted responsive CSS, Lucide icons |
| Backend | Node.js 22, Express 5, TypeScript, Zod |
| Database | PostgreSQL 16, Prisma ORM 6 |
| Login | JWT in HttpOnly cookies, bcrypt password hashing, customer/admin roles |
| Payments | Safaricom Daraja (OAuth, STK Push, callback, STK query reconciliation), or simulated demo payments |
| Dev environment | npm workspaces, Docker Compose (PostgreSQL) |

**Why Prisma 6?** This project deliberately pins a stable major version for a beginner-friendly schema and database setup. Prisma 7 uses a different client adapter/configuration model; do not change majors without following its migration guide.

## Features

- Responsive homepage, category collections and product cards
- Product search, category filters, sorting and individual product pages
- Local persistent shopping bag, quantity editing and stock limits
- Customer registration, login, logout and session restoration
- Checkout in **KSh** with Kenyan phone normalization (07/01/+254 formats)
- Kenyan counties and configurable delivery / pickup data model
- Free shipping over KSh 5,000; demo shipping rules: Nairobi KSh 250, other counties KSh 450
- Backend-calculated order totals and atomic inventory reservation
- Real Daraja STK Push flow with callback matching and independent STK query confirmation
- Simulated payment flow for portfolio demos **without real money**
- Customer order history and order status
- Role-protected admin dashboard, revenue summaries, add/edit/hide products, fulfill orders
- 30-minute cleanup of abandoned orders whose payment was never initiated
- Basic security: rate limiting, origin checks for browser mutations, HttpOnly cookies, Helmet, input validation

## Quick start (Windows / macOS / Linux)

**Requirements:** Node.js 22 (or newer compatible LTS), npm, Git and a running PostgreSQL database. Docker Desktop is the easiest local Postgres option.

### 1. Install dependencies

Unzip the project, open the `jirani-shop` directory in VS Code, then:

```bash
npm install
```

This root command installs dependencies for both workspaces. The source archive intentionally does not contain `node_modules` or secrets.

### 2. Configure environment files

**Windows PowerShell:**

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

**macOS / Linux:**

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

In `apps/api/.env`, set a random **JWT_SECRET of at least 32 characters**. To provision an admin account, replace `ADMIN_PASSWORD` with a unique password of at least 12 characters. Do not commit `.env` or use the sample secrets in production.

`MPESA_MODE=mock` is the default: **it does not charge any phone**.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

This starts a local development PostgreSQL database on port 5432. If Docker is unavailable, create a PostgreSQL database in your local installation or use a hosted PostgreSQL provider, then change `DATABASE_URL` in `apps/api/.env`.

### 4. Create database tables and demo catalog

```bash
npm run db:push
npm run db:seed
```

These seed 4 categories and 12 **fictional/demo** products. Seeding a second time does not duplicate products. The admin account is created only when you set a suitable `ADMIN_EMAIL`/`ADMIN_PASSWORD` before seeding. The seed script will not reset an existing admin password.

### 5. Start storefront + API

```bash
npm run dev
```

| Service | Address |
| --- | --- |
| Storefront | http://localhost:5173 |
| API health | http://localhost:4000/api/health |
| Admin | http://localhost:5173/admin |

Register a normal account to shop. Sign in with your seeded admin credentials to use the dashboard. The Vite dev server forwards `/api` to Express by default: cookies work under the same browser origin. Leave `VITE_API_URL` empty unless you intentionally host the API at a different origin.

### 6. Try a complete demo purchase

1. Visit the Shop page and add a product to your bag.
2. Sign up or log in, then continue to checkout.
3. Enter a test Kenyan mobile number in the correct format and delivery information.
4. Click **Place order & continue to payment**.
5. With `MPESA_MODE=mock`, click **Complete demo payment**. The order is marked paid **in the local demo database**. No Safaricom request occurs.
6. See the order under My Orders. As admin, view it in Orders and progress it to Processing → Shipped → Delivered.

## Switch on Daraja M-Pesa integration

Official entry point: [Safaricom Daraja developer portal](https://developer.safaricom.co.ke/).

**This step needs your own Safaricom account, credentials and a publicly accessible HTTPS backend**; it cannot work with arbitrary secrets, an unreachable localhost callback, or an invented shortcode.

In `apps/api/.env`:

```dotenv
MPESA_MODE=sandbox
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_SHORTCODE=your_daraja_test_shortcode
MPESA_PASSKEY=your_daraja_sandbox_passkey
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
PUBLIC_API_URL=https://your-https-backend-domain.example
MPESA_CALLBACK_SECRET=a_unique_random_string_at_least_24_characters
```

For local development you can expose port `4000` with an HTTPS tunnel and set `PUBLIC_API_URL` to its public HTTPS address. The **callback path is constructed automatically by the backend**:

```text
https://YOUR-API-DOMAIN/api/payments/mpesa/callback/YOUR_MPESA_CALLBACK_SECRET
```

### How real STK Push payments work

```text
Customer checkout
     |
     v
Backend calculates KSh total, reserves stock, creates order
     |
     v
POST /api/payments/mpesa/stk (authenticated, one attempt per order)
     |
     +--> Daraja OAuth --> STK Push --> customer's phone
     |                                 |
     |                  Customer approves or cancels
     |                                 |
     +<---- Safaricom HTTPS callback --+
     |
     +--> Match CheckoutRequestID + verify amount, phone, receipt
     |
     +--> Independent STK Query confirms successful result
     |
     v
Payment SUCCESS -> order PAID
or payment FAILED -> order CANCELLED + reserved stock restored
```

**Important safeguards:**

- The frontend never sees Consumer Secret, Passkey or JWT signing secret.
- The server calculates product prices, delivery fees and totals from the database, **not** from the browser's cart price.
- A successful *STK initiation response* does **not** mark an order paid.
- Callback metadata is checked and payment is only marked successful after an independent successful Daraja STK query result.
- A shared secret in the unguessable callback URL helps reject arbitrary webhooks. Daraja callbacks are not cryptographically signed; production operators should also use transaction reconciliation, log review, and the latest Safaricom guidance.
- Payment creation is limited to **one attempt per order** to avoid inadvertently triggering duplicate M-Pesa prompts if a network request timed out. The admin/support reconciliation process must handle ambiguous outcomes.
- `MPESA_MODE=production` uses `https://api.safaricom.co.ke` and needs genuine approved production credentials and business shortcode. No testing should be performed against unsuspecting phone numbers.
- **Demo mode is deliberately labelled** and must never be represented as evidence that real payment has been received.

## API endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| GET | `/api/catalog/categories` | Public |
| GET | `/api/catalog/products?q=&category=&sort=` | Public |
| GET | `/api/catalog/products/:slug` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Public |
| GET | `/api/auth/me` | Signed in |
| POST | `/api/orders` | Signed in |
| GET | `/api/orders/my` | Signed in |
| GET | `/api/orders/:id` | Order owner |
| POST | `/api/orders/:id/cancel` | Order owner; before initiating payment |
| GET | `/api/payments/mode` | Public |
| POST | `/api/payments/mock/complete` | Order owner; demo mode only |
| POST | `/api/payments/mpesa/stk` | Order owner; Daraja mode only |
| POST | `/api/payments/mpesa/verify` | Order owner; Daraja mode only |
| POST | `/api/payments/mpesa/callback/:secret` | Safaricom callback only |
| GET | `/api/admin/overview` | Admin |
| GET | `/api/admin/products` | Admin |
| POST | `/api/admin/products` | Admin |
| PATCH | `/api/admin/products/:id` | Admin |
| GET | `/api/admin/orders` | Admin |
| PATCH | `/api/admin/orders/:id/status` | Admin |

## Build and production hosting

```bash
npm run test
npm run build
npm run start -w apps/api
```

The built Express API **also serves** the built React frontend, enabling a single-origin deployment on a Node-capable hosting service with a persistent PostgreSQL database. Set `NODE_ENV=production`, `WEB_ORIGIN=https://your-app-domain`, `DATABASE_URL` and secure secrets in the hosting provider's environment dashboard. Use HTTPS; cookie sessions require it in production.

For a professional production rollout, generate and review versioned Prisma migrations (`cd apps/api && npx prisma migrate dev --name initial` while developing, then `prisma migrate deploy` on your production host). `db:push` is meant for this initial portfolio/demo setup, **not as a production migration strategy**.

## Project layout

```text
jirani-shop/
├── apps/
│   ├── web/                 # React + TypeScript storefront
│   │   ├── src/components/  # Layout and product UI
│   │   ├── src/contexts/    # Auth and shopping bag
│   │   └── src/pages/       # Home, Shop, Product, Cart, Checkout, Orders, Admin
│   └── api/                 # Express + TypeScript REST API
│       ├── prisma/          # Schema + 12 demo products seed
│       └── src/
│           ├── lib/         # Pricing, phone, Daraja, cleanup, Prisma
│           ├── middleware/  # Auth/role enforcement
│           └── routes/      # Auth, Catalog, Orders, Payments, Admin
├── docker-compose.yml      # Local PostgreSQL
├── .github/workflows/ci.yml
└── README.md
```

## Tests and quality

`npm test` covers Kenyan phone normalization, server-side delivery calculations, and product slug formatting. `.github/workflows/ci.yml` builds and tests both workspaces. More automated API/database, callback replay, payment failure and end-to-end tests are recommended before allowing real purchases.

## Future improvements / production checklist

This **functional portfolio starter** is intentionally not a certified production commerce backend. Before operating a real business, add:

- End-to-end checkout/browser tests and PostgreSQL integration tests
- Payment reconciliation job for missing/malformed callbacks, timeout states and dispute handling
- Order refunds, returns, customer service and M-Pesa settlement reconciliation
- Secure password reset / email verification / notification service
- Product photo uploads (e.g. Cloudinary) rather than URL-only image entry
- Real delivery quotes / courier integration, pickup-point configuration, and fulfilment policies
- Pagination, stock alerting, product variants, reviews and inventory admin audits
- Structured logs, monitoring, backups, fraud checks, accessibility audits and expanded security tests
- Managed DB migrations, CI release automation and a proper service domain

**License:** MIT. Built as an educational and portfolio demonstration.

## Add Jirani Shop to your GitHub portfolio

Create an empty GitHub repository named `jirani-shop`, then from the project directory:

```bash
git init
git add .
git commit -m "Build Jirani Shop Kenyan full-stack e-commerce platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jirani-shop.git
git push -u origin main
```

Replace `YOUR_USERNAME`. Never commit `.env`, real M-Pesa credentials, or private customer information. Once running locally, take screenshots of the actual site and add them to this README, along with a live demo URL after deployment.
