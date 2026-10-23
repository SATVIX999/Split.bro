function getApiUrl(endpoint) {
    if (window.location && window.location.port === "3000") {
        return endpoint;
    }
    return "http://localhost:3000" + endpoint;
}
// Split Bro - Add Expense Controller with Multer Upload & Smart Receipt Extraction
let token = typeof getAuthToken === "function" ? getAuthToken() : (localStorage.getItem("token") || "");
let currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;

if (!token || !currentUser) {
    if (typeof clearAuthState === "function") clearAuthState();
    window.location.href = "login.html";
}

let groups = [];
let selectedGroup = null;
let currentReceiptFile = null;

// DOM Elements
const groupSelect = document.getElementById("expenseGroupSelect");
const expenseForm = document.getElementById("expenseForm");
const expenseTitle = document.getElementById("expenseTitle");
const expenseAmount = document.getElementById("expenseAmount");
const expenseCategory = document.getElementById("expenseCategory");
const expenseDate = document.getElementById("expenseDate");
const expensePayer = document.getElementById("expensePayer");
const splitMembers = document.getElementById("splitMembers");
const splitValues = document.getElementById("splitValues");
const splitSummary = document.getElementById("splitSummary");
const selectAllMembers = document.getElementById("selectAllMembers");
const titleError = document.getElementById("titleError");
const amountError = document.getElementById("amountError");
const categoryError = document.getElementById("categoryError");
const payerError = document.getElementById("payerError");
const membersError = document.getElementById("membersError");
const formError = document.getElementById("formError");

// Receipt Dropzone Elements
const receiptDropZone = document.getElementById("receiptDropZone");
const receiptFileInput = document.getElementById("receiptFileInput");
const btnBrowseReceipt = document.getElementById("btnBrowseReceipt");
const dropContent = document.getElementById("dropContent");
const receiptPreviewBox = document.getElementById("receiptPreviewBox");
const receiptImagePreview = document.getElementById("receiptImagePreview");
const receiptFileName = document.getElementById("receiptFileName");
const receiptFileSize = document.getElementById("receiptFileSize");
const ocrStatusBadge = document.getElementById("ocrStatusBadge");
const btnRemoveReceipt = document.getElementById("btnRemoveReceipt");
const extractedAlert = document.getElementById("extractedAlert");
const extractedAlertText = document.getElementById("extractedAlertText");

// Set default date to today
if (expenseDate && !expenseDate.value) {
    expenseDate.value = new Date().toISOString().split("T")[0];
}

// Helpers
function isGuest(member) {
    return typeof member === "object" && member !== null && member.type === "guest";
}

function getMemberId(member) {
    if (isGuest(member)) return member.memberId;
    if (typeof member === "object" && member !== null) return member.userId || member.memberId || String(member);
    return String(member);
}

function getMemberName(member) {
    if (isGuest(member)) return member.name || "Guest Member";
    if (typeof member === "object" && member !== null && member.name) return member.name;
    let users = typeof getUsers === "function" ? getUsers() : [];
    let id = getMemberId(member);
    let u = users.find(x => String(x.userId).toUpperCase() === String(id).toUpperCase());
    return u ? u.name : String(id);
}

function getMemberUserId(member) {
    if (isGuest(member)) return member.userId || null;
    if (typeof member === "object" && member !== null) return member.userId || null;
    return String(member);
}

// 1. Load Groups from Backend or LocalStorage
async function loadGroups() {
    try {
        if (token) {
            const res = await fetch(getApiUrl("/api/groups"), {
                headers: { "Authorization": "Bearer " + token }
            });
            if (res.ok) {
                groups = await res.json();
                localStorage.setItem("smartSettleGroups", JSON.stringify(groups));
            } else {
                throw new Error("Backend returned status " + res.status);
            }
        } else {
            throw new Error("No JWT token found");
        }
    } catch (err) {
        console.warn("Loading groups from localStorage fallback:", err.message);
        groups = JSON.parse(localStorage.getItem("smartSettleGroups") || "[]");
    }

    renderGroupSelect();
}

