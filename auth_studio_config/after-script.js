/* ============================================================================
 * Hosted Auth page — After Script
 * ========================================================================== */

(function () {
    var authContainer = document.getElementById("auth-container");
    if (!authContainer) return;
  
    var LABELS = {
      "email": "Email Address:",
      "password": "Password:",
      "login": "Sign in",
      "forgot password?": "Forgot your password?"
    };
  
    function text(el) {
      return (el.textContent || "").trim().toLowerCase();
    }
  
    function findByText(root, selector, match) {
      var nodes = root.querySelectorAll(selector);
      for (var i = 0; i < nodes.length; i++) {
        if (match(text(nodes[i]))) return nodes[i];
      }
      return null;
    }
  
    function relabel(el) {
      if (!el) return;
      var next = LABELS[text(el)];
      if (next && el.textContent.trim() !== next) el.textContent = next;
    }
  
    /* 1. Wording ---------------------------------------------------------------- */
    function applyLabels() {
      var labels = authContainer.querySelectorAll(".loginradius-input-label");
      for (var i = 0; i < labels.length; i++) {
        // Skip the checkbox label; it gets removed below, not relabelled.
        if (text(labels[i]).indexOf("remember") === -1) relabel(labels[i]);
      }
    }
  
    /* 2. Sign-in row ------------------------------------------------------------- */
    function buildSignInRow() {
      var buttons = authContainer.querySelector(".loginradius-button-container");
      var primary = authContainer.querySelector(".loginradius-primary-button");
      if (!buttons || !primary) return;
  
      var forgot = findByText(authContainer, ".loginradius-link-button, a", function (t) {
        return t.indexOf("forgot") === 0;
      });
  
      var row = buttons.querySelector(".lr-signin-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "lr-signin-row";
        buttons.insertBefore(row, buttons.firstChild);
      }
      if (primary.parentNode !== row) row.appendChild(primary);
      if (forgot && forgot.parentNode !== row) row.appendChild(forgot);
  
      relabel(primary);
      relabel(forgot);
    }
  
    /* 3. Remember Me -------------------------------------------------------------- */
    function hideRememberMe() {
      var boxes = authContainer.querySelectorAll('input[type="checkbox"]');
      for (var i = 0; i < boxes.length; i++) {
        var node = boxes[i];
        // Climb to the smallest wrapper that holds the checkbox and its label.
        while (node && node !== authContainer) {
          if (text(node).indexOf("remember") > -1) break;
          node = node.parentNode;
        }
        if (!node || node === authContainer) continue;
        // Never hide a wrapper that still carries a field, button or link.
        if (node.querySelector("input:not([type='checkbox']), .loginradius-button, .loginradius-link-button")) {
          continue;
        }
        node.style.display = "none";
      }
    }
  
    /* 4. Current view --------------------------------------------------------------- */
    function tagView() {
      var header = authContainer.querySelector('[class*="card-header"]');
      var title = header ? text(header) : "";
      var isLogin =
        title.indexOf("login") > -1 ||
        title.indexOf("sign in") > -1 ||
        (!title && !!authContainer.querySelector("#Password"));
  
      document.body.setAttribute("data-lr-view", isLogin ? "login" : "other");
    }
  
    /* 5. Create Account ---------------------------------------------------------------- */
    var createAccount = document.querySelector(".lr-create-account");
    if (createAccount) {
      createAccount.addEventListener("click", function () {
        var signUp = findByText(authContainer, ".loginradius-link-button, a, div", function (t) {
          return t === "sign up" || t === "create account" || t === "register";
        });
        if (signUp) {
          signUp.click();
          return;
        }
        var url = new URL(window.location.href);
        url.searchParams.set("action", "register");
        window.location.href = url.toString();
      });
    }
  
    /* Apply, then keep applying as the widget re-renders --------------------------- */
    var queued = false;
    function apply() {
      queued = false;
      observer.disconnect();
      try {
        applyLabels();
        buildSignInRow();
        hideRememberMe();
        tagView();
      } finally {
        observer.observe(authContainer, { childList: true, subtree: true });
      }
    }
  
    var observer = new MutationObserver(function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(apply);
    });
  
    apply();
    window.addEventListener("hashchange", apply);
  })();
  