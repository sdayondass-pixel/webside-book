
/* =====================================
   AYON'S LIBRARY
   Supabase + Library Management
===================================== */

const SUPABASE_URL = "https://pjqaxjfobsxjgemcnbjy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5Rr7Dad2tr2B4sdBqR_vPg_ONZiWMxf";

const supabaseReady = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  window.supabase
);

const client = supabaseReady
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// =====================================
// DOM HELPERS
// =====================================

const $ = id => document.getElementById(id);

$("year").textContent = new Date().getFullYear();

let category = "All";
let currentUser = null;
let books = [];

// =====================================
// SAMPLE BOOKS
// =====================================

const samples = [
  {
    id: "s1",
    title: "The Art of Learning",
    author: "A collection for curious minds",
    category: "Other",
    description: "A sample book card.",
    color: "c1"
  },
  {
    id: "s2",
    title: "Programming Basics",
    author: "Computer Science",
    category: "Programming",
    description: "Learn programming.",
    color: "c2"
  },
  {
    id: "s3",
    title: "Exploring Science",
    author: "Science Collection",
    category: "Science",
    description: "Explore science.",
    color: "c3"
  },
  {
    id: "s4",
    title: "Stories & Literature",
    author: "Classic Reads",
    category: "Literature",
    description: "Classic literature.",
    color: "c4"
  },
  {
    id: "s5",
    title: "Data Structures",
    author: "Computer Science",
    category: "Programming",
    description: "Learn data structures.",
    color: "c5"
  },
  {
    id: "s6",
    title: "The Natural World",
    author: "Science Collection",
    category: "Science",
    description: "Discover nature.",
    color: "c6"
  },
  {
    id: "s7",
    title: "Short Stories",
    author: "Literature Collection",
    category: "Literature",
    description: "Enjoy short stories.",
    color: "c7"
  },
  {
    id: "s8",
    title: "Web Development",
    author: "Computer Science",
    category: "Programming",
    description: "Learn web development.",
    color: "c8"
  }
];

// =====================================
// SECURITY HELPER
// =====================================

function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// =====================================
// MODAL FUNCTIONS
// =====================================

function showModal(id) {
  $(id).classList.remove("hidden");
}

function hideModal(id) {
  $(id).classList.add("hidden");
}

$("closeModal").addEventListener("click", () => {
  hideModal("loginModal");
});

$("closeAdmin").addEventListener("click", () => {
  hideModal("adminModal");
});

["loginModal", "adminModal"].forEach(id => {
  $(id).addEventListener("click", event => {
    if (event.target === $(id)) {
      hideModal(id);
    }
  });
});

// =====================================
// ADMIN NAVIGATION
// =====================================

function updateNavigation() {
  const loginNav = $("loginNav");

  loginNav.textContent = currentUser
    ? "Admin panel"
    : "Admin login";

  loginNav.onclick = event => {
    event.preventDefault();

    if (currentUser) {
      showModal("adminModal");
    } else {
      showModal("loginModal");
    }
  };
}

$("loginNav").addEventListener("click", event => {
  event.preventDefault();

  if (currentUser) {
    showModal("adminModal");
  } else {
    $("authMessage").textContent = client
      ? ""
      : "Supabase connection is not available.";

    showModal("loginModal");
  }
});

// =====================================
// RENDER BOOKS
// =====================================

function renderBooks() {
  const query = $("search").value.trim().toLowerCase();

  const filtered = books.filter(book => {
    const matchesCategory =
      category === "All" || book.category === category;

    const searchText = [
      book.title,
      book.author,
      book.category
    ].join(" ").toLowerCase();

    return matchesCategory && searchText.includes(query);
  });

  $("bookGrid").innerHTML = filtered.map((book, index) => `
    <article class="book-card">

      <div class="cover ${book.color || `c${index % 8 + 1}`}">
        <span>${safeText(book.title)}</span>
        <small>AYON'S LIBRARY</small>
      </div>

      <span class="book-category">
        ${safeText(book.category)}
      </span>

      <h3>${safeText(book.title)}</h3>

      <p class="author">
        ${safeText(book.author || "Unknown author")}
      </p>

      <button
        class="read-btn"
        data-read="${safeText(book.id)}"
        type="button">
        View book ↗
      </button>

    </article>
  `).join("");

  $("emptyState").classList.toggle(
    "hidden",
    filtered.length !== 0
  );

  $("bookCount").textContent =
    `${books.length} books`;
}

// =====================================
// SEARCH
// =====================================

$("search").addEventListener("input", renderBooks);

// =====================================
// CATEGORY FILTER
// =====================================

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {

    document.querySelectorAll(".filter").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    category = button.dataset.category;

    renderBooks();
  });
});

// =====================================
// LOAD BOOKS FROM SUPABASE
// =====================================

async function refreshBooks() {

  if (!client) {
    books = [...samples];
    renderBooks();
    return;
  }

  const { data, error } = await client
    .from("books")
    .select("id,title,author,category,description,file_path")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Book loading error:", error);

    $("bookCount").textContent = "Unable to load books";
    return;
  }

  books = (data || []).map((book, index) => ({
    ...book,
    color: `c${index % 8 + 1}`
  }));

  renderBooks();
}

// =====================================
// AUTHENTICATION SESSION
// =====================================

