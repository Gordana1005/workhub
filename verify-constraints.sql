-- Verify that our security constraints were created
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname LIKE '%_check' OR conname LIKE '%_unique'
  AND connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;
