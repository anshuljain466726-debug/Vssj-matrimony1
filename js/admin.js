/*==================================================
        SSJ MATRIMONY — admin.js
        Admin panel wired to the same localStorage demo
        data the public site writes (ssjMembers, ssjPayments,
        ssjAds). No backend — every action here updates
        localStorage directly and re-renders.
==================================================*/

(function () {

    var adminUser = JSON.parse(localStorage.getItem("adminUser") || "null");
    if (!adminUser) return; // the inline guard in admin.html already redirects

    var isSuperAdmin = adminUser.role === "Super Admin";
    function sameCity(a, b) {
        return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
    }
    function inMyCity(cityValue) {
        if (isSuperAdmin) return true; // Super Admin sees every city
        return sameCity(cityValue, adminUser.city);
    }

    /* ---------- data helpers ---------- */
    function getMembers() { try { return JSON.parse(localStorage.getItem("ssjMembers")) || []; } catch (e) { return []; } }
    function saveMembers(list) { localStorage.setItem("ssjMembers", JSON.stringify(list)); }
    function getPayments() { try { return JSON.parse(localStorage.getItem("ssjPayments")) || []; } catch (e) { return []; } }
    function savePayments(list) { localStorage.setItem("ssjPayments", JSON.stringify(list)); }
    function getAds() { try { return JSON.parse(localStorage.getItem("ssjAds")) || []; } catch (e) { return []; } }
    function saveAds(list) { localStorage.setItem("ssjAds", JSON.stringify(list)); }
    function getAdmins() { try { return JSON.parse(localStorage.getItem("ssjAdmins")) || []; } catch (e) { return []; } }
    function saveAdmins(list) { localStorage.setItem("ssjAdmins", JSON.stringify(list)); }
    function getPendingAdmins() { try { return JSON.parse(localStorage.getItem("ssjPendingAdmins")) || []; } catch (e) { return []; } }
    function savePendingAdmins(list) { localStorage.setItem("ssjPendingAdmins", JSON.stringify(list)); }

    function fullName(m) { return ((m.firstName || "") + " " + (m.lastName || "")).trim() || "-"; }
    function statusChip(status) {
        var colors = { Pending: "#fff3cd;color:#856404", Approved: "#d4edda;color:#155724", Rejected: "#f8d7da;color:#721c24" };
        var style = colors[status] || "#eee;color:#555";
        return '<span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:' + style + '">' + (status || "Pending") + '</span>';
    }

    function updateMember(profileId, patch) {
        var updatedMember = null;
        var list = getMembers().map(function (m) {
            if (m.profileId !== profileId) return m;
            updatedMember = Object.assign({}, m, typeof patch === "function" ? patch(m) : patch);
            return updatedMember;
        });
        saveMembers(list);
        // keep the member's own "ssjProfile" snapshot in sync if it's the same profile
        var own = JSON.parse(localStorage.getItem("ssjProfile") || "null");
        if (own && own.profileId === profileId) {
            var fresh = list.filter(function (m) { return m.profileId === profileId; })[0];
            if (fresh) localStorage.setItem("ssjProfile", JSON.stringify(fresh));
        }
        if (updatedMember && typeof SSJ !== "undefined" && SSJ.cloud) { SSJ.cloud.saveMember(updatedMember); }
        renderAll();
    }

    /* ---------- rendering ---------- */
    function renderStats() {
        var members = getMembers().filter(function (m) { return inMyCity(m.city); });
        var ads = getAds().filter(function (a) { return inMyCity(a.city); });
        var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
        set("totalMembers", members.length);
        set("pendingMembers", members.filter(function (m) { return (m.status || "Pending") === "Pending"; }).length);
        set("approvedMembers", members.filter(function (m) { return m.status === "Approved"; }).length);
        set("premiumMembers", members.filter(function (m) { return m.premium && m.premium.active; }).length);
        set("advertisements", ads.length);
        set("marriedMembers", members.filter(function (m) { return m.maritalStatus === "विवाहित" || m.maritalStatus === "Married"; }).length);
    }

    function memberRow(m, context) {
        var actions =
            '<button class="btn" data-action="view" data-id="' + m.profileId + '">👁 View</button>' +
            '<button class="btn" data-action="edit" data-id="' + m.profileId + '">✏ Edit</button>';
        if ((m.status || "Pending") !== "Approved") actions += '<button class="btn" data-action="approve" data-id="' + m.profileId + '">✅ Approve</button>';
        if (m.status !== "Rejected") actions += '<button class="btn" data-action="reject" data-id="' + m.profileId + '">❌ Reject</button>';
        actions +=
            '<button class="btn" data-action="premium" data-id="' + m.profileId + '">💎 Premium</button>' +
            '<button class="btn" data-action="waiver" data-id="' + m.profileId + '">🎁 Fee Waiver</button>' +
            '<button class="btn" data-action="delete" data-id="' + m.profileId + '">🗑 Delete</button>';

        if (context === "pending") {
            return '<tr><td>' + m.profileId + '</td><td>' + fullName(m) + '</td><td>' + (m.mobile || "-") +
                '</td><td>' + (m.city || "-") + '</td><td>' + (m.registeredOn || "-") + '</td><td>' +
                '<button class="btn" data-action="approve" data-id="' + m.profileId + '">✅ Approve</button>' +
                '<button class="btn" data-action="reject" data-id="' + m.profileId + '">❌ Reject</button></td></tr>';
        }

        return '<tr><td>' + m.profileId + '</td><td>' + fullName(m) + '</td><td>' + (m.gender || "-") +
            '</td><td>' + (m.mobile || "-") + '</td><td>' + (m.city || "-") + '</td><td>' + (m.address || "-") +
            '</td><td>' + statusChip(m.status || "Pending") + '</td><td>' + (m.premium && m.premium.active ? "💎 " + m.premium.plan : "Free") +
            '</td><td>' + actions + '</td></tr>';
    }

    function renderMembers() {
        var body = document.getElementById("memberTableBody");
        if (!body) return;
        var q = ((document.getElementById("searchMember") || {}).value || "").trim().toLowerCase();
        var members = getMembers().filter(function (m) { return inMyCity(m.city); }).filter(function (m) {
            if (!q) return true;
            return (m.profileId || "").toLowerCase().indexOf(q) !== -1 ||
                fullName(m).toLowerCase().indexOf(q) !== -1 ||
                (m.mobile || "").indexOf(q) !== -1;
        });
        body.innerHTML = members.length ? members.map(function (m) { return memberRow(m, "all"); }).join("") :
            '<tr><td colspan="9" align="center">कोई सदस्य पंजीकृत नहीं है।</td></tr>';
    }

    function renderPending() {
        var body = document.getElementById("pendingTableBody");
        if (!body) return;
        var pending = getMembers().filter(function (m) { return (m.status || "Pending") === "Pending"; }).filter(function (m) { return inMyCity(m.city); });
        body.innerHTML = pending.length ? pending.map(function (m) { return memberRow(m, "pending"); }).join("") :
            '<tr><td colspan="6" align="center">कोई लंबित पंजीकरण नहीं है।</td></tr>';
    }

    function renderPayments() {
        var body = document.getElementById("paymentTableBody");
        if (!body) return;
        var payments = getPayments();
        body.innerHTML = payments.length ? payments.map(function (p) {
            return '<tr><td>' + (p.profileId || "-") + '</td><td>' + (p.mobile || "-") + '</td><td>₹' + (p.amount || "-") +
                '</td><td>UPI/Online</td><td>' + statusChip(p.status || "Received") + '</td><td>' + (p.date || "-") + '</td></tr>';
        }).join("") : '<tr><td colspan="6" align="center">अभी तक कोई भुगतान दर्ज नहीं है।</td></tr>';
    }

    function renderPremium() {
        var body = document.getElementById("premiumTableBody");
        if (!body) return;
        var premiumMembers = getMembers().filter(function (m) { return m.premium && m.premium.active; });
        body.innerHTML = premiumMembers.length ? premiumMembers.map(function (m) {
            return '<tr><td>' + m.profileId + '</td><td>' + fullName(m) + '</td><td>' + m.premium.plan +
                '</td><td>' + (m.premium.status || "Active") + '</td><td>' + (m.premium.since || "-") +
                '</td><td><button class="btn" data-action="revoke-premium" data-id="' + m.profileId + '">Revoke</button></td></tr>';
        }).join("") : '<tr><td colspan="6" align="center">कोई Premium सदस्य नहीं है।</td></tr>';
    }

    function renderAds() {
        var body = document.getElementById("adsTableBody");
        if (!body) return;
        var ads = getAds();
        body.innerHTML = ads.length ? ads.map(function (a) {
            var canManage = inMyCity(a.city);
            var actions = statusChip(a.status || "Pending");
            if (canManage) {
                if (a.status !== "Approved") actions += '<button class="btn" data-action="approve-ad" data-id="' + a.id + '">✅</button>';
                if (a.status !== "Rejected") actions += '<button class="btn" data-action="reject-ad" data-id="' + a.id + '">❌</button>';
            } else {
                actions += ' <span style="font-size:11px;color:#999;">(' + (a.city || "-") + ' के Admin द्वारा Manage होगा)</span>';
            }
            return '<tr><td>' + a.id + '</td><td>' + a.businessName + '</td><td>' + (a.city || "-") + '</td><td>' + (a.plan || "-") + '</td><td>' + (a.website || "-") +
                '</td><td>' + actions +
                '</td></tr>';
        }).join("") : '<tr><td colspan="6" align="center">कोई विज्ञापन नहीं है।</td></tr>';
    }

    function renderReports() {
        var el = document.getElementById("reportsContent");
        if (!el) return;
        var members = getMembers();
        var payments = getPayments();
        var totalRevenue = payments.reduce(function (sum, p) { return sum + (parseInt(p.amount, 10) || 0); }, 0);
        el.innerHTML =
            '<div class="dashboard">' +
            '<div class="card"><h3>Total Registrations</h3><h1>' + members.length + '</h1></div>' +
            '<div class="card"><h3>Total Revenue</h3><h1>₹' + totalRevenue + '</h1></div>' +
            '<div class="card"><h3>Total Ads Requests</h3><h1>' + getAds().length + '</h1></div>' +
            '</div>';
    }

    function renderSettings() {
        var el = document.getElementById("settingsContent");
        if (!el) return;
        var settings = JSON.parse(localStorage.getItem("ssjSiteSettings") || '{"phone":"+91 9785229081","email":"support@ssjmatrimony.in"}');
        el.innerHTML =
            '<div class="card" style="max-width:420px;">' +
            '<label>Support Phone</label><input id="settingsPhone" type="text" value="' + settings.phone + '"/>' +
            '<label>Support Email</label><input id="settingsEmail" type="text" value="' + settings.email + '"/><br/><br/>' +
            '<button class="btn" id="saveSettingsBtn" type="button">Save Settings</button>' +
            '<p id="settingsMsg"></p></div>';

        document.getElementById("saveSettingsBtn").addEventListener("click", function () {
            var updated = {
                phone: document.getElementById("settingsPhone").value.trim(),
                email: document.getElementById("settingsEmail").value.trim()
            };
            localStorage.setItem("ssjSiteSettings", JSON.stringify(updated));
            document.getElementById("settingsMsg").textContent = "✅ Settings saved.";
        });
    }

    function renderAdmins() {
        var body = document.getElementById("adminsTableBody");
        var btn = document.getElementById("manageAdminsBtn");
        var section = document.getElementById("manageAdminsSection");
        var isSuper = adminUser.role === "Super Admin";
        if (btn) btn.style.display = isSuper ? "block" : "none";
        if (!isSuper) { if (section) section.style.display = "none"; return; }
        if (section) section.style.display = "block";

        var admins = [{ adminId: "ADM001", name: "Super Admin", username: "9785229081", phone: "9785229081", city: "-", role: "Super Admin" }].concat(getAdmins());
        if (body) {
            body.innerHTML = admins.map(function (a) {
                var canDelete = a.adminId !== "ADM001";
                return '<tr><td>' + a.adminId + '</td><td>' + (a.name || '-') + '</td><td>' + a.username + '</td><td>' + (a.phone || '-') + '</td><td>' + (a.city || '-') + '</td><td>' + a.role + '</td><td>' +
                    (canDelete ? '<button class="btn" data-action="delete-admin" data-id="' + a.adminId + '">🗑 Delete</button>' : '—') +
                    '</td></tr>';
            }).join("");
        }
    }

    function renderPendingAdmins() {
        var body = document.getElementById("pendingAdminsTableBody");
        if (!body) return;
        var isSuper = adminUser.role === "Super Admin";
        if (!isSuper) return;
        var pending = getPendingAdmins();
        if (pending.length === 0) {
            body.innerHTML = '<tr><td colspan="6" align="center">कोई pending request नहीं है।</td></tr>';
            return;
        }
        body.innerHTML = pending.map(function (p) {
            return '<tr><td>' + p.name + '</td><td>' + p.username + '</td><td>' + p.phone + '</td><td>' + (p.city || '-') + '</td><td>' + p.status + '</td><td>' +
                '<button class="btn" data-action="approve-admin" data-id="' + p.requestId + '">✅ Approve</button> ' +
                '<button class="btn" data-action="reject-admin" data-id="' + p.requestId + '">❌ Reject</button>' +
                '</td></tr>';
        }).join("");
    }

    function renderAll() {
        renderStats();
        renderMembers();
        renderPending();
        renderPayments();
        renderPremium();
        renderAds();
        renderReports();
        renderSettings();
        renderAdmins();
        renderPendingAdmins();
    }

    /* ---------- row actions (event delegation) ---------- */
    document.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-action]");
        if (!btn) return;
        var action = btn.getAttribute("data-action");
        var id = btn.getAttribute("data-id");

        switch (action) {
            case "view":
                window.open("profile.html?id=" + encodeURIComponent(id), "_blank");
                break;
            case "edit":
                var members = getMembers();
                var m = members.filter(function (x) { return x.profileId === id; })[0];
                if (!m) return;
                var newCity = prompt("शहर अपडेट करें:", m.city || "");
                if (newCity === null) return;
                var newMobile = prompt("मोबाइल अपडेट करें:", m.mobile || "");
                if (newMobile === null) return;
                updateMember(id, { city: newCity.trim(), mobile: newMobile.trim() });
                break;
            case "approve":
                updateMember(id, { status: "Approved" });
                break;
            case "reject":
                if (confirm("क्या आप वाकई इस प्रोफ़ाइल को अस्वीकार करना चाहते हैं?")) updateMember(id, { status: "Rejected" });
                break;
            case "premium":
                updateMember(id, { premium: { active: true, plan: "Admin Granted", status: "Active", since: new Date().toLocaleDateString("en-GB") } });
                break;
            case "waiver":
                updateMember(id, { premium: { active: true, plan: "Fee Waiver", status: "Active", since: new Date().toLocaleDateString("en-GB") } });
                break;
            case "revoke-premium":
                updateMember(id, { premium: { active: false, plan: null } });
                break;
            case "approve-admin":
                approveAdminRequest(id);
                break;
            case "reject-admin":
                if (confirm("क्या आप वाकई इस Admin अनुरोध को अस्वीकार करना चाहते हैं?")) rejectAdminRequest(id);
                break;
            case "delete":
                if (confirm("क्या आप वाकई इस सदस्य को हटाना चाहते हैं?")) {
                    saveMembers(getMembers().filter(function (m) { return m.profileId !== id; }));
                    renderAll();
                }
                break;
            case "approve-ad":
                saveAds(getAds().map(function (a) { return a.id === id ? Object.assign({}, a, { status: "Approved" }) : a; }));
                if (typeof SSJ !== "undefined" && SSJ.cloud) { SSJ.cloud.updateAdStatus(id, "Approved"); }
                renderAll();
                break;
            case "reject-ad":
                saveAds(getAds().map(function (a) { return a.id === id ? Object.assign({}, a, { status: "Rejected" }) : a; }));
                if (typeof SSJ !== "undefined" && SSJ.cloud) { SSJ.cloud.updateAdStatus(id, "Rejected"); }
                renderAll();
                break;
            case "delete-admin":
                saveAdmins(getAdmins().filter(function (a) { return a.adminId !== id; }));
                renderAll();
                break;
        }
    });

    /* ---------- sidebar navigation (smooth scroll) ---------- */
    function scrollToId(id) {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.showDashboard = function () { scrollToId("dashboardSection"); };
    window.showMembers = function () { scrollToId("membersSection"); };
    window.showPending = function () { scrollToId("pendingSection"); };
    window.showPayments = function () { scrollToId("paymentsSection"); };
    window.showPremium = function () { scrollToId("premiumSection"); };
    window.showAdvertisements = function () { scrollToId("advertisementsSection"); };
    window.showReports = function () { scrollToId("reportsSection"); };
    window.showSettings = function () { scrollToId("settingsSectionTitle"); };
    window.showManageAdmins = function () { scrollToId("manageAdminsSection"); };
    window.logout = function () {
        localStorage.removeItem("adminUser");
        window.location.href = "admin-login.html";
    };

    var newAdminPhotoData = "";
    document.addEventListener("DOMContentLoaded", function () {
        var photoInput = document.getElementById("newAdminPhoto");
        var photoPreview = document.getElementById("newAdminPhotoPreview");
        if (photoInput && photoPreview) {
            photoInput.addEventListener("change", function () {
                var file = photoInput.files && photoInput.files[0];
                if (file) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        newAdminPhotoData = e.target.result;
                        photoPreview.src = newAdminPhotoData;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });

    window.createAdminSubmit = async function () {
        var name = (document.getElementById("newAdminName").value || "").trim();
        var username = (document.getElementById("newAdminUsername").value || "").trim();
        var password = (document.getElementById("newAdminPassword").value || "").trim();
        var phone = (document.getElementById("newAdminPhone").value || "").trim();
        var city = (document.getElementById("newAdminCity").value || "").trim();
        var address = (document.getElementById("newAdminAddress").value || "").trim();
        var aadhar = (document.getElementById("newAdminAadhar").value || "").trim();
        var feeTxn = (document.getElementById("newAdminFeeTxn").value || "").trim();
        var msg = document.getElementById("createAdminMsg");

        if (!name || !username || !password || !phone) {
            msg.textContent = "कृपया नाम, Username, Password और मोबाइल नंबर भरें।";
            return;
        }
        if (!/^\d{10}$/.test(phone)) {
            msg.textContent = "कृपया सही 10 अंकों का मोबाइल नंबर डालें।";
            return;
        }
        if (aadhar && !/^\d{12}$/.test(aadhar)) {
            msg.textContent = "आधार नंबर 12 अंकों का होना चाहिए।";
            return;
        }

        var allAdmins = getAdmins();
        var usernameTaken = allAdmins.some(function (a) { return a.username === username; }) || username === "9785229081";
        if (usernameTaken) {
            msg.textContent = "यह Username पहले से उपयोग में है, कोई और चुनें।";
            return;
        }

        var pending = getPendingAdmins();
        var hashedPassword = (typeof SSJ !== "undefined" && SSJ.hashPassword)
            ? await SSJ.hashPassword(password)
            : password;
        pending.push({
            requestId: "REQ" + Date.now(),
            name: name,
            username: username,
            password: hashedPassword,
            phone: phone,
            city: city,
            address: address,
            aadhar: aadhar,
            feeTxn: feeTxn,
            photo: newAdminPhotoData,
            status: "Pending"
        });
        savePendingAdmins(pending);

        document.getElementById("newAdminName").value = "";
        document.getElementById("newAdminUsername").value = "";
        document.getElementById("newAdminPassword").value = "";
        document.getElementById("newAdminPhone").value = "";
        document.getElementById("newAdminCity").value = "";
        document.getElementById("newAdminAddress").value = "";
        document.getElementById("newAdminAadhar").value = "";
        document.getElementById("newAdminFeeTxn").value = "";
        document.getElementById("newAdminPhoto").value = "";
        newAdminPhotoData = "";
        document.getElementById("newAdminPhotoPreview").src = "../images/user.png";

        msg.textContent = "✅ अनुरोध भेज दिया गया — Super Admin की मंज़ूरी के बाद Admin ID जनरेट होगी।";
        renderPendingAdmins();
    };

    window.approveAdminRequest = function (requestId) {
        var pending = getPendingAdmins();
        var idx = pending.findIndex(function (p) { return p.requestId === requestId; });
        if (idx === -1) return;
        var req = pending[idx];
        pending.splice(idx, 1);
        savePendingAdmins(pending);

        var admins = getAdmins();
        var newAdmin = {
            adminId: "ADM" + (100 + admins.length + 1),
            name: req.name,
            username: req.username,
            password: req.password,
            phone: req.phone,
            city: req.city,
            address: req.address,
            aadhar: req.aadhar,
            feeTxn: req.feeTxn,
            photo: req.photo,
            role: "Admin",
            status: "Approved"
        };
        admins.push(newAdmin);
        saveAdmins(admins);
        if (typeof SSJ !== "undefined" && SSJ.cloud) { SSJ.cloud.saveAdmin(newAdmin); }
        renderPendingAdmins();
        renderAdmins();
    };

    window.rejectAdminRequest = function (requestId) {
        var pending = getPendingAdmins();
        pending = pending.filter(function (p) { return p.requestId !== requestId; });
        savePendingAdmins(pending);
        renderPendingAdmins();
    };

    /* ---------- search ---------- */
    document.addEventListener("DOMContentLoaded", function () {
        var searchBox = document.getElementById("searchMember");
        if (searchBox) searchBox.addEventListener("input", renderMembers);
        renderAll(); // instant render from whatever's cached locally
        syncFromCloud(); // then pull the real cross-device data and re-render
    });

    /* ---------- cloud sync (cross-device) ---------- */
    function mergeById(localList, cloudList, idKey) {
        var map = {};
        localList.forEach(function (item) { map[item[idKey]] = item; });
        cloudList.forEach(function (item) { map[item[idKey]] = Object.assign({}, map[item[idKey]] || {}, item); });
        var out = [];
        for (var k in map) out.push(map[k]);
        return out;
    }

    function syncFromCloud() {
        if (typeof SSJ === "undefined" || !SSJ.cloud) return;

        SSJ.cloud.getAllMembers().then(function (cloudMembers) {
            if (cloudMembers && cloudMembers.length) {
                saveMembers(mergeById(getMembers(), cloudMembers, "profileId"));
            }
            renderAll();
        });

        SSJ.cloud.getAllAds().then(function (cloudAds) {
            if (cloudAds && cloudAds.length) {
                saveAds(mergeById(getAds(), cloudAds, "id"));
            }
            renderAll();
        });

        SSJ.cloud.getAllAdmins().then(function (cloudAdmins) {
            if (cloudAdmins && cloudAdmins.length) {
                saveAdmins(mergeById(getAdmins(), cloudAdmins, "adminId"));
            }
            renderAll();
        });
    }

})();
