import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCA6MsZ9m0WVShWRWqJBDD-5V0cdZKdrG0",
  authDomain: "coin-toss-multiplayer.firebaseapp.com",
  databaseURL: "https://coin-toss-multiplayer-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "coin-toss-multiplayer",
  storageBucket: "coin-toss-multiplayer.firebasestorage.app",
  messagingSenderId: "448920482222",
  appId: "1:448920482222:web:a62656b2febb8bce77583f",
  measurementId: "G-JPCL0DLYSJ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

let currentUser = null;
let userId = null;
let userWins = 0;
let userName = "You";

signInAnonymously(auth)
  .then(() => {
    document.getElementById("status").textContent = "Connected. Ready to toss!";
  })
  .catch((error) => {
    document.getElementById("status").textContent = "Auth failed.";
    console.error(error);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    userId = user.uid;
    const userRef = ref(db, `users/${userId}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        userWins = data.wins || 0;
        userName = data.name || "You";
        document.getElementById("yourWins").textContent = userWins;
        document.getElementById("nameInput").value = userName;
      } else {
        set(userRef, { wins: 0, name: "You" });
      }
      document.getElementById("saveNameBtn").disabled = false;
    });
    listenToLeaderboard();
  }
});

function saveName() {
  const nameInput = document.getElementById("nameInput");
  const name = nameInput.value.trim();

  if (!userId) {
    alert("Please wait — still connecting to Firebase.");
    return;
  }

  if (name.length === 0) {
    alert("Please enter a valid name.");
    return;
  }

  const userRef = ref(db, `users/${userId}`);
  update(userRef, { name })
    .then(() => {
      userName = name;
      document.getElementById("status").textContent = `Name saved as "${name}" ✅`;
      listenToLeaderboard(); // Refresh leaderboard on name change
    })
    .catch((err) => {
      console.error("❌ Failed to save name:", err);
      alert("Error saving name. Check the console for details.");
    });
}

function startMatch() {
  const coin = document.getElementById("coin");
  coin.classList.remove("spin");
  void coin.offsetWidth;
  coin.classList.add("spin");

  document.getElementById("status").textContent = "Flipping...";

  setTimeout(() => {
    const result = Math.random() < 0.5 ? "win" : "lose";
    const userRef = ref(db, `users/${userId}`);

    if (result === "win") {
      userWins++;
      update(userRef, { wins: userWins });
      document.getElementById("status").textContent = "🎉 You WON the toss!";
    } else {
      document.getElementById("status").textContent = "😞 You lost the toss!";
    }

    document.getElementById("yourWins").textContent = userWins;
    listenToLeaderboard(); // Refresh leaderboard after each match
  }, 1000);
}

// ✅ NEW: One-time get() instead of onValue()
function listenToLeaderboard() {
  const leaderboardRef = ref(db, 'users');

  get(leaderboardRef).then((snapshot) => {
    console.log("📦 Raw snapshot:", snapshot.val());

    const list = document.getElementById("leaderboardList");
    list.innerHTML = "";

    const data = [];
    snapshot.forEach((child) => {
      const val = child.val();
      if (val && typeof val.wins === "number") {
        data.push({ id: child.key, ...val });
      }
    });

    if (data.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No players yet";
      list.appendChild(li);
      return;
    }

    data.sort((a, b) => b.wins - a.wins);

    data.slice(0, 5).forEach((player, index) => {
      const li = document.createElement("li");
      const name = player.name || player.id.slice(0, 6);
      const label = player.id === userId ? `${name} (You)` : name;
      li.textContent = `${index + 1}. ${label} – ${player.wins}`;
      list.appendChild(li);
    });
  }).catch((error) => {
    console.error("❌ Failed to read leaderboard:", error);
  });
}

// ✅ Hook up buttons
document.getElementById("saveNameBtn").addEventListener("click", saveName);
document.getElementById("tossBtn").addEventListener("click", startMatch);
