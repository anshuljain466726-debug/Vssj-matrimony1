/*==================================================
        SSJ MATRIMONY — dashboard.js
        Member dashboard (sidebar layout): profile card,
        stat cards, photo gallery, profile-completeness,
        recent activity and membership upgrade.
        Demo data only — everything lives in localStorage.
==================================================*/

(function () {

    var stored = SSJ.requireLogin("login.html");
    if (!stored) return;

    var profile = SSJ.getMyMergedProfile() || stored;

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = (value === undefined || value === null || value === "") ? el.textContent : value;
    }

    /* ---------- Header / profile card ---------- */
    var name = SSJ.fullName(profile) || "सदस्य";
    setText("memberName", name.split(" ")[0] || "सदस्य");
    setText("name", name);
    setText("memberID", profile.profileId || "—");
    setText("age", profile.age ? (profile.age + " वर्ष") : "—");
    setText("education", profile.education || "—");
    setText("occupation", profile.profession || "—");
    setText("city", profile.city || "—");

    var profilePhotoEl = document.getElementById("profilePhoto");
    if (profilePhotoEl && profile.photo) profilePhotoEl.src = profile.photo;

    /* ---------- Photo gallery ---------- */
    var photos = (profile.photos && profile.photos.length) ? profile.photos : [];
    for (var i = 1; i <= 4; i++) {
        var img = document.getElementById("photo" + i);
        if (!img) continue;
        if (i === 1 && profile.photo) {
            img.src = profile.photo;
        } else if (photos[i - 1]) {
            img.src = photos[i - 1];
        }
    }

    /* ---------- Stat cards (stable demo numbers) ---------- */
    var sentInterests = SSJ.readJSON("sentInterests", []);
    var shortlist = SSJ.readJSON("ssjShortlist", []);
    setText("totalVisitors", SSJ.hashNumber(profile.profileId + "v", 8, 240));
    setText("interestReceived", SSJ.hashNumber(profile.profileId + "r", 0, 12));
    setText("interestSent", sentInterests.length);
    setText("shortlistCount", shortlist.length);

    var premiumCard = document.querySelector(".card.premium h3");
    if (premiumCard) {
        premiumCard.textContent = (profile.premium && profile.premium.active) ? (profile.premium.plan || "PREMIUM") : "FREE";
    }

    /* ---------- Profile completeness ---------- */
    var trackedFields = ["firstName", "lastName", "gender", "dob", "maritalStatus", "fatherName",
        "motherName", "fatherGotra", "motherGotra", "address", "state", "city", "mobile", "education", "profession", "photo"];
    var filled = trackedFields.filter(function (f) { return profile[f] && String(profile[f]).trim() !== ""; }).length;
    var percent = Math.round((filled / trackedFields.length) * 100);
    var bar = document.getElementById("profileProgress");
    if (bar) {
        bar.style.width = percent + "%";
        bar.textContent = percent + "%";
    }

    /* ---------- Recent activity ---------- */
    var activityBody = document.getElementById("activityTable");
    if (activityBody) {
        var rows = [];
        rows.push({ date: profile.registeredOn || SSJ.fmtDate(), activity: "प्रोफ़ाइल पंजीकृत हुई", status: "पूर्ण" });
        if (profile.status === "Approved") {
            rows.push({ date: SSJ.fmtDate(), activity: "प्रोफ़ाइल वेरिफाई हुई", status: "स्वीकृत" });
        } else if (profile.status === "Rejected") {
            rows.push({ date: SSJ.fmtDate(), activity: "प्रोफ़ाइल समीक्षा में अस्वीकृत", status: "अस्वीकृत" });
        } else {
            rows.push({ date: SSJ.fmtDate(), activity: "प्रोफ़ाइल समीक्षा हेतु लंबित", status: "लंबित" });
        }
        if (profile.premium && profile.premium.active) {
            rows.push({ date: profile.premium.since || SSJ.fmtDate(), activity: profile.premium.plan + " सदस्यता सक्रिय", status: "सक्रिय" });
        }
        if (sentInterests.length) {
            rows.push({ date: SSJ.fmtDate(), activity: sentInterests.length + " प्रोफ़ाइल को रुचि भेजी गई", status: "भेजी गई" });
        }
        activityBody.innerHTML = rows.map(function (r) {
            return "<tr><td>" + r.date + "</td><td>" + r.activity + "</td><td>" + r.status + "</td></tr>";
        }).join("");
    }

    /* ---------- Membership upgrade ---------- */
    var planSelect = document.getElementById("membershipPlan");
    if (planSelect) {
        planSelect.addEventListener("change", function () {
            var val = planSelect.value;
            if (!val || val === "FREE") return;
            var label = planSelect.options[planSelect.selectedIndex].textContent.trim();
            SSJ.writeJSON("ssjPendingPlan", { amount: val, label: label, profileId: profile.profileId });
            window.location.href = "registration-payment.html?plan=" + encodeURIComponent(val);
        });
    }

    /* ---------- Logout ---------- */
    var logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            try { sessionStorage.removeItem("ssjLoggedIn"); } catch (e) {}
        });
    }

})();