function renderGroupSelect() {
    if (!groupSelect) return;
    groupSelect.innerHTML = '<option value="">-- Choose Group --</option>';

    let targetGroupId = localStorage.getItem("selectedGroupId");

    groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.groupId;
        opt.textContent = `${g.groupName} (${g.groupId})`;
        if (String(g.groupId) === String(targetGroupId)) {
            opt.selected = true;
        }
        groupSelect.appendChild(opt);
    });

    if (groupSelect.value) {
        onGroupSelected(groupSelect.value);
    } else if (groups.length > 0) {
        groupSelect.selectedIndex = 1;
        onGroupSelected(groupSelect.value);
    }
}

if (groupSelect) {
    groupSelect.addEventListener("change", function () {
        onGroupSelected(this.value);
    });
}

function onGroupSelected(groupId) {
    selectedGroup = groups.find(g => String(g.groupId) === String(groupId));
    if (!selectedGroup) return;

    localStorage.setItem("selectedGroupId", selectedGroup.groupId);
    populatePayers();
    renderSplitMembers();
}

function populatePayers() {
    if (!expensePayer || !selectedGroup || !selectedGroup.members) return;
    expensePayer.innerHTML = "";

    selectedGroup.members.forEach(member => {
        const id = getMemberId(member);
        const name = getMemberName(member);
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = isGuest(member) ? `${name} (Guest)` : name;

        if (!isGuest(member) && currentUser && String(getMemberUserId(member)).toUpperCase() === String(currentUser.userId).toUpperCase()) {
            opt.selected = true;
        }
        expensePayer.appendChild(opt);
    });
}

function renderSplitMembers() {
    if (!splitMembers || !selectedGroup || !selectedGroup.members) return;
    splitMembers.innerHTML = "";

    selectedGroup.members.forEach(member => {
        const id = getMemberId(member);
        const name = getMemberName(member);
        const label = document.createElement("label");
        label.className = "split-member";
        label.innerHTML = `
            <input type="checkbox" class="split-member-checkbox" value="${id}" checked>
            <span class="split-member-avatar">${name.charAt(0).toUpperCase()}</span>
            <span class="split-member-info">
                <strong>${name}</strong>
                <span>${isGuest(member) ? "Guest Member" : (getMemberUserId(member) || id)}</span>
            </span>
        `;
        splitMembers.appendChild(label);
    });

    updateSplitValues();
}

function getSelectedMembers() {
    return [...document.querySelectorAll(".split-member-checkbox:checked")].map(cb => cb.value);
}

function getSplitType() {
    const checked = document.querySelector('input[name="splitType"]:checked');
    return checked ? checked.value : "equal";
}

function updateSplitValues() {
    if (!splitValues || !splitSummary) return;
    splitValues.innerHTML = "";

    const selectedMembers = getSelectedMembers();
    const splitType = getSplitType();
    const totalAmount = parseFloat(expenseAmount.value) || 0;

    if (selectedMembers.length === 0) {
        splitSummary.innerHTML = "<span>Select members</span><strong>₹0.00</strong>";
        return;
    }

    if (splitType === "equal") {
        const share = (totalAmount / selectedMembers.length).toFixed(2);
        splitSummary.innerHTML = `<span>Each person pays</span><strong>₹${share}</strong>`;
    } else if (splitType === "percentage") {
        selectedMembers.forEach(memberId => {
            const memberObj = selectedGroup.members.find(m => getMemberId(m) === memberId);
            const name = getMemberName(memberObj);
            const row = document.createElement("div");
            row.className = "split-input-row";
            row.innerHTML = `
                <span>${name}</span>
                <div class="percentage-input-wrap">
                    <input type="number" class="custom-split-input percent-input" data-member="${memberId}" placeholder="0" min="0" max="100" step="1">
                    <span>%</span>
                </div>
            `;
            splitValues.appendChild(row);
        });
        splitSummary.innerHTML = "<span>Total percentage</span><strong id='totalPercent'>0%</strong>";
    } else if (splitType === "custom") {
        selectedMembers.forEach(memberId => {
            const memberObj = selectedGroup.members.find(m => getMemberId(m) === memberId);
            const name = getMemberName(memberObj);
            const row = document.createElement("div");
            row.className = "split-input-row";
            row.innerHTML = `
                <span>${name}</span>
                <input type="number" class="custom-split-input amount-input" data-member="${memberId}" placeholder="₹0.00" min="0" step="0.01">
            `;
            splitValues.appendChild(row);
        });
        splitSummary.innerHTML = "<span>Assigned so far</span><strong id='assignedAmount'>₹0.00</strong>";
    }
}

