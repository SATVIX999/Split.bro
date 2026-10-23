function getApiUrl(endpoint) {
    if (window.location && window.location.port === "3000") {
        return endpoint;
    }
    return "http://localhost:3000" + endpoint;
}
// Split Bro - Enhanced Dashboard Controller connected to Express & MongoDB Atlas
document.addEventListener("DOMContentLoaded", async function () {
    const token = typeof getAuthToken === "function" ? getAuthToken() : (localStorage.getItem("token") || "");
    const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;

    if (!token || !currentUser) {
        if (typeof clearAuthState === "function") clearAuthState();
        window.location.href = "login.html";
        return;
    }

    // Set Welcome Name
    const heroUserName = document.getElementById("heroUserName");
    if (heroUserName) heroUserName.textContent = currentUser.name || "User";

    let groups = [];
    let selectedGroup = null;
    let expenses = [];
    let settlements = [];

    // Elements
    const overviewTotal = document.getElementById("overviewTotal");
    const overviewPaid = document.getElementById("overviewPaid");
    const overviewBalance = document.getElementById("overviewBalance");
    const overviewBalanceText = document.getElementById("overviewBalanceText");

    const dashboardGroupName = document.getElementById("dashboardGroupName");
    const dashboardMembersText = document.getElementById("dashboardMembersText");
    const dashboardMemberCount = document.getElementById("dashboardMemberCount");
    const expenseCount = document.getElementById("expenseCount");
    const totalExpenses = document.getElementById("totalExpenses");

    const dashboardMembers = document.getElementById("dashboardMembers");
    const recentExpenses = document.getElementById("recentExpenses");

    // Modal Elements
    const receiptModal = document.getElementById("receiptModal");
    const receiptModalImg = document.getElementById("receiptModalImg");
    const receiptModalTitle = document.getElementById("receiptModalTitle");
    const receiptModalMeta = document.getElementById("receiptModalMeta");
    const receiptDownloadLink = document.getElementById("receiptDownloadLink");
    const closeReceiptModal = document.getElementById("closeReceiptModal");

    const diagnosticsModal = document.getElementById("diagnosticsModal");
    const closeDiagnosticsModal = document.getElementById("closeDiagnosticsModal");
    const btnExportCsvCard = document.getElementById("btnExportCsvCard");
    const btnSystemHealthCard = document.getElementById("btnSystemHealthCard");

    // Modal close listeners
    if (closeReceiptModal) {
        closeReceiptModal.addEventListener("click", () => receiptModal.style.display = "none");
    }
    if (closeDiagnosticsModal) {
        closeDiagnosticsModal.addEventListener("click", () => diagnosticsModal.style.display = "none");
    }
    window.addEventListener("click", (e) => {
        if (e.target === receiptModal) receiptModal.style.display = "none";
        if (e.target === diagnosticsModal) diagnosticsModal.style.display = "none";
    });

    // Global viewer function for inline buttons
    window.viewReceiptPhoto = function (url, title, originalName) {
        if (!url) return;
        const authUrl = token ? `${url}?token=${token}` : url;
        if (receiptModalImg) receiptModalImg.src = authUrl;
        if (receiptModalTitle) receiptModalTitle.innerHTML = `<i class="fa-solid fa-receipt"></i> ${title || 'Bill Photo'}`;
        if (receiptModalMeta) receiptModalMeta.textContent = originalName ? `File: ${originalName} (Multer Upload)` : 'Attached via Multer file upload';
        if (receiptDownloadLink) receiptDownloadLink.href = authUrl;
        if (receiptModal) receiptModal.style.display = "flex";
    };

    // 1. Fetch Groups
    try {
        if (token) {
            const res = await fetch(getApiUrl("/api/groups"), {
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) {
                groups = await res.json();
                localStorage.setItem("smartSettleGroups", JSON.stringify(groups));
            } else {
                throw new Error("HTTP " + res.status);
            }
        } else {
            throw new Error("No token");
        }
    } catch (e) {
        groups = JSON.parse(localStorage.getItem("smartSettleGroups") || "[]");
    }

    // Determine Active Group
    let selectedGroupId = localStorage.getItem("selectedGroupId");
    if (selectedGroupId) {
        selectedGroup = groups.find(g => String(g.groupId) === String(selectedGroupId));
    }
    if (!selectedGroup && groups.length > 0) {
        selectedGroup = groups[0];
        localStorage.setItem("selectedGroupId", selectedGroup.groupId);
    }

    // 2. Fetch Expenses for Active Group
    if (selectedGroup) {
        try {
            if (token) {
                const res = await fetch(getApiUrl(`/api/expenses?groupId=${selectedGroup.groupId}`), {
                    headers: { "Authorization": "Bearer " + token }
                });
                if (res.ok) {
                    const data = await res.json();
                    expenses = data.expenses || (Array.isArray(data) ? data : []);
                }
            }
        } catch (e) {
            console.warn("Could not fetch expenses from backend:", e.message);
        }

        // Fetch Settlements (Greedy Simplification Algorithm)
        try {
            if (token) {
                const res = await fetch(getApiUrl(`/api/settlements?groupId=${selectedGroup.groupId}`), {
                    headers: { "Authorization": "Bearer " + token }
                });
                if (res.ok) {
                    const data = await res.json();
                    settlements = data.transactions || (Array.isArray(data) ? data : []);
                }
            }
        } catch (e) {
            console.warn("Could not fetch settlements:", e.message);
        }
    }

    // Fallback expenses from localStorage if backend returned none
    if (expenses.length === 0 && selectedGroup) {
        const localExp = JSON.parse(localStorage.getItem("smartSettleExpenses") || "[]");
        expenses = localExp.filter(x => String(x.groupId) === String(selectedGroup.groupId));
    }

    // 3. Render Dashboard Data
    renderActiveGroupDetails();
    renderOverviewStats();
    renderGroupMembers();
    renderRecentExpenses();

    function renderActiveGroupDetails() {
        if (!selectedGroup) {
            if (dashboardGroupName) dashboardGroupName.textContent = "No Active Group";
            if (dashboardMembersText) dashboardMembersText.textContent = "Create or join a group to start tracking.";
            if (dashboardMemberCount) dashboardMemberCount.textContent = "0";
            if (expenseCount) expenseCount.textContent = "0";
            if (totalExpenses) totalExpenses.textContent = "₹0.00";
            return;
        }

        if (dashboardGroupName) dashboardGroupName.textContent = selectedGroup.groupName;
        const memberCount = selectedGroup.members ? selectedGroup.members.length : 0;
        if (dashboardMembersText) dashboardMembersText.textContent = `${memberCount} member${memberCount !== 1 ? 's' : ''} in this group`;
        if (dashboardMemberCount) dashboardMemberCount.textContent = memberCount;
        if (expenseCount) expenseCount.textContent = expenses.length;

        const totalSum = expenses.reduce((acc, x) => acc + (parseFloat(x.amount) || 0), 0);
        if (totalExpenses) totalExpenses.textContent = `₹${totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    function renderOverviewStats() {
        if (!selectedGroup) return;

        const totalSum = expenses.reduce((acc, x) => acc + (parseFloat(x.amount) || 0), 0);
        if (overviewTotal) overviewTotal.textContent = `₹${totalSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        // Amount paid by current user
        const currentUserId = String(currentUser.userId).toUpperCase();
        const paidByUser = expenses
            .filter(x => String(x.payerId).toUpperCase() === currentUserId)
            .reduce((acc, x) => acc + (parseFloat(x.amount) || 0), 0);

        if (overviewPaid) overviewPaid.textContent = `₹${paidByUser.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        // Calculate Balance from settlements
        let youOwe = 0;
        let youAreOwed = 0;
        settlements.forEach(s => {
            const fromId = String(s.from).toUpperCase();
            const toId = String(s.to).toUpperCase();
            if (fromId === currentUserId) youOwe += s.amount;
            if (toId === currentUserId) youAreOwed += s.amount;
        });

        const netBalance = youAreOwed - youOwe;
        if (overviewBalance) {
            if (netBalance > 0) {
                overviewBalance.textContent = `+₹${netBalance.toFixed(2)}`;
                overviewBalance.style.color = "#10b981";
                if (overviewBalanceText) overviewBalanceText.textContent = "You are owed";
            } else if (netBalance < 0) {
                overviewBalance.textContent = `-₹${Math.abs(netBalance).toFixed(2)}`;
                overviewBalance.style.color = "#f87171";
                if (overviewBalanceText) overviewBalanceText.textContent = "You owe money";
            } else {
                overviewBalance.textContent = "₹0.00";
                overviewBalance.style.color = "#f8fafc";
                if (overviewBalanceText) overviewBalanceText.textContent = "All settled up";
            }
        }
    }

    function renderGroupMembers() {
        if (!dashboardMembers || !selectedGroup || !selectedGroup.members) return;
        dashboardMembers.innerHTML = "";

        selectedGroup.members.forEach(m => {
            const isG = typeof m === "object" && m.type === "guest";
            const id = isG ? m.memberId : (m.userId || m);
            const name = isG ? m.name : (m.name || id);

            const div = document.createElement("div");
            div.className = "dashboard-member-item";
            div.innerHTML = `
                <div class="member-avatar">${String(name).charAt(0).toUpperCase()}</div>
                <div class="member-details">
                    <strong>${name}</strong>
                    <span>${isG ? 'Guest Member' : id}</span>
                </div>
            `;
            dashboardMembers.appendChild(div);
        });
    }

    function renderRecentExpenses() {
        if (!recentExpenses) return;
        recentExpenses.innerHTML = "";

        if (expenses.length === 0) {
            recentExpenses.innerHTML = `
                <div style="text-align:center;padding:30px;color:#94a3b8;">
                    <i class="fa-solid fa-receipt" style="font-size:32px;margin-bottom:10px;opacity:0.4;"></i>
                    <p style="margin:0;">No expenses recorded yet.</p>
                    <a href="addExpense.html" class="primary-button small-button" style="margin-top:12px;display:inline-flex;">Add First Expense</a>
                </div>
            `;
            return;
        }

        const sorted = [...expenses].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8);

        sorted.forEach(exp => {
            const hasReceipt = Boolean(exp.receiptUrl);
            const card = document.createElement("div");
            card.className = "expense-item-card";
            card.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(15,23,42,0.6);border-radius:12px;margin-bottom:10px;border:1px solid rgba(255,255,255,0.06);";

            const catIcon = getCategoryIcon(exp.category);
            const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent';

            card.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;border-radius:10px;background:rgba(56,189,248,0.15);color:#38bdf8;display:flex;align-items:center;justify-content:center;font-size:18px;">
                        <i class="${catIcon}"></i>
                    </div>
                    <div>
                        <strong style="color:#f8fafc;font-size:14px;display:block;">${exp.title}</strong>
                        <span style="font-size:11px;color:#94a3b8;">Paid by ${exp.payerName || exp.payerId} &bull; ${dateStr}</span>
                        ${hasReceipt ? `
                            <div>
                                <button type="button" class="receipt-badge-btn" onclick="viewReceiptPhoto('${exp.receiptUrl}', '${exp.title.replace(/'/g, "\\'")}', '${(exp.receiptOriginalName || '').replace(/'/g, "\\'")}')">
                                    <i class="fa-solid fa-paperclip"></i> View Receipt Photo (Multer)
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div style="text-align:right;">
                    <strong style="color:#f8fafc;font-size:15px;display:block;">₹${parseFloat(exp.amount).toFixed(2)}</strong>
                    <span style="font-size:11px;color:#38bdf8;background:rgba(56,189,248,0.1);padding:2px 6px;border-radius:4px;">${exp.category || 'Food'}</span>
                </div>
            `;
            recentExpenses.appendChild(card);
        });
    }

    function getCategoryIcon(category) {
        switch (String(category).toLowerCase()) {
            case 'food': return 'fa-solid fa-utensils';
            case 'transport': return 'fa-solid fa-car';
            case 'hotel': return 'fa-solid fa-hotel';
            case 'shopping': return 'fa-solid fa-bag-shopping';
            case 'activities': return 'fa-solid fa-ticket';
            default: return 'fa-solid fa-receipt';
        }
    }

    // 4. CSV Export Feature (Lecture 32 & 34 Node.js Stream Pipeline)
    if (btnExportCsvCard) {
        btnExportCsvCard.addEventListener("click", () => {
            if (!selectedGroup) return alert("Select a group first");
            const exportUrl = `/api/expenses/export/csv?groupId=${selectedGroup.groupId}&token=${token}`;
            window.open(exportUrl, '_blank');
        });
    }

    // 5. System Health & V8 Heap Diagnostics (Lecture 31 & 35)
    if (btnSystemHealthCard) {
        btnSystemHealthCard.addEventListener("click", async () => {
            if (diagnosticsModal) diagnosticsModal.style.display = "flex";
            const diagJson = document.getElementById("diagJson");
            const diagStatus = document.getElementById("diagStatus");
            const diagDbStatus = document.getElementById("diagDbStatus");
            const diagHeapUsed = document.getElementById("diagHeapUsed");
            const diagHeapTotal = document.getElementById("diagHeapTotal");

            try {
                const res = await fetch(getApiUrl("/api/health"));
                const data = await res.json();
                if (diagJson) diagJson.textContent = JSON.stringify(data, null, 2);
                if (diagStatus) diagStatus.textContent = data.status === "ok" ? "Active (Online)" : "Degraded";
                if (diagDbStatus) diagDbStatus.textContent = data.databaseConnected ? "Connected (Atlas)" : "Disconnected";
                if (data.v8HeapStatistics) {
                    const usedMB = (data.v8HeapStatistics.used_heap_size / (1024 * 1024)).toFixed(1);
                    const totalMB = (data.v8HeapStatistics.total_heap_size / (1024 * 1024)).toFixed(1);
                    if (diagHeapUsed) diagHeapUsed.textContent = `${usedMB} MB`;
                    if (diagHeapTotal) diagHeapTotal.textContent = `${totalMB} MB`;
                }
            } catch (err) {
                if (diagJson) diagJson.textContent = "Error fetching /api/health: " + err.message;
            }
        });
    }
});
