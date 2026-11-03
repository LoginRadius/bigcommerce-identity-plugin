/*
 * LoginRadius OIDC (Authorization Code + PKCE, public client) -> BigCommerce login.
 *
 * No secrets live here: the OIDC app is a public client (code_verifier instead of client_secret),
 * and the BigCommerce Customer Login JWT is minted by the LoginRadius-hosted BigCommerce connector,
 * which holds the store credentials server-side.
 *
 * Config comes from window.LR_OIDC_CONFIG, defined in oidc-config.js.
 */
(function (window, document) {
    'use strict';

    var TXN_KEY = 'lr_oidc_txn';
    var SSO_CHECKED_KEY = 'lr_oidc_sso_checked'; // auto-SSO already attempted in this tab
    var RETURN_KEY = 'lr_oidc_return_to'; // page to go back to once BigCommerce has logged the customer in
    var TXN_TTL_MS = 10 * 60 * 1000;
    var HTTP_TIMEOUT_MS = 15000;
    // prompt=none errors meaning "no usable LoginRadius session" (OIDC Core 3.1.2.6) — not failures.
    var SILENT_AUTH_ERRORS = ['login_required', 'interaction_required', 'consent_required', 'account_selection_required'];
    var BOT_PATTERN = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|lighthouse|headless/i;

    function getConfig() {
        var cfg = window.LR_OIDC_CONFIG || {};
        var missing = ['siteUrl', 'appName', 'clientId', 'apiKey', 'storeHash', 'connectorUrl'].filter(function (k) {
            return !cfg[k] || /^<.*>$/.test(String(cfg[k])); // unset or still a <placeholder>
        });
        if (missing.length) {
            throw new Error('LoginRadius OIDC: set these in oidc-config.js: ' + missing.join(', '));
        }
        var siteUrl = cfg.siteUrl.replace(/\/$/, '');
        return {
            clientId: cfg.clientId,
            apiKey: cfg.apiKey,
            storeHash: cfg.storeHash,
            connectorUrl: cfg.connectorUrl,
            scopes: cfg.scopes || 'openid email profile',
            callbackPath: cfg.callbackPath || '/',
            // redirect_uri must exactly match the one registered on the OIDC app.
            redirectUri: cfg.redirectUri || window.location.origin + (cfg.callbackPath || '/'),
            issuer: siteUrl + '/service/oidc/' + cfg.appName,
            authorizeEndpoint: siteUrl + '/service/oidc/' + cfg.appName + '/authorize',
            tokenEndpoint: siteUrl + '/api/oidc/' + cfg.appName + '/token',
            defaultReturnTo: cfg.defaultReturnTo || '/account.php',
            debug: cfg.debug === true,
            // Default true: stop before the connector when the id_token has no valid email claim.
            requireEmailClaim: cfg.requireEmailClaim !== false,
            // Where a bare Customer Login JWT from the connector is sent. Default: this storefront.
            storeLoginUrl: cfg.storeLoginUrl || window.location.origin + '/login/token/',
            endSessionEndpoint: siteUrl + '/service/oidc/' + cfg.appName + '/logout',
            // BigCommerce's own logout. LoginRadius redirects here after ending its session, so it must be
            // whitelisted as a post-logout redirect URI on the OIDC app.
            postLogoutRedirectUri: cfg.postLogoutRedirectUri || window.location.origin + '/login.php?action=logout',
            // Default true: store logout also ends the LoginRadius session (RP-initiated logout).
            singleLogout: cfg.singleLogout !== false,
            autoSso: cfg.autoSso === true,
            autoSsoExcludePaths: cfg.autoSsoExcludePaths || ['/checkout', '/finishorder.php', '/login.php'],
        };
    }

    function isCustomerLoggedIn() {
        return window.LR_BC_CUSTOMER === true; // rendered by components/loginradius/head.html
    }

    function storageGet(key) {
        try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function storageSet(key, value) {
        try { sessionStorage.setItem(key, value); } catch (e) { /* private mode: degrade gracefully */ }
    }

    function storageRemove(key) {
        try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    function currentPath() {
        return window.location.pathname + window.location.search;
    }

    // ---- crypto helpers (Web Crypto API only; no custom crypto) ----

    function base64url(bytes) {
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function randomString(byteLength) {
        var bytes = new Uint8Array(byteLength);
        window.crypto.getRandomValues(bytes);
        return base64url(bytes);
    }

    function sha256Base64url(text) {
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (hash) {
            return base64url(new Uint8Array(hash));
        });
    }

    function decodeJwtPayload(jwt) {
        var part = String(jwt).split('.')[1];
        if (!part) throw new Error('Malformed id_token');
        var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        var bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(bytes));
    }

    // Only same-site relative paths are allowed as post-login destinations (prevents open redirects).
    function safeReturnTo(value, fallback) {
        if (typeof value !== 'string' || value.charAt(0) !== '/' || value.indexOf('//') === 0 || value.indexOf('\\') !== -1) {
            return fallback;
        }
        return value.slice(0, 512);
    }

    function fail(code, detail) {
        if (detail) console.error('LoginRadius OIDC:', detail);
        window.location.replace('/login.php?lr_error=' + encodeURIComponent(code));
    }

    // ---- step 1: start an authorization request ----
    // options.purpose: 'login' (button), 'sso' (silent auto-login check) or 'logout' (silent, to get an
    //                  id_token_hint for the end-session request; the token is never stored)
    // options.prompt:  'none' for the silent purposes — LoginRadius never shows its UI

    function login(returnTo, options) {
        var cfg = getConfig();
        var opts = options || {};
        var purpose = opts.purpose || 'login';
        var state = randomString(32);
        var nonce = randomString(32);
        var codeVerifier = randomString(48); // 64 chars, within the 43-128 range required by RFC 7636

        return sha256Base64url(codeVerifier).then(function (codeChallenge) {
            // sessionStorage: per-tab, same-origin, cleared when the tab closes. Holds only one-time values.
            storageSet(TXN_KEY, JSON.stringify({
                state: state,
                nonce: nonce,
                codeVerifier: codeVerifier,
                purpose: purpose,
                returnTo: safeReturnTo(returnTo, cfg.defaultReturnTo),
                createdAt: Date.now(),
            }));

            var params = new URLSearchParams({
                client_id: cfg.clientId,
                response_type: 'code',
                scope: cfg.scopes,
                redirect_uri: cfg.redirectUri,
                state: state,
                nonce: nonce,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
            });
            if (opts.prompt) params.set('prompt', opts.prompt);
            window.location.assign(cfg.authorizeEndpoint + '?' + params.toString());
        });
    }

    // ---- step 2: handle ?code&state on the redirect_uri ----

    function isCallback(cfg) {
        var params = new URLSearchParams(window.location.search);
        return window.location.pathname === cfg.callbackPath &&
            params.has('state') && (params.has('code') || params.has('error'));
    }

    function exchangeCode(cfg, code, codeVerifier) {
        var body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: cfg.clientId,
            code_verifier: codeVerifier,
            redirect_uri: cfg.redirectUri,
        });
        var controller = new AbortController();
        var timer = setTimeout(function () { controller.abort(); }, HTTP_TIMEOUT_MS);

        return fetch(cfg.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: body.toString(),
            credentials: 'omit',
            signal: controller.signal,
        }).then(function (res) {
            clearTimeout(timer);
            return res.json().catch(function () { return {}; }).then(function (json) {
                if (!res.ok || json.error) {
                    throw new Error('Token exchange failed (HTTP ' + res.status + '): ' + (json.error || '') + ' ' + (json.error_description || ''));
                }
                if (!json.access_token || !json.id_token) {
                    throw new Error('Token response is missing access_token or id_token');
                }
                return json;
            });
        });
    }

    // Claim checks on the ID token. The token was received directly from the token endpoint over TLS,
    // which OIDC Core 3.1.3.7 accepts in place of signature validation for the code flow.
    function validateIdToken(cfg, idToken, expectedNonce) {
        var claims = decodeJwtPayload(idToken);
        var now = Math.floor(Date.now() / 1000);
        var aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

        if (claims.iss !== cfg.issuer) throw new Error('id_token issuer mismatch: ' + claims.iss);
        if (aud.indexOf(cfg.clientId) === -1) throw new Error('id_token audience mismatch');
        if (typeof claims.exp !== 'number' || claims.exp + 60 < now) throw new Error('id_token expired');
        if (claims.nonce !== expectedNonce) throw new Error('id_token nonce mismatch (possible replay)');
        return claims;
    }

    // JSONP call to the LoginRadius BigCommerce connector, with error + timeout handling
    // (a non-2xx JSONP response never runs the callback, so onerror/timeout must catch it).
    function jsonp(url) {
        return new Promise(function (resolve, reject) {
            var name = 'lrOidcCb_' + randomString(12).replace(/[^A-Za-z0-9]/g, '');
            var script = document.createElement('script');
            var timer;

            function cleanup() {
                clearTimeout(timer);
                try { delete window[name]; } catch (e) { window[name] = undefined; }
                if (script.parentNode) script.parentNode.removeChild(script);
            }

            window[name] = function (data) { cleanup(); resolve(data); };
            script.onerror = function () { cleanup(); reject(new Error('Connector request failed (invalid API key, store or token?)')); };
            timer = setTimeout(function () { cleanup(); reject(new Error('Connector request timed out')); }, HTTP_TIMEOUT_MS);

            script.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + name;
            document.head.appendChild(script);
        });
    }

    function loginToBigCommerce(cfg, accessToken, returnTo) {
        var params = new URLSearchParams({
            access_token: accessToken,
            apikey: cfg.apiKey,
            store: cfg.storeHash,
            password: '', // never send a password from the OIDC flow
            redirectto: returnTo,
        });
        return jsonp(cfg.connectorUrl + '?' + params.toString()).then(function (data) {
            if (!data || !data.loginUrl) {
                throw new Error('Connector returned no loginUrl: ' + ((data && (data.Description || data.description || data.Message)) || 'unknown error'));
            }
            return resolveLoginUrl(cfg, String(data.loginUrl));
        });
    }

    // The connector returns either a full https://<store>/login/token/<jwt> URL or, when "Store Login URL"
    // is not configured in the LoginRadius console, just the bare JWT. Extract the JWT from either form and
    // always send it to storeLoginUrl (default: the storefront the shopper is on, so the session cookie lands
    // on that domain). The redirect target is never taken from the response, so it can't be an open redirect.
    var JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

    function resolveLoginUrl(cfg, loginUrl) {
        var jwt = loginUrl;
        if (!JWT_PATTERN.test(jwt)) {
            var marker = '/login/token/';
            var i = loginUrl.indexOf(marker);
            jwt = i === -1 ? '' : loginUrl.slice(i + marker.length).split(/[?#/]/)[0];
        }
        if (!JWT_PATTERN.test(jwt)) {
            throw new Error('Connector returned an unrecognised loginUrl (check "Store Login URL" in the LoginRadius BigCommerce integration)');
        }
        return cfg.storeLoginUrl.replace(/\/?$/, '/') + jwt;
    }

    function handleCallback() {
        var cfg;
        try {
            cfg = getConfig();
        } catch (e) {
            console.error(e.message);
            return false;
        }
        if (!isCallback(cfg)) return false;

        // Hide the page and strip code/state from the address bar and history straight away.
        document.documentElement.style.visibility = 'hidden';
        var params = new URLSearchParams(window.location.search);
        window.history.replaceState(null, '', cfg.callbackPath);

        var txn = null;
        try {
            txn = JSON.parse(storageGet(TXN_KEY) || 'null');
        } catch (e) {
            txn = null;
        }
        storageRemove(TXN_KEY); // one-time use
        var purpose = (txn && txn.purpose) || 'login';

        // Silent requests (auto-SSO / logout) must never show an error page to the shopper.
        var onError = function (code, detail) {
            if (purpose === 'sso') {
                if (detail && SILENT_AUTH_ERRORS.indexOf(code) === -1) console.warn('LoginRadius OIDC (auto SSO):', detail);
                window.location.replace((txn && txn.returnTo) || '/');
            } else if (purpose === 'logout') {
                // No LoginRadius session left to end (or it couldn't be read): just log out of BigCommerce.
                if (detail && SILENT_AUTH_ERRORS.indexOf(code) === -1) console.warn('LoginRadius OIDC (logout):', detail);
                window.location.replace(cfg.postLogoutRedirectUri);
            } else {
                fail(code, detail);
            }
        };

        if (params.get('error')) {
            onError(params.get('error'), 'IdP error: ' + params.get('error') + ' ' + (params.get('error_description') || ''));
            return true;
        }
        if (!txn || Date.now() - txn.createdAt > TXN_TTL_MS) {
            onError('session_expired', 'No/expired login transaction (was login started in another tab or domain?)');
            return true;
        }
        // CSRF protection: state must match what this tab sent to /authorize.
        if (params.get('state') !== txn.state) {
            onError('invalid_state', 'state mismatch');
            return true;
        }
        // RFC 9207 mix-up protection.
        if (params.has('iss') && params.get('iss') !== cfg.issuer) {
            onError('invalid_issuer', 'unexpected iss: ' + params.get('iss'));
            return true;
        }

        exchangeCode(cfg, params.get('code'), txn.codeVerifier)
            .then(function (tokens) {
                var claims = validateIdToken(cfg, tokens.id_token, txn.nonce);
                if (purpose === 'logout') {
                    // RP-initiated logout: LoginRadius requires id_token_hint to redirect back to the store.
                    // The fresh id_token is used once here and never stored.
                    var logoutParams = new URLSearchParams({
                        id_token_hint: tokens.id_token,
                        post_logout_redirect_uri: cfg.postLogoutRedirectUri,
                        client_id: cfg.clientId,
                        state: randomString(16),
                    });
                    return cfg.endSessionEndpoint + '?' + logoutParams.toString();
                }
                var emailOk = typeof claims.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email);
                if (cfg.debug) {
                    // Shape only — never log the email address or tokens (PII / credentials).
                    console.info('LoginRadius OIDC debug:', {
                        claimNames: Object.keys(claims),
                        emailPresent: typeof claims.email === 'string' && claims.email.length > 0,
                        emailWellFormed: emailOk,
                        emailVerified: claims.email_verified,
                        accessTokenIsJwt: String(tokens.access_token).split('.').length === 3,
                    });
                }
                // BigCommerce needs a valid email to find/create the customer; stop here with a clear error
                // instead of letting the connector fail with "The field 'email' is invalid".
                if (!emailOk && cfg.requireEmailClaim) {
                    var noEmail = new Error('id_token has no valid email claim (user has no email, or "email" scope not granted)');
                    noEmail.code = 'email_missing';
                    throw noEmail;
                }
                if (claims.email_verified === false) {
                    var err = new Error('email not verified');
                    err.code = 'email_not_verified';
                    throw err;
                }
                // The connector's Customer Login JWT carries no redirect_to, so remember where to go back to
                // and let resumeReturnTo() finish the trip after BigCommerce has logged the customer in.
                storageSet(RETURN_KEY, txn.returnTo);
                return loginToBigCommerce(cfg, tokens.access_token, txn.returnTo);
            })
            .then(function (nextUrl) {
                window.location.replace(nextUrl);
            })
            .catch(function (err) {
                onError(err.code || 'login_failed', err.message);
            });
        return true;
    }

    // ---- after BigCommerce login: return to the page the shopper started from ----

    function resumeReturnTo() {
        var returnTo = storageGet(RETURN_KEY);
        if (!returnTo) return false;
        storageRemove(RETURN_KEY); // one page load only, logged in or not
        returnTo = safeReturnTo(returnTo, null);
        if (!returnTo || !isCustomerLoggedIn() || returnTo === currentPath()) return false;
        document.documentElement.style.visibility = 'hidden';
        window.location.replace(returnTo);
        return true;
    }

    // ---- logout: end the LoginRadius session, then the BigCommerce session ----

    function logout() {
        // Don't let auto-SSO sign the shopper straight back in on the page they land on.
        storageSet(SSO_CHECKED_KEY, '1');
        storageRemove(RETURN_KEY);
        var cfg = getConfig();
        // Silent authorize gets a fresh id_token (required id_token_hint) without storing tokens anywhere.
        return login('/', { purpose: 'logout', prompt: 'none' }).catch(function (err) {
            console.warn('LoginRadius OIDC: logout could not reach LoginRadius, logging out of the store only', err);
            window.location.assign(cfg.postLogoutRedirectUri);
        });
    }

    function isLogoutLink(anchor) {
        if (!anchor || !anchor.href) return false;
        try {
            var url = new URL(anchor.href, window.location.href);
            return url.origin === window.location.origin && url.pathname === '/login.php' &&
                url.searchParams.get('action') === 'logout';
        } catch (e) {
            return false;
        }
    }

    // Catch every BigCommerce logout link (header, account menu, ...) without touching theme templates.
    function installLogoutInterceptor(cfg) {
        document.addEventListener('click', function (event) {
            if (!isCustomerLoggedIn() || event.defaultPrevented || event.button !== 0 ||
                event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
            if (!isLogoutLink(anchor)) return;
            if (!cfg.singleLogout) {
                // Store-only logout: let the link work normally, but the LoginRadius session is still
                // active, so stop auto SSO from signing the shopper straight back in from this tab.
                storageSet(SSO_CHECKED_KEY, '1');
                storageRemove(RETURN_KEY);
                return;
            }
            event.preventDefault();
            logout();
        }, true);
    }

    // ---- auto SSO: silently sign in guests who already have a LoginRadius session ----

    function autoSso(cfg) {
        if (!cfg.autoSso || isCustomerLoggedIn() || storageGet(SSO_CHECKED_KEY)) return false;
        if (window.top !== window.self) return false; // iframes, e.g. Page Builder preview
        if (BOT_PATTERN.test(window.navigator.userAgent || '')) return false; // keep crawlers on the page
        if (new URLSearchParams(window.location.search).has('lr_error')) return false;
        var path = window.location.pathname;
        for (var i = 0; i < cfg.autoSsoExcludePaths.length; i++) {
            if (path.indexOf(cfg.autoSsoExcludePaths[i]) === 0) return false;
        }
        // Once per tab session, whatever the outcome — a guest without a LoginRadius session is
        // redirected at most once.
        storageSet(SSO_CHECKED_KEY, '1');
        if (!storageGet(SSO_CHECKED_KEY)) return false; // storage unavailable: never risk a redirect loop
        document.documentElement.style.visibility = 'hidden';
        login(currentPath(), { purpose: 'sso', prompt: 'none' }).catch(function (err) {
            document.documentElement.style.visibility = '';
            console.warn('LoginRadius OIDC (auto SSO):', err);
        });
        return true;
    }

    // ---- entry point, called from components/loginradius/head.html on every page ----

    function init() {
        var cfg;
        try {
            cfg = getConfig();
        } catch (e) {
            console.error(e.message);
            return;
        }
        installLogoutInterceptor(cfg);
        if (handleCallback()) return;
        if (resumeReturnTo()) return;
        autoSso(cfg);
    }

    window.LoginRadiusOIDC = { init: init, login: login, logout: logout, handleCallback: handleCallback };
})(window, document);
