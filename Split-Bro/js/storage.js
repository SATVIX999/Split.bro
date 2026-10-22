let getUsers = () => {
    return JSON.parse(localStorage.getItem("smartSettleUsers")) || [];
};

let saveUsers = (users) => {
    localStorage.setItem("smartSettleUsers", JSON.stringify(users));
};

let getCurrentUser = () => {
    return JSON.parse(localStorage.getItem("smartSettleCurrentUser"));
};

let saveCurrentUser = (user) => {
    localStorage.setItem("smartSettleCurrentUser", JSON.stringify(user));
};

let removeCurrentUser = () => {
    localStorage.removeItem("smartSettleCurrentUser");
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