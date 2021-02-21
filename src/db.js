import pg from 'pg';
import dotenv from 'dotenv';
import faker from 'faker';

dotenv.config();

const {
  DATABASE_URL: connectionString,
  NODE_ENV: nodeEnv = 'development',
} = process.env;

if (!connectionString) {
  console.error('Vantar DATABASE_URL');
  process.exit(1);
}

// Notum SSL tengingu við gagnagrunn ef við erum *ekki* í development mode, þ.e.a.s. á local vél
const ssl = nodeEnv !== 'development' ? { rejectUnauthorized: false } : false;

const pool = new pg.Pool({ connectionString, ssl });

pool.on('error', (err) => {
  console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
  process.exit(-1);
});

export async function query(_query, values = []) {
  const client = await pool.connect();

  try {
    const result = await client.query(_query, values);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Insert a single registration into the registration table.
 *
 * @param {string} entry.name – Name of registrant
 * @param {string} entry.nationalId – National ID of registrant
 * @param {string} entry.comment – Comment, if any from registrant
 * @param {boolean} entry.anonymous – If the registrants name should be displayed or not
 * @returns {Promise<boolean>} Promise, resolved as true if inserted, otherwise false
 */
export async function insert({
  name, nationalId, comment, anonymous,
} = {}) {
  let success = true;

  const q = `
    INSERT INTO signatures
      (name, nationalId, comment, anonymous)
    VALUES
      ($1, $2, $3, $4);
  `;
  const values = [name, nationalId, comment, anonymous === 'on'];

  try {
    await query(q, values);
  } catch (e) {
    console.error('Error inserting signature', e);
    success = false;
  }

  return success;
}

/**
 * List all registrations from the registration table.
 *
 * @returns {Promise<Array<list>>} Promise, resolved to array of all registrations.
 */
export async function list() {
  let result = [];
  try {
    const queryResult = await query(
      'SELECT name, nationalId, comment, anonymous, signed FROM signatures ORDER BY signed DESC',
    );

    if (queryResult && queryResult.rows) {
      result = queryResult.rows;
    }
  } catch (e) {
    console.error('Error selecting signatures', e);
  }

  return result;
}

function createNationalId() {
  let str = '';
  for (let i = 0; i < 10; i++ ) {
    str += Math.floor(Math.random()*10);
  }
  return str;
}

export async function fakeData() {
  const name = faker.name.findName();
  const nationalId = createNationalId();
  let comment = '';
  let anonymous = false;

  if (Math.random() < 0.5) {
    comment = faker.lorem.sentence();
  }
  if (Math.random() < 0.5) {
    anonymous = true;
  }
  const from = new Date(Date.now() - 604800000*2);
  const to = new Date(Date.now());
  
  const signed = faker.date.between(from, to);

  // console.log('name: ' + name);
  // console.log('nationalId: ' + nationalId);
  // console.log('comment: ' + comment);
  // console.log('anonymous: ' + anonymous);
  // console.log('signed: ' + signed);

  let success = true;

  const q = `
    INSERT INTO signatures
      (name, nationalId, comment, anonymous, signed)
    VALUES
      ($1, $2, $3, $4, $5);
  `;
  const values = [name, nationalId, comment, anonymous, signed];

  try {
    await query(q, values);
  } catch (e) {
    console.error('Error inserting signature', e);
    success = false;
  }

  return success;
}

// for (let i = 0; i < 500; i++) {
//   await fakeData();
// }

// Helper to remove pg from the event loop
export async function end() {
  await pool.end();
}
