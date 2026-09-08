/*==================================================
        SSJ MATRIMONY — ssj-data.js
        Shared helpers for the browser-only demo data
        layer (localStorage). Loaded before the
        page-specific script on every logged-in page.
==================================================*/

var SSJ = (function () {

    // ---------- Password hashing (SHA-256, Web Crypto API) ----------
    // Passwords are never stored or compared as plain text anymore —
    // every place that saves or checks a password hashes it first with
    // this function. Works over file:// and https:// (both are treated
    // as "secure contexts" by Chrome, which is required for crypto.subtle).
    function hashPassword(password) {
        var text = String(password || "");
        if (!window.crypto || !window.crypto.subtle) {
            return Promise.resolve(text); // very old browser — fall back to plain text
        }
        var data = new TextEncoder().encode(text);
        return window.crypto.subtle.digest("SHA-256", data).then(function (buf) {
            return Array.from(new Uint8Array(buf))
                .map(function (b) { return b.toString(16).padStart(2, "0"); })
                .join("");
        });
    }

    function readJSON(key, fallback) {
        try {
            var v = JSON.parse(localStorage.getItem(key));
            return (v === null || v === undefined) ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    function getMembers() {
        return readJSON("ssjMembers", []);
    }

    function saveMembers(list) {
        return writeJSON("ssjMembers", list);
    }

    // Logged-in member's own snapshot (set at registration / login)
    function getMyProfile() {
        return readJSON("ssjProfile", null);
    }

    function saveMyProfile(profile) {
        return writeJSON("ssjProfile", profile);
    }

    // The freshest copy of "my" record: prefer the entry inside
    // ssjMembers (which admin.js can update — approval, premium…)
    // but fall back to the ssjProfile snapshot for any field the
    // members-list copy is missing.
    function getMyMergedProfile() {
        var mine = getMyProfile();
        if (!mine) return null;
        var list = getMembers();
        var fresh = list.filter(function (m) { return m.profileId === mine.profileId; })[0];
        if (!fresh) return mine;
        var merged = {};
        for (var k in mine) merged[k] = mine[k];
        for (var k2 in fresh) merged[k2] = fresh[k2];
        return merged;
    }

    function isLoggedIn() {
        try { return sessionStorage.getItem("ssjLoggedIn") === "1"; } catch (e) { return false; }
    }

    function requireLogin(loginPage) {
        var mine = getMyProfile();
        if (!mine) {
            window.location.href = loginPage || "login.html";
            return null;
        }
        return mine;
    }

    // Small deterministic "random" number from a string — used so
    // demo stats (visitors etc.) stay stable across reloads instead
    // of jumping every time the page renders.
    function hashNumber(str, min, max) {
        str = String(str || "SSJ");
        var h = 0;
        for (var i = 0; i < str.length; i++) {
            h = (h * 31 + str.charCodeAt(i)) >>> 0;
        }
        var range = (max - min) + 1;
        return min + (h % range);
    }

    function fullName(p) {
        return ((p && p.firstName) || "" || "").toString().trim()
            ? ((p.firstName || "") + " " + (p.lastName || "")).trim()
            : "";
    }

    function fmtDate(d) {
        d = d || new Date();
        return d.toLocaleDateString("en-GB");
    }

    /* ---------- Cloud (Firestore) — real, cross-device data ----------
       Every function here resolves to a safe fallback (null / [] / false)
       if ssjDb isn't available (offline, or firebase-init.js not loaded),
       so pages that call these never crash — they just behave like the
       old local-only demo. */

    function cloudSaveMember(profile) {
        if (!window.ssjDb || !profile || !profile.profileId) return Promise.resolve(false);
        return window.ssjDb.collection("members").doc(profile.profileId).set(profile, { merge: true })
            .then(function () { return true; })
            .catch(function () { return false; });
    }

    function cloudGetMember(profileId) {
        if (!window.ssjDb || !profileId) return Promise.resolve(null);
        return window.ssjDb.collection("members").doc(profileId).get()
            .then(function (doc) { return doc.exists ? doc.data() : null; })
            .catch(function () { return null; });
    }

    function cloudGetAllMembers() {
        if (!window.ssjDb) return Promise.resolve([]);
        return window.ssjDb.collection("members").get()
            .then(function (snap) {
                var list = [];
                snap.forEach(function (doc) { list.push(doc.data()); });
                return list;
            })
            .catch(function () { return []; });
    }

    function cloudFindLogin(mobile, password) {
        if (!window.ssjDb) return Promise.resolve(null);
        return window.ssjDb.collection("members").where("mobile", "==", mobile).get()
            .then(function (snap) {
                var found = null;
                snap.forEach(function (doc) {
                    var d = doc.data();
                    if (d.password === password) found = d;
                });
                return found;
            })
            .catch(function () { return null; });
    }

    function cloudSendInterest(fromId, toId) {
        if (!window.ssjDb || !fromId || !toId) return Promise.resolve(false);
        return window.ssjDb.collection("interests")
            .where("fromProfileId", "==", fromId)
            .where("toProfileId", "==", toId)
            .get()
            .then(function (snap) {
                if (!snap.empty) return true; // already sent — don't duplicate
                return window.ssjDb.collection("interests").add({
                    fromProfileId: fromId,
                    toProfileId: toId,
                    status: "Pending",
                    createdOn: fmtDate()
                }).then(function () { return true; });
            })
            .catch(function () { return false; });
    }

    function cloudGetReceivedInterests(profileId) {
        if (!window.ssjDb || !profileId) return Promise.resolve([]);
        return window.ssjDb.collection("interests").where("toProfileId", "==", profileId).get()
            .then(function (snap) {
                var list = [];
                snap.forEach(function (doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    list.push(d);
                });
                return list;
            })
            .catch(function () { return []; });
    }

    function cloudGetSentInterests(profileId) {
        if (!window.ssjDb || !profileId) return Promise.resolve([]);
        return window.ssjDb.collection("interests").where("fromProfileId", "==", profileId).get()
            .then(function (snap) {
                var list = [];
                snap.forEach(function (doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    list.push(d);
                });
                return list;
            })
            .catch(function () { return []; });
    }

    function cloudRespondInterest(interestDocId, status) {
        if (!window.ssjDb || !interestDocId) return Promise.resolve(false);
        return window.ssjDb.collection("interests").doc(interestDocId).update({ status: status })
            .then(function () { return true; })
            .catch(function () { return false; });
    }

    /* ---------- Advertisements (cloud) ---------- */
    function cloudSaveAd(ad) {
        if (!window.ssjDb || !ad || !ad.id) return Promise.resolve(false);
        return window.ssjDb.collection("ads").doc(ad.id).set(ad, { merge: true })
            .then(function () { return true; })
            .catch(function () { return false; });
    }

    function cloudGetAllAds() {
        if (!window.ssjDb) return Promise.resolve([]);
        return window.ssjDb.collection("ads").get()
            .then(function (snap) {
                var list = [];
                snap.forEach(function (doc) { list.push(doc.data()); });
                return list;
            })
            .catch(function () { return []; });
    }

    function cloudUpdateAdStatus(adId, status) {
        if (!window.ssjDb || !adId) return Promise.resolve(false);
        return window.ssjDb.collection("ads").doc(adId).update({ status: status })
            .then(function () { return true; })
            .catch(function () { return false; });
    }

    /* ---------- Admin accounts (cloud) ---------- */
    function cloudSaveAdmin(admin) {
        if (!window.ssjDb || !admin || !admin.adminId) return Promise.resolve(false);
        return window.ssjDb.collection("admins").doc(admin.adminId).set(admin, { merge: true })
            .then(function () { return true; })
            .catch(function () { return false; });
    }

    function cloudGetAllAdmins() {
        if (!window.ssjDb) return Promise.resolve([]);
        return window.ssjDb.collection("admins").get()
            .then(function (snap) {
                var list = [];
                snap.forEach(function (doc) { list.push(doc.data()); });
                return list;
            })
            .catch(function () { return []; });
    }

    function cloudFindAdminLogin(username, password) {
        if (!window.ssjDb) return Promise.resolve(null);
        return window.ssjDb.collection("admins").where("username", "==", username).get()
            .then(function (snap) {
                var found = null;
                snap.forEach(function (doc) {
                    var d = doc.data();
                    if (d.password === password) found = d;
                });
                return found;
            })
            .catch(function () { return null; });
    }

    return {
        readJSON: readJSON,
        writeJSON: writeJSON,
        hashPassword: hashPassword,
        getMembers: getMembers,
        saveMembers: saveMembers,
        getMyProfile: getMyProfile,
        saveMyProfile: saveMyProfile,
        getMyMergedProfile: getMyMergedProfile,
        isLoggedIn: isLoggedIn,
        requireLogin: requireLogin,
        hashNumber: hashNumber,
        fullName: fullName,
        fmtDate: fmtDate,
        cloud: {
            saveMember: cloudSaveMember,
            getMember: cloudGetMember,
            getAllMembers: cloudGetAllMembers,
            findLogin: cloudFindLogin,
            sendInterest: cloudSendInterest,
            getReceivedInterests: cloudGetReceivedInterests,
            getSentInterests: cloudGetSentInterests,
            respondInterest: cloudRespondInterest,
            saveAd: cloudSaveAd,
            getAllAds: cloudGetAllAds,
            updateAdStatus: cloudUpdateAdStatus,
            saveAdmin: cloudSaveAdmin,
            getAllAdmins: cloudGetAllAdmins,
            findAdminLogin: cloudFindAdminLogin
        }
    };

})();
