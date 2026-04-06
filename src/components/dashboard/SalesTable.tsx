import { useState, useMemo } from 'react';
import type { SaleItem, FamilyImage } from '@/types/sales';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown } from 'lucide-react';

interface SalesTableProps {
  items: SaleItem[];
  familyImages: FamilyImage;
  onQtyChange: (code: string, newQty: number) => void;
}

type SortKey = 'code' | 'unitOrigin' | 'quantity' | 'qtyPerBag' | 'totalUN' | 'family';

export function SalesTable({ items, familyImages, onQtyChange }: SalesTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalUN');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.code.toLowerCase().includes(q) || i.family.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'number' ? (av as number) - (bv as number) : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
  }, [items, search, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const headers: { key: SortKey; label: string }[] = [
    { key: 'code', label: 'Código' },
    { key: 'unitOrigin', label: 'Unidade' },
    { key: 'quantity', label: 'Qtd Origem' },
    { key: 'qtyPerBag', label: 'QTY/BAG' },
    { key: 'totalUN', label: 'Total UN' },
    { key: 'family', label: 'Família' },
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por código ou família..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground">Img</th>
              {headers.map(h => (
                <th
                  key={h.key}
                  onClick={() => toggleSort(h.key)}
                  className="cursor-pointer p-3 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1">
                    {h.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={item.code + i} className="border-b transition-colors hover:bg-muted/30">
                <td className="p-3">
                  {familyImages[item.family] ? (
                    <img src={familyImages[item.family]} alt={item.family} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                      {item.family.slice(0, 2)}
                    </div>
                  )}
                </td>
                <td className="p-3 font-mono text-xs font-medium">{item.code}</td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    item.unitOrigin === 'SC' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                  }`}>
                    {item.unitOrigin}
                  </span>
                </td>
                <td className="p-3 font-mono">{item.quantity.toLocaleString('pt-BR')}</td>
                <td className="p-3">
                  <Input
                    type="number"
                    value={item.qtyPerBag}
                    onChange={e => onQtyChange(item.code, Number(e.target.value) || 0)}
                    className="h-7 w-20 font-mono text-xs"
                  />
                </td>
                <td className="p-3 font-mono font-semibold">{item.totalUN.toLocaleString('pt-BR')}</td>
                <td className="p-3 text-xs text-muted-foreground">{item.family}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {items.length} itens</p>
    </div>
  );
}
