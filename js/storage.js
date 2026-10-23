let getUsers = () => {
    return JSON.parse(localStorage.getItem("smartSettleUsers")) || [];
};

let saveUsers = (users) => {
    localStorage.setItem("smartSettleUsers", JSON.stringify(users));
};

let getAuthToken = () => {
    try {
        const token = localStorage.getItem("token");
        if (!token || typeof token !== "string" || token.trim() === "" || token === "null" || token === "undefined") {
            return null;
        }
        return token.trim();
    } catch (e) {
        return null;
    }
};

let getCurrentUser = () => {
    const token = getAuthToken();
    if (!token) {
        return null;
    }
    try {
        const userStr = localStorage.getItem("currentUser") || localStorage.getItem("smartSettleCurrentUser");
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        if (!user || typeof user !== "object" || !user.userId) return null;
        return user;
    } catch (e) {
        return null;
    }
};

let isAuthenticated = () => {
    return Boolean(getAuthToken() && getCurrentUser());
};

let clearAuthState = () => {
    try {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("smartSettleCurrentUser");
        localStorage.removeItem("selectedGroupId");
        sessionStorage.removeItem("smartSettleExpenseDraft");
        sessionStorage.removeItem("redirectAfterLogin");
    } catch (e) {}
};

let removeCurrentUser = () => {
    clearAuthState();
};

let saveCurrentUser = (user) => {
    if (user && typeof user === "object") {
        localStorage.setItem("currentUser", JSON.stringify(user));
        localStorage.setItem("smartSettleCurrentUser", JSON.stringify(user));
    } else {
        clearAuthState();
    }
};

let saveExpenseDraft = (draft) => {
    sessionStorage.setItem("smartSettleExpenseDraft", JSON.stringify(draft));
};

let getExpenseDraft = () => {
    try {
        return JSON.parse(sessionStorage.getItem("smartSettleExpenseDraft")) || null;
    } catch (e) {
        return null;
    }
};

let clearExpenseDraft = () => {
    sessionStorage.removeItem("smartSettleExpenseDraft");
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        getUsers,
        saveUsers,
        getAuthToken,
        getCurrentUser,
        isAuthenticated,
        clearAuthState,
        removeCurrentUser,
        saveCurrentUser,
        saveExpenseDraft,
        getExpenseDraft,
        clearExpenseDraft
    };
}
