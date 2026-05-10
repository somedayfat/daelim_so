import { create } from 'zustand';
import { SODashboardStats } from '../constants/types';

interface AppState {
  soSession: string;
  companyName: string;
  stats: SODashboardStats;
  
  setSoSession: (session: string) => void;
  setStats: (stats: SODashboardStats) => void;
}

export const useAppStore = create<AppState>((set) => ({
  soSession: `SO-${new Date().toISOString().split('T')[0]}`,
  companyName: 'PT. DAELIM',
  stats: {
    totalAccounting: 0,
    sudahSO: 0,
    belumSO: 0,
    assetBaru: 0,
    progress: 0,
    totalQtyAccounting: 0,
    totalQtyAktual: 0,
    selisihTotal: 0,
  },
  
  setSoSession: (soSession) => set({ soSession }),
  setStats: (stats) => set({ stats }),
}));
