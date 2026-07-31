
var LoginRadius_Bigcommerce = {};
var $LRBC = LoginRadius_Bigcommerce;
LoginRadius_Bigcommerce.util = {};


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

	util.setBrowserStorage = function (key, value) {
		try {
			if (isLocalStorageNameSupported('localStorage')) {
				localStorage.setItem(key, value);
				return;
			}
			if (isLocalStorageNameSupported('sessionStorage')) {
				sessionStorage.setItem(key, value);
			}
		} catch (e) { /* storage unavailable / quota exceeded: non-fatal */ }
	};

	util.removeBrowserStorage = function (key) {
		try { localStorage.removeItem(key); } catch (e) { }
		try { sessionStorage.removeItem(key); } catch (e) { }
	};


	var SIGNOUT_MARKER = "LRBCSignOutPending";

	util.setSignOutPending = function () {
		try { sessionStorage.setItem(SIGNOUT_MARKER, "1"); } catch (e) { }
	};

	util.clearSignOutPending = function () {
		try { sessionStorage.removeItem(SIGNOUT_MARKER); } catch (e) { }
	};

	util.isSignOutInFlight = function () {
		var pending = false;
		try { pending = sessionStorage.getItem(SIGNOUT_MARKER) === "1"; } catch (e) { }
		return pending || util.getParameterByName("action") === "logout";
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


LoginRadiusBCUX = (function (doc) {
	var LRBCUX = {};
	LRBCUX.interface = {};

	// A hub round trip must never be able to strand a shopper mid sign-out.
	var HUB_TIMEOUT_MS = 2500;
	var SIGN_OUT_MAX_WAIT_MS = 3000;

	function settledWithin(promise, ms) {
		return new Promise(function (resolve) {
			var settled = false;
			function done() {
				if (settled) return;
				settled = true;
				resolve();
			}
			setTimeout(done, ms);
			try {
				Promise.resolve(promise).then(done, done);
			} catch (e) {
				done();
			}
		});
	}

	function hasSDK() {
		return typeof LRObject !== 'undefined' && LRObject;
	}

	LRBCUX.interface.showMessage = function (msg, timeout) {
		var el = document.getElementById("lr-message-container");
		if (!el) return;
		el.style.display = 'block';
		el.innerHTML = msg;
		setTimeout(function () { el.style.display = 'none'; }, timeout);
	};


	LRBCUX.interface.endLoginRadiusSession = function () {

		var settled = hasSDK() && typeof LRObject.ensureSession === 'function'
			? settledWithin(LRObject.ensureSession(), HUB_TIMEOUT_MS)
			: Promise.resolve();

		return settled.then(function () {
			if (hasSDK() && typeof LRObject.logout === 'function') {
				return settledWithin(LRObject.logout(), HUB_TIMEOUT_MS);
			}
		}).then(function () {

			$LRBC.util.removeBrowserStorage("LRTokenKey");
		});
	};

	// Sign out of LoginRadius first, then hand off to BigCommerce's own sign-out.
	LRBCUX.interface.signOut = function (bigCommerceLogoutUrl) {
		$LRBC.util.setSignOutPending();

		var navigated = false;
		function proceed() {
			if (navigated) return;
			navigated = true;
			window.location = bigCommerceLogoutUrl;
		}

		LRBCUX.interface.endLoginRadiusSession().then(proceed, proceed);

		setTimeout(proceed, SIGN_OUT_MAX_WAIT_MS);
	};

	LRBCUX.interface.completeBigCommerceLogin = function (response) {
		if (!response || !response.access_token) {
			return false;
		}

		if (LRBCUX.interface.signOutInProgress) {
			return false;
		}

		$LRBC.util.setSsoToken(response.access_token, option.apiKey);
		$LRBC.util.setBrowserStorage("LRTokenKey", response.access_token);
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
				LRBCUX.interface.completeBigCommerceLogin(response);
			},
			onError: function (errors) {
			}
		});
	};


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

		LRBCUX.interface.sessionReady.then(function () {
			LRBCUX.interface.defineAuth();
			LRBCUX.interface.defineVerify();
		});
	};


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


	LRBCUX.interface.signOutInProgress = $LRBC.util.isSignOutInFlight();

	LRBCUX.interface.sessionReady = (function () {
		if (!LRBCUX.interface.signOutInProgress) {
			return Promise.resolve(false);
		}
		function finish() {
			$LRBC.util.clearSignOutPending();
			LRBCUX.interface.signOutInProgress = false;
			return true;
		}
		return LRBCUX.interface.endLoginRadiusSession().then(finish, finish);
	})();

	return LRBCUX;
})(document);
