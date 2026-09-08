/*==================================================
        SSJ MATRIMONY — search.js
        Shows newly-registered members (local + cloud) and
        wires up the filter form. Also shows each card's real
        Interest status relative to the logged-in member:
        - Already sent  -> "भेजी गई" label (no duplicate send)
        - They sent us  -> Accept / Reject buttons right here
        - Otherwise     -> normal "Interest" link to their profile
==================================================*/

(function () {

    function getMembers() {
        try {
            return JSON.parse(localStorage.getItem("ssjMembers")) || [];
        } catch (e) {
            return [];
        }
    }

    function ageFromMember(m) {
        var n = parseInt(m.age, 10);
        return isNaN(n) ? "" : n;
    }

    // ---------- My own Interest state (who I sent to / who sent me) ----------
    var sentToSet = {};        // { toProfileId: true }
    var receivedFromMap = {};  // { fromProfileId: {id, status} }
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

    // ---------- Accept / Reject, called from the card buttons ----------
    window.searchRespondInterest = function (interestId, status, btn) {
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

    function buildCard(m) {
        var name = ((m.firstName || "") + " " + (m.lastName || "")).trim() || ("Profile " + m.profileId);
        var age = ageFromMember(m);
        var photo = (m.photo && m.photo.indexOf("data:image") === 0) ? m.photo : "../images/user.png";
        var education = m.education || "-";
        var profession = m.profession || m.company || "-";
        var profileLink = "profile.html?id=" + encodeURIComponent(m.profileId);

        var card = document.createElement("div");
        card.className = "profile-card";
        card.setAttribute("data-gender", m.gender || "");
        card.setAttribute("data-age", age);
        card.setAttribute("data-state", (m.state || "").trim());
        card.setAttribute("data-city", (m.city || "").trim());
        card.setAttribute("data-education", (education || "").trim());
        card.setAttribute("data-profession", (profession || "").trim());

        // Decide the action area: Accept/Reject | Already sent | normal Interest link
        var actionsHTML;
        var pendingFromThem = receivedFromMap[m.profileId];

        if (pendingFromThem) {
            actionsHTML =
                '<div class="profile-btns">' +
                '<a class="btn" href="' + profileLink + '">View Profile</a>' +
                '<button type="button" class="btn-outline" style="border-color:#2e7d32;color:#2e7d32;" onclick="searchRespondInterest(\'' + pendingFromThem.id + '\',\'Accepted\',this)">✔ Accept</button>' +
                '<button type="button" class="btn-outline" style="border-color:#c0392b;color:#c0392b;" onclick="searchRespondInterest(\'' + pendingFromThem.id + '\',\'Rejected\',this)">✖ Reject</button>' +
                '</div>';
        } else if (myProfileId && sentToSet[m.profileId]) {
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

        card.innerHTML =
            '<a href="' + profileLink + '" class="profile-photo-link">' +
            '<img alt="' + name + '" src="' + photo + '"/>' +
            '</a>' +
            '<div class="profile-content">' +
            '<h3>Profile ID : ' + m.profileId + ' <span style="font-size:11px;color:var(--gold-dark,#8C6221);font-weight:600;">नया</span></h3>' +
            '<p><strong>नाम :</strong> ' + name + '</p>' +
            '<p><strong>आयु :</strong> ' + (age ? age + " वर्ष" : "-") + '</p>' +
            '<p><strong>राज्य :</strong> ' + (m.state || "-") + '</p>' +
            '<p><strong>शहर :</strong> ' + (m.city || "-") + '</p>' +
            '<p><strong>शिक्षा :</strong> ' + education + '</p>' +
            '<p><strong>व्यवसाय :</strong> ' + profession + '</p>' +
            actionsHTML +
            '</div>';
        return card;
    }

    function renderNewMembers() {
        var grid = document.getElementById("profileGrid");
        if (!grid) return;

        loadMyInterestState().then(function () {

            var shown = {};
            function addCards(list) {
                // list is push-order (oldest first); reverse so the insertBefore
                // loop below ends with the newest registration on top
                list.slice().reverse().forEach(function (m) {
                    if (!m || !m.profileId || shown[m.profileId]) return;
                    if (myProfileId && m.profileId === myProfileId) return; // don't show my own card
                    shown[m.profileId] = true;
                    grid.insertBefore(buildCard(m), grid.firstChild);
                });
            }

            addCards(getMembers());

            // Also pull real members registered on OTHER devices/browsers,
            // so people can actually find and send interest to each other.
            if (typeof SSJ !== "undefined" && SSJ.cloud) {
                SSJ.cloud.getAllMembers().then(function (cloudMembers) {
                    addCards(cloudMembers);
                });
            }
        });
    }

    /* ---------- Filtering (works across sample + new cards) ---------- */
    function ageInRange(age, rangeLabel) {
        if (!rangeLabel) return true;
        if (!age) return false;
        if (rangeLabel === "40+") return age >= 40;
        var parts = rangeLabel.split("-").map(function (p) { return parseInt(p.trim(), 10); });
        return age >= parts[0] && age <= parts[1];
    }

    function applyFilters() {
        var grid = document.getElementById("profileGrid");
        if (!grid) return;

        var gender = (document.getElementById("searchGender") || {}).value || "";
        var ageRange = (document.getElementById("searchAge") || {}).value || "";
        var state = ((document.getElementById("searchState") || {}).value || "").trim().toLowerCase();
        var city = ((document.getElementById("searchCity") || {}).value || "").trim().toLowerCase();
        var education = ((document.getElementById("searchEducation") || {}).value || "").trim().toLowerCase();
        var profession = ((document.getElementById("searchProfession") || {}).value || "").trim().toLowerCase();

        var cards = grid.querySelectorAll(".profile-card");
        var visibleCount = 0;

        cards.forEach(function (card) {
            var cGender = card.getAttribute("data-gender") || "";
            var cAge = parseInt(card.getAttribute("data-age"), 10) || 0;
            var cState = (card.getAttribute("data-state") || "").toLowerCase();
            var cCity = (card.getAttribute("data-city") || "").toLowerCase();
            var cEducation = (card.getAttribute("data-education") || "").toLowerCase();
            var cProfession = (card.getAttribute("data-profession") || "").toLowerCase();

            var match = true;
            if (gender && cGender && cGender !== gender) match = false;
            if (match && ageRange && !ageInRange(cAge, ageRange)) match = false;
            if (match && state && cState.indexOf(state) === -1) match = false;
            if (match && city && cCity.indexOf(city) === -1) match = false;
            if (match && education && cEducation.indexOf(education) === -1) match = false;
            if (match && profession && cProfession.indexOf(profession) === -1) match = false;

            card.style.display = match ? "" : "none";
            if (match) visibleCount++;
        });

        var emptyMsg = document.getElementById("searchEmptyMsg");
        if (!emptyMsg) {
            emptyMsg = document.createElement("p");
            emptyMsg.id = "searchEmptyMsg";
            emptyMsg.style.cssText = "grid-column:1/-1;text-align:center;color:var(--gray,#7C6E5E);padding:30px 0;";
            emptyMsg.textContent = "कोई मिलता-जुलता प्रोफाइल नहीं मिला। कृपया अलग फ़िल्टर आज़माएं।";
            grid.appendChild(emptyMsg);
        }
        emptyMsg.style.display = visibleCount === 0 ? "block" : "none";
    }

    function resetFilters() {
        ["searchGender", "searchAge", "searchState", "searchCity", "searchEducation", "searchProfession"]
            .forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.value = "";
            });
        applyFilters();
    }

    document.addEventListener("DOMContentLoaded", function () {
        var grid = document.getElementById("profileGrid");
        if (grid) {
            grid.querySelectorAll(".profile-card").forEach(function (card) {
                if (card.hasAttribute("data-gender")) return;
                var text = card.textContent;
                var ageMatch = text.match(/आयु\s*:\s*(\d+)/);
                var stateMatch = text.match(/राज्य\s*:\s*([^\n]+)/);
                var cityMatch = text.match(/शहर\s*:\s*([^\n]+)/);
                var eduMatch = text.match(/शिक्षा\s*:\s*([^\n]+)/);
                var proMatch = text.match(/व्यवसाय\s*:\s*([^\n]+)/);
                card.setAttribute("data-gender", "");
                card.setAttribute("data-age", ageMatch ? ageMatch[1] : "");
                card.setAttribute("data-state", stateMatch ? stateMatch[1].trim() : "");
                card.setAttribute("data-city", cityMatch ? cityMatch[1].trim() : "");
                card.setAttribute("data-education", eduMatch ? eduMatch[1].trim() : "");
                card.setAttribute("data-profession", proMatch ? proMatch[1].trim() : "");
            });
        }

        renderNewMembers();

        var searchBtn = document.getElementById("searchBtn");
        var resetBtn = document.getElementById("resetBtn");
        if (searchBtn) searchBtn.addEventListener("click", applyFilters);
        if (resetBtn) resetBtn.addEventListener("click", resetFilters);
    });

})();
