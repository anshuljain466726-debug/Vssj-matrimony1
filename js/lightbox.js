/*==================================================
        SSJ MATRIMONY — lightbox.js
        Generic click-to-enlarge image popup.
        Works with css/lightbox.css
==================================================*/

document.addEventListener("DOMContentLoaded", function () {

    var selectors = ".gallery-item img, .profile-card .photo img, .hero-media-frame img, .profile-gallery img";
    var images = document.querySelectorAll(selectors);

    if (!images.length) return;

    // Build overlay once
    var overlay = document.createElement("div");
    overlay.className = "ssj-lightbox-overlay";
    overlay.innerHTML =
        '<span class="ssj-lightbox-close" aria-label="Close">&times;</span>' +
        '<img class="ssj-lightbox-img" src="" alt="">';
    document.body.appendChild(overlay);

    var imgEl = overlay.querySelector(".ssj-lightbox-img");
    var closeBtn = overlay.querySelector(".ssj-lightbox-close");

    function open(src, alt) {
        imgEl.src = src;
        imgEl.alt = alt || "";
        overlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function close() {
        overlay.classList.remove("open");
        document.body.style.overflow = "";
    }

    images.forEach(function (img) {
        // avoid placeholder/no-photo-set images — for those, keep the
        // existing behaviour (e.g. navigating to edit-profile.html to add one)
        if (img.src.indexOf("no-image.png") !== -1 || img.src.indexOf("user.png") !== -1) return;

        var wrappingLink = img.closest("a");
        if (wrappingLink) {
            // Photo is wrapped in a link (e.g. "बदलें" links to edit-profile.html) —
            // clicking the photo itself should enlarge it instead of navigating away.
            wrappingLink.addEventListener("click", function (e) {
                e.preventDefault();
                open(img.src, img.alt);
            });
        } else {
            img.addEventListener("click", function () {
                open(img.src, img.alt);
            });
        }
    });

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
    });

});
