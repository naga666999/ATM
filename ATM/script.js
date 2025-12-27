// --- Data & State Configuration ---
const users = [
  { id: 1, name: "Naga", pin: "0000", balance: 99999.0 },
  { id: 2, name: "Raju", pin: "1234", balance: 2475.5 },
  { id: 3, name: "Bathala", pin: "8888", balance: 12000.0 },
];

let currentUser = null;
let currentInput = "";
let sessionState = "LOGIN"; // States: LOGIN, MENU, WITHDRAW, DEPOSIT
let isProcessing = false; // Lock to prevent clicks during messages

// --- Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq = 600, type = "sine", duration = 0.1) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(
    0.00001,
    audioCtx.currentTime + duration
  );
  osc.stop(audioCtx.currentTime + duration);
}

function beep() {
  playTone(800, "square", 0.1);
}
function errorSound() {
  playTone(200, "sawtooth", 0.3);
}
function cashSound() {
  for (let i = 0; i < 8; i++)
    setTimeout(() => playTone(1200 - i * 100, "square", 0.05), i * 60);
}

// --- MESSAGE SYSTEM (No Alerts) ---
function showMessage(title, message, type = "success") {
  const screen = document.getElementById("screen-content");
  const color = type === "error" ? "#ff4757" : "#38ef7d"; // Red or Green

  screen.innerHTML = `
        <h2 style="color: ${color}; font-size: 2.2rem; text-shadow: 0 0 20px ${color};">${title}</h2>
        <p style="font-size: 1.5rem; margin-top: 15px; color: #fff;">${message}</p>
        <div class="pin-display" style="font-size: 1rem; margin-top: 20px; color: #aaa;">PLEASE WAIT...</div>
    `;

  isProcessing = true; // Lock keypad
}

// --- Keypad Input Logic ---
function pressKey(key) {
  if (isProcessing) return; // Prevent input while message is showing

  beep();

  if (key === "clear") {
    currentInput = "";
  } else if (key === "enter") {
    handleEnter();
    return;
  } else {
    if (currentInput.length < 6) currentInput += key;
  }
  renderScreen();
}

function handleEnter() {
  if (sessionState === "LOGIN") {
    const user = users.find((u) => u.pin === currentInput);
    if (user) {
      currentUser = user;
      sessionState = "MENU";
      currentInput = "";
      playTone(600, "sine", 0.2);
    } else {
      // ERROR: Incorrect PIN Display
      errorSound();
      showMessage("ACCESS DENIED", "INCORRECT PIN", "error");
      currentInput = "";
      setTimeout(() => {
        isProcessing = false;
        renderScreen();
      }, 2000);
      return;
    }
  } else if (sessionState === "WITHDRAW" || sessionState === "DEPOSIT") {
    processTransaction();
    return;
  }
  renderScreen();
}

// --- Transaction Processing ---
function processTransaction() {
  const amount = parseFloat(currentInput);

  // Check Invalid Amount
  if (!amount || amount <= 0) {
    errorSound();
    showMessage("ERROR", "INVALID AMOUNT", "error");
    setTimeout(() => {
      isProcessing = false;
      renderScreen();
    }, 2000);
    return;
  }

  if (sessionState === "WITHDRAW") {
    const totalDebit = amount + 1.25; // Fee check

    // Check Funds (including fee)
    if (totalDebit > currentUser.balance) {
      errorSound();
      showMessage("TRANSACTION FAILED", "INSUFFICIENT FUNDS", "error");
      setTimeout(() => {
        isProcessing = false;
        renderScreen();
      }, 2000);
      return;
    }
    currentUser.balance -= amount; // Deduct Cash
  } else if (sessionState === "DEPOSIT") {
    currentUser.balance += amount;
  }

  // SUCCESS SEQUENCE
  cashSound();

  const typeText = sessionState === "WITHDRAW" ? "WITHDRAWAL" : "DEPOSIT";
  showMessage("SUCCESS", `${typeText} SUCCESSFUL`, "success");

  // Print Receipt
  printReceipt(sessionState, amount);

  // Return to Menu
  setTimeout(() => {
    isProcessing = false;
    sessionState = "MENU";
    currentInput = "";
    renderScreen();
  }, 3000);
}

// --- Receipt Printing System ---
function printReceipt(type, amount) {
  const now = new Date();
  const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();

  // 1. Basic Info
  document.getElementById("r-date").innerText = dateStr;
  document.getElementById("r-name").innerText = currentUser.name.toUpperCase();
  document.getElementById("r-seq").innerText =
    Math.floor(Math.random() * 9000) + 1000;

  // 2. Financial Breakdown
  const fee = 1.25;
  const totalDebit = amount + fee;

  // Fill HTML fields
  document.getElementById("r-amount").innerText = amount.toFixed(2);
  document.getElementById("r-total").innerText = totalDebit.toFixed(2);
  document.getElementById("r-balance").innerText =
    currentUser.balance.toFixed(2); // New Balance

  // 3. Trigger Print
  setTimeout(() => {
    window.print();
  }, 1000);
}

// --- Screen Rendering ---
function renderScreen() {
  if (isProcessing) return;

  const screen = document.getElementById("screen-content");

  if (sessionState === "LOGIN") {
    screen.innerHTML = `
            <h2 class="animate-pulse">WELCOME</h2>
            <p>Enter PIN to Access</p>
            <div class="pin-display">${currentInput.replace(/./g, "*")}</div>`;
  } else if (sessionState === "MENU") {
    screen.innerHTML = `
            <h2>HI, ${currentUser.name.toUpperCase()}</h2>
            <p>Select a Transaction</p>
            <div class="pin-display" style="font-size:2rem; margin-top:10px; color:#00fff2; text-shadow: 0 0 10px #00fff2;">
                $${currentUser.balance.toFixed(2)}
            </div>`;
  } else {
    screen.innerHTML = `
            <h2>${sessionState}</h2>
            <p>Enter Amount</p>
            <div class="pin-display">$${currentInput}</div>`;
  }
}

// --- Button Event Listeners ---
document.querySelectorAll(".action-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    if (isProcessing) return;

    const action = e.target.dataset.action;
    beep();

    if (action === "exit") {
      currentUser = null;
      sessionState = "LOGIN";
      currentInput = "";
    } else if (currentUser) {
      if (action === "back") sessionState = "MENU";
      if (action === "balance") {
        showMessage(
          "BALANCE",
          `Available: $${currentUser.balance.toFixed(2)}`,
          "success"
        );
        setTimeout(() => {
          isProcessing = false;
          renderScreen();
        }, 3000);
        return;
      }
      if (action === "deposit") sessionState = "DEPOSIT";
      if (action === "withdraw") sessionState = "WITHDRAW";
      currentInput = "";
    }
    renderScreen();
  });
});
