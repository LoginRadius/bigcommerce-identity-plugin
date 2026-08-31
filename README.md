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
- A BigCommerce store, plus permission to create API accounts in its control
  panel. You will create two: one for Stencil CLI (step 4) and one for the
  LoginRadius SSO connector (step 7).
- [Git](https://git-scm.com/downloads) — needed to clone the theme and to run `npm install`
- Node 20. Cornerstone pins Node 20 in its `.nvmrc` and generated its lockfile on
  Node 20 / npm 10, so use [nvm](https://github.com/nvm-sh/nvm) or
  [nvm-windows](https://github.com/coreybutler/nvm-windows) to switch if your
  system Node is newer. This repo's own scripts need only Node >= 16.7.
- [Stencil CLI](https://developer.bigcommerce.com/docs/storefront/stencil/cli/install):
  `npm install -g @bigcommerce/stencil-cli`
- A Cornerstone theme checkout. Stencil CLI does **not** create one — step 3
  below walks through getting it.

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

Nine steps. Some run in **this repo** and some run in **your theme checkout**,
and mixing them up is the most common way to get stuck. Every command block below
says which directory it belongs to.

### 1. Clone and configure — in this repo

```bash
git clone <this-repo>
cd bigcommerce-identity-plugin
cp .env.example .env        # Windows: copy .env.example .env
```

Fill in `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `LR_STORE_NAME` | yes | BigCommerce **store hash** — an opaque ID, not your store's subdomain. Find it in the API path of any store API account (`https://api.bigcommerce.com/stores/<store_hash>/v3/`) under Settings → API accounts, or in the control panel URL after signing in. `stencil start` also prints it in the SSL store URL (`https://store-<store_hash>.mybigcommerce.com`). This is the value LoginRadius passes as `store` to the BigCommerce SSO bridge. |
| `LR_API_KEY` | yes | LoginRadius API Key (Admin Console → Tenant Settings → API Credentials). Public by design — it ships in the theme bundle. |
| `LR_TENANT_NAME` | yes | LoginRadius tenant/site name. Used for the SSO hub host `https://<LR_TENANT_NAME>.hub.loginradius.com`. |
| `LR_APP_NAME` | no | Only set this if your app name differs from the tenant name. Falls back to `LR_TENANT_NAME`. |
| `LR_SOTT` | no | Leave empty unless you know you need it. See [SOTT](#sott). |

No BigCommerce API key or secret goes in `.env`. This integration needs two
BigCommerce credentials, and neither of them lives in this repo:

- a Stencil CLI token, entered with `stencil init` in your theme (step 4)
- a store-level API account's Client ID, Client Secret and Access Token, entered
  in the LoginRadius Admin Console's BigCommerce SSO form (step 7)

`.env` is gitignored. Never commit it.

### 2. Generate the theme config — in this repo

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

### 3. Get a Cornerstone theme — outside this repo

Installing Stencil CLI gives you a `stencil` command and nothing else. Theme
files (`templates/`, `assets/`, `config.json`, `webpack.*.js`, and the rest) come
from the Cornerstone repository, and `node_modules/` comes from installing its
dependencies. Keep the checkout **outside** this repo:

```bash
# one level up from this repo
git clone https://github.com/bigcommerce/cornerstone.git
cd cornerstone
npm install
```

If `npm install` fails, check your Node version before anything else — Cornerstone
expects Node 20. Don't delete `package-lock.json` to force it through.

Already have a theme in the BigCommerce control panel? Download it from
Storefront → Themes instead of cloning, then `npm install` in it. The rest of
these steps are the same.

### 4. Point Stencil CLI at your store — in the theme

Stencil CLI needs a BigCommerce API token to pull live store data into the local
preview. In the BigCommerce control panel, go to Settings → API accounts →
Create API account and choose **Create Stencil-CLI Token**, which applies the
required scopes for you. Pick an access level:

- *local development only* — enough for `stencil start`
- *publish theme* — also allows `stencil push`, which requires Themes: modify

```bash
# in <theme>
stencil init --url https://yourstore.com/ --token <your-stencil-token> --port 3000
```

This writes `config.stencil.json` and `secrets.stencil.json` into the theme.
`secrets.stencil.json` holds the live token — keep it out of every commit.

Run this **inside the theme**. Running it in this repo leaves stray
`config.stencil.json`, `secrets.stencil.json` and `stencil.conf.cjs` files here,
and `stencil start` then fails with `Cannot find module 'webpack'` because this
repo has no theme dependencies installed.

### 5. Copy the plugin into your theme — in this repo

```bash
node scripts/install-into-theme.js ../cornerstone
```

Which copies:

| From | To |
| --- | --- |
| `bigcommerce-stencil-package/assets/loginradius` | `<theme>/assets/loginradius` |
| `bigcommerce-stencil-package/components/loginradius` | `<theme>/templates/components/loginradius` |

The script refuses to run if the target has no `templates/layout` directory, or
if you haven't generated `config.js` yet. Re-run it after every
`generate-config.js`, otherwise the theme keeps the old `config.js`.

### 6. Add the includes to your theme — in the theme

Six template edits. Paths are relative to your theme checkout.

**`templates/layout/base.html`** — add two includes directly above the existing
`{{{footer.scripts}}}` line, near the end of the file:

```handlebars
        {{> components/loginradius/LRreferences }}
        {{> components/loginradius/LRsso }}

        {{{footer.scripts}}}
    </body>
```

`LRreferences` loads the V3 SDK, your `config.js` and `LoginRadiusInterface.js`.
`LRsso` handles single sign-on and intercepts sign-out. Both must be present on
every page, so the layout is the right place.

**`templates/pages/auth/login.html`** — delete the entire `<div class="login-row">`
block, which holds both the native login `<form>` and the new-customer panel, and
put the include in its place. Keep the breadcrumbs and page heading. The whole
file afterwards:

```handlebars
{{#partial "page"}}
<div class="login">
    {{> components/common/breadcrumbs breadcrumbs=breadcrumbs}}
    <h1 class="page-heading">{{lang 'login.heading' }}</h1>

    {{> components/loginradius/auth }}
</div>
{{/partial}}
{{> layout/base}}
```

**`templates/pages/auth/create-account.html`, `forgot-password.html`,
`new-password.html`** — Cornerstone ships these three with native BigCommerce
forms. They stay reachable through header links and direct URLs, so leaving them
alone lets shoppers create accounts and reset passwords *outside* LoginRadius,
which is the main way a half-finished install goes wrong. In each file, delete the
`<form ...>` … `</form>` block and put the same include where it was:

```handlebars
{{> components/loginradius/auth }}
```

| Template | Native form to delete |
| --- | --- |
| `create-account.html` | Registration form (inside the `{{#if settings.account_creation_enabled}}` guard — keep the guard) |
| `forgot-password.html` | Forgot-password form |
| `new-password.html` | Reset-password form |

One include covers all three: `auth` renders sign in, sign up and forgot
password together, and resolves reset/verification tokens when it finds one in
the URL. You can also drop the `{{inject 'recaptchaTitle' ...}}` and
`{{inject 'passwordRequirements' ...}}` lines at the top of those files, since
they only feed the native forms. `account-created.html` is a confirmation page
with no form, so leave it as is.

**`templates/pages/checkout.html`** — after the `</header>` block, before
`{{{ checkout.checkout_content }}}`:

```handlebars
{{> components/loginradius/LoginRadiusOptimizedCheckout }}
```

**Account pages (optional)** — to hand profile management to LoginRadius, add
`{{> components/loginradius/accountdetails }}` to your account template. Left
out, shoppers edit their profile and password in BigCommerce only and the two
records drift apart.

### 7. Configure LoginRadius and BigCommerce — in the browser

- Create a store-level API account in BigCommerce (Settings → API accounts) for
  the SSO connector. This is separate from the Stencil CLI token in step 4. The
  connector looks up a customer by email, creates one if missing, and then opens a
  BigCommerce session, so grant **Customers: modify** and **Customers login:
  login**. Remaining scopes of API can be configured towards your needs. (EXAMPLE: Channel settings read-only, Sites & routes read-only, Themes, Content, Customers, Customers login, Information & settings read-only)
- Fill in the BigCommerce SSO form in the LoginRadius Admin Console:

  | Field | Value |
  | --- | --- |
  | Store Name | Your store hash, the same value as `LR_STORE_NAME`. Usually prefilled and read-only. |
  | Store URL | Your storefront URL, e.g. `https://yourstore.mybigcommerce.com/` |
  | Store Login URL | `https://yourstore.mybigcommerce.com/login/token/` — the customer-login endpoint the connector redirects to |
  | Access Token, Client ID, Client Secret | From the API account you just created. Copy them at creation time; BigCommerce shows the secret once. |
  | Scopes | Optional. Leave blank unless your tenant requires an explicit list. |
  | Data Mapping | Maps LoginRadius profile fields onto BigCommerce customer fields. `email` → `Email[0].Value`, `first_name` → `First Name`, `last_name` → `Last Name` covers the default Cornerstone customer record. |

  These credentials authorise a third party to read and modify your customer
  records. Rotate them if they're ever exposed — including in a screenshot.
- Add every origin you will load the storefront from to the allowed/whitelisted
  domains. That includes your production domain **and** whatever you develop
  against — `http://localhost:3000` for `stencil start`, or your tunnel host if
  you serve over HTTPS. LoginRadius rejects requests from origins that aren't
  listed, and the widget simply fails to appear.
- Enable **Bot Protection (Captcha)** under Security → Attack Protection. This is
  what lets you leave `LR_SOTT` empty (see [SOTT](#sott)).

### 8. Run it — in the theme

```bash
cd ../cornerstone     # the plugin scripts run in this repo; stencil runs in the theme
stencil start         # local preview on http://localhost:3000
stencil push          # deploy to the store (needs a publish-theme token)
```

`stencil start` warns about missing translations in Cornerstone's non-English
`lang/*.json` files. That is a pre-existing Cornerstone issue, unrelated to this
plugin, and safe to ignore.

### 9. Changing the LoginRadius Login Widget to Fit Theme

- Look within the auth_studio_config folder on this repository.
- Inside this folder contains the html, css, and javascript files necessary to configure a custom login design fit for the BigCommerce theme in LoginRadius' auth studio in the admin console.
- Simple paste the code from their respective files into the code files within auth studio.

### 10. Check it worked

- Open `http://localhost:3000/login.php`. You should see the LoginRadius auth
  widget, not Cornerstone's login form.
- Add `?action=register` and `?action=forgotpassword` to that URL and confirm each
  screen opens.
- Check the browser console for `LoginRadius: interface/SDK failed to load`. If
  it's there, `LRreferences` isn't resolving or `config.js` never made it into the
  theme.
- Sign in with a LoginRadius account and confirm you land back on the storefront
  signed in to BigCommerce, then sign out and confirm you stay signed out.

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
and redirects there. Nothing in the theme calls the BigCommerce API directly —
the store-side credential lives on LoginRadius's end of that bridge, which is why
a public static theme asset is safe to ship.

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
node scripts/generate-config.js                        # in this repo
node scripts/install-into-theme.js ../cornerstone      # in this repo
cd ../cornerstone && stencil start                     # in the theme
```

If you prefer to keep a theme checkout in the repo root, ignore those files
through `.git/info/exclude` rather than `.gitignore`, so the shared ignore list
stays limited to real plugin artifacts (`.env`, the generated `config.js`, and
Stencil CLI state).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `[generate-config] missing required .env values` | Fill in `LR_STORE_NAME`, `LR_API_KEY`, `LR_TENANT_NAME`. |
| `[install-into-theme] does not look like a Stencil theme` | You pointed the script at something that isn't a theme checkout. Complete step 3. |
| `Cannot find module 'webpack'` from `stencil start` | You're running it in this repo instead of the theme. `cd` to the theme. Delete any stray `stencil.conf.cjs`, `config.stencil.json` or `secrets.stencil.json` from this repo's root. |
| Theme files like `templates/` or `node_modules/` are missing | They come from cloning Cornerstone and running `npm install`, not from installing Stencil CLI. See step 3. |
| `stencil start` can't authenticate | The token comes from a Stencil-CLI API account and is stored by `stencil init` in the theme, not in `.env`. See step 4. |
| Sign-in works but no BigCommerce customer is ever created | Check the Access Token, Client ID and Client Secret in the Admin Console's BigCommerce SSO form, and that the API account behind them has Customers: modify and Customers login: login. See step 7. |
| `LoginRadius: interface/SDK failed to load` in the console | `LRreferences` is missing from the layout, or `config.js` was never generated. |
| Auth widget never appears | Confirm `assets/loginradius/assets/js/config.js` exists in the theme, that `LR_API_KEY` is set, and that the origin you're loading (including `http://localhost:3000`) is whitelisted in the Admin Console. |
| Theme still shows the old config after editing `.env` | Re-run `generate-config.js` **and** `install-into-theme.js`; the theme holds its own copy of `config.js`. |
| LoginRadius sign-in succeeds but the shopper is never logged into BigCommerce | `LR_STORE_NAME` must be the store hash (`3mhucbxfyj`), not the subdomain. The SSO bridge returns no `loginUrl` for an unknown store. |
| Registration fails with a SOTT error | Enable Bot Protection (Captcha) in the Admin Console, or set a valid `LR_SOTT`. |
| Shoppers can still register or reset passwords through BigCommerce | `create-account.html`, `forgot-password.html` or `new-password.html` still has its native form. See step 6. |
| Sign-out bounces straight back in | `LRsso` must be in the layout. It ends the LoginRadius session before BigCommerce logout. |
| Social login doesn't return to checkout | `callbackUrl` must keep the query string so `return_url` survives. Don't strip it in `config.template.js`. |

## License

Copyright © 2026 LoginRadius Global Inc.
