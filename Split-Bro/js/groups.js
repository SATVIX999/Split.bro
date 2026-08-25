document.addEventListener("DOMContentLoaded", function () {

    // --------------------------------------------------
    // 1. BASIC SETUP
    // --------------------------------------------------

    const currentUser = getCurrentUser();

    // If the user is not logged in, send them to login page.
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const users = getUsers();

    // Get saved groups from localStorage.
    // If nothing is saved, use an empty array.
    let groups =
        JSON.parse(
            localStorage.getItem("smartSettleGroups")
        ) || [];

    let newMembers = [];
    let editingGroupId = null;


    // --------------------------------------------------
    // 2. DOM ELEMENTS
    // --------------------------------------------------

    // Short helper instead of repeatedly writing
    // document.getElementById().
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


    // --------------------------------------------------
    // 3. EVENT LISTENER HELPERS
    // --------------------------------------------------

    // Adds an event listener only if the element exists.
    function on(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    // Adds the same event listener to all matching elements.
    // Useful for buttons that are created dynamically.
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


    // --------------------------------------------------
    // 4. NORMALIZATION
    // --------------------------------------------------

    // Converts values into the same format before comparing.
    //
    // Example:
    // " u101 "
    // "U101"
    //
    // Both become:
    // "U101"
    function normalize(value) {

        return String(value)
            .trim()
            .toUpperCase();
    }


    // --------------------------------------------------
    // 5. LOCAL STORAGE AND ID HELPERS
    // --------------------------------------------------

    // Saves the current groups array to localStorage.
    function saveGroups() {

        localStorage.setItem(
            "smartSettleGroups",
            JSON.stringify(groups)
        );
    }


    // Creates an internal Group ID.
    //
    // Date.now() gives the current timestamp.
    // Math.random() adds another random part.
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


    // Creates a short 6-character Group Code
    // that users can share with other users.
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


    // Keeps generating a Group Code until
    // a code that is not already being used is found.
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


    // Finds a group using its internal Group ID.
    function findGroup(groupId) {

        return groups.find(
            group =>
                normalize(group.groupId) ===
                normalize(groupId)
        );
    }


    // Finds a group using the user-facing Group Code.
    function findGroupByCode(code) {

        return groups.find(
            group =>
                normalize(group.groupCode) ===
                normalize(code)
        );
    }


    // Finds a registered user using User ID.
    function getUserById(userId) {

        return users.find(
            user =>
                normalize(user.userId) ===
                normalize(userId)
        );
    }


    // Gets the user's name from their User ID.
    function getUserName(userId) {

        const user =
            getUserById(userId);

        return user
            ? user.name
            : userId;
    }


    // --------------------------------------------------
    // 6. MEMBER HELPERS
    // --------------------------------------------------

    // Checks whether a member is a guest object.
    function isGuest(member) {

        return (
            typeof member === "object" &&
            member !== null &&
            member.type === "guest"
        );
    }


    // Gets the unique ID of a member.
    function getMemberId(member) {

        return isGuest(member)
            ? member.memberId
            : String(member);
    }


    // Gets the registered user's User ID.
    //
    // Guests normally have userId = null.
    function getMemberUserId(member) {

        return isGuest(member)
            ? member.userId || null
            : String(member);
    }


    // Gets the display name of a member.
    function getMemberName(member) {

        return isGuest(member)
            ? member.name
            : getUserName(member);
    }


    // Creates a guest member object.
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


    // Checks whether the currently logged-in user
    // belongs to a particular group.
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


    // Returns only groups that contain
    // the currently logged-in user.
    function getVisibleGroups() {

        return groups.filter(
            group =>
                isCurrentUserMember(group)
        );
    }


    // --------------------------------------------------
    // 7. MODAL HELPERS
    // --------------------------------------------------

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


    // Opens the Create Group modal.
    function openCreateGroup() {

        clearCreateForm();

        openModal(createGroupModal);
    }


    // Opens the Join Group modal.
    function openJoinGroupModal() {

        joinGroupCode.value = "";

        joinGroupError.textContent = "";

        guestClaimBox.style.display =
            "none";

        openModal(joinGroupModal);
    }


    // Clears the Create Group form.
    function clearCreateForm() {

        groupName.value = "";

        memberUserId.value = "";

        guestMemberName.value = "";

        newMembers = [];

        groupNameError.textContent = "";

        memberError.textContent = "";


        // Reset member mode to Registered User.
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


    // --------------------------------------------------
    // 8. CREATE-GROUP MEMBER DISPLAY
    // --------------------------------------------------

    function renderSelectedMembers() {

        if (!selectedMembers) {
            return;
        }

        selectedMembers.innerHTML = "";


        // Create a visual item for every selected member.
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


        // Add remove functionality to the
        // newly created remove buttons.
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


    // --------------------------------------------------
    // 9. ADD REGISTERED MEMBER
    // --------------------------------------------------

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


        // Prevent the current user from
        // adding themselves again.
        if (
            normalize(user.userId) ===
            normalize(currentUser.userId)
        ) {

            memberError.textContent =
                "You are already added to the group.";

            return;
        }


        // Check if this member is already selected.
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


    // --------------------------------------------------
    // 10. ADD GUEST MEMBER
    // --------------------------------------------------

    function addGuestMember() {

        memberError.textContent = "";


        const name =
            guestMemberName.value.trim();


        if (name.length < 2) {

            memberError.textContent =
                "Enter a valid guest name.";

            return;
        }


        // Prevent duplicate guest names.
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


    // --------------------------------------------------
    // 11. CREATE GROUP
    // --------------------------------------------------

    function createGroup(event) {

        event.preventDefault();

        groupNameError.textContent = "";

        memberError.textContent = "";


        const name =
            groupName.value.trim();


        // Validate group name.
        if (name.length < 2) {

            groupNameError.textContent =
                "Group name must contain at least 2 characters.";

            return;
        }


        // At least one other member is required.
        if (newMembers.length === 0) {

            memberError.textContent =
                "Add at least one other member.";

            return;
        }


        // Prevent the same creator from creating
        // another group with the same name.
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


        // Create the new group object.
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


        // Add the new group to the groups array.
        groups.push(newGroup);

        // Save updated groups.
        saveGroups();


        // Remember the newly created group.
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


    // --------------------------------------------------
    // 12. GUEST CLAIMS
    // --------------------------------------------------

    // Shows guest members that can be claimed
    // when a user joins a group.
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


    // --------------------------------------------------
    // 13. JOIN GROUP
    // --------------------------------------------------

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


        // Check whether the user selected
        // an existing guest profile to claim.
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


            // Replace the guest object with
            // the actual registered user's ID.
            group.members[index] =
                currentUser.userId;

        } else {

            // Otherwise add the user normally.
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


    // --------------------------------------------------
    // 14. OPEN EDIT GROUP
    // --------------------------------------------------

    function openEditGroup(groupId) {

        const group =
            findGroup(groupId);


        if (!group) {
            return;
        }


        // Only the creator can edit.
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


    // --------------------------------------------------
    // 15. RENDER EDIT MEMBERS
    // --------------------------------------------------

    function renderEditMembers(group) {

        editSelectedMembers.innerHTML =
            "";


        group.members.forEach(
            member => {

                const name =
                    getMemberName(member);

                const id =
                    getMemberId(member);


                // The creator/current user cannot
                // remove themselves.
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

                // A group must always contain
                // at least two members.
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


    // --------------------------------------------------
    // 16. ADD REGISTERED MEMBER WHILE EDITING
    // --------------------------------------------------

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


    // --------------------------------------------------
    // 17. ADD GUEST WHILE EDITING
    // --------------------------------------------------

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


    // --------------------------------------------------
    // 18. SAVE EDITED GROUP
    // --------------------------------------------------

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


    // --------------------------------------------------
    // 19. DELETE GROUP
    // --------------------------------------------------

    function deleteGroup(groupId) {

        const group =
            findGroup(groupId);


        if (!group) {
            return;
        }


        // Only the creator can delete.
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


        // Remove the selected group.
        groups =
            groups.filter(
                group =>
                    normalize(group.groupId) !==
                    normalize(groupId)
            );


        saveGroups();


        // If the deleted group was selected,
        // remove it from localStorage too.
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


    // --------------------------------------------------
    // 20. LEAVE GROUP
    // --------------------------------------------------

    function leaveGroup(groupId) {

        const group =
            findGroup(groupId);


        if (!group) {
            return;
        }


        // The creator cannot leave their own group.
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


        // Remove the current user.
        //
        // Guest profiles are kept in the group.
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


    // --------------------------------------------------
    // 21. EXPENSE CALCULATION
    // --------------------------------------------------

    // Adds all expense amounts in a group.
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


    // --------------------------------------------------
    // 22. RENDER GROUP CARDS
    // --------------------------------------------------

    function renderGroups() {

        if (!groupsContainer) {
            return;
        }


        groupsContainer.innerHTML =
            "";


        const visibleGroups =
            getVisibleGroups();


        // If the user has no groups,
        // show the empty state.
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


        // Create one card for every visible group.
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

                    // Fallback if clipboard access fails.
                    alert(
                        "Group Code: " +
                        code
                    );
                }
            }
        );


        // Edit group.
        onAll(
            ".edit-group-button",
            "click",
            button => {

                openEditGroup(
                    button.dataset.groupId
                );
            }
        );


        // Delete group.
        onAll(
            ".delete-group-button",
            "click",
            button => {

                deleteGroup(
                    button.dataset.groupId
                );
            }
        );


        // Leave group.
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


    // --------------------------------------------------
    // 23. MODAL EVENTS
    // --------------------------------------------------

    // Create Group buttons.
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


    // Close buttons.
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


    // --------------------------------------------------
    // 24. CREATE-GROUP MEMBER MODE
    // --------------------------------------------------

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


    // --------------------------------------------------
    // 25. CREATE-GROUP MEMBER EVENTS
    // --------------------------------------------------

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


    // Pressing Enter in the User ID field
    // adds the registered member.
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


    // Pressing Enter in guest name field
    // adds the guest.
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


    // --------------------------------------------------
    // 26. CREATE AND JOIN FORMS
    // --------------------------------------------------

    on(
        groupForm,
        "submit",
        createGroup
    );


    // Check Group Code while typing.
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


    // --------------------------------------------------
    // 27. EDIT MEMBER MODE
    // --------------------------------------------------

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


    // --------------------------------------------------
    // 28. EDIT MEMBER EVENTS
    // --------------------------------------------------

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


    // Enter key for adding a guest while editing.
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


    // Save edited group.
    on(
        editGroupForm,
        "submit",
        saveEditedGroup
    );


    // --------------------------------------------------
    // 29. INITIAL RENDER
    // --------------------------------------------------

    // Display the user's groups immediately
    // when the page loads.
    renderGroups();

});
