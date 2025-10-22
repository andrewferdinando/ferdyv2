# Deploy RPC Function to Fix Multiple Posts Issue

## Problem
The new post creation is still creating multiple posts (one per channel) instead of a single post with multiple channels.

## Solution
The new RPC function `rpc_create_single_manual_post` needs to be deployed to your Supabase database.

## Steps to Fix

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the SQL Migration**
   - Copy the contents of `supabase_rpc_functions.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

3. **Verify the Function Exists**
   - The function `rpc_create_single_manual_post` should now be available
   - This function creates a single post with multiple channels stored as comma-separated string

## What This Fixes
- ✅ Creates **one single post** instead of multiple posts
- ✅ Stores all selected channels as comma-separated string in the database
- ✅ Displays multiple channel icons on the single post
- ✅ Fixes image URLs to use Supabase public URLs instead of storage paths

## After Deployment
Once the RPC function is deployed, creating a new post with multiple channels will:
- Create only **1 post** (not multiple)
- Show all selected channel icons on that single post
- Display actual images from the database (not placeholders)
