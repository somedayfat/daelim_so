import { getDb } from './database';

export const generateNextAssetNumber = async (): Promise<string> => {
  const db = await getDb();
  if (!db) return 'AST-0001';

  const lastRecord = await db.getFirstAsync<{ no_asset: string }>(
    'SELECT no_asset FROM hasil_so ORDER BY id DESC LIMIT 1'
  );

  if (!lastRecord) return 'AST-0001';

  const lastNum = parseInt(lastRecord.no_asset.split('-')[1]);
  const nextNum = (lastNum + 1).toString().padStart(4, '0');
  return `AST-${nextNum}`;
};
