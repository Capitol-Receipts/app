# Deploys

This repo deploys to Vercel projects in the Capitol Receipts team. Every push to `main` builds them.

| Part | Vercel project | Address |
|---|---|---|
| Site | capitol-receipts-marketing | capitolreceipts.com |
| App | capitol-receipts | app.capitolreceipts.com |
| Admin | capitol-receipts-admin | admin.capitolreceipts.com |

The admin is served at the root of admin.capitolreceipts.com by `middleware.js`.
The `capitol-receipts-site` project has no domains and can be deleted.
