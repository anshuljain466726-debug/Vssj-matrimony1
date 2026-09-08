/*==================================================
        SSJ MATRIMONY — firebase-init.js
        Initializes Firebase (compat SDK) + Firestore.
        Load AFTER the two firebase-*-compat.js CDN
        scripts and BEFORE ssj-data.js on every page
        that needs real, cross-device member/interest
        data (register, login, search, profile, interest).
==================================================*/

var firebaseConfig = {
    apiKey: "AIzaSyBkoDMZFwUxDo-RrTiBbF96EQAeXTHD2yE",
    authDomain: "vssjmatrimony.firebaseapp.com",
    projectId: "vssjmatrimony",
    storageBucket: "vssjmatrimony.firebasestorage.app",
    messagingSenderId: "967598027527",
    appId: "1:967598027527:web:3ba44a52471dcaef884ba2"
};

var ssjDb = null;
try {
    if (typeof firebase !== "undefined") {
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        ssjDb = firebase.firestore();
    }
} catch (e) {
    ssjDb = null; // e.g. offline / CDN blocked — pages fall back to local-only demo mode
}
