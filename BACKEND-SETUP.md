# SSJ Matrimony — Backend Setup (Firestore)

आपकी site ka backend **Google Firebase / Firestore** hai (project ID: `vssjmatrimony`),
Google Apps Script wala nahi. Site ki har page pehले se hi `js/firebase-init.js` +
`js/ssj-data.js` ke through Firestore se judi hui hai — data 4 collections mein store hota hai:

| Collection  | Kis liye |
|-------------|----------|
| `members`   | Har registered member ki profile |
| `interests` | Bheji/prapt hui Interest requests |
| `ads`       | Advertise With Us wale ads |
| `admins`    | Admin panel ke logins |

## Zaroori: Security Rules laga na (`firestore.rules`)

Bina rules ke, ya toh:
- Firestore **"locked" mode** mein hai → poori site kaam nahi karegi (register, login,
  search — kuch bhi save/load nahi hoga, koi error bhi screen par nahi dikhega, sab
  chup-chaap fail ho jaayega), YA
- Firestore **"test mode"** mein hai → sab kaam karega, lekin koi bhi internet par
  aapka data padh/badal sakta hai.

**Isliye is repo mein `firestore.rules` file di gayi hai — ise apply karna zaroori hai:**

### Tareeka 1 — Firebase Console (sabse aasan)
1. https://console.firebase.google.com par jaayein → project **vssjmatrimony** kholein
2. Left menu se **Firestore Database** → **Rules** tab
3. Is repo ki `firestore.rules` file ka pura content copy karke wahan paste karein
4. **Publish** button dabayein

### Tareeka 2 — Firebase CLI (agar aap terminal use karte hain)
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project vssjmatrimony
```

## ⚠️ Ek zaroori security baat

Is site mein **Firebase Authentication use nahi hoti** — login sirf mobile number +
password ko Firestore mein dhoondh kar browser mein compare karta hai. Iska matlab:

- `members` aur `admins` collection ka data **read karna zaroori hai** taaki login/search
  kaam kare — lekin isi wajah se koi bhi (thoda technical) browser console khol kar
  saare members/admins ka data (password sameत) dekh sakta hai.
- Diya gaya `firestore.rules` isse pura nahi rok sakta, kyunki current design mein
  koi real authentication hi nahi hai. Rules sirf itna karte hain ki koi galat/tuta
  hua data na likh paaye, ya password na badal paaye bina sahi format ke.

**Behtar/permanent fix** (agar future mein karna ho): Login ko ek **Cloud Function**
(server-side code) ke through karwayein, jahan password check server par ho, browser
mein kabhi na aaye. Yeh ek bada change hai — agar chahiye toh alag se bata dijiye,
main woh bhi bana dunga.