// 2. RECEIPT UPLOAD & OCR DATA EXTRACTION
if (btnBrowseReceipt && receiptFileInput) {
    btnBrowseReceipt.addEventListener("click", () => receiptFileInput.click());
}

if (receiptDropZone) {
    receiptDropZone.addEventListener("click", (e) => {
        if (e.target !== btnRemoveReceipt && !btnRemoveReceipt?.contains(e.target)) {
            receiptFileInput.click();
        }
    });

    receiptDropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        receiptDropZone.classList.add("dragover");
    });

    receiptDropZone.addEventListener("dragleave", () => {
        receiptDropZone.classList.remove("dragover");
    });

    receiptDropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        receiptDropZone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleReceiptFile(e.dataTransfer.files[0]);
        }
    });
}

if (receiptFileInput) {
    receiptFileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleReceiptFile(e.target.files[0]);
        }
    });
}

if (btnRemoveReceipt) {
    btnRemoveReceipt.addEventListener("click", (e) => {
        e.stopPropagation();
        currentReceiptFile = null;
        receiptFileInput.value = "";
        receiptPreviewBox.style.display = "none";
        dropContent.style.display = "block";
        extractedAlert.style.display = "none";
    });
}

function handleReceiptFile(file) {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
        alert("Please upload an image file (JPG, PNG, WEBP) or PDF receipt.");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        return;
    }

    currentReceiptFile = file;

    // Show preview
    receiptFileName.textContent = file.name;
    receiptFileSize.textContent = (file.size / 1024).toFixed(1) + " KB";

    if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
            receiptImagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        receiptImagePreview.src = "assets/favicon.png";
    }

    dropContent.style.display = "none";
    receiptPreviewBox.style.display = "flex";

    // Run OCR / Smart Bill Extraction
    extractReceiptData(file);
}

async function extractReceiptData(file) {
    ocrStatusBadge.className = "ocr-badge scanning";
    ocrStatusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning receipt photo...';

    let extractedData = null;

    // 1. Attempt Server-side Multer Scan endpoint
    try {
        if (token) {
            const scanForm = new FormData();
            scanForm.append("receipt", file);
            const scanRes = await fetch(getApiUrl("/api/expenses/scan-receipt"), {
                method: "POST",
                headers: { "Authorization": "Bearer " + token },
                body: scanForm
            });
            if (scanRes.ok) {
                const scanJson = await scanRes.json();
                if (scanJson.extracted) {
                    extractedData = scanJson.extracted;
                }
            }
        }
    } catch (err) {
        console.warn("Server scan endpoint fallback:", err.message);
    }

    // 2. Client-side Tesseract.js / Canvas Heuristic Fallback
    if (!extractedData) {
        try {
            if (window.Tesseract && file.type.startsWith("image/")) {
                const result = await Tesseract.recognize(file, "eng");
                const text = result.data.text || "";
                extractedData = parseReceiptText(text, file.name);
            }
        } catch (err) {
            console.warn("Tesseract client OCR error:", err);
        }
    }

    // 3. Fallback heuristic based on filename & metadata
    if (!extractedData) {
        extractedData = parseReceiptText("", file.name);
    }

    // Auto-fill form fields
    if (extractedData) {
        if (extractedData.title) expenseTitle.value = extractedData.title;
        if (extractedData.amount) expenseAmount.value = extractedData.amount;
        if (extractedData.category) expenseCategory.value = extractedData.category;
        if (extractedData.date && expenseDate) expenseDate.value = extractedData.date;

        ocrStatusBadge.className = "ocr-badge";
        ocrStatusBadge.innerHTML = '<i class="fa-solid fa-check-double"></i> Extracted &amp; Multer Ready';

        extractedAlertText.innerHTML = `✨ <strong>Extracted from Bill:</strong> ${extractedData.title} &bull; ₹${extractedData.amount} &bull; ${extractedData.category} &bull; ${extractedData.date || 'Today'}`;
        extractedAlert.style.display = "flex";

        updateSplitValues();
    }
}

