/*==================================================
        SSJ MATRIMONY — forgot-password.js
        3-step password reset using the security
        question / answer saved at registration.
==================================================*/

(function () {

    var steps = document.querySelectorAll(".step-content");
    var stepIndicators = document.querySelectorAll(".step-wrapper .step");
    var progressBar = document.getElementById("progressBar");
    var msgEl = document.getElementById("resetMsg");
    var current = 0;
    var matchedMember = null;

    function showMsg(text, ok) {
        if (!msgEl) return;
        msgEl.textContent = text || "";
        msgEl.style.color = ok ? "#2e7d32" : "#c0392b";
    }

    function goTo(index) {
        current = index;
        steps.forEach(function (s, i) { s.classList.toggle("active", i === current); });
        stepIndicators.forEach(function (s, i) {
            s.classList.toggle("active", i === current);
            s.classList.toggle("completed", i < current);
        });
        if (progressBar) progressBar.style.width = (((current + 1) / steps.length) * 100) + "%";
        showMsg("");
    }

    function findMember(profileId, mobile) {
        var all = JSON.parse(localStorage.getItem("ssjMembers") || "[]");
        var own = JSON.parse(localStorage.getItem("ssjProfile") || "null");
        if (own && !all.some(function (m) { return m.profileId === own.profileId; })) all.push(own);
        return all.filter(function (m) {
            return m.profileId === profileId && (m.mobile || "") === mobile;
        })[0] || null;
    }

    /* ---------- Step 1 ---------- */
    var step1Next = document.getElementById("step1Next");
    if (step1Next) {
        step1Next.addEventListener("click", async function () {
            var profileId = (document.getElementById("profileId").value || "").trim();
            var mobile = (document.getElementById("mobile").value || "").trim();

            if (!profileId || !/^\d{10}$/.test(mobile)) {
                showMsg("कृपया सही Profile ID और 10 अंकों का मोबाइल नंबर डालें।");
                return;
            }

            matchedMember = findMember(profileId, mobile);

            // Not found on this browser — check the cloud too, so a member
            // can reset their password from any device, not just the one
            // they registered on.
            if (!matchedMember && typeof SSJ !== "undefined" && SSJ.cloud) {
                var cloudMembers = await SSJ.cloud.getAllMembers();
                matchedMember = cloudMembers.filter(function (m) {
                    return m.profileId === profileId && (m.mobile || "") === mobile;
                })[0] || null;
            }

            if (!matchedMember) {
                showMsg("इस Profile ID और मोबाइल नंबर से कोई खाता नहीं मिला।");
                return;
            }
            if (!matchedMember.securityQuestion1) {
                showMsg("इस खाते के लिए सुरक्षा प्रश्न सेट नहीं हैं। कृपया सहायता हेतु संपर्क करें।");
                return;
            }

            document.getElementById("qLabel1").textContent = matchedMember.securityQuestion1;
            document.getElementById("qLabel2").textContent = matchedMember.securityQuestion2;
            document.getElementById("qLabel3").textContent = matchedMember.securityQuestion3;

            goTo(1);
        });
    }

    /* ---------- Step 2 ---------- */
    var step2Prev = document.getElementById("step2Prev");
    var step2Next = document.getElementById("step2Next");
    if (step2Prev) step2Prev.addEventListener("click", function () { goTo(0); });
    if (step2Next) {
        step2Next.addEventListener("click", function () {
            var a1 = (document.getElementById("answer1").value || "").trim().toLowerCase();
            var a2 = (document.getElementById("answer2").value || "").trim().toLowerCase();
            var a3 = (document.getElementById("answer3").value || "").trim().toLowerCase();

            if (!a1 || !a2 || !a3) {
                showMsg("कृपया तीनों प्रश्नों के उत्तर दें।");
                return;
            }
            if (a1 !== matchedMember.securityAnswer1 || a2 !== matchedMember.securityAnswer2 || a3 !== matchedMember.securityAnswer3) {
                showMsg("एक या अधिक उत्तर सही नहीं हैं। कृपया दोबारा प्रयास करें।");
                return;
            }
            goTo(2);
        });
    }

    /* ---------- Step 3 ---------- */
    var step3Prev = document.getElementById("step3Prev");
    var resetSubmit = document.getElementById("resetSubmit");
    if (step3Prev) step3Prev.addEventListener("click", function () { goTo(1); });
    if (resetSubmit) {
        resetSubmit.addEventListener("click", async function () {
            var pwd = document.getElementById("newPassword").value;
            var confirm = document.getElementById("confirmNewPassword").value;

            if (!pwd || pwd.length < 6) {
                showMsg("पासवर्ड कम से कम 6 अक्षर का होना चाहिए।");
                return;
            }
            if (pwd !== confirm) {
                showMsg("पासवर्ड मेल नहीं खा रहे हैं।");
                return;
            }

            var hashedPwd = (typeof SSJ !== "undefined" && SSJ.hashPassword)
                ? await SSJ.hashPassword(pwd)
                : pwd;

            var all = JSON.parse(localStorage.getItem("ssjMembers") || "[]");
            var updated = false;
            all = all.map(function (m) {
                if (m.profileId === matchedMember.profileId) { m.password = hashedPwd; updated = true; }
                return m;
            });
            if (updated) localStorage.setItem("ssjMembers", JSON.stringify(all));

            var own = JSON.parse(localStorage.getItem("ssjProfile") || "null");
            if (own && own.profileId === matchedMember.profileId) {
                own.password = hashedPwd;
                localStorage.setItem("ssjProfile", JSON.stringify(own));
            }

            if (typeof SSJ !== "undefined" && SSJ.cloud) {
                matchedMember.password = hashedPwd;
                await SSJ.cloud.saveMember(matchedMember);
            }

            showMsg("✅ पासवर्ड सफलतापूर्वक बदल दिया गया! लॉगिन पेज पर भेजा जा रहा है...", true);
            resetSubmit.disabled = true;
            setTimeout(function () { window.location.href = "login.html"; }, 1600);
        });
    }

})();
