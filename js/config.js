// Know Your Partner · configuration
// Paste your Supabase credentials below to enable realtime rooms.
// With the placeholders left empty, the app runs in local demo mode
// with a simulated partner, so the prototype keeps working.

const KYP_CONFIG = {
  // From: Supabase Dashboard → Project Settings → API
  supabaseUrl: "https://bnmnjrtblwozyljtlrkf.supabase.co",
  supabaseAnonKey: "sb_publishable_7QKn8Dued9FY1tO1IC_aPw_30cea6Op",

  // Room code length. Keep >= 4 while codes are the only security barrier.
  codeLength: 4,
  // Codes are made of consonants + digits to avoid accidental rude words.
  codeAlphabet: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",

  // Answer write limit in characters
  answerMaxLength: 600
};

// Resolved at boot: "supabase" when credentials exist, otherwise "demo".
const KYP_RUNTIME = (() => {
  const u = (KYP_CONFIG.supabaseUrl || "").trim();
  const k = (KYP_CONFIG.supabaseAnonKey || "").trim();
  const configured = /^https:\/\/.+\..+/.test(u) && k.length > 20;
  return Object.assign({}, KYP_CONFIG, { mode: configured ? "supabase" : "demo" });
})();

// Expose on window so subsequent classic <script> files and inline handlers can reach them.
window.KYP_CONFIG = KYP_CONFIG;
window.KYP_RUNTIME = KYP_RUNTIME;
