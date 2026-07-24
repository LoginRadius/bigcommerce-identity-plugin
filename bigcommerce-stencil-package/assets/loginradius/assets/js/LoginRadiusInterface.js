
var LoginRadius_Bigcommerce = {};
var $LRBC = LoginRadius_Bigcommerce;
LoginRadius_Bigcommerce.util = {};

/* ------------------------------------------------------------------ *
 * BigCommerce SSO bridge (SDK-agnostic).
 * These helpers exchange a LoginRadius access token for a BigCommerce
 * session via the LoginRadius-hosted endpoint. They do not depend on
 * the LoginRadius SDK version.
 * ------------------------------------------------------------------ */
(function (util) {
	function isLocalStorageNameSupported(lsname) {
		if (!window["ignoreSessionStorage"]) {
			if (window[lsname]) {
				var testKey = 'test', storage = window[lsname];
				try {
					storage.setItem(testKey, '1');
					storage.removeItem(testKey);
					return true;
				} catch (error) {
					return false;
				}
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

	util.jsonpCall = function (path, handle) {
		var func = 'Loginradius' + Date.now() + Math.floor(Math.random() * 1e9);
		window[func] = function (data) {
			handle(data);
			try {
				delete window[func];
			} catch (e) {
				window[func] = undefined;
			}
			document.body.removeChild(js);
		};
		var js = document.createElement('script');
		js.src = path + "&callback=" + func;
		js.type = "text/javascript";
		document.body.appendChild(js);
	};

	util.sendusertosite = function (url) {
		setTimeout(function () { window.location = url; }, 2000);
	};

	util.getBrowserStorage = function (key) {
		if (isLocalStorageNameSupported('localStorage')) {
			return localStorage.getItem(key);
		}
		if (isLocalStorageNameSupported('sessionStorage')) {
			return sessionStorage.getItem(key);
		}
		return null;
	};

	util.getParameterByName = function (name, url) {
		if (!url) {
			url = window.location.href;
		}
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	};

	// Broadcast a successful login to the LoginRadius Web SSO hub so other
	// properties sharing this tenant can detect the session (fire-and-forget).
	util.setSsoToken = function (access_token, apikey) {
		if (typeof ssoTenantName === 'undefined' || !ssoTenantName) {
			return;
		}
		var url = "https://" + ssoTenantName + ".hub.loginradius.com/ssologin/setToken?token=" +
			encodeURIComponent(access_token) + "&apikey=" + encodeURIComponent(apikey);
		try {
			fetch(url, { credentials: "include" }).catch(function () { });
		} catch (e) { /* fetch unavailable / blocked: non-fatal */ }
	};

	util.getURL = function (access_token, apikey, password, store) {
		var base = "https://cloud-api.loginradius.com/sso/bigcommerce/api/token?access_token=" +
			access_token + "&apikey=" + apikey + "&store=" + store + "&password=" + password;
		if (util.getParameterByName("return_url")) {
			return base + "&redirectto=" + util.getParameterByName("return_url");
		}
		if (typeof islrCheckout !== 'undefined' && islrCheckout && typeof checkoutURL !== 'undefined' && checkoutURL != null) {
			return base + "&redirectto=" + checkoutURL;
		}
		return base;
	};
})(LoginRadius_Bigcommerce.util);

/* ------------------------------------------------------------------ *
 * UI layer (LoginRadius V3 JS SDK / LoginRadiusSDK).
 * ------------------------------------------------------------------ */
LoginRadiusBCUX = (function (doc) {
	var LRBCUX = {};
	LRBCUX.interface = {};

	LRBCUX.interface.showMessage = function (msg, timeout) {
		var el = document.getElementById("lr-message-container");
		if (!el) return;
		el.style.display = 'block';
		el.innerHTML = msg;
		setTimeout(function () { el.style.display = 'none'; }, timeout);
	};

	// Shared success handler: turn a LoginRadius access token into a
	// BigCommerce session. Used by both login and social login (all of
	// which arrive through the unified `auth` component in V3).
	LRBCUX.interface.completeBigCommerceLogin = function (response) {
		if (!response || !response.access_token) {
			return false;
		}
		// Propagate the session to the SSO hub so other tenant properties see it.
		$LRBC.util.setSsoToken(response.access_token, option.apiKey);
		var url = $LRBC.util.getURL(response.access_token, option.apiKey, "", storeName);
		LRBCUX.interface.showMessage("Login Successful, you will be redirected momentarily", 5000);
		$LRBC.util.jsonpCall(url, function (tokendata) {
			if (tokendata && tokendata.loginUrl != null) {
				$LRBC.util.sendusertosite(tokendata.loginUrl);
			} else {
				LRBCUX.interface.showMessage("Something went wrong during login please try again", 5000);
			}
		});
		return true;
	};

	// Unified login + registration + social + forgot password.
	LRBCUX.interface.defineAuth = function () {
		LRObject.init("auth", {
			container: "lr-auth-container",
			onSuccess: function (response) {
				// Login / social login return an access token -> establish the
				// BigCommerce session. Registration success (no token) is handled
				// by the SDK's own messaging (verification email sent).
				LRBCUX.interface.completeBigCommerceLogin(response);
			},
			onError: function (errors) {
				// The V3 SDK surfaces field/flow errors inline; nothing extra needed.
			}
		});
	};

	// Email / token verification. V3's verifyToken auto-reads the token from
	// the URL, so only mount it when a verification link is being handled.
	LRBCUX.interface.defineVerify = function () {
		var hasToken = $LRBC.util.getParameterByName("vtype") ||
			$LRBC.util.getParameterByName("verification_token") ||
			$LRBC.util.getParameterByName("vtoken");
		if (!hasToken) {
			return;
		}
		LRObject.init("verifyToken", {
			container: "lr-verify-container",
			onSuccess: function (response) {
				LRBCUX.interface.showMessage("Your request has been verified successfully.", 5000);
			},
			onError: function (errors) { }
		});
	};

	LRBCUX.interface.DisplayAuth = function () {
		var wrapper = document.getElementById("authcontainer");
		if (wrapper) {
			wrapper.style.display = 'block';
		}
		LRBCUX.interface.defineAuth();
		LRBCUX.interface.defineVerify();
	};

	/* --- Account management components (used by the standalone panels; not
	 * wired into the default login flow). BigCommerce profile re-sync after an
	 * update is deferred to step 4 pending the V3 token-retrieval approach. --- */
	LRBCUX.interface.defineProfileEditor = function () {
		LRObject.init("profileEditor", {
			container: "profileeditor-container",
			onSuccess: function (response) {
				LRBCUX.interface.showMessage("Profile has been successfully updated", 5000);
			},
			onError: function (errors) { }
		});
	};

	LRBCUX.interface.defineChangePassword = function () {
		LRObject.init("changePassword", {
			container: "changepassword-container",
			onSuccess: function (response) {
				LRBCUX.interface.showMessage("Password has been successfully updated", 5000);
			},
			onError: function (errors) { }
		});
	};

	LRBCUX.interface.defineAddEmail = function () {
		LRObject.init("addEmail", {
			container: "addemail-container",
			onSuccess: function (response) {
				LRBCUX.interface.showMessage("Email has been successfully updated", 5000);
			},
			onError: function (errors) { }
		});
	};

	return LRBCUX;
})(document);
