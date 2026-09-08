/*==================================================
        SSJ MATRIMONY — registration-payment.js
        Demo "confirm payment" flow: validates the two
        fields, records a payment entry, marks the member
        premium in localStorage, then hands off to
        thank-you.html.
==================================================*/

(function () {

    var params = new URLSearchParams(window.location.search);
    var pending = SSJ.readJSON("ssjPendingPlan", null);
    var planAmount = params.get("plan") || (pending && pending.amount) || "";
    var planLabel = (pending && pending.label) || (planAmount ? "₹" + planAmount + " योजना" : "सदस्यता शुल्क");

    var mobileInput = document.getElementById("payMobile");
    var mine = SSJ.getMyProfile ? SSJ.getMyProfile() : null;
    if (mobileInput && mine && mine.mobile) mobileInput.value = mine.mobile;

    // Update visible headings/amount dynamically based on selected plan
    if (planAmount) {
        var amtEls = document.querySelectorAll("[data-plan-amount]");
        amtEls.forEach(function (el) { el.textContent = "₹" + planAmount; });
    }

    var btn = document.getElementById("confirmPaymentBtn");
    var resultEl = document.getElementById("paymentResult");

    if (btn) {
        btn.addEventListener("click", function () {
            var mobile = (document.getElementById("payMobile") || {}).value || "";
            var txn = (document.getElementById("payTransactionId") || {}).value || "";
            mobile = mobile.trim();
            txn = txn.trim();

            if (!/^\d{10}$/.test(mobile)) {
                resultEl.style.color = "#c0392b";
                resultEl.textContent = "कृपया सही 10 अंकों का मोबाइल नंबर डालें।";
                return;
            }
            if (!txn) {
                resultEl.style.color = "#c0392b";
                resultEl.textContent = "कृपया Payment Transaction / UTR नंबर डालें।";
                return;
            }

            var payments = SSJ.readJSON("ssjPayments", []);
            payments.push({
                mobile: mobile,
                transactionId: txn,
                amount: planAmount || "-",
                plan: planLabel,
                status: "Received",
                date: SSJ.fmtDate()
            });
            SSJ.writeJSON("ssjPayments", payments);

            // Mark this member premium (demo — real verification happens in admin panel)
            var profile = mine;
            if (profile) {
                profile.premium = { active: true, plan: planLabel, since: SSJ.fmtDate(), status: "Pending Verification" };
                SSJ.saveMyProfile(profile);
                var members = SSJ.getMembers();
                members = members.map(function (m) { return m.profileId === profile.profileId ? Object.assign({}, m, { premium: profile.premium }) : m; });
                SSJ.saveMembers(members);
            }
            try { localStorage.removeItem("ssjPendingPlan"); } catch (e) {}

            resultEl.style.color = "#2e7d32";
            resultEl.textContent = "✅ भुगतान की जानकारी दर्ज हो गई! सत्यापन के बाद सदस्यता सक्रिय हो जाएगी।";
            btn.disabled = true;

            setTimeout(function () { window.location.href = "thank-you.html"; }, 1600);
        });
    }

})();
