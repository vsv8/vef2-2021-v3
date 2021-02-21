import { readFile } from 'fs/promises';
import { query, end, fakeData } from './db.js';

const schemaFile = './sql/schema.sql';

async function create() {
  const data = await readFile(schemaFile);

  await query(data.toString('utf-8'));

  await end();

  console.info('Schema created');
}

for (let i = 0; i < 10; i++) {
  await fakeData();
}

create().catch((err) => {
  console.error('Error creating schema', err);
});
