/* Ayon's Library
   Preview mode works without credentials using sample cards.
   Real authentication/storage requires your own Supabase project.
*/
const SUPABASE_URL = "https://pjqaxjfobsxjgemcnbjy.supabase.co";       // Add your Supabase Project URL
const SUPABASE_ANON_KEY = "sb_publishable_5Rr7Dad2tr2B4sdBqR_vPg_ONZiWMxf";  // Add your Supabase publishable/anon key (never a service-role key)
const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const client = supabaseReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const samples = [
  {id:"s1",title:"The Art of Learning",author:"A collection for curious minds",category:"Other",description:"A sample book card. Upload your own PDF after setup.",color:"c1"},
  {id:"s2",title:"Programming Basics",author:"Computer Science",category:"Programming",description:"A sample book card. Upload your own PDF after setup.",color:"c2"},
  {id:"s3",title:"Exploring Science",author:"Science Collection",category:"Science",description:"A sample book card. Upload your own PDF after setup.",color:"c3"},
  {id:"s4",title:"Stories & Literature",author:"Classic Reads",category:"Literature",description:"A sample book card. Upload your own PDF after setup.",color:"c4"},
  {id:"s5",title:"Data Structures",author:"Computer Science",category:"Programming",description:"A sample book card. Upload your own PDF after setup.",color:"c5"},
  {id:"s6",title:"The Natural World",author:"Science Collection",category:"Science",description:"A sample book card. Upload your own PDF after setup.",color:"c6"},
  {id:"s7",title:"Short Stories",author:"Literature Collection",category:"Literature",description:"A sample book card. Upload your own PDF after setup.",color:"c7"},
  {id:"s8",title:"Web Development",author:"Computer Science",category:"Programming",description:"A sample book card. Upload your own PDF after setup.",color:"c8"}
];
let books = [...samples], category = "All", currentUser = null;
const $ = id => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

function safeText(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderBooks(){
  const q=$("search").value.trim().toLowerCase();
  const filtered=books.filter(b=>(category==="All"||b.category===category)&&(`${b.title} ${b.author} ${b.category}`).toLowerCase().includes(q));
  $("bookGrid").innerHTML=filtered.map((b,i)=>`<article class="book-card"><div class="cover ${b.color||"c"+(i%8+1)}"><span>${safeText(b.title)}</span><small>AYON'S LIBRARY</small></div><span class="book-category">${safeText(b.category)}</span><h3>${safeText(b.title)}</h3><p class="author">${safeText(b.author||"Unknown author")}</p><button class="read-btn" data-read="${safeText(b.id)}">View book ↗</button></article>`).join("");
  $("emptyState").classList.toggle("hidden",filtered.length!==0);
  $("bookCount").textContent=supabaseReady?`${books.length} books`:"Preview collection";
}
$("search").addEventListener("input",renderBooks);
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));btn.classList.add("active");category=btn.dataset.category;renderBooks();}));
function showModal(id){$(id).classList.remove("hidden");}
function hideModal(id){$(id).classList.add("hidden");}
$("loginNav").addEventListener("click",e=>{e.preventDefault();$("authMessage").textContent=supabaseReady?"":"Preview only: connect Supabase using the SETUP.md guide to enable secure sign-in.";showModal("loginModal");});
$("closeModal").addEventListener("click",()=>hideModal("loginModal"));
$("closeAdmin").addEventListener("click",()=>hideModal("adminModal"));
["loginModal","adminModal"].forEach(id=>$(id).addEventListener("click",e=>{if(e.target===$(id))hideModal(id);}));

async function refreshBooks(){
  if(!client)return;
  const {data,error}=await client.from("Ayon Books").select("id,title,author,category,description,file_path").order("created_at",{ascending:false});
  if(!error&&data){books=data.map((b,i)=>({...b,color:"c"+(i%8+1)}));renderBooks();}
}
async function refreshSession(){
  if(!client)return;
  const {data}=await client.auth.getSession();
  currentUser=data.session?.user||null;
  if(currentUser){$("loginNav").textContent="Admin panel";$("loginNav").onclick=e=>{e.preventDefault();showModal("adminModal");};}
  await refreshBooks();
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!client){$("authMessage").textContent="Secure login is not active yet. Follow SETUP.md to connect your Supabase project.";return;}
  $("authMessage").textContent="Signing in…";
  const {data,error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  if(error){$("authMessage").textContent=error.message;return;}
  currentUser=data.user;hideModal("loginModal");$("loginNav").textContent="Admin panel";showModal("adminModal");
});
$("resetPassword").addEventListener("click",async()=>{
  if(!client){$("authMessage").textContent="Connect Supabase first; then password reset email will work.";return;}
  const email=$("email").value.trim();if(!email){$("authMessage").textContent="Enter your account email above first.";return;}
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  $("authMessage").textContent=error?error.message:"If this account exists, a password reset email has been sent.";
});
$("changePassword").addEventListener("click",async()=>{
  if(!client||!currentUser){$("uploadMessage").textContent="Sign in with your connected admin account first.";return;}
  const {error}=await client.auth.resetPasswordForEmail(currentUser.email,{redirectTo:location.origin+location.pathname});
  $("uploadMessage").textContent=error?error.message:"Password reset instructions sent to your email.";
});
$("signOut").addEventListener("click",async()=>{if(client)await client.auth.signOut();currentUser=null;hideModal("adminModal");$("loginNav").textContent="Admin login";$("loginNav").onclick=e=>{e.preventDefault();showModal("loginModal");};});
$("uploadForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!client||!currentUser){$("uploadMessage").textContent="Secure upload is not active. Connect Supabase and sign in first.";return;}
  const file=$("bookFile").files[0];
  if(!file||file.type!=="application/pdf"){ $("uploadMessage").textContent="Please choose a PDF file.";return;}
  if(file.size>25*1024*1024){$("uploadMessage").textContent="For this starter, keep PDFs under 25 MB.";return;}
  $("uploadMessage").textContent="Uploading…";
  const path=`${currentUser.id}/${crypto.randomUUID()}.pdf`;
  const {error:storageError}=await client.storage.from("Ayon Books").upload(path,file,{contentType:"application/pdf",upsert:false});
  if(storageError){$("uploadMessage").textContent=storageError.message;return;}
  const {error}=await client.from("Ayon Books").insert({title:$("bookTitle").value.trim(),author:$("bookAuthor").value.trim(),category:$("bookCategory").value,description:$("bookDescription").value.trim(),file_path:path});
  if(error){await client.storage.from("Ayon Books").remove([path]);$("uploadMessage").textContent=error.message;return;}
  $("uploadMessage").textContent="Book uploaded successfully.";
  $("uploadForm").reset();await refreshBooks();
});
$("bookGrid").addEventListener("click",async e=>{
  const btn=e.target.closest("[data-read]");if(!btn)return;
  const book=books.find(b=>b.id===btn.dataset.read);if(!book)return;
  if(book.file_path&&client){
    const {data,error}=await client.storage.from("Ayon Books").createSignedUrl(book.file_path,300);
    if(error){alert("Could not open this book: "+error.message);return;}
    window.open(data.signedUrl,"_blank","noopener");
  }else{
    alert("This is a sample preview card, not a real book file. Connect Supabase and upload a PDF to make it readable.");
  }
});
if(client){client.auth.onAuthStateChange(()=>refreshSession());refreshSession();}
renderBooks();
