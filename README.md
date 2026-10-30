# বইঘর — Secure Online Library Starter

এই প্রজেক্টটি GitHub Pages-এর মতো static hosting-এ frontend হিসেবে চালানো যায়; লগইন, ডেটাবেস ও private file storage-এর জন্য Supabase দরকার।

## কী আছে
- Responsive Bengali interface (mobile + desktop)
- Google, Facebook, GitHub OAuth buttons via Supabase Auth
- Authenticated users can view books/videos
- Admin-only PDF/MP4/WebM upload and delete
- Private Supabase Storage bucket + Row Level Security (RLS)
- Search and type filter
- PDF reader / video player modal
- File type and 50 MB size validation
- Code comments and setup instructions

## গুরুত্বপূর্ণ নিরাপত্তা কথা
- Browser code-এ শুধু Supabase Project URL ও anon/publishable key ব্যবহার করবেন। `service_role` key কখনোই `app.js`, HTML, GitHub repository বা public hosting-এ দেবেন না।
- শুধু UI লুকিয়ে রাখা security নয়; এই project-এ database/storage RLS policy দিয়ে upload/delete অনুমতি যাচাই করা হয়।
- Admin role `app_metadata.role = "admin"` হতে হবে। এটি Supabase Dashboard-এর Authentication user metadata editor-এ **App Metadata**-তে trusted admin হিসেবে সেট করুন, অথবা নিরাপদ server/Admin API ব্যবহার করুন। `user_metadata`-তে role দেবেন না—ব্যবহারকারী সেটি বদলাতে পারে। App metadata পরিবর্তনের পরে user-কে sign out/in করতে হতে পারে।
- এই starter-এ authenticated users ফাইল পড়তে পারে। Browser-এ দেখানো PDF/video 100% copy, screenshot বা screen recording থেকে আটকানো যায় না। সম্পূর্ণ DRM/anti-copy সুরক্ষা নয়।
- 50 MB সীমা starter-এর জন্য। বড় ভিডিও হলে Supabase resumable/TUS upload ব্যবহার করুন।
- OAuth provider-গুলোর Client ID/Secret Supabase provider settings-এ রাখতে হবে; source code-এ নয়।

## ধাপ ১ — Supabase project
1. https://supabase.com এ account খুলে New project তৈরি করুন।
2. Project Settings → API থেকে Project URL এবং anon/publishable key কপি করুন।
3. `app.js`-এ `SUPABASE_URL` এবং `SUPABASE_ANON_KEY`-এ বসান।
4. Supabase SQL Editor খুলে `supabase.sql`-এর সব SQL চালান।

## ধাপ ২ — OAuth login চালু করুন
Supabase Dashboard → Authentication → Providers-এ Google, Facebook ও GitHub enable করুন।
প্রতিটি provider-এর OAuth app/Client ID ও Client Secret তৈরি করে Supabase provider settings-এ বসান।
Supabase Authentication → URL Configuration-এ:
- Site URL: আপনার deployed website URL
- Redirect URLs: `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/**` এবং local testing URL প্রয়োজন অনুযায়ী
Provider setup-এর redirect/callback URL Supabase Dashboard-এ দেখানো ঠিকানার সঙ্গে মিলিয়ে দিন। Provider-এর ডেভেলপার কনসোলেও callback URL যোগ করুন।

## ধাপ ৩ — Admin account নির্ধারণ
1. আপনার নিজের account দিয়ে একবার OAuth login করুন।
2. Supabase Dashboard → Authentication → Users-এ নিজের user খুলুন।
3. **App Metadata**-তে `role` = `admin` সেট করুন (JSON object-এর মধ্যে, যেমন `{"provider":"google","providers":["google"],"role":"admin"}`; বিদ্যমান metadata মুছে ফেলবেন না—শুধু `role` যোগ করুন)।
4. Save করে website থেকে sign out এবং sign in করুন।
5. Admin panel দেখা গেলে PDF/MP4/WebM upload পরীক্ষা করুন।

**কখনোই** client-side JavaScript দিয়ে admin role সেট করবেন না। নিরাপদে App Metadata সম্পাদনা করার সুবিধা না পেলে Supabase Dashboard বা trusted server/Admin API ব্যবহার করুন।

## ধাপ ৪ — GitHub Pages-এ publish
1. এই ZIP extract করুন।
2. `index.html`, `style.css`, `app.js`, `supabase.sql`, `README.md` একই repository folder-এ রাখুন।
3. `app.js`-এ Supabase URL/key বসিয়ে commit/push করুন।
4. GitHub repository → Settings → Pages → Deploy from branch → `main` / root নির্বাচন করুন।
5. আপনার Pages URL Supabase Site URL ও Redirect URLs-এ যোগ করুন।

## মন্তব্য (Comments)
এই starter-এ বই/ভিডিওর জন্য comment section ইচ্ছাকৃতভাবে অন্তর্ভুক্ত করা হয়নি, কারণ public comments চালু করতে moderation, spam prevention এবং abuse reporting দরকার। চাইলে পরের সংস্করণে authenticated comments, rate limits, report/delete moderation policies যোগ করা যাবে।

## Troubleshooting
- OAuth error: provider credentials ও redirect URLs মিলিয়ে দেখুন।
- Admin panel না এলে: App Metadata-তে role `admin` আছে কি না এবং পুনরায় sign in করেছেন কি না দেখুন।
- Upload denied: `supabase.sql` policy চালানো হয়েছে কি না দেখুন।
- Files won't open: bucket name `library-files`, private status এবং Storage RLS policy পরীক্ষা করুন।
