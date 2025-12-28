# Run Team Members Migration

This migration adds the `team_members` table to enable proactive helper management.

## Steps to Run Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Copy the Migration SQL**
   - Open the file: `supabase/migrations/20250129000003_add_team_members.sql`
   - Copy the entire contents

3. **Run in SQL Editor**
   - Paste the SQL into the SQL Editor
   - Click **Run** or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
   - You should see: "Success. No rows returned"

4. **Verify Migration**
   - Go to **Table Editor** in Supabase Dashboard
   - You should see a new table called `team_members`
   - Check that it has the correct columns:
     - `id` (UUID, primary key)
     - `owner_id` (UUID, foreign key to auth.users)
     - `helper_id` (UUID, foreign key to auth.users)
     - `helper_email` (TEXT)
     - `helper_name` (TEXT, nullable)
     - `added_at` (TIMESTAMPTZ)
     - `created_at` (TIMESTAMPTZ)

## What This Migration Does

- Creates `team_members` table to store helper relationships
- Allows owners to proactively add helpers before first assignment
- Includes RLS policies for security
- Auto-populates when jobs are assigned (via code changes)

## After Migration

The app will now:
1. Show helpers from both `team_members` and discovered assignments
2. Auto-add helpers to `team_members` when jobs are assigned
3. Display better helper information (email, name) when available

## Troubleshooting

If you see errors:
- **"relation does not exist"**: Make sure you're running this in the correct Supabase project
- **"permission denied"**: Check that you're logged in as the project owner
- **"duplicate key"**: The table might already exist - check Table Editor first




