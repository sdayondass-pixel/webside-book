/*
  বইঘর — Supabase starter
  1) Create a Supabase project.
  2) Paste Project URL and anon/publishable key below. Never put service_role key here.
  3) Run supabase.sql in Supabase SQL Editor.
  4) In Supabase Auth, enable Google/Facebook/GitHub and configure provider credentials + redirect URLs.
  5) Set your admin role in Supabase app_metadata using a trusted server/Admin API, not user-editable user_metadata.
*/
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY";
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const BUCKET = "library-files";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");
const sb = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();
let currentUser = null;
let libraryItems = [];
let readerObjectUrl = null;

function showStatus(message, type = "") {
  $("uploadStatus").textContent = message;
  $("uploadStatus").className = `status ${type}`;
}
function isAdmin(user) {
  // Admin role must be assigned server-side in app_metadata. Never trust a role from user_metadata.
  return user?.app_metadata?.role === "admin";
}
function setSignedInUI(user) {
  currentUser = user;
  $("loginSection").classList.toggle("hidden", !!user);
  $("accountPanel").classList.toggle("hidden", !user);
  $("logoutBtn").classList.toggle("hidden", !user);
  $("adminPanel").classList.toggle("hidden", !isAdmin(user));
  $("adminBadge").classList.toggle("hidden", !isAdmin(user));
  if (user) $("welcomeText").textContent = `স্বাগতম, ${user.user_metadata?.full_name || user.email || "পাঠক"}!`;
  $("libraryMessage").classList.toggle("hidden", !!user);
  if (!user) {
    $("itemsGrid").innerHTML = "";
    $("libraryMessage").innerHTML = '<div class="empty-icon">▤</div><h3>আপনার বইয়ের জন্য অপেক্ষা করছি</h3><p>লাইব্রেরি দেখতে সাইন ইন করুন।</p>';
  }
}
async function init() {
  if (!configured) {
    $("libraryMessage").innerHTML = '<div class="empty-icon">⚙</div><h3>সেটআপ প্রায় শেষ!</h3><p>app.js ফাইলে Supabase Project URL ও publishable key বসিয়ে SQL সেটআপ করুন। তারপর লগইন ও লাইব্রেরি চালু হবে।</p>';
    document.querySelectorAll("[data-provider]").forEach(b => b.addEventListener("click", () => alert("প্রথমে app.js-এ Supabase URL ও publishable key বসান। README.md-তে ধাপগুলো আছে।")));
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  setSignedInUI(session?.user || null);
  if (session?.user) await loadItems();
  sb.auth.onAuthStateChange(async (_event, sessionNow) => {
    setSignedInUI(sessionNow?.user || null);
    if (sessionNow?.user) await loadItems();
  });
}
document.querySelectorAll("[data-provider]").forEach(button => {
  button.addEventListener("click", async () => {
    if (!sb) return;
    const provider = button.dataset.provider;
    button.disabled = true;
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert("সাইন ইন করা যায়নি: " + error.message);
    button.disabled = false;
  });
});
$("logoutBtn").addEventListener("click", async () => {
  if (!sb) return;
  const { error } = await sb.auth.signOut();
  if (error) alert("লগ আউট করা যায়নি। আবার চেষ্টা করুন।");
  setSignedInUI(null);
});
$("itemType").addEventListener("change", () => {
  const isVideo = $("itemType").value === "video";
  $("itemFile").accept = isVideo ? "video/mp4,video/webm,.mp4,.webm" : "application/pdf,.pdf";
  $("fileHint").textContent = isVideo ? "MP4 বা WebM ভিডিও নির্বাচন করুন। সর্বোচ্চ 50 MB।" : "PDF ফাইল নির্বাচন করুন। সর্বোচ্চ 50 MB।";
});
$("uploadForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!sb || !isAdmin(currentUser)) return showStatus("এই কাজের অনুমতি নেই।", "error");
  const file = $("itemFile").files[0];
  const type = $("itemType").value;
  if (!file) return showStatus("একটি ফাইল নির্বাচন করুন।", "error");
  if (file.size > MAX_FILE_SIZE) return showStatus("ফাইল 50 MB-এর চেয়ে ছোট হতে হবে।", "error");
  const allowed = type === "book" ? file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    : ["video/mp4", "video/webm"].includes(file.type) || /\.(mp4|webm)$/i.test(file.name);
  if (!allowed) return showStatus(type === "book" ? "শুধু PDF ফাইল দিন।" : "শুধু MP4/WebM ভিডিও দিন।", "error");
  const submit = $("uploadForm").querySelector('button[type="submit"]');
  submit.disabled = true; showStatus("আপলোড হচ্ছে…");
  try {
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const path = `${currentUser.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: storageError } = await sb.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || (type === "book" ? "application/pdf" : "video/mp4"),
      upsert: false
    });
    if (storageError) throw storageError;
    const { error: dbError } = await sb.from("library_items").insert({
      title: $("itemTitle").value.trim(),
      description: $("itemDescription").value.trim(),
      category: $("itemCategory").value.trim() || "সাধারণ",
      item_type: type,
      storage_path: path,
      mime_type: file.type || null,
      file_size: file.size,
      created_by: currentUser.id
    });
    if (dbError) {
      await sb.storage.from(BUCKET).remove([path]);
      throw dbError;
    }
    $("uploadForm").reset();
    $("itemFile").accept = "application/pdf,.pdf";
    $("fileHint").textContent = "PDF ফাইল নির্বাচন করুন। সর্বোচ্চ 50 MB।";
    showStatus("সফলভাবে আপলোড হয়েছে।", "success");
    await loadItems();
  } catch (err) {
    showStatus("আপলোড ব্যর্থ: " + (err.message || "অনুগ্রহ করে সেটআপ ও অনুমতি পরীক্ষা করুন।"), "error");
  } finally { submit.disabled = false; }
});
async function loadItems() {
  if (!sb || !currentUser) return;
  $("libraryMessage").classList.add("hidden");
  $("itemsGrid").innerHTML = '<div class="empty-state">লাইব্রেরি লোড হচ্ছে…</div>';
  const { data, error } = await sb.from("library_items").select("id,title,description,category,item_type,storage_path,created_at,created_by").order("created_at", { ascending: false });
  if (error) {
    $("itemsGrid").innerHTML = "";
    $("libraryMessage").classList.remove("hidden");
    $("libraryMessage").innerHTML = '<div class="empty-icon">⚠</div><h3>লাইব্রেরি লোড হয়নি</h3><p>Supabase SQL ও RLS policy পরীক্ষা করুন।</p>';
    return;
  }
  libraryItems = data || [];
  renderItems();
}
function renderItems() {
  const term = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;
  const filtered = libraryItems.filter(item =>
    (type === "all" || item.item_type === type) &&
    [item.title, item.description, item.category].join(" ").toLowerCase().includes(term)
  );
  $("itemsGrid").innerHTML = "";
  if (!filtered.length) {
    $("libraryMessage").classList.remove("hidden");
    $("libraryMessage").innerHTML = `<div class="empty-icon">⌕</div><h3>${libraryItems.length ? "কিছু পাওয়া যায়নি" : "এখনও কোনো বই যোগ করা হয়নি"}</h3><p>${libraryItems.length ? "অন্য শব্দ দিয়ে খুঁজে দেখুন।" : "অ্যাডমিন লগইন করে প্রথম বই বা ভিডিও আপলোড করতে পারবেন।"}</p>`;
    return;
  }
  $("libraryMessage").classList.add("hidden");
  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "item-card";
    const video = item.item_type === "video";
    const cover = document.createElement("div");
    cover.className = `cover ${video ? "video" : ""}`;
    cover.innerHTML = `<span class="cover-tag">${video ? "VIDEO" : "PDF BOOK"}</span><span>${video ? "▶" : "▤"}</span>`;
    const body = document.createElement("div"); body.className = "item-body";
    const title = document.createElement("h3"); title.textContent = item.title;
    const desc = document.createElement("p"); desc.textContent = item.description || "এই রিসোর্সটি খুলে পড়ুন বা দেখুন।";
    const meta = document.createElement("div"); meta.className = "item-meta";
    const category = document.createElement("span"); category.textContent = item.category || "সাধারণ";
    const date = document.createElement("span"); date.textContent = new Date(item.created_at).toLocaleDateString("bn-BD");
    meta.append(category, date);
    const actions = document.createElement("div"); actions.className = "card-actions";
    const open = document.createElement("button"); open.className = "btn btn-primary"; open.textContent = video ? "ভিডিও দেখুন" : "বই পড়ুন"; open.addEventListener("click", () => openItem(item));
    actions.append(open);
    if (isAdmin(currentUser)) {
      const del = document.createElement("button"); del.className = "btn btn-danger"; del.textContent = "মুছুন";
      del.addEventListener("click", () => deleteItem(item)); actions.append(del);
    }
    body.append(title, desc, meta, actions); card.append(cover, body); $("itemsGrid").append(card);
  });
}
$("searchInput").addEventListener("input", renderItems);
$("typeFilter").addEventListener("change", renderItems);
async function openItem(item) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(item.storage_path, 120);
  if (error || !data?.signedUrl) return alert("ফাইল খোলা যায়নি। Storage policy পরীক্ষা করুন।");
  $("readerTitle").textContent = item.title;
  $("readerKind").textContent = item.item_type === "video" ? "WATCH & LEARN" : "READING ROOM";
  $("readerContent").innerHTML = '<div class="reader-loading">ফাইল খোলা হচ্ছে…</div>';
  $("readerDialog").showModal();
  const url = data.signedUrl;
  if (item.item_type === "video") {
    const video = document.createElement("video"); video.controls = true; video.playsInline = true; video.preload = "metadata"; video.src = url;
    $("readerContent").replaceChildren(video);
  } else {
    const iframe = document.createElement("iframe");
    iframe.title = item.title; iframe.src = url + "#toolbar=0&navpanes=0";
    $("readerContent").replaceChildren(iframe);
  }
}
$("closeReader").addEventListener("click", () => $("readerDialog").close());
$("readerDialog").addEventListener("close", () => { $("readerContent").innerHTML = ""; });
async function deleteItem(item) {
  if (!isAdmin(currentUser) || !confirm(`“${item.title}” মুছে ফেলবেন?`)) return;
  const { error: fileError } = await sb.storage.from(BUCKET).remove([item.storage_path]);
  if (fileError) return alert("ফাইল মুছতে সমস্যা হয়েছে: " + fileError.message);
  const { error } = await sb.from("library_items").delete().eq("id", item.id);
  if (error) alert("তথ্য মুছতে সমস্যা হয়েছে: " + error.message);
  else await loadItems();
}
init();
