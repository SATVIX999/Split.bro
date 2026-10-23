// Split Bro - Universal Authentication Controller
function getApiUrl(endpoint) {
    if (window.location && window.location.port === "3000") {
        return endpoint;
    }
    return "http://localhost:3000" + endpoint;
}

let signupForm = document.getElementById("signupForm");
let loginForm = document.getElementById("loginForm");
let btnQuickDemoLogin = document.getElementById("btnQuickDemoLogin");

let generateUserId = (name) => {
    let cleanName = name.trim().replace(/\s+/g, "").toUpperCase();
    let base = cleanName.substring(0, 6);
    let users = typeof getUsers === "function" ? getUsers() : [];
    let userId = base + "01";
    let number = 1;

    while (users.some(user => user.userId === userId)) {
        number++;
        userId = base + String(number).padStart(2, "0");
    }

    return userId;
};

// SIGNUP HANDLER
if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        let name = document.getElementById("signupName").value.trim();
        let email = document.getElementById("signupEmail").value.trim().toLowerCase();
        let userIdInput = document.getElementById("signupUserId") ? document.getElementById("signupUserId").value.trim().toUpperCase() : "";
        let password = document.getElementById("signupPassword").value;

        let nameError = document.getElementById("nameError");
        let emailError = document.getElementById("emailError");
        let userIdError = document.getElementById("userIdError");
        let passwordError = document.getElementById("passwordError");
        let signupMessage = document.getElementById("signupMessage");

        if (nameError) nameError.textContent = "";
        if (emailError) emailError.textContent = "";
        if (userIdError) userIdError.textContent = "";
        if (passwordError) passwordError.textContent = "";
        if (signupMessage) {
            signupMessage.textContent = "";
            signupMessage.className = "auth-message";
        }

        let valid = true;
        if (name.length < 2) {
            if (nameError) nameError.textContent = "Enter a valid name (at least 2 characters).";
            valid = false;
        }
        if (!email.includes("@") || !email.includes(".")) {
            if (emailError) emailError.textContent = "Enter a valid email address.";
            valid = false;
        }
        if (password.length < 6) {
            if (passwordError) passwordError.textContent = "Password must be at least 6 characters.";
            valid = false;
        }
        if (!valid) return;

        const submitBtn = signupForm.querySelector(".auth-submit");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
        }

        try {
            const res = await fetch(getApiUrl("/api/auth/register"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    userId: userIdInput || undefined,
                    password
                })
            });

            const text = await res.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch (e) {}

            if (res.ok && data && data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("currentUser", JSON.stringify(data.user));
                localStorage.setItem("smartSettleCurrentUser", JSON.stringify(data.user));

                if (signupMessage) {
                    signupMessage.textContent = "Account created successfully! Redirecting...";
                    signupMessage.className = "auth-message success";
                }

                let redirectTarget = "dashboard.html";
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    redirectTarget = sessionStorage.getItem("redirectAfterLogin") || urlParams.get("redirect") || "dashboard.html";
                    sessionStorage.removeItem("redirectAfterLogin");
                } catch (e) {}

                setTimeout(() => {
                    window.location.href = redirectTarget;
                }, 800);
            } else {
                const errorMsg = (data && data.message) ? data.message : "Registration failed. Please check your details.";
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.warn("Backend register error:", err.message);
            if (signupMessage) {
                signupMessage.textContent = err.message || "Registration failed. Please try again.";
                signupMessage.className = "auth-message error";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right"></i>';
            }
        }
    });
}

// HELPER: EXECUTE LOGIN
async function executeLogin(identifier, password, triggerBtn) {
    let loginMessage = document.getElementById("loginMessage");
    if (loginMessage) {
        loginMessage.textContent = "";
        loginMessage.className = "auth-message";
    }

    const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.disabled = true;
    if (btnQuickDemoLogin) btnQuickDemoLogin.disabled = true;

    if (triggerBtn) {
        triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
    }

    try {
        const res = await fetch(getApiUrl("/api/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: identifier,
                password: password
            })
        });

        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) {}

        if (res.ok && data && data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            localStorage.setItem("smartSettleCurrentUser", JSON.stringify(data.user));

            if (loginMessage) {
                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.className = "auth-message success";
            }

            let redirectTarget = "dashboard.html";
            try {
                const urlParams = new URLSearchParams(window.location.search);
                redirectTarget = sessionStorage.getItem("redirectAfterLogin") || urlParams.get("redirect") || "dashboard.html";
                sessionStorage.removeItem("redirectAfterLogin");
            } catch (e) {}

            setTimeout(() => {
                window.location.href = redirectTarget;
            }, 800);
        } else {
            const errorMsg = (data && data.message) ? data.message : "Incorrect email/User ID or password.";
            throw new Error(errorMsg);
        }
    } catch (err) {
        console.warn("Backend auth fetch issue:", err.message);
        if (loginMessage) {
            const isConnectionError = err.message && (err.message.includes("fetch") || err.message.includes("NetworkError") || err.message.includes("Failed to fetch"));
            loginMessage.textContent = isConnectionError
                ? "Cannot connect to server. Please ensure the backend is running with 'npm start'."
                : (err.message || "Invalid credentials. Please try again.");
            loginMessage.className = "auth-message error";
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Login <i class="fa-solid fa-arrow-right"></i>';
        }
        if (btnQuickDemoLogin) {
            btnQuickDemoLogin.disabled = false;
            btnQuickDemoLogin.innerHTML = '<i class="fa-solid fa-bolt"></i> Quick Demo Login (Mayur Mittal)';
        }
    }
}

// LOGIN HANDLER
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        let loginId = document.getElementById("loginId").value.trim();
        let password = document.getElementById("loginPassword").value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        await executeLogin(loginId, password, submitBtn);
    });
}

// QUICK DEMO LOGIN (Mayur Mittal)
if (btnQuickDemoLogin) {
    btnQuickDemoLogin.addEventListener("click", async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const loginIdInput = document.getElementById("loginId");
        const loginPasswordInput = document.getElementById("loginPassword");
        if (loginIdInput) loginIdInput.value = "mayur@example.com";
        if (loginPasswordInput) loginPasswordInput.value = "Password@123";

        await executeLogin("mayur@example.com", "Password@123", btnQuickDemoLogin);
    });
}

let togglePassword = (inputId, button) => {
    let input = document.getElementById(inputId);
    let icon = button.querySelector("i");

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
};

let logoutUser = () => {
    if (typeof clearAuthState === "function") {
        clearAuthState();
    } else {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("smartSettleCurrentUser");
        localStorage.removeItem("selectedGroupId");
        try {
            sessionStorage.removeItem("smartSettleExpenseDraft");
            sessionStorage.removeItem("redirectAfterLogin");
        } catch (e) {}
    }
    window.location.href = "login.html";
};

// Handle contextual login messages (e.g., session expired, required login for groups)
document.addEventListener("DOMContentLoaded", () => {
    const loginMessageEl = document.getElementById("loginMessage");
    if (loginMessageEl) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const msg = urlParams.get("message");
            const redirect = urlParams.get("redirect");
            if (msg === "session_expired") {
                loginMessageEl.textContent = "Please log in to continue.";
                loginMessageEl.className = "auth-message error";
            } else if (redirect === "groups.html" || redirect === "addExpense.html" || redirect === "settlement.html") {
                loginMessageEl.textContent = "Please log in to access this feature.";
                loginMessageEl.className = "auth-message error";
            }
        } catch (e) {}
    }
});
