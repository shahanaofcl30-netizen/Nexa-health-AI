-- Migration: Add full_name column to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
