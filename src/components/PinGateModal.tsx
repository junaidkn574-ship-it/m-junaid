import { useEffect, useState } from 'react';
import { Delete, Lock, X } from 'lucide-react';

interface PinGateModalProps {
  isOpen: boolean;
  expectedPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinGateModal({ isOpen, expectedPin, onSuccess, onCancel }: PinGateModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setError('');
    setPin(next);

    if (next.length === 4) {
      if (next === expectedPin) {
        setTimeout(() => {
          onSuccess();
        }, 80);
      } else {
        setError('Incorrect 4-digit PIN. Try again.');
        setTimeout(() => {
          setPin('');
        }, 350);
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError('');
    setPin('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Admin PIN Verification"
    >
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg w-full max-w-sm overflow-hidden shadow-2xl text-[#F8FAFC]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#D97706]/15 border border-[#D97706]/40 flex items-center justify-center text-[#F59E0B]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-editorial text-xl font-semibold leading-tight">Owner Access</h2>
              <p className="text-xs text-slate-400">Enter 4-digit Admin PIN</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-[#334155] hover:bg-slate-600 text-slate-200 cursor-pointer"
            aria-label="Cancel PIN entry"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* PIN dots indicator */}
          <div className="flex items-center justify-center gap-4 my-2">
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded border flex items-center justify-center text-2xl font-bold transition-colors ${
                    filled
                      ? 'bg-[#D97706]/20 border-[#D97706] text-[#F59E0B]'
                      : 'bg-[#0F172A] border-[#334155] text-slate-600'
                  }`}
                >
                  {filled ? '•' : ''}
                </div>
              );
            })}
          </div>

          <div className="h-6 text-center mt-2">
            {error ? (
              <p className="text-xs font-semibold text-rose-400">{error}</p>
            ) : (
              <p className="text-xs text-slate-400">Enter your 4-digit owner PIN (changeable in Settings)</p>
            )}
          </div>

          {/* Touch-optimized numeric keypad (min-height >= 54px) */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="min-h-[56px] rounded bg-[#0F172A] hover:bg-[#334155] active:scale-[0.98] border border-[#334155] text-xl font-bold font-tabular text-[#F8FAFC] transition-all cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[56px] rounded bg-[#334155] hover:bg-slate-600 active:scale-[0.98] text-xs font-bold uppercase tracking-wider text-slate-200 transition-all cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="min-h-[56px] rounded bg-[#0F172A] hover:bg-[#334155] active:scale-[0.98] border border-[#334155] text-xl font-bold font-tabular text-[#F8FAFC] transition-all cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="min-h-[56px] rounded bg-[#334155] hover:bg-slate-600 active:scale-[0.98] flex items-center justify-center text-slate-200 transition-all cursor-pointer"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
