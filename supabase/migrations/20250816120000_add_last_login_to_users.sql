-- Add last_login field to users table
-- This field will track when users last logged into the system

ALTER TABLE public.users 
ADD COLUMN last_login timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of the user''s last login to the system';

-- Create index for performance (optional, but recommended for queries filtering by last_login)
CREATE INDEX idx_users_last_login ON public.users(last_login);

-- Update RLS policies to include the new column (if needed)
-- The existing RLS policies should automatically cover this new column since they're based on tenant_id