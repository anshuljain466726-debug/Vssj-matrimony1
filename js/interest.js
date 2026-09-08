/*==================================================
        SSJ MATRIMONY — interest.js
        Received / Sent interests tabs.

        Real, cross-device interests: "Send Interest" (on
        profile.html) writes a doc to Firestore's "interests"
        collection. This page reads that collection to show
        who sent you interest, and lets you Accept/Reject —
        which updates the same Firestore doc so the sender
        sees the result too.

        If Firestore isn't available (offline / firebase-init.js
        missing), this page falls back to the old local-only
        demo data so it never breaks.
==================================================*/

(function () {

    var me = SSJ.requireLogin("login.html");
    if (!me) return;

    var hasCloud = (typeof SSJ !== "undefined" && !!SSJ.cloud);

    var SAMPLE = [
        { profileId: "SSJ1001", name: "प्रिया जी", age: 26, city: "उदयपुर", education: "MBA", profession: "Business", photo: "../images/profile1.jpg" },
        { profileId: "SSJ1002", name: "राहुल जी", age: 28, city: "अहमदाबाद", education: "B.Tech", profession: "Engineer", photo: "../images/profile2.jpg" },
        { profileId: "SSJ1003", name: "अंजलि जी", age: 24, city: "इंदौर", education: "CA", profession: "Chartered Accountant", photo: "../images/profile3.jpg" }
    ];

    function normalize(m) {
        return {
            profileId: m.profileId, name: "********", age: m.age, city: m.city,
            education: m.education, profession: m.profession || m.company,
            photo: (m.photo && m.photo.indexOf("data:image") === 0) ? m.photo : "../images/user.png"
        };
    }

    function findMemberLocal(profileId) {
        var fromSample = SAMPLE.filter(function (m) { return m.profileId === profileId; })[0];
        if (fromSample) return fromSample;
        var members = SSJ.getMembers();
        var m = members.filter(function (x) { return x.profileId === profileId; })[0];
        return m ? normalize(m) : null;
    }

    function resolveMember(profileId) {
        var local = findMemberLocal(profileId);
        if (local) return Promise.resolve(local);
        if (!hasCloud) return Promise.resolve(null);
        return SSJ.cloud.getMember(profileId).then(function (m) {
            return m ? normalize(m) : null;
        });
    }

    function card(entry, mode, member) {
        if (!member) return "";
        var actions = "";
        if (mode === "received") {
            if (entry.status === "Pending") {
                actions =
                    '<div class="interest-actions">' +
                    '<button style="background:#2e7d32;color:#fff;" onclick="SSJInterest.respond(\'' + entry.id + '\',\'Accepted\')">स्वीकार करें</button>' +
                    '<button style="background:#c0392b;color:#fff;" onclick="SSJInterest.respond(\'' + entry.id + '\',\'Rejected\')">अस्वीकार करें</button>' +
                    '</div>';
            }
        }
        return (
            '<div class="interest-card">' +
            '<img src="' + member.photo + '" alt="Profile">' +
            '<h3>' + member.profileId + '</h3>' +
            '<p>' + (member.age ? member.age + " वर्ष • " : "") + (member.city || "") + '</p>' +
            '<p>' + (member.education || "-") + ' • ' + (member.profession || "-") + '</p>' +
            '<span class="interest-status ' + entry.status + '">' + entry.status + '</span>' +
            actions +
            '</div>'
        );
    }

    function getReceivedEntries() {
        if (hasCloud) {
            return SSJ.cloud.getReceivedInterests(me.profileId);
        }
        var stored = SSJ.readJSON("ssjReceivedInterests", null);
        if (stored) return Promise.resolve(stored);
        var seeded = SAMPLE.slice(0, 2).map(function (m, i) {
            return { id: m.profileId, fromProfileId: m.profileId, status: i === 0 ? "Pending" : "Accepted" };
        });
        SSJ.writeJSON("ssjReceivedInterests", seeded);
        return Promise.resolve(seeded);
    }

    function getSentEntries() {
        if (hasCloud) {
            return SSJ.cloud.getSentInterests(me.profileId);
        }
        var ids = SSJ.readJSON("sentInterests", []);
        return Promise.resolve(ids.map(function (id) { return { id: id, toProfileId: id, status: "Pending" }; }));
    }

    function render(mode) {
        var grid = document.getElementById("interestGrid");
        if (!grid) return;

        grid.innerHTML = '<p class="interest-empty">लोड हो रहा है...</p>';
        var entriesPromise = (mode === "sent") ? getSentEntries() : getReceivedEntries();

        entriesPromise.then(function (entries) {
            entries = entries || [];
            if (!entries.length) {
                grid.innerHTML = '<p class="interest-empty">अभी तक कोई रुचि उपलब्ध नहीं है।</p>';
                return;
            }
            return Promise.all(entries.map(function (e) {
                var targetId = (mode === "sent") ? (e.toProfileId || e.profileId) : (e.fromProfileId || e.profileId);
                return resolveMember(targetId).then(function (member) {
                    return card(e, mode, member);
                });
            })).then(function (cards) {
                var html = cards.join("");
                grid.innerHTML = html || '<p class="interest-empty">अभी तक कोई रुचि उपलब्ध नहीं है।</p>';
            });
        });
    }

    window.switchInterestTab = function (tab) {
        var receivedBtn = document.getElementById("receivedTabBtn");
        var sentBtn = document.getElementById("sentTabBtn");
        if (receivedBtn) receivedBtn.classList.toggle("active", tab === "received");
        if (sentBtn) sentBtn.classList.toggle("active", tab === "sent");
        render(tab);
        try {
            var url = new URL(window.location.href);
            url.searchParams.set("tab", tab);
            window.history.replaceState({}, "", url);
        } catch (e) {}
    };

    window.SSJInterest = {
        respond: function (entryId, status) {
            if (hasCloud) {
                SSJ.cloud.respondInterest(entryId, status).then(function () {
                    render("received");
                });
            } else {
                var list = SSJ.readJSON("ssjReceivedInterests", []);
                list.forEach(function (e) { if (e.id === entryId) e.status = status; });
                SSJ.writeJSON("ssjReceivedInterests", list);
                render("received");
            }
        }
    };

    var params = new URLSearchParams(window.location.search);
    var initialTab = params.get("tab") === "sent" ? "sent" : "received";
    window.switchInterestTab(initialTab);

    var logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            try { sessionStorage.removeItem("ssjLoggedIn"); } catch (e) {}
        });
    }

})();
