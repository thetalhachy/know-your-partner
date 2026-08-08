// Know Your Partner · store
// Single source of truth for room state. Two interchangeable backends:
//   - "supabase" — real two-person rooms via Supabase + Realtime
//   - "demo"     — local simulation of the partner (keeps prototype working)
//
// The store owns the state machine and the current screen; app.js just
// renders whatever Store.state.screen says.

const Store = (() => {
  const cfg = KYP_RUNTIME;
  let client = null;
  let channel = null;

  let state = {
    mode: cfg.mode,
    screen: "home",        // home | create | join | invite | lobby | play | wait | reveal | discoveries
    room: null,            // { id, code, status }
    me: null,              // { id, name, isHost }
    partner: null,         // { name, joined }
    session: null,         // { id, category, question_index }
    question: null,        // { category, question, index, total }
    myAnswer: null,        // { text, status }
    theirAnswer: null,     // { text, status }
    saved: loadSaved(),    // discovery mirror (localStorage per room)
    error: null
  };

  const listeners = {};
  function emit(event, payload) {
    (listeners[event] || []).forEach((fn) => fn(payload, state));
  }
  function setState(patch) {
    state = Object.assign({}, state, patch);
    emit("state", state);
  }
  function setError(err) {
    console.error("[kyp]", err);
    setState({ error: err && err.message ? err.message : String(err) });
  }
  function clearError() {
    if (state.error) setState({ error: null });
  }

  // -------------------------------------------------------------
  // helpers
  // -------------------------------------------------------------
  function randomCode() {
    let out = "";
    const bytes = new Uint32Array(cfg.codeLength);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < cfg.codeLength; i++) bytes[i] = Math.floor(Math.random() * 0xffffffff);
    for (let i = 0; i < cfg.codeLength; i++) out += cfg.codeAlphabet[bytes[i] % cfg.codeAlphabet.length];
    return out;
  }
  function uuid() {
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
  }
  const LS_PREFIX = "kyp-";
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(LS_PREFIX + "discoveries") || "[]"); }
    catch (e) { return []; }
  }
  function persistSaved() {
    try { localStorage.setItem(LS_PREFIX + "discoveries", JSON.stringify(state.saved)); } catch (e) {}
  }

  function makeClient() {
    if (client) return client;
    if (!window.supabase) throw new Error("Supabase client not loaded. Add the CDN script to index.html.");
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 5 } },
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return client;
  }

  // Ensures an anonymous identity exists (cached by Supabase in
  // localStorage, so it survives reloads) and returns the user id.
  // This id is the participant's real identity for RLS.
  async function ensureIdentity() {
    const sb = makeClient();
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user) return session.user.id;
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) {
      throw new Error("Cannot join anonymously. Enable 'Anonymous sign-ins' in Supabase > Auth and check the project.");
    }
    return data.user.id;
  }

  // -------------------------------------------------------------
  // Supabase backend
  // -------------------------------------------------------------
  async function ensureBackend() {
    if (cfg.mode !== "supabase") return;
    makeClient();
  }

  function cleanListeners() {
    if (channel) { try { channel.unsubscribe(); } catch (e) {} channel = null; }
  }

  function questionFor(cat, idx) {
    const q = questionAt(cat, idx);
    return q ? Object.assign({}, q, { index: idx, total: QUESTIONS[cat].qs.length }) : null;
  }

  function applySession(row) {
    const idx = row.question_index;
    if (idx < 0) {
      // run complete → back to lobby
      setState({ session: null, myAnswer: null, theirAnswer: null, screen: "lobby" });
      return;
    }
    const q = questionFor(row.category, idx);
    setState({ session: { id: row.id, category: row.category, question_index: idx }, question: q, myAnswer: null, theirAnswer: null, screen: "play" });
    refreshReadiness();
  }

  async function refreshReadiness() {
    if (cfg.mode !== "supabase" || !state.session) return;
    try {
      const { data } = await makeClient()
        .from("answers")
        .select("*")
        .eq("session_id", state.session.id)
        .eq("question_index", state.session.question_index);
      if (!data) return;
      if (data.length >= 2) {
        const mine = data.find((a) => a.participant_id === state.me.id) || null;
        const theirs = data.find((a) => a.participant_id !== state.me.id) || null;
        setState({
          myAnswer: mine ? { text: mine.answer, status: mine.answer_status } : state.myAnswer,
          theirAnswer: theirs ? { text: theirs.answer, status: theirs.answer_status } : state.theirAnswer,
          screen: "reveal"
        });
      } else {
        const mine = data.find((a) => a.participant_id === state.me.id);
        setState({ myAnswer: mine ? { text: mine.answer, status: mine.answer_status } : null });
      }
    } catch (e) { setError(e); }
  }

  async function attachToRoom(roomId, roomCode, me) {
    cleanListeners();
    const sb = makeClient();
    channel = sb.channel("room:" + roomCode);

    // presence — who is here right now
    channel
      .on("presence", { event: "sync" }, () => {
        const present = Object.values(channel.presenceState() || {}).map((p) => p[0]).filter(Boolean);
        const them = present.find((p) => p.participantId !== me.id);
        const joined = !!them;
        setState({ partner: { name: (them && them.name) || (state.partner && state.partner.name) || "Your partner", joined } });
        if (joined && state.screen === "invite") setState({ screen: "lobby" });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: "room_id=eq." + roomId }, (payload) => {
        if (payload.new && payload.new.id) applySession(payload.new);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "answers", filter: "room_id=eq." + roomId }, (payload) => {
        // only care about answers for the question we're currently on
        if (payload.new && state.session && payload.new.question_index === state.session.question_index && payload.new.session_id === state.session.id) {
          refreshReadiness();
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ participantId: me.id, name: me.name });
        }
      });
  }

  // -------------------------------------------------------------
  // public API
  // -------------------------------------------------------------
  async function boot() {
    try { await ensureBackend(); } catch (e) { setError(e); return; }
    if (cfg.mode === "demo") {
      const me = localStorage.getItem(LS_PREFIX + "me-demo");
      if (me) {
        const p = JSON.parse(me);
        setState({ me: p, partner: { name: localStorage.getItem(LS_PREFIX + "partner-demo") || "Your partner", joined: false } });
      }
      return;
    }
    // supabase — resume via the persistent anonymous identity
    try {
      const uid = await ensureIdentity();
      if (!uid) { localStorage.removeItem(LS_PREFIX + "me"); return; }
      const { data: part } = await makeClient().from("participants").select("*").eq("user_id", uid).order("joined_at", { ascending: false }).limit(1).maybeSingle();
      if (part) {
        const { data: room } = await makeClient().from("rooms").select("*").eq("id", part.room_id).maybeSingle();
        if (room) {
          setState({ me: { id: part.id, name: part.name, isHost: part.is_host }, room: { id: room.id, code: room.code, status: room.status }, partner: { name: room.partner_name, joined: false } });
          await attachToRoom(room.id, room.code, { id: part.id, name: part.name });
          setState({ screen: "lobby" });
          return;
        }
      }
    } catch (e) { console.warn("[kyp] resume failed", e); }
    localStorage.removeItem(LS_PREFIX + "me");
  }

  async function createRoom({ me, partner }) {
    setState({ error: null });
    try {
      await ensureBackend();
    } catch (e) { setError(e); return; }

    if (cfg.mode === "demo") {
      const id = uuid();
      const code = randomCode();
      const p = { id, name: me, isHost: true };
      localStorage.setItem(LS_PREFIX + "me-demo", JSON.stringify(p));
      localStorage.setItem(LS_PREFIX + "partner-demo", partner);
      setState({ me: p, room: { id: "local", code }, partner: { name: partner, joined: false } });
      showInvite();
      return;
    }

    const sb = makeClient();
    let uid = null;
    let room = null;
    let code = "";
    try { uid = await ensureIdentity(); }
    catch (e) { setError(e); return; }
    for (let attempt = 0; attempt < 5 && !room; attempt++) {
      code = randomCode();
      try {
        const { data, error } = await sb.from("rooms").insert({ code, status: "waiting", creator_name: me, partner_name: partner, creator_id: uid }).select().single();
        if (!error) room = data;
        else if (error.code !== "23505") throw error; // 23505 = unique violation, just try a new code
      } catch (e) { setError(e); return; }
    }
    if (!room) { setError(new Error("Could not create a room. Try again.")); return; }

    const pid = uuid();
    const { error: perr } = await sb.from("participants").insert({ id: pid, user_id: uid, room_id: room.id, name: me, is_host: true });
    if (perr) { setError(perr); return; }

    setState({ me: { id: pid, name: me, isHost: true }, room: { id: room.id, code, status: "waiting" }, partner: { name: partner, joined: false } });
    await attachToRoom(room.id, code, { id: pid, name: me });
    showInvite();
  }

  function showInvite() {
    setState({ screen: "invite" });
    if (cfg.mode === "demo") {
      // Demo: simulate the partner joining so you're not stuck on invite.
      setTimeout(() => {
        if (state.screen === "invite") {
          setState({ partner: Object.assign({}, state.partner, { joined: true }), screen: "lobby" });
        }
      }, 1600);
    }
  }

  async function joinRoom({ code, me }) {
    setState({ error: null });
    code = (code || "").trim().toUpperCase();
    try { await ensureBackend(); } catch (e) { setError(e); return; }

    if (cfg.mode === "demo") {
      const id = uuid();
      const p = { id, name: me, isHost: false };
      localStorage.setItem(LS_PREFIX + "me-demo", JSON.stringify(p));
      localStorage.setItem(LS_PREFIX + "partner-demo", me);
      setState({ me: p, partner: { name: "Your partner", joined: true } });
      setState({ room: { id: "local", code } });
      setState({ screen: "lobby" });
      return;
    }

    const sb = makeClient();
    let uid = null;
    try { uid = await ensureIdentity(); }
    catch (e) { setError(e); return; }
    const { data: room, error } = await sb.from("rooms").select("*").eq("code", code).maybeSingle();
    if (error) { setError(error); return; }
    if (!room) { setState({ error: "No room found for that code. Double-check and try again." }); return; }
    if (room.status === "closed" || room.status === "expired") { setState({ error: "That room has closed." }); return; }

    const pid = uuid();
    const { error: perr } = await sb.from("participants").insert({ id: pid, user_id: uid, room_id: room.id, name: me, is_host: false });
    if (perr) { setError(perr); return; }
    await sb.from("rooms").update({ status: "active" }).eq("id", room.id);

    setState({ me: { id: pid, name: me, isHost: false }, room: { id: room.id, code, status: "active" }, partner: { name: room.creator_name, joined: false } });
    await attachToRoom(room.id, code, { id: pid, name: me });
    setState({ screen: "lobby" });
  }

  async function pickCategory(category) {
    if (cfg.mode === "demo") {
      setState({ session: { id: "local", category, question_index: 0 }, question: questionFor(category, 0), myAnswer: null, theirAnswer: null, screen: "play" });
      return;
    }
    if (!state.session || state.session.category !== category) {
      try {
        const sb = makeClient();
        const { data } = await sb.from("sessions")
          .upsert({ room_id: state.room.id, category }, { onConflict: "room_id,category" })
          .select().single();
        if (data) {
          await sb.from("sessions").update({ question_index: 0 }).eq("id", data.id);
          applySession(Object.assign({}, data, { question_index: 0 }));
        }
      } catch (e) { setError(e); }
    } else {
      applySession(Object.assign({}, state.session, { question_index: 0 }));
    }
  }

  async function submitAnswer(text) {
    const status = "answered";
    const payload = { text, status };
    if (cfg.mode === "demo") {
      setState({ myAnswer: payload, screen: "wait" });
      setTimeout(() => {
        if (!state.session) return;
        const demo = DEMO_ANSWERS[(state.session.question_index + QUESTION_ORDER.indexOf(state.session.category)) % DEMO_ANSWERS.length];
        setState({ theirAnswer: { text: demo, status: "answered" }, screen: "reveal" });
      }, 1400);
      return;
    }
    await writeAnswer(payload);
  }

  // "I'd rather not answer" → declined · "I don't know yet" → skipped
  async function skipOrDecline(kind) {
    if (kind !== "skipped" && kind !== "declined") return;
    const payload = { text: "", status: kind };
    if (cfg.mode === "demo") {
      setState({ myAnswer: payload, screen: "wait" });
      setTimeout(() => {
        if (!state.session) return;
        setState({ theirAnswer: { text: "", status: "answered" }, screen: "reveal" });
      }, 1400);
      return;
    }
    await writeAnswer(payload);
  }

  async function writeAnswer({ text, status }) {
    if (!state.session) return;
    try {
      const sb = makeClient();
      const qidx = state.session.question_index;
      await sb.from("answers").upsert({
        session_id: state.session.id,
        room_id: state.room.id,
        participant_id: state.me.id,
        question_index: qidx,
        answer: text || "",
        answer_status: status
      }, { onConflict: "participant_id,session_id,question_index" });
      setState({ myAnswer: { text, status }, screen: "wait" });
      refreshReadiness();
    } catch (e) { setError(e); }
  }

  async function nextQuestion() {
    if (cfg.mode === "demo") {
      const cat = state.session.category;
      const idx = state.session.question_index + 1;
      if (idx >= QUESTIONS[cat].qs.length) {
        setState({ session: null, question: null, screen: "lobby" });
      } else {
        setState({ session: Object.assign({}, state.session, { question_index: idx }), question: questionFor(cat, idx), myAnswer: null, theirAnswer: null, screen: "play" });
      }
      return;
    }
    if (!state.session) return;
    try {
      const sb = makeClient();
      const cat = state.session.category;
      const sessionId = state.session.id;
      const next = state.session.question_index + 1;
      const done = next >= QUESTIONS[cat].qs.length;
      const idx = done ? -1 : next;
      await sb.from("sessions").update({ question_index: idx }).eq("id", sessionId);
      if (done) {
        // clear this run's answers so replaying the category starts fresh
        await sb.from("answers").delete().eq("session_id", sessionId);
        setState({ session: null, question: null, myAnswer: null, theirAnswer: null, screen: "lobby" });
      } else applySession(Object.assign({}, state.session, { question_index: idx }));
    } catch (e) { setError(e); }
  }

  async function saveDiscovery() {
    if (!state.question) return;
    const item = {
      id: uuid(),
      category: state.question.category,
      question: state.question.question,
      mine: state.myAnswer ? state.myAnswer.text : "",
      theirs: state.theirAnswer ? state.theirAnswer.text : "",
      date: Date.now()
    };
    state.saved = [item].concat(state.saved);
    persistSaved();
    setState({ saved: state.saved, screen: "discoveries" });

    if (cfg.mode === "supabase" && state.room && state.session) {
      try {
        const sb = makeClient();
        await sb.from("discoveries").insert({
          room_id: state.room.id,
          session_id: state.session.id,
          saved_by: state.me.id,
          category: state.question.category,
          question: state.question.question,
          question_index: state.question.index,
          my_answer: item.mine,
          partner_answer: item.theirs
        });
      } catch (e) { console.warn("[kyp] discovery not persisted", e); }
    }
  }

  function removeDiscovery(id) {
    state.saved = state.saved.filter((d) => d.id !== id);
    persistSaved();
    setState({ saved: state.saved });
  }

  function clearDiscoveries() {
    state.saved = [];
    persistSaved();
    setState({ saved: state.saved });
  }

  function show(screen) {
    setState({ screen, error: null });
  }

  function goHome() {
    cleanListeners();
    if (cfg.mode === "supabase") localStorage.removeItem(LS_PREFIX + "me");
    setState({ room: null, me: null, partner: null, session: null, question: null, myAnswer: null, theirAnswer: null, screen: "home" });
  }

  return {
    on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); },
    get state() { return state; },
    boot,
    createRoom,
    joinRoom,
    pickCategory,
    submitAnswer,
    skipOrDecline,
    nextQuestion,
    saveDiscovery,
    removeDiscovery,
    clearDiscoveries,
    clearError,
    show,
    goHome
  };
})();

// Expose on window so app.js and inline handlers can reach it.
window.Store = Store;