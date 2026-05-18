import { readFileSync } from 'fs';
import { resolve } from 'path';

// Leer .env manualmente
const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = 'b95d1fc6-a440-448c-a46d-b2f1a79c6f41';
const NEW_PASSWORD = 'Admin1234!';

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

console.log('Reseteando contraseña para usuario', USER_ID);

const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`, {
  method: 'PUT',
  headers: {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ password: NEW_PASSWORD }),
});

const data = await res.json();

if (res.ok) {
  console.log('✅ Contraseña actualizada. Usa:', NEW_PASSWORD);
} else {
  console.error('❌ Error:', data);
}
