# LoginRadius for BigCommerce (Stencil)

Adds LoginRadius login, SSO and single logout to a BigCommerce **Stencil** theme (Cornerstone or Cornerstone-based), using OIDC Authorization Code + PKCE through LoginRadius Auth Studio.

**Documentation**

- LoginRadius and BigCommerce setup: [LoginRadius BigCommerce Stencil plugin](https://www.loginradius.com/docs/sdk/turnkey-plugins/bigcommerce-stencil-plugin?stencil-setup=loginradius-configuration)
- OIDC app configuration: [LoginRadius OIDC PKCE flow](https://www.loginradius.com/docs/single-sign-on/federated-sso/openid-connect/pkce-flow/)

## How it works

1. The shopper clicks **Sign in** on the store login page and is sent to LoginRadius Auth Studio.
2. After login, LoginRadius redirects back to the store, and the theme exchanges the authorization code for tokens using PKCE (no client secret in the theme).
3. The theme sends the access token to the LoginRadius BigCommerce connector, which finds or creates the customer and returns a BigCommerce Customer Login JWT.
4. The theme redirects to `/login/token/<jwt>` and the shopper is logged in to BigCommerce.

**Features**

- **Login** with any method enabled in Auth Studio (password, social, passwordless, MFA)
- **Auto SSO**: shoppers who already have a LoginRadius session are signed in silently
- **Single logout**: store logout also ends the LoginRadius session
- **Return to page**: shoppers go back to the page they started from after login

## Login modes

The plugin has two modes, switched with `enabled` in `assets/loginradius/assets/js/oidc-config.js`:

```js
enabled: true,   // OIDC flow (recommended)
enabled: false,  // legacy LoginRadius JS widget flow
```

`components/loginradius/head` reads this switch on every page and loads only the scripts for the active mode.

### OIDC flow (`enabled: true`)

**To enable:** set up an OIDC app with **Enforce PKCE** turned on (see [LoginRadius OIDC PKCE flow](https://www.loginradius.com/docs/single-sign-on/federated-sso/openid-connect/pkce-flow/)), set `enabled: true`, fill in the OIDC values in `oidc-config.js` (see [Configuration](#configuration)), then rebuild and upload the theme.

**How the flow starts:**

| Trigger | What happens |
|---|---|
| **Sign in button** on the login page (`/login.php`) | Calls `LoginRadiusOIDC.login()`, which redirects the shopper to LoginRadius Auth Studio |
| **Page load** (auto SSO, if `autoSso: true`) | Once per browser tab, a guest is checked silently (`prompt=none`). If they already have a LoginRadius session, they are logged in to the store without seeing a login page. Skipped on the paths in `autoSsoExcludePaths` (checkout, login page) |
| **Logout link** (if `singleLogout: true`) | Any `/login.php?action=logout` link ends the LoginRadius session first, then the BigCommerce session |
| **Custom button** (optional) | Any element on your theme can start login with `window.LoginRadiusOIDC.login()` |

When LoginRadius redirects back to the store, `head` picks up the `?code&state` response, completes the login and returns the shopper to the page they started from. Errors are shown on the login page as `?lr_error=<code>`.

### Legacy flow (`enabled: false`)

**To enable:** set `enabled: false` in `oidc-config.js`, fill in `assets/loginradius/assets/js/config.js` (`storeName`, `option.apiKey`, `option.appName`, `option.sott`), then rebuild and upload the theme.

**What changes:**

- `head` loads the LoginRadius JS SDK, `config.js` and `LoginRadiusInterface.js` instead of the OIDC script.
- The login page shows the embedded LoginRadius widget (login, registration, social login, forgot password) instead of the **Sign in** button.
- SSO and logout are handled by `components/loginradius/LRsso` using the LoginRadius JS SDK.
- `oidc-config.js` settings other than `enabled` are ignored.

**How the legacy flow works:**

1. `head` loads the LoginRadius JS SDK (`LoginRadiusV2.js`), `config.js` (creates the `LRObject` SDK instance with your API key, app name and SOTT) and `LoginRadiusInterface.js`.
2. On the login page, `components/loginradius/auth` renders the widget forms (login, registration, social login, forgot password) directly on the store page. The forms talk to LoginRadius APIs from the browser.
3. When the shopper logs in (traditional or social), the SDK returns a LoginRadius access token.
4. The theme sends the access token to the LoginRadius BigCommerce connector (JSONP), which finds or creates the customer and returns a BigCommerce login URL.
5. The theme redirects to that URL and the shopper is logged in to BigCommerce.
6. On every page, `components/loginradius/LRsso` runs the SSO check (if `enableSSO = true` in `config.js`):
   - **Guest with a LoginRadius session:** logged in to the store automatically (steps 4–5).
   - **Store customer without a LoginRadius session:** logged out of the store.
7. Email verification and password reset links come back to the store with `?vtype=emailverification` or `?vtype=reset`, and the widget handles them. Optional account partials (`profileeditor`, `changepassword`, `emailmanage`, `accountdetails`) can be added to account pages.

> Legacy mode is kept for existing installations only. Its traditional login sends the shopper's password to the connector in the URL, so use the OIDC flow for new stores.

## Package layout

```
assets/loginradius/assets/js/oidc-config.js   ← your settings
assets/loginradius/                           scripts, styles, images
components/loginradius/                       theme partials
```

## Installation

1. Copy the folders into your theme:

   | From | To |
   |---|---|
   | `assets/loginradius/` | `assets/loginradius/` |
   | `components/loginradius/` | `templates/components/loginradius/` |

2. In `templates/layout/base.html`, add as the first line inside `<head>`:
   ```handlebars
   {{> components/loginradius/head}}
   ```
   and just before `{{{footer.scripts}}}`:
   ```handlebars
   {{> components/loginradius/LRsso}}
   ```

3. In `templates/pages/auth/login.html`, replace the native login form partial with:
   ```handlebars
   {{> components/loginradius/login-form}}
   ```

## Configuration

Edit `assets/loginradius/assets/js/oidc-config.js`:

| Option | Description |
|---|---|
| `enabled` | `true` = OIDC flow, `false` = legacy flow (see [Login modes](#login-modes)) |
| `siteUrl` | LoginRadius domain, e.g. `https://<tenant>.hub.loginradius.com` (no trailing slash) |
| `appName` | OIDC app name |
| `clientId` | OIDC app client ID |
| `redirectUri` | Store URL whitelisted on the OIDC app, e.g. `https://your-store.mybigcommerce.com/` |
| `apiKey` | LoginRadius API key |
| `storeHash` | BigCommerce store hash |
| `autoSso` | Silently sign in shoppers who already have a LoginRadius session |
| `singleLogout` | Store logout also ends the LoginRadius session |
| `buttonText` | Login button text |
| `debug` | Keep `false` in production |
| `requireEmailClaim` | Keep `true` in production |

> This file is public. Never put a client secret, API secret or BigCommerce access token in it or anywhere else in the theme.

## Build and deploy

From your theme's root folder:

```bash
npm ci
stencil bundle
```

Upload the generated zip in **Storefront → Themes → Upload Theme**, preview it, then **Apply**.
