import { getDb } from './database';

export const generateNextAssetNumber = async (): Promise<string> => {
  const db = await getDb();
  if (!db) return 'AST-0001';

  try {
    const lastRecord = await db.getFirstAsync<{ no_asset: string }>(
      'SELECT no_asset FROM hasil_so ORDER BY id DESC LIMIT 1'
    );

    if (!lastRecord?.no_asset) return 'AST-0001';

    const parts = lastRecord.no_asset.split('-');
    const lastNum = parseInt(parts[1] || '0', 10);
    
    if (isNaN(lastNum)) return 'AST-0001';
    
    const nextNum = (lastNum + 1).toString().padStart(4, '0');
    return `AST-${nextNum}`;
  } catch (error) {
    console.warn('[generateNextAssetNumber] error:', error);
    return 'AST-0001';
  }
};
