/*
  # Fix Users Table RLS Policies

  1. Changes
    - Add policy for inserting new users
    - Update select policy to allow reading own data

  2. Security
    - Maintain RLS on users table
    - Allow new user registration
    - Restrict data access to own records
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create new policies
CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);