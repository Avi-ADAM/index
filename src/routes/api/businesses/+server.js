import { json } from '@sveltejs/kit';
import { google } from 'googleapis';
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SPREADSHEET_ID
} from '$env/static/private';

/**
 * @param {string} str
 * @returns {string}
 */
const clean = (str) => {
  if (!str) return '';
  return str.replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n').trim();
};

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: clean(GOOGLE_CLIENT_EMAIL),
    private_key: clean(GOOGLE_PRIVATE_KEY),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function GET() {
  try {
    const spreadsheetId = clean(SPREADSHEET_ID);
    // Get spreadsheet metadata to find the actual sheet names
    const metaResponse = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    const sheetsList = metaResponse.data.sheets;

    if (!sheetsList || sheetsList.length === 0) {
      return json({ error: 'No sheets found in spreadsheet' }, { status: 404 });
    }

    // Use the first sheet (assuming it contains the data)
    const sheetName = sheetsList[0]?.properties?.title;

    if (!sheetName) {
      return json({ error: 'Unable to find sheet name' }, { status: 500 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName, // Fetch all data from the sheet
    });

    /** @type {string[][]} */
    const rows = response.data.values || [];

    if (rows.length === 0) {
      return json([]);
    }
    console.log(rows[0]);
    // הנח שהשורה הראשונה היא כותרות
    /** @type {string[]} */
    const headers = rows[0];
    const approvedIndex = headers.findIndex(h =>
      h.toLowerCase().includes('אושר') ||
      h.toLowerCase().includes('approved')
    );

    const businesses = rows.slice(1)
      .filter((/** @type {string[]} */ row) => {
        // סנן רק עסקים מאושרים
        if (approvedIndex !== -1) {
          return row[approvedIndex]?.toLowerCase() === 'כן' ||
                 row[approvedIndex]?.toLowerCase() === 'yes' ||
                 row[approvedIndex] === '1';
        }
        return true; // אם אין עמודת אישור, הצג הכל
      })
      .map((/** @type {string[]} */ row, index) => {
        /** @type {Record<string, any>} */
        const business = {};
        headers.forEach((header, i) => {
          business[header] = row[i] || '';
        });
        business.id = index;
        return business;
      });

    return json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return json({ 
      error: 'Failed to fetch businesses', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
