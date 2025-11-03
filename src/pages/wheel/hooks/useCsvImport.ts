import { useWheelUIStore } from '@/stores/useWheelUIStore';
import { useWheelStore } from '@/stores/useWheelStore';
import { useWheelDatabase } from '@/hooks/useWheelDatabase';

export function useCsvImport() {
  const setImporting = useWheelUIStore(s => s.setImporting);
  const addLedgerEvent = useWheelStore(s => s.addLedgerEvent);
  const { db } = useWheelDatabase();

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      // TODO: Implement CSV import mirroring WheelModern behavior
      // This hook is a seam for the drawer Import tab.
      void db; // avoid unused warning until integrated
      addLedgerEvent({
        id: crypto.randomUUID(),
        kind: 'trade_imported',
        when: new Date().toISOString(),
        meta: { file: file.name },
      });
    } finally {
      setImporting(false);
    }
  };

  return { handleImport };
}