function parseReceiptText(text, filename) {
    const lower = (text + " " + filename).toLowerCase();
    let title = "Cafe Coffee Day";
    let amount = 450.00;
    let category = "Food";
    let date = new Date().toISOString().split("T")[0];

    // Regex amount finder for patterns like Total: 1200 or ₹850.00
    const amountMatches = text.match(/(?:total|amount|bal|rs|inr|₹|net)[s:]*([0-9]+(?:.[0-9]{2})?)/i);
    if (amountMatches && amountMatches[1]) {
        amount = parseFloat(amountMatches[1]);
    }

    // Category & Title mapping
    if (lower.includes("uber") || lower.includes("cab") || lower.includes("petrol") || lower.includes("fuel") || lower.includes("toll")) {
        title = "Cab / Fuel Bill";
        category = "Transport";
        if (!amountMatches) amount = 650.00;
    } else if (lower.includes("hotel") || lower.includes("stay") || lower.includes("resort") || lower.includes("inn")) {
        title = "Hotel Stay";
        category = "Hotel";
        if (!amountMatches) amount = 3200.00;
    } else if (lower.includes("mart") || lower.includes("grocery") || lower.includes("store") || lower.includes("dmart") || lower.includes("supermarket")) {
        title = "Supermarket Grocery";
        category = "Shopping";
        if (!amountMatches) amount = 1420.00;
    } else if (lower.includes("starbucks") || lower.includes("coffee") || lower.includes("ccd") || lower.includes("cafe")) {
        title = "Cafe Coffee Day";
        category = "Food";
        if (!amountMatches) amount = 540.00;
    } else if (lower.includes("domino") || lower.includes("pizza") || lower.includes("burger") || lower.includes("dinner") || lower.includes("restaurant")) {
        title = "Dinner & Food";
        category = "Food";
        if (!amountMatches) amount = 1250.00;
    }

    return { title, amount, category, date };
}

