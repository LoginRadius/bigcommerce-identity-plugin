# LoginRadius plugin for BigCommerce

Replaces BigCommerce's native storefront authentication with LoginRadius
Customer Identity: sign in, sign up, social login, forgot password, email
verification, account management, and single sign-on across the storefront and
Optimized One-Page Checkout.

This repository contains the **plugin only**. It is not a theme. You copy the
plugin into your own Stencil theme checkout and add a handful of includes.

The Stencil package targets the **LoginRadius V3 JavaScript SDK**.

## Requirements

- A LoginRadius app (API key, tenant/site name) — [Admin Console](https://console.loginradius.com)
- The LoginRadius **BigCommerce SSO** integration enabled on your LoginRadius tenant
- A BigCommerce store and a Stencil theme based on Cornerstone
- [Stencil CLI](https://developer.bigcommerce.com/docs/storefront/stencil/cli/install) and Node 20 (Node >= 16.7 is the hard minimum)

The plugin itself has **no npm dependencies**. Both scripts in `scripts/` are
plain Node, so a fresh clone needs no `npm install`.

## Repository layout

```
bigcommerce-stencil-package/     Stencil (Cornerstone) plugin — V3 SDK, actively maintained
  assets/loginradius/            CSS, images, config.template.js, LoginRadiusInterface.js
  components/loginradius/        Handlebars partials you include from your theme
bigcommerce-blueprint-package/   Legacy Blueprint plugin — still on the V2 SDK, unchanged
scripts/generate-config.js       Builds config.js from .env
scripts/install-into-theme.js    Copies the Stencil package into a theme checkout
.env.example                     Template for your local .env
```

## Setup

### 1. Clone and configure

```bash
git clone <this-repo>
cd bigcommerce-identity-plugin
cp .env.example .env        # Windows: copy .env.example .env
```

Fill in `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `LR_STORE_NAME` | yes | BigCommerce **store hash** — an opaque ID, not your store's subdomain. Find it in the API path of any store API account (`https://api.bigcommerce.com/stores/<store_hash>/v3/`) under Settings → API accounts, or in the control panel URL after signing in. This is the value LoginRadius passes as `store` to the BigCommerce SSO bridge. |
| `LR_API_KEY` | yes | LoginRadius API Key (Admin Console → Tenant Settings → API Credentials). Public by design — it ships in the theme bundle. |
| `LR_TENANT_NAME` | yes | LoginRadius tenant/site name. Used for the SSO hub host `https://<LR_TENANT_NAME>.hub.loginradius.com`. |
| `LR_APP_NAME` | no | Only set this if your app name differs from the tenant name. Falls back to `LR_TENANT_NAME`. |
| `LR_SOTT` | no | Leave empty unless you know you need it. See [SOTT](#sott). |

`.env` is gitignored. Never commit it.

### 2. Generate the theme config

```bash
node scripts/generate-config.js
```

This substitutes your `.env` values into
`bigcommerce-stencil-package/assets/loginradius/assets/js/config.template.js`
and writes `config.js` beside it. It fails loudly if a required value is
missing.

`config.js` is **gitignored** — it contains your API key, so it is generated per
environment rather than committed. Re-run the script whenever `.env` or
`config.template.js` changes. There is no `npm install` hook: the script is
deliberately manual and dependency-free so it can't run against a stale `.env`
during an unrelated install.

### 3. Copy the plugin into your theme

```bash
node scripts/install-into-theme.js ../cornerstone
```

Which copies:

| From | To |
| --- | --- |
| `bigcommerce-stencil-package/assets/loginradius` | `<theme>/assets/loginradius` |
| `bigcommerce-stencil-package/components/loginradius` | `<theme>/templates/components/loginradius` |

The script refuses to run if the target has no `templates/layout` directory, or
if you haven't generated `config.js` yet.

### 4. Add the includes to your theme

**`templates/layout/base.html`** — once, just before `{{{footer.scripts}}}`:

```handlebars
{{> components/loginradius/LRreferences }}
{{> components/loginradius/LRsso }}
```

`LRreferences` loads the V3 SDK, your `config.js` and `LoginRadiusInterface.js`.
`LRsso` handles single sign-on and intercepts sign-out. Both must be present on
every page, so the layout is the right place.

**`templates/pages/auth/login.html`** — replace the native login form and
new-customer panel with:

```handlebars
{{> components/loginradius/auth }}
```

**The other auth pages** — Cornerstone ships four more templates in
`templates/pages/auth/` that render native BigCommerce forms. They stay reachable
through header links and direct URLs, so leaving them alone lets shoppers create
accounts and reset passwords *outside* LoginRadius, which is the main way a
half-finished install goes wrong. Replace the native form in each with the same
include:

| Template | Native form to remove |
| --- | --- |
| `create-account.html` | Registration form |
| `forgot-password.html` | Forgot-password form |
| `new-password.html` | Reset-password form |

```handlebars
{{> components/loginradius/auth }}
```

One include covers all three: `auth` renders sign in, sign up and forgot
password together, and resolves reset/verification tokens when it finds one in
the URL. `account-created.html` is a confirmation page with no form, so it can be
left as is.

**`templates/pages/checkout.html`** — after the header:

```handlebars
{{> components/loginradius/LoginRadiusOptimizedCheckout }}
```

**Account pages (optional)** — to hand profile management to LoginRadius, add
`{{> components/loginradius/accountdetails }}` to your account template. Left
out, shoppers edit their profile and password in BigCommerce only and the two
records drift apart.

### 5. Configure the LoginRadius Admin Console

- Add your storefront domain to the allowed/whitelisted domains.
- Enable **Bot Protection (Captcha)** under Security → Attack Protection. This is
  what lets you leave `LR_SOTT` empty (see [SOTT](#sott)).
- Enable and configure the BigCommerce SSO integration for the tenant.

### 6. Run it

```bash
stencil start        # local
stencil push         # deploy to the store
```

## Component reference

| Include | Renders |
| --- | --- |
| `LRreferences` | V3 SDK script + stylesheet, `config.js`, `LoginRadiusInterface.js` |
| `LRsso` | SSO session sync and sign-out interception (no markup) |
| `auth` | Sign in, sign up, social login, forgot password, and token verification |
| `LoginRadiusOptimizedCheckout` | Sign-in prompt beside Optimized One-Page Checkout |
| `accountdetails` | Full account management (V3 Profile bundle) |
| `profileeditor`, `changepassword`, `emailmanage` | Individual account panels |
| `login`, `register`, `social`, `forgot`, `verify` | Compatibility wrappers that delegate to `auth` |

V3's `auth` component is a single combined surface, so the old per-form panels no
longer exist as separate widgets. The wrappers are kept so existing theme
includes keep working; new themes should include `auth` directly. Link to the
auth page with `?action=register` or `?action=forgotpassword` to open a specific
screen first.

## How the flows work

**Sign in.** `auth` posts to LoginRadius. On success the plugin sets the SSO
token on the LoginRadius hub, then exchanges the access token with
`cloud-api.loginradius.com/sso/bigcommerce/api/token` for a BigCommerce login URL
and redirects there.

**SSO.** On every page load, guests with a live LoginRadius hub session are
logged into BigCommerce automatically. Signed-in shoppers whose LoginRadius
access token no longer validates are signed out.

**Checkout.** Optimized One-Page Checkout is a closed React app, so the plugin
does not inject forms into it. It renders a prompt linking to
`/login.php?return_url=<checkout url>` and sends the shopper back to checkout
after login.

**Sign out.** Clicks on any `action=logout` link are intercepted, the LoginRadius
session is ended first (`ensureSession()` then `logout()`, each time-boxed), and
only then does the browser follow BigCommerce's logout URL. Without that order
SSO would immediately sign the shopper back in.

## SOTT

A SOTT (Secure One-Time Token) authorises registration from the browser. It is
only required when Bot Protection (Captcha) is **disabled** in the Admin Console;
with Captcha on, LoginRadius expects `sott` to be omitted.

A SOTT expires — 10 minutes by default, configurable in the Admin Console — and
the recommended pattern is to inject a fresh one server-side per page render.
A Stencil theme asset is a static file, so it cannot do that: anything in
`LR_SOTT` is baked into `config.js` and readable by anyone who loads the
storefront.

**So: enable Captcha and leave `LR_SOTT` empty.** The template omits `sott`
entirely when the variable is blank. If a store genuinely needs SOTT-based
registration, set a long-expiry SOTT from the Admin Console and plan to rotate
it; `generate-config.js` will warn when the value is present.

## Local testing

Keep your Cornerstone checkout **outside** this repo and point
`install-into-theme.js` at it:

```bash
node scripts/generate-config.js
node scripts/install-into-theme.js ../cornerstone
cd ../cornerstone && stencil start
```

If you prefer to keep a theme checkout in the repo root, ignore those files
through `.git/info/exclude` rather than `.gitignore`, so the shared ignore list
stays limited to real plugin artifacts (`.env`, the generated `config.js`, and
Stencil CLI state).

## Blueprint package

`bigcommerce-blueprint-package/` targets the legacy Blueprint theme framework and
is still on the LoginRadius V2 SDK. It was not part of the V3 migration and is
kept for stores that have not moved to Stencil. New integrations should use the
Stencil package.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `[generate-config] missing required .env values` | Fill in `LR_STORE_NAME`, `LR_API_KEY`, `LR_TENANT_NAME`. |
| `LoginRadius: interface/SDK failed to load` in the console | `LRreferences` is missing from the layout, or `config.js` was never generated. |
| Auth widget never appears | Confirm `assets/loginradius/assets/js/config.js` exists in the theme and that `LR_API_KEY` is set. |
| LoginRadius sign-in succeeds but the shopper is never logged into BigCommerce | `LR_STORE_NAME` must be the store hash (`3mhucbxfyj`), not the subdomain. The SSO bridge returns no `loginUrl` for an unknown store. |
| Registration fails with a SOTT error | Enable Bot Protection (Captcha) in the Admin Console, or set a valid `LR_SOTT`. |
| Sign-out bounces straight back in | `LRsso` must be in the layout. It ends the LoginRadius session before BigCommerce logout. |
| Social login doesn't return to checkout | `callbackUrl` must keep the query string so `return_url` survives. Don't strip it in `config.template.js`. |

## License

Copyright © 2026 LoginRadius Global Inc.
