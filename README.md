# Kumar Vibhu Portfolio

Live portfolio + private portfolio CMS.

## Admin CMS

Private admin area:

`https://vibhu10.github.io/portfolio/admin/`

Features:
- Email/password login through Supabase Auth
- Add/edit/delete projects
- Upload project screenshots through Supabase Storage
- Manage skills and technologies
- Publish/hide projects
- Visitor, page-view, contact-click and resume-click analytics
- Anonymous visitor IDs; no raw IP address is stored

## One-time Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql).
3. In **Authentication → Users**, create your private admin email/password account.
4. Copy that user's UUID and run:

```sql
insert into public.admin_users(user_id) values ('YOUR-AUTH-USER-UUID');
```

5. In GitHub, open **Settings → Secrets and variables → Actions** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase publishable/anon key
6. Run the Pages workflow again.

**Never put a Supabase service-role key in the repository or GitHub Pages build.** Row Level Security limits CMS writes and private analytics reads to your admin user.

GitHub Pages remains the host; Supabase provides the authentication, database, storage and analytics backend.
