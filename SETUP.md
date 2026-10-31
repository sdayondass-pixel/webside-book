# Ayon's Library — setup guide

This ZIP is a responsive front-end starter. The book cards work in preview mode. Real login, upload, password reset and online PDF storage activate only after you connect your own Supabase project and apply the security setup below.

## 1. Preview on a phone/computer
- Unzip the downloaded ZIP.
- Open `index.html` in a browser. If your phone blocks local JavaScript, upload the folder to GitHub Pages or use a local web server.
- Sample book cards are placeholders; they are not actual downloadable books.

## 2. Create Supabase project
1. Open https://supabase.com/ and create a project.
2. In Project Settings / API, copy the Project URL and publishable/anon key.
3. Put them in `app.js` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. Never put a `service_role` or secret key in front-end code.

## 3. Database and private file bucket
1. Open SQL Editor in Supabase.
2. Run the contents of `supabase-schema.sql`.
3. In Storage, create a bucket named exactly `books`.
4. Keep the bucket private if you want access controlled. The included example creates short-lived signed PDF URLs for reading.
5. Review the storage read policy. The example currently allows any visitor to read PDFs in the bucket. If you want only logged-in/approved readers, change that policy to require authentication or an approved-reader claim.

## 4. Admin account and role (important)
- Create your user through Supabase Authentication.
- Set `app_metadata.role = "admin"` for your own user using a trusted server-side/admin workflow or Supabase dashboard-supported admin workflow.
- Never set admin privileges using user-editable metadata or browser JavaScript. Never share the service-role key.
- The included SQL policies use the trusted `app_metadata.role` claim. If the role is not set, uploads and changes should be denied.
- Enable email confirmation, use a unique strong password, and configure password recovery URLs in Supabase Auth settings.

## 5. Social login
In Supabase Authentication > Providers, enable Google, Facebook, and GitHub and complete each provider's OAuth setup. Each provider needs its own developer-console app, client ID/secret, and exact redirect URL from Supabase. Do not put provider secrets in `app.js`. YouTube is a channel/profile link, not a sign-in provider.
The starter UI does not yet include working social-login buttons; those require provider setup and corresponding OAuth button handlers.

## 6. Publish with GitHub Pages
- Create a new GitHub repository and upload `index.html`, `style.css`, `app.js`, and `supabase-schema.sql`.
- In repository Settings > Pages, enable publishing from the main branch and root folder.
- Copy the generated Pages URL into Supabase Auth's allowed redirect URLs.
- Your GitHub repository is where you edit website code. Supabase stores user accounts, book records, and PDFs separately.

## Current starter limitations
- Sample cards are illustrations only; no actual books are bundled.
- Social-login provider buttons need configuration and implementation.
- The example's SQL uses `app_metadata.role = 'admin'`; assign that role securely before testing upload.
- Public reading vs approved-reader-only access should be chosen explicitly. The starter policy allows public reads of uploaded PDFs.
- Do not upload copyrighted books unless you have permission to share them.
