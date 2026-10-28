#!/usr/bin/env node
// Cria (ou atualiza) os usuários do painel usados nos testes E2E do e-mail.
// Usa as dependências já instaladas na API (mysql2 e bcrypt).
const path = require('path');
const apiRequire = require('module').createRequire(path.join(__dirname, '../../api-redecoop/package.json'));
const mysql = apiRequire('mysql2/promise');
const bcrypt = apiRequire('bcrypt');

const USERS = [
  { username: 'admin.e2e', password: 'Admin-e2e-123', role: 'ADMIN' },
  { username: 'coop.e2e', password: 'Coop-e2e-123', role: 'COOPERATIVE', company: 'Cooperativa E2E' },
];

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || 'redecoop',
    password: process.env.DATABASE_PASSWORD || 'redecoop123',
    database: process.env.DATABASE_NAME || 'redecoopapi',
  });
  for (const user of USERS) {
    const hash = await bcrypt.hash(user.password, 10);
    const [rows] = await db.query('SELECT id FROM user WHERE username = ?', [user.username]);
    let id = rows[0]?.id;
    if (id) {
      await db.query('UPDATE user SET password = ?, role = ? WHERE id = ?', [hash, user.role, id]);
    } else {
      const [result] = await db.query('INSERT INTO user (username, password, role) VALUES (?, ?, ?)', [
        user.username,
        hash,
        user.role,
      ]);
      id = result.insertId;
    }
    if (user.role === 'COOPERATIVE') {
      const [coops] = await db.query('SELECT id FROM cooperative WHERE user_id = ?', [id]);
      if (!coops.length) {
        await db.query('INSERT INTO cooperative (user_id, company_name, email) VALUES (?, ?, ?)', [
          id,
          user.company,
          `${user.username}@redecoop.test`,
        ]);
      }
    }
  }
  await db.end();
  console.log(`Usuários E2E prontos: ${USERS.map((user) => user.username).join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
