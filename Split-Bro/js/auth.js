// Split Bro - Real Backend Authentication Controller (Lectures 37-40)
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
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    userId: userIdInput || undefined,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Registration failed");
            }

            if (data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("currentUser", JSON.stringify(data.user));
                localStorage.setItem("smartSettleCurrentUser", JSON.stringify(data.user));
            }

            if (signupMessage) {
                signupMessage.textContent = "Account created successfully! Redirecting...";
                signupMessage.className = "auth-message success";
            }

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 800);
        } catch (err) {
            if (signupMessage) {
                signupMessage.textContent = err.message;
                signupMessage.className = "auth-message error";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Sign Up <i class="fa-solid fa-arrow-right"></i>';
            }
        }
    });
}

// LOGIN HANDLER
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        let loginId = document.getElementById("loginId").value.trim();
        let password = document.getElementById("loginPassword").value;
        let loginMessage = document.getElementById("loginMessage");

        if (loginMessage) {
            loginMessage.textContent = "";
            loginMessage.className = "auth-message";
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        }

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: loginId,
                    password: password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Invalid credentials");
            }

            if (data.token) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("currentUser", JSON.stringify(data.user));
                localStorage.setItem("smartSettleCurrentUser", JSON.stringify(data.user));
            }

            if (loginMessage) {
                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.className = "auth-message success";
            }

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 800);
        } catch (err) {
            if (loginMessage) {
                loginMessage.textContent = err.message;
                loginMessage.className = "auth-message error";
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Login <i class="fa-solid fa-arrow-right"></i>';
            }
        }
    });
}

// QUICK DEMO LOGIN (Mayur Mittal)
if (btnQuickDemoLogin) {
    btnQuickDemoLogin.addEventListener("click", async () => {
        const loginIdInput = document.getElementById("loginId");
        const loginPasswordInput = document.getElementById("loginPassword");
        if (loginIdInput) loginIdInput.value = "mayur@example.com";
        if (loginPasswordInput) loginPasswordInput.value = "Password@123";

        const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
        if (submitBtn) submitBtn.click();
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
    localStorage.removeItem("token");
    if (typeof removeCurrentUser === "function") {
        removeCurrentUser();
    } else {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("smartSettleCurrentUser");
    }
    window.location.href = "login.html";
};
