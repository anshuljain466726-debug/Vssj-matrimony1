/*==================================================
        SSJ MATRIMONY — profile.js
        Renders a profile: the logged-in member's own
        profile by default, or another member's profile
        when opened as profile.html?id=SSJxxxxx (name /
        mobile stay masked until an interest is sent).

        If the requested member isn't in this browser's
        local data (e.g. they registered on a different
        device), we fall back to looking them up in
        Firestore so real, cross-device profiles work.
==================================================*/

(function () {

    var me = SSJ.requireLogin("login.html");
    if (!me) return;

    var params = new URLSearchParams(window.location.search);
    var viewId = params.get("id");
    var isOwn = !viewId || viewId === me.profileId;

    function render(data, isOwn) {
        var sentInterests = SSJ.readJSON("sentInterests", []);
        var alreadySent = sentInterests.indexOf(data.profileId) !== -1;
        var reveal = isOwn || alreadySent;

        function setText(id, value) {
            var el = document.getElementById(id);
            if (el) el.textContent = (value === undefined || value === null || value === "") ? "-" : value;
        }

        var name = SSJ.fullName(data) || "Member";
        setText("profileName", "👤 " + (reveal ? name : "********"));
        setText("profileId", data.profileId);

        var mainPhoto = document.getElementById("mainPhoto");
        if (mainPhoto) mainPhoto.src = data.photo || "../images/user.png";

        setText("fatherName", data.fatherName);
        setText("fatherGotra", data.fatherGotra || data.gotra);
        setText("motherName", data.motherName);
        setText("motherGotra", data.motherGotra);
        setText("profileGender", data.gender);
        setText("profileDob", reveal ? data.dob : "•••");
        setText("profileAge", data.age ? data.age + " वर्ष" : "-");
        setText("profileMarital", data.maritalStatus);
        setText("profileMobile", reveal ? data.mobile : "इंटरेस्ट भेजने के बाद दिखेगा");
        setText("profileWhatsapp", reveal ? (data.whatsapp || data.mobile) : "इंटरेस्ट भेजने के बाद दिखेगा");
        setText("profileState", data.state);
        setText("profileCity", data.city);
        setText("profileAddress", data.address);
        setText("profileEducation", data.education);
        setText("profileProfession", data.profession);

        setText("education", data.education);
        setText("profession", data.profession || data.company);
        setText("familyBusiness", data.familyBusiness);
        var familyCount = [data.brothers, data.sisters].filter(function (v) { return v; }).length
            ? ("भाई: " + (data.brothers || 0) + ", बहन: " + (data.sisters || 0))
            : "-";
        setText("familyMembers", familyCount);

        /* ---------- Photo gallery ---------- */
        var photos = (data.photos && data.photos.length) ? data.photos.slice(0, 4) : [];
        var thumbWrap = document.getElementById("galleryThumbnails");
        var mainImg = document.getElementById("galleryMainImg");
        var counter = document.getElementById("galleryCounter");
        if (thumbWrap) {
            var slots = [data.photo].concat(photos).filter(Boolean);
            if (!slots.length && mainImg) mainImg.src = "../images/no-image.png";
            thumbWrap.innerHTML = slots.map(function (src, i) {
                return '<img src="' + src + '" alt="Photo ' + (i + 1) + '" style="width:70px;height:70px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid var(--border,#E7D9BB);margin:4px;" data-idx="' + i + '">';
            }).join("");
            thumbWrap.querySelectorAll("img").forEach(function (thumb) {
                thumb.addEventListener("click", function () {
                    if (mainImg) mainImg.src = thumb.src;
                    if (counter) counter.textContent = "फोटो " + (parseInt(thumb.getAttribute("data-idx"), 10) + 1) + " / " + slots.length;
                });
            });
            if (slots.length && mainImg) {
                mainImg.src = slots[0];
                if (counter) counter.textContent = "फोटो 1 / " + slots.length;
            }
        }

        /* ---------- Interest button state ---------- */
        var interestBtn = document.getElementById("interestBtn");
        if (interestBtn) {
            if (isOwn) {
                interestBtn.style.display = "none";
            } else if (alreadySent) {
                interestBtn.disabled = true;
                interestBtn.textContent = "✅ Interest भेज दी गई";
                interestBtn.style.opacity = "0.75";
                interestBtn.style.cursor = "not-allowed";
            }
        }

        /* ---------- Own-photo change (own profile only) ---------- */
        var changeInput = document.getElementById("changePhotoInput");
        if (changeInput) {
            if (!isOwn) {
                changeInput.closest("div").style.display = "none";
            } else {
                changeInput.addEventListener("change", function () {
                    var file = changeInput.files && changeInput.files[0];
                    if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        if (mainPhoto) mainPhoto.src = e.target.result;
                        var mine = SSJ.getMyProfile();
                        if (mine) {
                            mine.photo = e.target.result;
                            SSJ.saveMyProfile(mine);
                            var allMembers = SSJ.getMembers();
                            var updatedList = allMembers.map(function (m) {
                                if (m.profileId === mine.profileId) {
                                    m.photo = e.target.result;
                                    return m;
                                }
                                return m;
                            });
                            SSJ.saveMembers(updatedList);
                            if (SSJ.cloud) { SSJ.cloud.saveMember(mine); }
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        }

        /* ---------- Print biodata (dashboard.html "PDF बायोडाटा" link) ---------- */
        if (params.get("print") === "1") {
            window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });
        }
    }

    if (isOwn) {
        render(SSJ.getMyMergedProfile() || me, true);
    } else {
        var members = SSJ.getMembers();
        var localMatch = members.filter(function (m) { return m.profileId === viewId; })[0];
        if (localMatch) {
            render(localMatch, false);
        } else if (SSJ.cloud) {
            // Not registered on this device/browser — look them up in Firestore.
            SSJ.cloud.getMember(viewId).then(function (cloudMember) {
                if (cloudMember) {
                    render(cloudMember, false);
                } else {
                    render(SSJ.getMyMergedProfile() || me, true);
                }
            });
        } else {
            render(SSJ.getMyMergedProfile() || me, true);
        }
    }

})();