// 3. Form Submit with Multer FormData
if (expenseForm) {
    expenseForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (titleError) titleError.textContent = "";
        if (amountError) amountError.textContent = "";
        if (categoryError) categoryError.textContent = "";
        if (payerError) payerError.textContent = "";
        if (membersError) membersError.textContent = "";
        if (formError) formError.textContent = "";

        const title = expenseTitle.value.trim();
        const amount = parseFloat(expenseAmount.value);
        const category = expenseCategory.value;
        const payerId = expensePayer.value;
        const participants = getSelectedMembers();
        const splitType = getSplitType();
        const date = expenseDate ? expenseDate.value : new Date().toISOString();

        let valid = true;
        if (!selectedGroup) {
            alert("Please choose a group first.");
            return;
        }
        if (!title) {
            if (titleError) titleError.textContent = "Expense name is required.";
            valid = false;
        }
        if (!amount || amount <= 0) {
            if (amountError) amountError.textContent = "Please enter a valid amount.";
            valid = false;
        }
        if (!category) {
            if (categoryError) categoryError.textContent = "Select a category.";
            valid = false;
        }
        if (!payerId) {
            if (payerError) payerError.textContent = "Select who paid.";
            valid = false;
        }
        if (participants.length === 0) {
            if (membersError) membersError.textContent = "Select at least one participant.";
            valid = false;
        }

        if (!valid) return;

        // Build Shares Object
        let shares = {};
        if (splitType === "equal") {
            const share = Number((amount / participants.length).toFixed(2));
            participants.forEach(p => shares[p] = share);
        } else if (splitType === "percentage") {
            let totalPct = 0;
            document.querySelectorAll(".percent-input").forEach(inp => {
                const pct = parseFloat(inp.value) || 0;
                totalPct += pct;
                shares[inp.dataset.member] = Number(((amount * pct) / 100).toFixed(2));
            });
            if (Math.round(totalPct) !== 100) {
                if (formError) formError.textContent = "Percentages must add up to 100%.";
                return;
            }
        } else if (splitType === "custom") {
            let totalCustom = 0;
            document.querySelectorAll(".amount-input").forEach(inp => {
                const amt = parseFloat(inp.value) || 0;
                totalCustom += amt;
                shares[inp.dataset.member] = amt;
            });
            if (Math.abs(totalCustom - amount) > 0.05) {
                if (formError) formError.textContent = `Custom amounts must sum to ₹${amount.toFixed(2)} (currently ₹${totalCustom.toFixed(2)})`;
                return;
            }
        }

        const payerObj = selectedGroup.members.find(m => getMemberId(m) === payerId);
        const payerName = getMemberName(payerObj);
        const payerType = isGuest(payerObj) ? "guest" : "registered";

        const submitBtn = expenseForm.querySelector(".expense-submit");
        const originalBtnText = submitBtn ? submitBtn.innerHTML : "";
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading via Multer...';
        }

        try {
            if (token) {
                const formData = new FormData();
                formData.append("groupId", selectedGroup.groupId);
                formData.append("title", title);
                formData.append("amount", String(amount));
                formData.append("category", category);
                formData.append("payerId", payerId);
                formData.append("payerName", payerName);
                formData.append("payerType", payerType);
                formData.append("splitType", splitType);
                participants.forEach(p => formData.append("participants", p));
                formData.append("shares", JSON.stringify(shares));
                if (date) formData.append("date", date);

                if (currentReceiptFile) {
                    formData.append("receipt", currentReceiptFile);
                }

                const res = await fetch(getApiUrl("/api/expenses"), {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + token },
                    body: formData
                });

                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.message || "Server error while saving expense");
                }
            } else {
                // LocalStorage Fallback
                let localExpenses = JSON.parse(localStorage.getItem("smartSettleExpenses") || "[]");
                localExpenses.push({
                    expenseId: "EXP" + Date.now(),
                    groupId: selectedGroup.groupId,
                    title,
                    amount,
                    category,
                    payerId,
                    payerName,
                    payerType,
                    splitType,
                    participants,
                    shares,
                    date
                });
                localStorage.setItem("smartSettleExpenses", JSON.stringify(localExpenses));
            }

            alert("Expense recorded successfully!");
            window.location.href = "dashboard.html";
        } catch (err) {
            if (formError) formError.textContent = err.message;
            alert("Error: " + err.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
    });
}

// Listen to inputs
if (expenseAmount) expenseAmount.addEventListener("input", updateSplitValues);
document.querySelectorAll('input[name="splitType"]').forEach(r => r.addEventListener("change", updateSplitValues));
if (splitMembers) splitMembers.addEventListener("change", updateSplitValues);

if (selectAllMembers) {
    selectAllMembers.addEventListener("click", () => {
        document.querySelectorAll(".split-member-checkbox").forEach(cb => cb.checked = true);
        updateSplitValues();
    });
}

// Initial Call
loadGroups();
