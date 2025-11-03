import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const InputDemoPage: React.FC = () => {
  const [open, setOpen] = React.useState(true);
  const [symbol, setSymbol] = React.useState('AAPL');
  const [qty, setQty] = React.useState<number | ''>(1);
  const [premium, setPremium] = React.useState<number | ''>(1);
  const [side, setSide] = React.useState<'S' | 'B'>('S');
  const [type, setType] = React.useState<'P' | 'C'>('P');
  const [error, setError] = React.useState<string>('');

  const validate = () => {
    if (!symbol) return setError('Symbol is required');
    if (!qty || Number(qty) <= 0) return setError('Quantity must be greater than 0');
    setError('');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Input Style Demo</h1>
        <button
          className="rounded-xl border border-green-500 bg-green-500/15 px-4 py-2 text-green-400 transition-colors hover:bg-green-500/25"
          onClick={() => setOpen(true)}
        >
          Open Demo Modal
        </button>
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Dark Modal · Input Styles"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Inputs sit on a slightly lighter near-black surface with subtle outline at rest and a
            strong focus ring.
          </p>

          {/* Normal state */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Symbol"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. AAPL"
            />
            <Select
              label="Type"
              value={type}
              onChange={e => setType(e.target.value as 'P' | 'C')}
              options={[
                { value: 'P', label: 'Put' },
                { value: 'C', label: 'Call' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qty"
              type="number"
              value={qty}
              onChange={e => setQty(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="1"
            />
            <Input
              label="Premium (per share)"
              type="number"
              step=".01"
              value={premium}
              onChange={e => setPremium(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="1.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Side"
              value={side}
              onChange={e => setSide(e.target.value as 'S' | 'B')}
              options={[
                { value: 'S', label: 'Sell' },
                { value: 'B', label: 'Buy' },
              ]}
            />
            <Input label="Disabled" disabled placeholder="Unavailable" />
          </div>

          {/* Error state demo */}
          <div>
            <Input
              label="With Error"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className={
                error ? 'border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50' : ''
              }
              onBlur={validate}
              placeholder="Try leaving empty and blur"
            />
            {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
          </div>

          <div className="text-xs text-zinc-500">
            Hover inputs and icons to see subtle feedback. Focus a field to see the 2px primary ring
            and soft glow.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InputDemoPage;
