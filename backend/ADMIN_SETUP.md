# Everything React Admin Panel

The admin panel is integrated into the existing React frontend and Node/Express backend.

## Admin URL

With the current HashRouter:

`http://localhost:5173/#/admin`

For a deployed frontend, use the same `/#/admin` route on the deployed domain.

## 1. Configure backend environment

Add these variables to `backend/.env`:

```env
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=YOUR_ARGON2_HASH
ADMIN_JWT_SECRET=YOUR_LONG_RANDOM_ADMIN_SECRET
```

Do not use a plain-text admin password in `ADMIN_PASSWORD_HASH`.

## 2. Generate the password hash

From the `backend` directory:

```bash
node scripts/createAdminHash.js YourStrongAdminPassword
```

Copy the printed `ADMIN_PASSWORD_HASH=...` value into `backend/.env`.

## 3. Start backend

```bash
cd backend
npm install
npm run dev
```

## 4. Start React frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

`http://localhost:5173/#/admin`

## Admin features

- Admin login with Argon2 password verification
- 8-hour signed admin JWT
- Admin login rate limiting
- Dashboard statistics
- User search and pagination
- Edit user credits
- Activate/deactivate users
- Verify/unverify users
- Payment filtering by status/provider
- Manual payment approval with transaction ID and verified amount
- Atomic credit application through the existing payment service
- Payment rejection
- Contact-message inbox
- Read/unread message status
- Message deletion
- Admin audit logs
- Responsive mobile layout
- Light/dark admin theme
- Collapsible sidebar

## Payment approval safety

Admin approval does not directly increment credits from the UI. It calls the backend payment service, which validates provider, amount, transaction uniqueness and credit application state before applying credits.

## Production

Set `FRONTEND_URL` in the backend to the exact deployed frontend origin, for example:

```env
FRONTEND_URL=https://your-frontend-domain.example
```

Keep `ADMIN_JWT_SECRET`, `ADMIN_PASSWORD_HASH`, MongoDB credentials, payment credentials and email credentials private.
