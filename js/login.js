/*==================================================
        SSJ MATRIMONY — login.js
        If a member is already logged in this browser,
        skip the form and go straight to the dashboard.
        (The actual login submit handler lives inline in
        login.html, right next to the form it drives.)
==================================================*/

(function () {
    try {
        if (sessionStorage.getItem("ssjLoggedIn") === "1" && localStorage.getItem("ssjProfile")) {
            window.location.href = "user-dashboard.html";
        }
    } catch (e) {}
})();