async function refreshSession() {

  if (!client) {
    updateNavigation();
    return;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    console.error(error);
    return;
  }

  currentUser = data.session?.user || null;

  updateNavigation();

  await refreshBooks();
}

// =====================================
// ADMIN LOGIN
// =====================================

$("loginForm").addEventListener("submit", async event => {

  event.preventDefault();

  if (!client) {
    $("authMessage").textContent =
      "Supabase connection is not configured.";

    return;
  }

  $("authMessage").textContent = "Signing in...";

  const email = $("email").value.trim();
  const password = $("password").value;

  const { data, error } = await client.auth
    .signInWithPassword({
      email,
      password
    });

  if (error) {
    $("authMessage").textContent = error.message;
    return;
  }

  currentUser = data.user;

  updateNavigation();

  $("authMessage").textContent = "";

  hideModal("loginModal");

  showModal("adminModal");
});

// =====================================
// FORGOT PASSWORD
// =====================================

$("resetPassword").addEventListener("click", async () => {

  if (!client) {
    $("authMessage").textContent =
      "Connect Supabase first.";

    return;
  }

  const email = $("email").value.trim();

  if (!email) {
    $("authMessage").textContent =
      "Please enter your email address.";

    return;
  }

  const { error } = await client.auth
    .resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });

  $("authMessage").textContent = error
    ? error.message
    : "Password reset instructions sent if the account exists.";
});

// =====================================
// CHANGE PASSWORD
// =====================================

$("changePassword").addEventListener("click", async () => {

  if (!client || !currentUser) {
    $("uploadMessage").textContent =
      "Please sign in first.";

    return;
  }

  const { error } = await client.auth
    .resetPasswordForEmail(currentUser.email, {
      redirectTo: location.origin + location.pathname
    });

  $("uploadMessage").textContent = error
    ? error.message
    : "Password reset instructions sent.";
});

// =====================================
// SIGN OUT
// =====================================

$("signOut").addEventListener("click", async () => {

  if (client) {
    const { error } = await client.auth.signOut();

    if (error) {
      $("uploadMessage").textContent = error.message;
      return;
    }
  }

  currentUser = null;

  updateNavigation();

  hideModal("adminModal");

  $("uploadMessage").textContent = "";
});

// =====================================
// UPLOAD PDF BOOK
// =====================================

$("uploadForm").addEventListener("submit", async event => {

  event.preventDefault();

  if (!client || !currentUser) {
    $("uploadMessage").textContent =
      "Please sign in first.";

    return;
  }

  const file = $("bookFile").files[0];

  if (!file || (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  )) {
    $("uploadMessage").textContent =
      "Please select a valid PDF file.";

    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    $("uploadMessage").textContent =
      "PDF must be under 25 MB.";

    return;
  }

  const title = $("bookTitle").value.trim();

  if (!title) {
    $("uploadMessage").textContent =
      "Please enter a book title.";

    return;
  }

  const submitButton = $("uploadForm").querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;

  try {

    $("uploadMessage").textContent = "Uploading PDF...";

    const path =
      `${currentUser.id}/${crypto.randomUUID()}.pdf`;

    // Upload PDF to Supabase Storage

    const { error: storageError } = await client.storage
      .from("Ayon Books")
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: false
      });

    if (storageError) {
      throw new Error(storageError.message);
    }

    $("uploadMessage").textContent =
      "Saving book information...";

    // Save book information to database

    const { error: dbError } = await client
      .from("books")
      .insert({
        title,
        author: $("bookAuthor").value.trim(),
        category: $("bookCategory").value,
        description: $("bookDescription").value.trim(),
        file_path: path
      });

    if (dbError) {

      await client.storage
        .from("Ayon Books")
        .remove([path]);

      throw new Error(dbError.message);
    }

    $("uploadMessage").textContent =
      "Book uploaded successfully!";

    $("uploadForm").reset();

    await refreshBooks();

  } catch (error) {

    console.error("Upload error:", error);

    $("uploadMessage").textContent =
      "Upload failed: " + error.message;

  } finally {

    submitButton.disabled = false;

  }

});

// =====================================
// VIEW / READ PDF BOOK
// =====================================

$("bookGrid").addEventListener("click", async event => {

  const button = event.target.closest("[data-read]");

  if (!button) return;

  const book = books.find(
    item => String(item.id) === button.dataset.read
  );

  if (!book) {
    alert("Book not found!");
    return;
  }

  if (!book.file_path || !client) {
    alert("This is a sample book. No PDF is available.");
    return;
  }

  button.disabled = true;

  try {

    const { data, error } = await client.storage
      .from("Ayon Books")
      .createSignedUrl(book.file_path, 300);

    if (error) {
      throw error;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");

  } catch (error) {

    console.error("PDF error:", error);

    alert("Unable to open PDF: " + error.message);

  } finally {

    button.disabled = false;

  }

});

// =====================================
// SUPABASE AUTH STATE
// =====================================

if (client) {

  client.auth.onAuthStateChange(() => {

    setTimeout(() => {
      refreshSession();
    }, 0);

  });

}

// =====================================
// INITIALIZE LIBRARY
// =====================================

async function initializeLibrary() {

  if (client) {
    await refreshSession();
  } else {
    books = [...samples];
    renderBooks();
    updateNavigation();
  }

}

initializeLibrary();
