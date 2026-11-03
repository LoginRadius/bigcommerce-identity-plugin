// LoginRadius OIDC (Authorization Code + PKCE) configuration.
// Only PUBLIC values belong here — this file is served to every shopper.
// Never add a client secret: the OIDC app must be configured as a public client with "Enforce PKCE" on.
window.LR_OIDC_CONFIG = {
    // Login mode switch:
    //   true  = OIDC Authorization Code + PKCE via LoginRadius Auth Studio (settings below)
    //   false = legacy LoginRadius JS widget (settings in config.js)
    enabled: true,

    // LoginRadius domain: <TenantName>.hub.loginradius.com or your custom domain (https://, no trailing slash)
    siteUrl: 'https://<TENANT_NAME>.hub.loginradius.com',
    // OIDC app name from the LoginRadius dashboard
    appName: '<OIDC_APP_NAME>',
    // OIDC app client ID (public)
    clientId: '<OIDC_CLIENT_ID>',
    // Must exactly match a redirect URI whitelisted on the OIDC app. Leave empty to use <current origin> + callbackPath.
    redirectUri: 'https://<YOUR_STORE_DOMAIN>/',
    callbackPath: '/',
    scopes: 'openid email profile',

    // LoginRadius BigCommerce connector (holds the BigCommerce credentials server-side)
    apiKey: '<LOGINRADIUS_API_KEY>',
    storeHash: '<BIGCOMMERCE_STORE_HASH>',
    connectorUrl: 'https://cloud-api.loginradius.com/sso/bigcommerce/api/token',
    // Used when the connector returns a bare JWT. Empty = <current storefront>/login/token/
    // Production example: 'https://<YOUR_STORE_DOMAIN>/login/token/'
    storeLoginUrl: '',

    defaultReturnTo: '/account.php',

    // Auto SSO: once per browser tab, silently sign in guests who already have a LoginRadius session
    // (prompt=none; LoginRadius never shows its UI). Guests without a session see one brief redirect.
    autoSso: true,
    // Paths where the auto SSO check never runs.
    autoSsoExcludePaths: ['/checkout', '/finishorder.php', '/login.php'],

    // Logout switch:
    //   true  = store logout also ends the LoginRadius session (single logout)
    //   false = store logout only ends the BigCommerce session; the LoginRadius session stays active
    singleLogout: true,
    // Where LoginRadius sends the shopper after ending its session (single logout only).
    // Must be whitelisted on the OIDC app. Empty = <current storefront>/login.php?action=logout
    postLogoutRedirectUri: '',
    buttonText: 'Sign in with LoginRadius',

    // true = log claim *shape* (never values) to the console for troubleshooting. Keep false in production.
    debug: false,

    // true = stop before calling the connector if the id_token has no valid email claim.
    // false = always call the connector (it reads the profile via the access token). Testing only.
    requireEmailClaim: false
};
