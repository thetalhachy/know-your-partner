// Know Your Partner · app
// Renders whatever Store.state.screen says. Inline <button onclick>
// handlers in index.html call the App.* functions exposed on window.

(function () {
  const cfg = KYP_RUNTIME;
  const $ = (id) => document.getElementById(id);
  let from = "home";

  function initials(name) {
    return (name || "?").trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pretty(a) {
    if (!a || !a.text) {
      if (a && a.status === "declined") return "…preferred not to answer this one.";
      if (a && a.status === "skipped") return "…doesn't know yet.";
      return "…";
    }
    return a.text;
  }
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toast);
    window.__toast = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  // --------------------- rendering ---------------------
  function renderCategories() {
    $("categories").innerHTML = Object.entries(QUESTIONS).map(([name, d]) =>
      `<button class="category" style="--c:${d.color}" onclick="App.startCategory('${name.replace(/'/g, "\\'")}')">
        <span class="icon">${d.icon}</span><strong>${name}</strong><small>${d.qs.length} questions · take your time</small>
      </button>`).join("");
  }

  function renderQuestion() {
    const s = Store.state;
    if (!s.question) return;
    const { category, question, index, total } = s.question;
    $("catPill").textContent = category;
    $("questionText").textContent = question;
    $("progressText").textContent = (index + 1) + " / " + total;
    $("progressBar").style.width = ((index + 1) / total * 100) + "%";
    $("myAnswer").value = "";
    updateCounter();
    setTimeout(function () { try { $("myAnswer").focus(); } catch (e) {} }, 120);
  }

  function updateCounter() {
    $("counter").textContent = ($("myAnswer").value.length || 0) + " / " + cfg.answerMaxLength;
  }

  function renderReveal() {
    const s = Store.state;
    if (!s.question) return;
    $("revealQuestion").textContent = s.question.question;
    $("meName").textContent = s.me ? s.me.name : "You";
    $("themName").textContent = s.partner ? s.partner.name : "Your partner";
    $("meAnswer").textContent = pretty(s.myAnswer);
    $("themAnswer").textContent = pretty(s.theirAnswer);
    $("matchBadge").innerHTML = "♡ Take a second to read theirs.";
  }

  function renderSaved() {
    const list = Store.state.saved || [];
    if (!list.length) {
      $("savedList").innerHTML = '<div class="empty">Nothing saved yet.<br>The best discoveries are still ahead.</div>';
      return;
    }
    $("savedList").innerHTML = list.map((x) =>
      `<article class="discovery">
        <div class="heart">♡</div>
        <div><div class="q">${escapeHtml(x.question)}</div><div class="a"><b>You:</b> ${escapeHtml(x.mine)}</div><div class="a"><b>${escapeHtml(x.theirsName || "Them")}:</b> ${escapeHtml(x.theirs)}</div></div>
        <button class="link-btn remove" onclick="App.removeDiscovery('${x.id}')">Remove</button>
      </article>`).join("");
  }

  // --------------------- screen routing ---------------------
  const SCREENS = ["home", "create", "join", "invite", "lobby", "play", "wait", "reveal", "discoveries"];

  function render() {
    const s = Store.state;

    if (s.error) { toast(s.error); Store.clearError(); }

    document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
    const cur = SCREENS.indexOf(s.screen) >= 0 ? s.screen : "home";
    const sc = document.getElementById(cur);
    if (sc) sc.classList.remove("hidden");

    $("headerBack").classList.toggle("hidden", cur === "home");
    const showRoom = cur === "invite" || cur === "lobby" || cur === "play" || cur === "wait" || cur === "reveal" || cur === "discoveries";
    $("headerRoom").style.display = s.room && showRoom ? "block" : "none";
    if (s.room) $("headerRoom").textContent = "ROOM · " + s.room.code;
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (cur === "lobby") {
      $("roomCode").textContent = s.room ? s.room.code : "----";
      renderCategories();
    } else if (cur === "invite") {
      $("inviteCode").textContent = s.room ? s.room.code : "----";
      $("inviteTo").textContent = s.partner ? s.partner.name : "them";
    } else if (cur === "play") {
      renderQuestion();
    } else if (cur === "wait") {
      $("avatarMe").textContent = initials(s.me ? s.me.name : "You");
      $("avatarThem").textContent = initials(s.partner ? s.partner.name : "Your partner");
      $("waitTitle").textContent = s.partner ? "Waiting for " + s.partner.name + "…" : "Now we wait for them.";
    } else if (cur === "reveal") {
      renderReveal();
    } else if (cur === "discoveries") {
      renderSaved();
    }
  }

  function show(screen) {
    from = screen && screen === "home" ? "home" : from;
    Store.show(screen || "home");
  }

  // --------------------- navigation ---------------------
  function stateBack() {
    const cur = Store.state.screen;
    if (cur === "lobby" || cur === "invite") return "home";
    if (cur === "discoveries") return "lobby";
    if (cur === "wait" || cur === "reveal" || cur === "play") return "lobby";
    return from;
  }
  function goBack() { Store.show(stateBack()); }
  function goHome() { Store.goHome(); }
  function open(screen) { show(screen); }

  function copyCode() {
    const code = Store.state.room ? Store.state.room.code : "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () { toast("Room code copied."); }).catch(function () { toast("Your room code is " + code); });
    } else toast("Your room code is " + code);
  }

  // --------------------- lifecycle ---------------------
  function createRoom() {
    const me = $("creatorName").value.trim() || "You";
    const partner = $("partnerName").value.trim() || "Them";
    Store.createRoom({ me, partner });
  }

  function joinRoom() {
    const code = ($("joinCode").value || "").trim().toUpperCase();
    if (code.length !== cfg.codeLength) { toast("Enter a " + cfg.codeLength + "-character room code."); return; }
    const me = ($("joinName").value || "").trim() || "You";
    Store.joinRoom({ code, me });
  }

  function startCategory(name) { from = "lobby"; Store.pickCategory(name); }
  function submitAnswer() {
    const text = $("myAnswer").value.trim();
    if (text.length < 2) { toast("Give it a real answer — even one sentence is enough."); return; }
    Store.submitAnswer(text);
  }
  function declineAnswer() { Store.skipOrDecline("declined"); }   // "I'd rather not answer"
  function dontKnow() { Store.skipOrDecline("skipped"); }        // "I don't know yet"
  function nextQuestion() { Store.nextQuestion(); }
  function saveDiscovery() { Store.saveDiscovery(); }
  function removeDiscovery(id) { Store.removeDiscovery(id); }
  function clearDiscoveries() {
    if (!Store.state.saved.length) return;
    if (confirm("Clear all saved discoveries?")) Store.clearDiscoveries();
  }

  // --------------------- boot ---------------------
  function init() {
    Store.on("state", render);
    $("myAnswer").addEventListener("input", updateCounter);
    $("joinCode").addEventListener("input", function () {
      $("joinCode").value = $("joinCode").value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, cfg.codeLength);
    });
    render();
  }

  window.App = {
    init, show, open, goBack, goHome, copyCode,
    createRoom, joinRoom, startCategory, submitAnswer,
    decline: declineAnswer,              // "I'd rather not answer" → declined
    dontKnow,                            // "I don't know yet" → skipped
    nextQuestion, saveDiscovery, removeDiscovery, clearDiscoveries,
    updateCounter, toast
  };

  Store.boot().then(function () {
    App.init();
  });
})();