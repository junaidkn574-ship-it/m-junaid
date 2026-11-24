import { Lock, Printer, ShieldCheck } from 'lucide-react';

export type ActiveTab = 'pos' | 'admin';

interface TopBarProps {
  shopName: string;
  activeTab: ActiveTab;
  isAdminUnlocked: boolean;
  hasLastSale: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onLockAdmin: () => void;
  onReprintLast: () => void;
}

export function TopBar({
  shopName,
  activeTab,
  isAdminUnlocked,
  hasLastSale,
  onSelectTab,
  onLockAdmin,
  onReprintLast,
}: TopBarProps) {
  return (
    <header className="bg-[#1E293B] text-[#F8FAFC] border-b border-[#334155] px-4 sm:px-6">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 sm:gap-8 h-[68px]">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('pos')}
          className="font-editorial text-xl sm:text-2xl font-semibold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0 hover:text-[#F59E0B] transition-colors cursor-pointer"
        >
          {shopName || 'Nishat Brand'}
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="flex items-center gap-2 sm:gap-6" aria-label="Primary sections">
          <button
            type="button"
            onClick={() => onSelectTab('pos')}
            className={`min-h-[48px] px-3 sm:px-4 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'pos'
                ? 'border-[#D97706] text-[#F59E0B]'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            POS Billing
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('admin')}
            className={`min-h-[48px] px-3 sm:px-4 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'border-[#D97706] text-[#F59E0B]'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            {isAdminUnlocked ? (
              <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Admin &amp; Profit</span>
          </button>
        </nav>

        {/* Zone 3: Single primary contextual action */}
        <div className="flex items-center shrink-0">
          {activeTab === 'admin' && isAdminUnlocked ? (
            <button
              type="button"
              onClick={onLockAdmin}
              className="min-h-[48px] px-4 py-2 rounded bg-[#334155] hover:bg-[#475569] text-[#F8FAFC] text-sm font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-2 border border-slate-600 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#F59E0B]" />
              <span>Lock Admin</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onReprintLast}
              disabled={!hasLastSale}
              className="min-h-[48px] px-4 py-2 rounded bg-[#D97706] hover:bg-[#B45309] disabled:bg-[#334155] disabled:text-slate-400 text-[#0F172A] text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Reprint Last Bill</span>
              <span className="sm:hidden">Last Bill</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
