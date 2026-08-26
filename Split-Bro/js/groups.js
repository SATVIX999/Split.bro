document.addEventListener("DOMContentLoaded", function () {

    const currentUser = getCurrentUser();

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const users = getUsers();

    let groups =
        JSON.parse(
            localStorage.getItem("smartSettleGroups")
        ) || [];

    let newMembers = [];
    let editingGroupId = null;

    const $ = id => document.getElementById(id);

    const groupsContainer = $("groupsContainer");
    const emptyGroups = $("emptyGroups");

    const openGroupModal = $("openGroupModal");
    const openJoinGroup = $("openJoinGroup");
    const emptyCreateGroup = $("emptyCreateGroup");
    const emptyJoinGroup = $("emptyJoinGroup");

    const createGroupModal = $("createGroupModal");
    const joinGroupModal = $("joinGroupModal");
    const editGroupModal = $("editGroupModal");

    const closeCreateModal = $("closeCreateModal");
    const closeJoinModal = $("closeJoinModal");
    const closeEditModal = $("closeEditModal");

    const cancelCreateGroup = $("cancelCreateGroup");
    const cancelJoinGroup = $("cancelJoinGroup");
    const cancelEditGroup = $("cancelEditGroup");

    const groupForm = $("groupForm");
    const joinGroupForm = $("joinGroupForm");
    const editGroupForm = $("editGroupForm");

    const groupName = $("groupName");
    const memberUserId = $("memberUserId");
    const addMemberButton = $("addMemberButton");
    const selectedMembers = $("selectedMembers");

    const groupNameError = $("groupNameError");
    const memberError = $("memberError");

    const joinGroupCode = $("joinGroupCode");
    const joinGroupError = $("joinGroupError");

    const guestClaimBox = $("guestClaimBox");
    const guestClaimSelect = $("guestClaimSelect");

    const registeredMemberMode =
        $("registeredMemberMode");

    const guestMemberMode =
        $("guestMemberMode");

    const registeredMemberBox =
        $("registeredMemberBox");

    const guestMemberBox =
        $("guestMemberBox");

    const guestMemberName =
        $("guestMemberName");

    const addGuestMemberButton =
        $("addGuestMemberButton");

    const editGroupName =
        $("editGroupName");

    const editSelectedMembers =
        $("editSelectedMembers");

    const editMemberUserId =
        $("editMemberUserId");

    const editAddMemberButton =
        $("editAddMemberButton");

    const editMemberError =
        $("editMemberError");

    const editRegisteredMemberMode =
        $("editRegisteredMemberMode");

    const editGuestMemberMode =
        $("editGuestMemberMode");

    const editRegisteredMemberBox =
        $("editRegisteredMemberBox");

    const editGuestMemberBox =
        $("editGuestMemberBox");

    const editGuestMemberName =
        $("editGuestMemberName");

    const editAddGuestMemberButton =
        $("editAddGuestMemberButton");

    const editGroupNameError =
        $("editGroupNameError");

    function on(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    function onAll(selector, event, handler) {

        document
            .querySelectorAll(selector)
            .forEach(element => {

                element.addEventListener(
                    event,
                    () => handler(element)
                );

            });
    }


    
    function normalize(value) {

        return String(value)
            .trim()
            .toUpperCase();
    }
    function saveGroups() {

        localStorage.setItem(
            "smartSettleGroups",
            JSON.stringify(groups)
        );
    }

    function generateGroupId() {

        return (
            "GRP" +
            Date.now() +
            Math.random()
                .toString(36)
                .substring(2, 7)
                .toUpperCase()
        );
    }

    function generateGroupCode() {

        const characters =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code = "";

        for (let i = 0; i < 6; i++) {

            code += characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );
        }

        return code;
    }


    function getUniqueGroupCode() {

        let code;

        do {

            code = generateGroupCode();

        } while (
            groups.some(
                group =>
                    normalize(group.groupCode) === code
            )
        );

        return code;
    }


    function findGroup(groupId) {

        return groups.find(
            group =>
                normalize(group.groupId) ===
                normalize(groupId)
        );
    }


    function findGroupByCode(code) {

        return groups.find(
            group =>
                normalize(group.groupCode) ===
                normalize(code)
        );
    }


    function getUserById(userId) {

        return users.find(
            user =>
                normalize(user.userId) ===
                normalize(userId)
        );
    }


    function getUserName(userId) {

        const user =
            getUserById(userId);

        return user
            ? user.name
            : userId;
    }


    function isGuest(member) {

        return (
            typeof member === "object" &&
            member !== null &&
            member.type === "guest"
        );
    }


    function getMemberId(member) {

        return isGuest(member)
            ? member.memberId
            : String(member);
    }


    function getMemberUserId(member) {

        return isGuest(member)
            ? member.userId || null
            : String(member);
    }


    function getMemberName(member) {

        return isGuest(member)
            ? member.name
            : getUserName(member);
    }


    function createGuest(name) {

        return {

            memberId:
                "GUEST_" +
                Date.now() +
                Math.random()
                    .toString(36)
                    .substring(2, 6),

            name: name,

            type: "guest",

            userId: null
        };
    }


    function isCurrentUserMember(group) {

        if (
            !group ||
            !Array.isArray(group.members) ||
            !currentUser
        ) {
            return false;
        }

        const currentUserId =
            normalize(currentUser.userId);

        return group.members.some(
            member => {

                const memberUserId =
                    getMemberUserId(member);

                return (
                    memberUserId &&
                    normalize(memberUserId) ===
                    currentUserId
                );
            }
        );
    }

    function getVisibleGroups() {

        return groups.filter(
            group =>
                isCurrentUserMember(group)
        );
    }


    function openModal(modal) {

        if (modal) {
            modal.classList.add("show");
        }
    }


    function closeModal(modal) {

        if (modal) {
            modal.classList.remove("show");
        }
    }


    function openCreateGroup() {

        clearCreateForm();

        openModal(createGroupModal);
    }


    function openJoinGroupModal() {

        joinGroupCode.value = "";

        joinGroupError.textContent = "";

        guestClaimBox.style.display =
            "none";

        openModal(joinGroupModal);
    }


    function clearCreateForm() {

        groupName.value = "";

        memberUserId.value = "";

        guestMemberName.value = "";

        newMembers = [];

        groupNameError.textContent = "";

        memberError.textContent = "";


        registeredMemberMode.classList.add(
            "active"
        );

        guestMemberMode.classList.remove(
            "active"
        );

        registeredMemberBox.style.display =
            "block";

        guestMemberBox.style.display =
            "none";


        renderSelectedMembers();
    }


    function renderSelectedMembers() {

        if (!selectedMembers) {
            return;
        }

        selectedMembers.innerHTML = "";


        newMembers.forEach(
            member => {

                const name =
                    getMemberName(member);

                const id =
                    getMemberId(member);

                const label =
                    isGuest(member)
                        ? "Guest Member"
                        : getMemberUserId(member);


                const item =
                    document.createElement("div");

                item.className =
                    "selected-member";


                item.innerHTML = `

                    <span class="selected-member-avatar">
                        ${name.charAt(0).toUpperCase()}
                    </span>

                    <div class="selected-member-info">

                        <strong>
                            ${name}
                        </strong>

                        <span>
                            ${label}
                        </span>

                    </div>

                    <button
                        type="button"
                        class="remove-member-button"
                        data-member-id="${id}"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                `;


                selectedMembers.appendChild(
                    item
                );
            }
        );

        onAll(
            ".remove-member-button",
            "click",
            button => {

                const id =
                    button.dataset.memberId;

                newMembers =
                    newMembers.filter(
                        member =>
                            String(
                                getMemberId(member)
                            ) !==
                            String(id)
                    );

                renderSelectedMembers();
            }
        );
    }


    function addMember() {

        memberError.textContent = "";


        const userId =
            normalize(
                memberUserId.value
            );


        if (!userId) {

            memberError.textContent =
                "Enter a User ID.";

            return;
        }


        const user =
            getUserById(userId);


        if (!user) {

            memberError.textContent =
                "No registered user found with this User ID.";

            return;
        }


        if (
            normalize(user.userId) ===
            normalize(currentUser.userId)
        ) {

            memberError.textContent =
                "You are already added to the group.";

            return;
        }


        const exists =
            newMembers.some(
                member => {

                    const id =
                        getMemberUserId(member);

                    return (
                        id &&
                        normalize(id) ===
                        normalize(user.userId)
                    );
                }
            );


        if (exists) {

            memberError.textContent =
                "This member is already added.";

            return;
        }


        newMembers.push(
            user.userId
        );

        memberUserId.value = "";

        renderSelectedMembers();
    }


    function addGuestMember() {

        memberError.textContent = "";


        const name =
            guestMemberName.value.trim();


        if (name.length < 2) {

            memberError.textContent =
                "Enter a valid guest name.";

            return;
        }


        const exists =
            newMembers.some(
                member =>
                    isGuest(member) &&
                    normalize(member.name) ===
                    normalize(name)
            );


        if (exists) {

            memberError.textContent =
                "This guest is already added.";

            return;
        }


        newMembers.push(
            createGuest(name)
        );

        guestMemberName.value = "";

        renderSelectedMembers();
    }


    function createGroup(event) {

        event.preventDefault();

        groupNameError.textContent = "";

        memberError.textContent = "";


        const name =
            groupName.value.trim();


        if (name.length < 2) {

            groupNameError.textContent =
                "Group name must contain at least 2 characters.";

            return;
        }


        if (newMembers.length === 0) {

            memberError.textContent =
                "Add at least one other member.";

            return;
        }


        const duplicate =
            groups.some(
                group =>
                    normalize(
                        group.createdBy
                    ) ===
                    normalize(
                        currentUser.userId
                    ) &&

                    normalize(
                        group.groupName
                    ) ===
                    normalize(name)
            );


        if (duplicate) {

            groupNameError.textContent =
                "A group with this name already exists.";

            return;
        }


        const newGroup = {

            groupId:
                generateGroupId(),

            groupName:
                name,

            groupCode:
                getUniqueGroupCode(),

            createdBy:
                currentUser.userId,

            members: [
                currentUser.userId,
                ...newMembers
            ],

            expenses: [],

            settledPayments: [],

            createdAt:
                new Date().toISOString()
        };


        groups.push(newGroup);

        saveGroups();


        localStorage.setItem(
            "selectedGroupId",
            newGroup.groupId
        );


        closeModal(createGroupModal);

        clearCreateForm();

        renderGroups();


        alert(
            `Group "${name}" created successfully.

Group Code: ${newGroup.groupCode}`
        );
    }


    function prepareGuestClaims(group) {

        guestClaimSelect.innerHTML = `

            <option value="">
                Join as a new member
            </option>

        `;


        const guests =
            group.members.filter(
                member =>
                    isGuest(member)
            );


        if (guests.length === 0) {

            guestClaimBox.style.display =
                "none";

            return;
        }


        guests.forEach(
            guest => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    guest.memberId;

                option.textContent =
                    guest.name;

                guestClaimSelect.appendChild(
                    option
                );
            }
        );


        guestClaimBox.style.display =
            "block";
    }


    // Checks the Group Code while the user types.
    function checkJoinCode() {

        const code =
            normalize(
                joinGroupCode.value
            );


        if (code.length < 6) {

            guestClaimBox.style.display =
                "none";

            return;
        }


        const group =
            findGroupByCode(code);


        if (
            !group ||
            isCurrentUserMember(group)
        ) {

            guestClaimBox.style.display =
                "none";

            return;
        }


        prepareGuestClaims(group);
    }


    function joinGroup(event) {

        event.preventDefault();

        joinGroupError.textContent = "";


        const code =
            normalize(
                joinGroupCode.value
            );


        if (!code) {

            joinGroupError.textContent =
                "Enter a Group Code.";

            return;
        }


        const group =
            findGroupByCode(code);


        if (!group) {

            joinGroupError.textContent =
                "Invalid Group Code.";

            return;
        }


        if (
            isCurrentUserMember(group)
        ) {

            joinGroupError.textContent =
                "You are already a member of this group.";

            return;
        }


        const claimId =
            guestClaimSelect.value;


        if (claimId) {

            const index =
                group.members.findIndex(
                    member =>
                        isGuest(member) &&
                        String(
                            member.memberId
                        ) ===
                        String(claimId)
                );


            if (index === -1) {

                joinGroupError.textContent =
                    "Guest member could not be found.";

                return;
            }

            group.members[index] =
                currentUser.userId;

        } else {

            group.members.push(
                currentUser.userId
            );
        }


        saveGroups();


        localStorage.setItem(
            "selectedGroupId",
            group.groupId
        );


        closeModal(joinGroupModal);

        renderGroups();


        alert(
            claimId
                ? `You joined "${group.groupName}" and your guest profile has been connected to your account.`
                : `You joined "${group.groupName}".`
        );
    }


    function openEditGroup(groupId) {

        const group =
            findGroup(groupId);


        if (!group) {
            return;
        }


        if (
            normalize(group.createdBy) !==
            normalize(currentUser.userId)
        ) {

            alert(
                "Only the group creator can edit this group."
            );

            return;
        }


        editingGroupId =
            groupId;


        editGroupName.value =
            group.groupName;

        editGroupNameError.textContent =
            "";

        editMemberError.textContent =
            "";


        renderEditMembers(group);

        openModal(editGroupModal);
    }


    function renderEditMembers(group) {

        editSelectedMembers.innerHTML =
            "";


        group.members.forEach(
            member => {

                const name =
                    getMemberName(member);

                const id =
                    getMemberId(member);


                const isSelf =
                    normalize(
                        getMemberUserId(member)
                    ) ===
                    normalize(
                        currentUser.userId
                    );


                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "selected-member";


                item.innerHTML = `

                    <span class="selected-member-avatar">
                        ${name.charAt(0).toUpperCase()}
                    </span>

                    <div class="selected-member-info">

                        <strong>
                            ${name}
                        </strong>

                        <span>
                            ${
                                isGuest(member)
                                    ? "Guest Member"
                                    : getMemberUserId(member)
                            }
                        </span>

                    </div>

                    ${
                        !isSelf
                            ? `
                                <button
                                    type="button"
                                    class="remove-edit-member-button"
                                    data-member-id="${id}"
                                >
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            `
                            : ""
                    }

                `;


                editSelectedMembers.appendChild(
                    item
                );
            }
        );


        // Add remove functionality to
        // edit-member buttons.
        onAll(
            ".remove-edit-member-button",
            "click",
            button => {
                if (
                    group.members.length <= 2
                ) {

                    editMemberError.textContent =
                        "A group must have at least 2 members.";

                    return;
                }


                const id =
                    button.dataset.memberId;


                group.members =
                    group.members.filter(
                        member =>
                            String(
                                getMemberId(member)
                            ) !==
                            String(id)
                    );


                saveGroups();

                renderEditMembers(group);

                renderGroups();
            }
        );
    }


    function addEditMember() {

        editMemberError.textContent =
            "";


        const userId =
            normalize(
                editMemberUserId.value
            );


        if (!userId) {

            editMemberError.textContent =
                "Enter a User ID.";

            return;
        }


        const user =
            getUserById(userId);


        if (!user) {

            editMemberError.textContent =
                "No registered user found with this User ID.";

            return;
        }


        const group =
            findGroup(
                editingGroupId
            );


        if (!group) {
            return;
        }


        const exists =
            group.members.some(
                member => {

                    const id =
                        getMemberUserId(
                            member
                        );

                    return (
                        id &&
                        normalize(id) ===
                        normalize(user.userId)
                    );
                }
            );


        if (exists) {

            editMemberError.textContent =
                "This member is already in the group.";

            return;
        }


        group.members.push(
            user.userId
        );


        saveGroups();

        editMemberUserId.value = "";

        renderEditMembers(group);

        renderGroups();
    }


    function addEditGuestMember() {

        editMemberError.textContent =
            "";


        const name =
            editGuestMemberName.value.trim();


        if (name.length < 2) {

            editMemberError.textContent =
                "Enter a valid guest name.";

            return;
        }


        const group =
            findGroup(
                editingGroupId
            );


        if (!group) {
            return;
        }


        const exists =
            group.members.some(
                member =>
                    isGuest(member) &&
                    normalize(member.name) ===
                    normalize(name)
            );


        if (exists) {

            editMemberError.textContent =
                "This guest is already in the group.";

            return;
        }


        group.members.push(
            createGuest(name)
        );


        saveGroups();

        editGuestMemberName.value =
            "";

        renderEditMembers(group);

        renderGroups();
    }



    function saveEditedGroup(event) {

        event.preventDefault();


        const group =
            findGroup(
                editingGroupId
            );


        if (!group) {
            return;
        }


        const name =
            editGroupName.value.trim();


        if (name.length < 2) {

            editGroupNameError.textContent =
                "Group name must contain at least 2 characters.";

            return;
        }


        group.groupName =
            name;


        saveGroups();

        closeModal(editGroupModal);

        renderGroups();
    }



    function deleteGroup(groupId) {

        const group =
            findGroup(groupId);


        if (!group) {
            return;
        }


        if (
            normalize(group.createdBy) !==
            normalize(currentUser.userId)
        ) {

            alert(
                "Only the group creator can delete this group."
            );

            return;
        }


        const confirmed =
            confirm(
                `Are you sure you want to delete "${group.groupName}"?`
            );


        if (!confirmed) {
            return;
        }


        groups =
            groups.filter(
                group =>
                    normalize(group.groupId) !==
                    normalize(groupId)
            );


        saveGroups();

        if (
            normalize(
                localStorage.getItem(
                    "selectedGroupId"
                )
            ) ===
            normalize(groupId)
        ) {

            localStorage.removeItem(
                "selectedGroupId"
            );
        }


        renderGroups();
    }



    function leaveGroup(groupId) {

        const group =
            findGroup(groupId);


        if (!group) {
            return;
        }


        if (
            normalize(group.createdBy) ===
            normalize(currentUser.userId)
        ) {

            alert(
                "The group creator cannot leave the group. Delete the group instead."
            );

            return;
        }


        const confirmed =
            confirm(
                `Are you sure you want to leave "${group.groupName}"?`
            );


        if (!confirmed) {
            return;
        }


        group.members =
            group.members.filter(
                member => {

                    if (isGuest(member)) {
                        return true;
                    }

                    return (
                        normalize(member) !==
                        normalize(
                            currentUser.userId
                        )
                    );
                }
            );


        saveGroups();


        if (
            normalize(
                localStorage.getItem(
                    "selectedGroupId"
                )
            ) ===
            normalize(groupId)
        ) {

            localStorage.removeItem(
                "selectedGroupId"
            );
        }


        renderGroups();
    }

    function getTotalExpenses(group) {

        return (
            group.expenses || []
        ).reduce(
            (
                sum,
                expense
            ) =>
                sum +
                Number(
                    expense.amount || 0
                ),
            0
        );
    }


    function renderGroups() {

        if (!groupsContainer) {
            return;
        }


        groupsContainer.innerHTML =
            "";


        const visibleGroups =
            getVisibleGroups();


        if (
            visibleGroups.length === 0
        ) {

            groupsContainer.style.display =
                "none";


            if (emptyGroups) {

                emptyGroups.style.display =
                    "flex";
            }

            return;
        }


        groupsContainer.style.display =
            "grid";


        if (emptyGroups) {

            emptyGroups.style.display =
                "none";
        }


        visibleGroups.forEach(
            group => {

                const total =
                    getTotalExpenses(group);


                const isCreator =
                    normalize(
                        group.createdBy
                    ) ===
                    normalize(
                        currentUser.userId
                    );


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "group-card";


                card.innerHTML = `

                    <div class="group-card-top">

                        <div class="group-icon">
                            <i class="fa-solid fa-users"></i>
                        </div>

                        <span class="group-member-count">

                            ${group.members.length}

                            ${
                                group.members.length === 1
                                    ? "member"
                                    : "members"
                            }

                        </span>

                    </div>


                    <h2>
                        ${group.groupName}
                    </h2>


                    <p class="group-card-created">

                        Created by
                        ${getUserName(
                            group.createdBy
                        )}

                    </p>


                    <div class="group-card-info">

                        <div class="group-stat">

                            <span>
                                Total Expenses
                            </span>

                            <strong>
                                ₹${total.toFixed(2)}
                            </strong>

                        </div>


                        <div class="group-stat">

                            <span>
                                Transactions
                            </span>

                            <strong>
                                ${
                                    (
                                        group.expenses ||
                                        []
                                    ).length
                                }
                            </strong>

                        </div>

                    </div>


                    <div class="group-code">

                        <span>
                            Group Code
                        </span>

                        <strong>
                            ${group.groupCode}
                        </strong>

                    </div>


                    <div class="group-card-actions">

                        <button
                            type="button"
                            class="view-group-button"
                            data-group-id="${group.groupId}"
                        >

                            <i class="fa-solid fa-arrow-right"></i>

                            Open Group

                        </button>


                        <button
                            type="button"
                            class="copy-code-button"
                            data-code="${group.groupCode}"
                        >

                            <i class="fa-solid fa-copy"></i>

                        </button>

                    </div>


                    ${
                        isCreator

                            ? `

                                <div class="group-manage-actions">

                                    <button
                                        type="button"
                                        class="edit-group-button"
                                        data-group-id="${group.groupId}"
                                    >

                                        <i class="fa-solid fa-pen"></i>

                                        Edit

                                    </button>


                                    <button
                                        type="button"
                                        class="delete-group-button"
                                        data-group-id="${group.groupId}"
                                    >

                                        <i class="fa-solid fa-trash"></i>

                                        Delete

                                    </button>

                                </div>

                            `

                            : `

                                <div class="group-manage-actions">

                                    <button
                                        type="button"
                                        class="leave-group-button"
                                        data-group-id="${group.groupId}"
                                    >

                                        <i class="fa-solid fa-right-from-bracket"></i>

                                        Leave Group

                                    </button>

                                </div>

                            `
                    }

                `;


                groupsContainer.appendChild(
                    card
                );
            }
        );


        // --------------------------------------------------
        // DYNAMIC GROUP BUTTONS
        // --------------------------------------------------

        // Open group.
        onAll(
            ".view-group-button",
            "click",
            button => {

                const group =
                    findGroup(
                        button.dataset.groupId
                    );


                if (
                    !group ||
                    !isCurrentUserMember(
                        group
                    )
                ) {

                    alert(
                        "You do not have access to this group."
                    );

                    return;
                }


                localStorage.setItem(
                    "selectedGroupId",
                    group.groupId
                );


                window.location.href =
                    "dashboard.html";
            }
        );


        // Copy group code.
        onAll(
            ".copy-code-button",
            "click",
            async button => {

                const code =
                    button.dataset.code;


                try {

                    await navigator
                        .clipboard
                        .writeText(code);


                    alert(
                        "Group code copied: " +
                        code
                    );

                } catch (error) {

                    alert(
                        "Group Code: " +
                        code
                    );
                }
            }
        );


        onAll(
            ".edit-group-button",
            "click",
            button => {

                openEditGroup(
                    button.dataset.groupId
                );
            }
        );


        onAll(
            ".delete-group-button",
            "click",
            button => {

                deleteGroup(
                    button.dataset.groupId
                );
            }
        );


        onAll(
            ".leave-group-button",
            "click",
            button => {

                leaveGroup(
                    button.dataset.groupId
                );
            }
        );
    }


    on(
        openGroupModal,
        "click",
        openCreateGroup
    );

    on(
        emptyCreateGroup,
        "click",
        openCreateGroup
    );


    // Join Group buttons.
    on(
        openJoinGroup,
        "click",
        openJoinGroupModal
    );

    on(
        emptyJoinGroup,
        "click",
        openJoinGroupModal
    );


    on(
        closeCreateModal,
        "click",
        () => closeModal(
            createGroupModal
        )
    );

    on(
        closeJoinModal,
        "click",
        () => closeModal(
            joinGroupModal
        )
    );

    on(
        closeEditModal,
        "click",
        () => closeModal(
            editGroupModal
        )
    );


    // Cancel buttons.
    on(
        cancelCreateGroup,
        "click",
        () => closeModal(
            createGroupModal
        )
    );

    on(
        cancelJoinGroup,
        "click",
        () => closeModal(
            joinGroupModal
        )
    );

    on(
        cancelEditGroup,
        "click",
        () => closeModal(
            editGroupModal
        )
    );


    on(
        registeredMemberMode,
        "click",
        () => {

            registeredMemberMode
                .classList
                .add("active");

            guestMemberMode
                .classList
                .remove("active");


            registeredMemberBox.style.display =
                "block";

            guestMemberBox.style.display =
                "none";
        }
    );


    on(
        guestMemberMode,
        "click",
        () => {

            guestMemberMode
                .classList
                .add("active");

            registeredMemberMode
                .classList
                .remove("active");


            registeredMemberBox.style.display =
                "none";

            guestMemberBox.style.display =
                "block";
        }
    );


    on(
        addMemberButton,
        "click",
        addMember
    );


    on(
        addGuestMemberButton,
        "click",
        addGuestMember
    );


    on(
        memberUserId,
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                addMember();
            }
        }
    );

    on(
        guestMemberName,
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                addGuestMember();
            }
        }
    );



    on(
        groupForm,
        "submit",
        createGroup
    );


    on(
        joinGroupCode,
        "input",
        checkJoinCode
    );


    on(
        joinGroupForm,
        "submit",
        joinGroup
    );


    on(
        editRegisteredMemberMode,
        "click",
        () => {

            editRegisteredMemberMode
                .classList
                .add("active");

            editGuestMemberMode
                .classList
                .remove("active");


            editRegisteredMemberBox
                .style
                .display =
                "block";

            editGuestMemberBox
                .style
                .display =
                "none";


            editMemberError.textContent =
                "";
        }
    );


    on(
        editGuestMemberMode,
        "click",
        () => {

            editGuestMemberMode
                .classList
                .add("active");

            editRegisteredMemberMode
                .classList
                .remove("active");


            editRegisteredMemberBox
                .style
                .display =
                "none";

            editGuestMemberBox
                .style
                .display =
                "block";


            editMemberError.textContent =
                "";
        }
    );



    on(
        editAddMemberButton,
        "click",
        addEditMember
    );


    on(
        editAddGuestMemberButton,
        "click",
        addEditGuestMember
    );


    on(
        editGuestMemberName,
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                addEditGuestMember();
            }
        }
    );


    on(
        editGroupForm,
        "submit",
        saveEditedGroup
    );

    renderGroups();

});
