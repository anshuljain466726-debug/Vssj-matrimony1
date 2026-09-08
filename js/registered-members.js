/*==================================================
        SSJ MATRIMONY — registered-members.js
        Lists every registered member (local device +
        Firestore cloud, so members from other devices show
        up too) with real Interest status vs the logged-in
        member — same behaviour as search.js.
==================================================*/

(function () {

    var SAMPLE_MEMBERS = [
        { profileId: "SSJ1001", firstName: "प्रिया", age: 26, state: "राजस्थान", city: "उदयपुर", education: "MBA", profession: "Business", photo: "../images/profile1.jpg" },
        { profileId: "SSJ1002", firstName: "राहुल", age: 24, state: "गुजरात", city: "अहमदाबाद", education: "B.Tech", profession: "Engineer", photo: "../images/profile2.jpg" },
        { profileId: "SSJ1003", firstName: "अंजलि", age: 29, state: "मध्य प्रदेश", city: "इंदौर", education: "CA", profession: "Chartered Accountant", photo: "../images/profile3.jpg" }
    ];

    function getNewMembers() {
        try {
            return JSON.parse(localStorage.getItem("ssjMembers")) || [];
        } catch (e) {
            return [];
        }
    }

    // ---------- My own Interest state (who I sent to / who sent me) ----------
    var sentToSet = {};
    var receivedFromMap = {};
    var myProfileId = null;

    function loadMyInterestState() {
        var me = (typeof SSJ !== "undefined" && SSJ.getMyProfile) ? SSJ.getMyProfile() : null;
        if (!me || !me.profileId || typeof SSJ === "undefined" || !SSJ.cloud) {
            return Promise.resolve();
        }
        myProfileId = me.profileId;

        var sentP = SSJ.cloud.getSentInterests(myProfileId).then(function (list) {
            (list || []).forEach(function (e) { sentToSet[e.toProfileId] = true; });
        });
        var recvP = SSJ.cloud.getReceivedInterests(myProfileId).then(function (list) {
            (list || []).forEach(function (e) {
                if (e.status === "Pending") { receivedFromMap[e.fromProfileId] = e; }
            });
        });

        return Promise.all([sentP, recvP]);
    }

    window.membersRespondInterest = function (interestId, status, btn) {
        if (typeof SSJ === "undefined" || !SSJ.cloud) return;
        var wrap = btn.closest(".profile-btns");
        SSJ.cloud.respondInterest(interestId, status).then(function (ok) {
            if (!ok) { alert("कुछ गलत हो गया, दोबारा प्रयास करें।"); return; }
            if (wrap) {
                wrap.innerHTML = status === "Accepted"
                    ? '<span class="interest-status Accepted">✅ स्वीकार किया गया</span>'
                    : '<span class="interest-status Rejected">❌ अस्वीकार किया गया</span>';
            }
        });
    };

    function buildCard(m, isNew) {
        var name = ((m.firstName || "") + " " + (m.lastName || "")).trim() || ("Profile " + m.profileId);
        var age = parseInt(m.age, 10);
        var photo = (m.photo && m.photo.indexOf("data:image") === 0) ? m.photo : (m.photo || "../images/user.png");
        var education = m.education || "-";
        var profession = m.profession || m.company || "-";
        var profileLink = isNew ? ("profile.html?id=" + encodeURIComponent(m.profileId)) : "login.html";

        var actionsHTML;
        var pendingFromThem = isNew ? receivedFromMap[m.profileId] : null;

        if (pendingFromThem) {
            actionsHTML =
                '<div class="profile-btns">' +
                '<a class="btn" href="' + profileLink + '">View Profile</a>' +
                '<button type="button" class="btn-outline" style="border-color:#2e7d32;color:#2e7d32;" onclick="membersRespondInterest(\'' + pendingFromThem.id + '\',\'Accepted\',this)">✔ Accept</button>' +
                '<button type="button" class="btn-outline" style="border-color:#c0392b;color:#c0392b;" onclick="membersRespondInterest(\'' + pendingFromThem.id + '\',\'Rejected\',this)">✖ Reject</button>' +
                '</div>';
        } else if (isNew && myProfileId && sentToSet[m.profileId]) {
            actionsHTML =
                '<div class="profile-btns">' +
                '<a class="btn" href="' + profileLink + '">View Profile</a>' +
                '<span class="interest-status Pending">💌 Interest भेजी गई</span>' +
                '</div>';
        } else {
            actionsHTML =
                '<div class="profile-btns">' +
                '<a class="btn" href="' + profileLink + '">View Profile</a>' +
                '<a class="btn-outline" href="' + profileLink + '"><i class="fas fa-heart"></i> Interest</a>' +
                '</div>';
        }

        var card = document.createElement("div");
        card.className = "profile-card";
        card.innerHTML =
            '<a href="' + profileLink + '" class="profile-photo-link">' +
            '<img alt="' + name + '" src="' + photo + '"/>' +
            '</a>' +
            '<div class="profile-content">' +
            '<h3>Profile ID : ' + m.profileId + (isNew ? ' <span style="font-size:11px;color:var(--gold-dark,#8C6221);font-weight:600;">नया</span>' : '') + '</h3>' +
            '<p><strong>नाम :</strong> ' + name + '</p>' +
            '<p><strong>आयु :</strong> ' + (isNaN(age) ? "-" : age + " वर्ष") + '</p>' +
            '<p><strong>राज्य :</strong> ' + (m.state || "-") + '</p>' +
            '<p><strong>शहर :</strong> ' + (m.city || "-") + '</p>' +
            '<p><strong>शिक्षा :</strong> ' + education + '</p>' +
            '<p><strong>व्यवसाय :</strong> ' + profession + '</p>' +
            actionsHTML +
            '</div>';
        return card;
    }

    document.addEventListener("DOMContentLoaded", function () {
        var grid = document.getElementById("allMembersGrid");
        if (!grid) return;

        loadMyInterestState().then(function () {

            grid.innerHTML = "";

            var shown = {};
            var newMembers = getNewMembers().slice().reverse().filter(function (m) {
                if (!m || !m.profileId || shown[m.profileId]) return false;
                if (myProfileId && m.profileId === myProfileId) return false;
                shown[m.profileId] = true;
                return true;
            });

            function renderAll(cloudMembers) {
                (cloudMembers || []).forEach(function (m) {
                    if (!m || !m.profileId || shown[m.profileId]) return;
                    if (myProfileId && m.profileId === myProfileId) return;
                    shown[m.profileId] = true;
                    newMembers.push(m);
                });

                var all = newMembers.map(function (m) { return { data: m, isNew: true }; })
                    .concat(SAMPLE_MEMBERS.map(function (m) { return { data: m, isNew: false }; }));

                if (!all.length) {
                    var empty = document.createElement("p");
                    empty.className = "members-empty";
                    empty.textContent = "अभी तक कोई सदस्य पंजीकृत नहीं है।";
                    grid.appendChild(empty);
                    return;
                }

                all.forEach(function (item) {
                    grid.appendChild(buildCard(item.data, item.isNew));
                });
            }

            // Also pull real members registered on OTHER devices/browsers.
            if (typeof SSJ !== "undefined" && SSJ.cloud) {
                SSJ.cloud.getAllMembers().then(renderAll);
            } else {
                renderAll([]);
            }

        });
    });

})();
