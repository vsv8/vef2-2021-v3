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

export async function pageSelection(page) {
  const size = 50;

  const pages = {
    count: 0,
    prev: page !== 1,
    curr: page,
    next: true,
    signatureCount: 0,
    info: [],
  };

  if (pages.curr === 1) pages.prev = false;

  try {
    const q = 'SELECT COUNT(*) FROM signatures';
    const queryResult = await query(q);

    pages.signatureCount = queryResult.rows[0].count;
    pages.count = Math.ceil(pages.signatureCount / size);
  } catch (err) {
    console.error(err);
  }

  if (pages.signatureCount === '0') return pages;

  if (pages.count < page) {
    page = pages.count; // eslint-disable-line
    pages.curr = page;
  }

  pages.next = pages.count !== page;

  try {
    const q = 'SELECT * FROM signatures ORDER BY signed OFFSET $1 LIMIT $2';
    const queryResult2 = await query(q, [(page - 1) * size, size]);
    pages.info = queryResult2.rows;
  } catch (err) {
    console.error(err);
  }

  return pages;
}

export async function deleteSignatureById(id) {
  try {
    const q = 'DELETE FROM signatures WHERE id = $1';
    await query(q, [id]);
  } catch (err) {
    console.error(err);
  }
}

function createNationalId() {
  let str = '';
  for (let i = 0; i < 10; i += 1) {
    str += Math.floor(Math.random() * 10);
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
  const from = new Date(Date.now() - 604800000 * 2);
  const to = new Date(Date.now());
  const signed = faker.date.between(from, to);

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

// Helper to remove pg from the event loop
export async function end() {
  await pool.end();
}
