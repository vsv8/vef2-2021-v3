import { readFile } from 'fs/promises';
import { query, end, fakeData } from './db.js';

const schemaFile = './sql/schema.sql';

async function create() {
  const data = await readFile(schemaFile);

  await query(data.toString('utf-8'));

  for (let i = 0; i < 510; i += 1) {
    await fakeData(); // eslint-disable-line
  }

  await end();

  console.info('Schema created');
}

create().catch((err) => {
  console.error('Error creating schema', err);
});
