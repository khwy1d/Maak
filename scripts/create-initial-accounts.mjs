import { createClient } from '@supabase/supabase-js';
import { stdin, stdout } from 'node:process';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local terminal environment. Never commit the service-role key.');
}
if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
  throw new Error('Run this script in an interactive terminal so passwords can be entered without being displayed.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function askHidden(label) {
  return new Promise((resolve, reject) => {
    stdout.write(label);
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Cancelled.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else if (char >= ' ') {
          value += char;
        }
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function findUserByPhone(phone) {
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((user) => user.phone === phone);
    if (found) return found;
    if (data.users.length < perPage) return null;
  }
}

async function ensureUser({ phone, fullName, password }) {
  let user = await findUserByPhone(phone);
  if (user) {
    console.log('Already exists; keeping its current password: ' + phone);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
    console.log('Created and phone-confirmed: ' + phone);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    throw new Error('Profile row was not created for ' + phone + '. Check the on_auth_user_created trigger and migration status.');
  }

  return user;
}

async function main() {
  console.log('MAAK temporary account setup');
  console.log('Passwords are entered invisibly and are never written to files or logs.\n');

  const adminPassword = await askHidden('Admin password: ');
  const customerPassword = await askHidden('Customer password: ');

  if (adminPassword.length < 6 || customerPassword.length < 6) {
    throw new Error('Both passwords must be at least 6 characters long.');
  }

  const admin = await ensureUser({
    phone: '+967717136229',
    fullName: 'خالد أمين',
    password: adminPassword,
  });

  const customer = await ensureUser({
    phone: '+967735452441',
    fullName: 'خالد أمين عبدالواسع محمد',
    password: customerPassword,
  });

  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: admin.id, role: 'admin' }, { onConflict: 'user_id' });
  if (roleError) throw roleError;

  console.log('\nCompleted successfully:');
  console.log('- Admin: ' + admin.phone + ' (admin role)');
  console.log('- Customer: ' + customer.phone + ' (customer role)');
  console.log('Both phone numbers were marked confirmed without sending SMS.');
  console.log('Because phone ownership was not verified by SMS, use these as controlled test accounts only.');
}

main().catch((error) => {
  console.error('Account setup failed:', error.message);
  process.exitCode = 1;
});
