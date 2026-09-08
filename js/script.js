/*==================================================
        SSJ MATRIMONY — script.js
        Site-wide UI behaviour: mobile menu, scroll-to-top
==================================================*/

document.addEventListener("DOMContentLoaded", function () {

    /* ---------- Mobile menu toggle ---------- */
    var menuToggle = document.getElementById("menuToggle");
    var menu = document.querySelector(".menu");

    if (menuToggle && menu) {
        menuToggle.addEventListener("click", function () {
            menu.classList.toggle("show");
            menuToggle.classList.toggle("open");
        });

        // close menu when a link is clicked (mobile)
        menu.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                menu.classList.remove("show");
                menuToggle.classList.remove("open");
            });
        });
    }

    /* ---------- Scroll-to-top button ---------- */
    var topBtn = document.getElementById("topBtn") || document.getElementById("scrollTop");

    if (topBtn) {
        window.addEventListener("scroll", function () {
            topBtn.classList.toggle("show", window.scrollY > 400);
        });

        topBtn.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

});
