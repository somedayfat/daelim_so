import { getDb } from './database';

/**
 * Generate nomor SO urut: SO-0001, SO-0002, dst.
 */
export const generateNextSoNumber = async (): Promise<string> => {
  const db = await getDb();
  if (!db) return 'SO-0001';

  try {
    const row = await db.getFirstAsync<{ max_no: string }>(
      'SELECT no_so as max_no FROM hasil_so ORDER BY id DESC LIMIT 1'
    );

    if (!row || !row.max_no) return 'SO-0001';

    const lastNo = row.max_no; // Misal "SO-0005"
    const numPart = lastNo.split('-')[1];
    const nextNum = parseInt(numPart, 10) + 1;
    
    return `SO-${String(nextNum).padStart(4, '0')}`;
  } catch (err) {
    return 'SO-0001';
  }
};
