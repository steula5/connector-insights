import { useState, useCallback, useMemo } from 'react';
import {
  BarChart3, Upload, Table2, History, Download, Setting, Package,
  TrendingUp, Activity, FileSpreadsheet, AlertCircle
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { KPICard } from '@/components/dashboard/KPICard';
import { FileUpload } from '@/components/dashboard/FileUpload';
import { MonthlyComparisonChart } from '@/components/dashboard/Charts';
import { 
  parseLinhaVendas, 
  parseLinhaCodes, 
  processLinhaConexoes, 
  generateLinhaCodesTemplate
} from '@/lib/linha-conexoes-parser';
import { exportToExcel } from '@/lib/excel-parser';
import { 
  loadLinhaHistory, 
  saveLinhaMonthData, 
  exportLinhaHistoryJSON, 
  importLinhaHistoryJSON 
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { SaleItem, HistoryData, MonthData } from '@/types/sales';
import { MONTH_NAMES } from '@/types/sales';
import { toast } from 'sonner';

type Section = 'upload' | 'dashboard' | 'table' | 'history' | 'export';

const NAV = [
  { id: 'upload' as Section, label: 'Upload', icon: Upload },
  { id: 'dashboard' as Section, label: 'Dashboard', icon: BarChart3 },
  { id: 'table' as Section, label: 'Relatório', icon: Table2 },
  { id: 'history' as Section, label: 'Histórico', icon: History },
  { id: 'export' as Section, label: 'Exportar', icon: Download },
];

export default function LinhaDeConexoes() {
  const [section, setSection] = useState<Section>(() => {
    const d = new Date();
    return loadLinhaHistory()[String(d.getFullYear())]?.[String(d.getMonth() + 1)] ? 'dashboard' : 'upload';
  });
  
  const [sales, setSales] = useState<Array<{ code: string; unit: string; qty: number }>>([]);
  const [targetCodes, setTargetCodes] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [salesBuffer, setSalesBuffer] = useState<ArrayBuffer | null>(null);

  const [items, setItems] = useState<SaleItem[]>(() => {
    const d = new Date();
    const data = loadLinhaHistory()[String(d.getFullYear())]?.[String(d.getMonth() + 1)];
    return data ? data.items : [];
  });
  
  const [history, setHistory] = useState<HistoryData>(loadLinhaHistory);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));

  const handleSalesFile = useCallback((buf: ArrayBuffer) => {
    try {
      const parsed = parseLinhaVendas(buf);
      setSales(parsed);
      setSalesBuffer(buf);
      if (targetCodes.length > 0) {
        const result = processLinhaConexoes(parsed, targetCodes, overrides);
        setItems(result);
        toast.success(`${parsed.length} registros cruzados com ${targetCodes.length} códigos`);
        setSection('dashboard');
      } else {
        toast.info('Relatório de vendas carregado. Agora envie a lista de códigos.');
      }
    } catch { toast.error('Erro ao ler arquivo de Vendas'); }
  }, [targetCodes, overrides]);

  const handleCodesFile = useCallback((buf: ArrayBuffer) => {
    try {
      const parsedCodes = parseLinhaCodes(buf);
      setTargetCodes(parsedCodes);
      if (sales.length > 0) {
        const result = processLinhaConexoes(sales, parsedCodes, overrides);
        setItems(result);
        toast.success(`${parsedCodes.length} códigos cruzados com ${sales.length} vendas`);
        setSection('dashboard');
      } else {
        toast.success(`${parsedCodes.length} códigos carregados. Agora envie o relatório de vendas.`);
      }
    } catch {
      toast.error('Erro ao ler arquivo de Códigos');
    }
  }, [sales, overrides]);


  const handleQtyChange = useCallback((code: string, newQty: number) => {
    setOverrides(prev => {
      const next = { ...prev, [code]: newQty };
      const result = processLinhaConexoes(sales, targetCodes, next);
      setItems(result);
      return next;
    });
  }, [sales, targetCodes]);

  const handleSaveMonth = useCallback(() => {
    if (!items.length) return;
    const totalUN = items.reduce((s, i) => s + i.totalUN, 0);
    const data: MonthData = {
      year: Number(selectedYear),
      month: Number(selectedMonth),
      items,
      totalUN,
      totalSKUs: items.length,
      topItem: items[0]?.code || '',
      avgPerItem: items.length ? Math.round(totalUN / items.length) : 0,
      importedAt: new Date().toISOString(),
    };
    saveLinhaMonthData(data);
    setHistory(loadLinhaHistory());
    toast.success(`Dados salvos: ${MONTH_NAMES[data.month - 1]} ${data.year}`);
  }, [items, selectedYear, selectedMonth]);

  const handleExportJSON = useCallback(() => {
    const json = exportLinhaHistoryJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'historico-linha-conexoes.json'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = importLinhaHistoryJSON(reader.result as string);
          setHistory(data);
          toast.success('Histórico importado com sucesso');
        } catch { toast.error('Erro ao importar JSON'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const totalUN = useMemo(() => items.reduce((s, i) => s + i.totalUN, 0), [items]);
  const families = useMemo(() => [...new Set(items.map(i => i.family))].sort(), [items]);
  
  // Encontrar itens com unidade diferente de UN para alerta
  const nonUnItems = useMemo(() => items.filter(i => i.unitOrigin !== 'UN' && i.unitOrigin !== ''), [items]);

  const years = useMemo(() => {
    const yrs = new Set(Object.keys(history));
    yrs.add(String(new Date().getFullYear()));
    return [...yrs].sort();
  }, [history]);

  const prevMonthData = useMemo(() => {
    let pm = Number(selectedMonth) - 1, py = Number(selectedYear);
    if (pm < 1) { pm = 12; py--; }
    return history[String(py)]?.[String(pm)];
  }, [history, selectedMonth, selectedYear]);

  const growth = prevMonthData ? ((totalUN - prevMonthData.totalUN) / prevMonthData.totalUN) * 100 : undefined;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarContent className="pt-4">
            <div className="mb-6 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white text-xs font-bold">LC</div>
                <span className="text-sm font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">Linha de Conexões</span>
              </div>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map(n => (
                    <SidebarMenuItem key={n.id}>
                      <SidebarMenuButton
                        onClick={() => setSection(n.id)}
                        isActive={section === n.id}
                        tooltip={n.label}
                      >
                        <n.icon className="h-4 w-4" />
                        <span>{n.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <h1 className="text-lg font-bold">Linha de Conexões</h1>
            <span className="text-xs text-muted-foreground">Soma Instantânea de Códigos</span>
            <div className="ml-auto flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={(val) => {
                setSelectedMonth(val);
                const data = history[selectedYear]?.[val];
                if (data) setItems(data.items);
              }}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={(val) => {
                setSelectedYear(val);
                const data = history[val]?.[selectedMonth];
                if (data) setItems(data.items);
              }}>
                <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              {items.length > 0 && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSaveMonth}>
                  Salvar Mês
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 md:p-6">
            {section === 'upload' && (
              <div className="mx-auto max-w-2xl space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Upload de Dados</h2>
                  <p className="text-sm text-muted-foreground">Carregue o Relatório de Vendas (Obrigatório) e a lista de Códigos (Obrigatório).</p>
                </div>
                
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-blue-700 dark:text-blue-400">Instruções de Códigos</h3>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Baixe a planilha modelo abaixo, insira todos os códigos que deseja somar na **Coluna C** e faça o upload.</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={generateLinhaCodesTemplate}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-600" />
                    Baixar Modelo
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FileUpload
                    label="Relatório de Vendas"
                    description="Planilha (.xlsx) com as vendas do período."
                    onFile={handleSalesFile}
                  />
                  <FileUpload
                    label="Lista de Códigos (Obrigatório)"
                    description="Planilha (.xlsx) com a lista de códigos na Coluna C."
                    onFile={handleCodesFile}
                  />
                </div>
                
                {sales.length > 0 && targetCodes.length > 0 && <p className="text-sm text-emerald-600 font-semibold">✓ {sales.length} vendas processadas com os {targetCodes.length} códigos fornecidos!</p>}
                {sales.length > 0 && targetCodes.length === 0 && <p className="text-sm text-amber-600 font-semibold">⚠ Relatório carregado, mas aguardando Lista de Códigos...</p>}
                {sales.length === 0 && targetCodes.length > 0 && <p className="text-sm text-amber-600 font-semibold">⚠ Lista de códigos carregada, mas aguardando Relatório de Vendas...</p>}
              </div>
            )}

            {section === 'dashboard' && (
              <div className="space-y-6">
                {nonUnItems.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm text-amber-600">Atenção: Unidades diferentes de UN detectadas</h3>
                      <p className="text-xs text-amber-600/80">Foram encontrados {nonUnItems.length} itens que não estão em UN. Vá para a aba "Relatório" para verificá-los e ajustá-los manualmente se necessário.</p>
                    </div>
                  </div>
                )}
              
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KPICard title="Total de Peças (Soma)" value={totalUN} icon={TrendingUp} trend={growth} />
                  <KPICard title="Item Top" value={items[0]?.code || '—'} icon={Package} subtitle={items[0] ? `${items[0].totalUN.toLocaleString('pt-BR')} peças` : undefined} />
                  <KPICard title="Total Códigos Encontrados" value={items.filter(i => i.totalUN > 0).length} icon={Activity} subtitle={`de ${targetCodes.length} pesquisados`} />
                  <KPICard title="Famílias" value={families.length} icon={Package} />
                </div>
                
                <div className="grid gap-4 lg:grid-cols-1">
                  <MonthlyComparisonChart history={history} year={selectedYear} />
                </div>
              </div>
            )}

            {section === 'table' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Conferência e Ajuste Manual</h2>
                </div>
                
                <div className="rounded-xl border bg-card overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 font-semibold text-muted-foreground w-12">#</th>
                        <th className="p-3 font-semibold text-muted-foreground">Código</th>
                        <th className="p-3 font-semibold text-muted-foreground">Família</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center">UN. Planilha</th>
                        <th className="p-3 font-semibold text-muted-foreground text-right w-48">Soma Encontrada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const isNonUn = item.unitOrigin !== 'UN' && item.unitOrigin !== '';
                        const hasSales = item.totalUN > 0;
                        
                        return (
                          <tr key={item.code} className={`border-b transition-colors hover:bg-muted/30 ${!hasSales ? 'opacity-50' : ''} ${isNonUn ? 'bg-amber-500/5' : ''}`}>
                            <td className="p-3 text-muted-foreground">{i + 1}</td>
                            <td className="p-3 font-mono font-medium">{item.code}</td>
                            <td className="p-3 text-muted-foreground">{item.family}</td>
                            <td className="p-3 text-center">
                              {isNonUn ? (
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  {item.unitOrigin}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{item.unitOrigin || '—'}</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {isNonUn ? (
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleQtyChange(item.code, Number(e.target.value))}
                                  className="h-8 w-full text-right font-mono border-amber-300 focus-visible:ring-amber-500"
                                />
                              ) : (
                                <span className="font-mono font-bold text-base">{item.totalUN.toLocaleString('pt-BR')}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {items.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum dado calculado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'history' && (
              <div className="mx-auto max-w-2xl space-y-6">
                <h2 className="text-xl font-bold">Histórico</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleImportJSON}>Importar JSON</Button>
                  <Button size="sm" variant="outline" onClick={handleExportJSON}>Exportar JSON</Button>
                  <Button size="sm" variant="destructive" className="ml-auto" onClick={() => {
                    if (confirm('Tem certeza que deseja apagar TODOS os dados e histórico? Esta ação não pode ser desfeita.')) {
                      import('@/lib/storage').then(({ saveLinhaHistory }) => saveLinhaHistory({}));
                      setHistory({});
                      setItems([]);
                      toast.success('Todos os dados foram apagados.');
                    }
                  }}>Excluir Todos os Dados</Button>
                </div>
                {Object.keys(history).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum histórico salvo ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(history).sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => (
                      <div key={year} className="rounded-xl border bg-card p-4">
                        <h3 className="mb-3 text-sm font-bold">{year}</h3>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                          {Object.entries(months).sort(([a], [b]) => Number(a) - Number(b)).map(([m, data]) => (
                            <button
                              key={m}
                              onClick={() => {
                                setItems(data.items);
                                setSelectedYear(year);
                                setSelectedMonth(m);
                                setSection('dashboard');
                                toast.info(`Carregado: ${MONTH_NAMES[Number(m) - 1]} ${year}`);
                              }}
                              className="rounded-lg border p-3 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                            >
                              <p className="text-xs font-semibold">{MONTH_NAMES[Number(m) - 1]}</p>
                              <p className="font-mono text-lg font-bold text-emerald-600">{data.totalUN.toLocaleString('pt-BR')}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === 'export' && (
              <div className="mx-auto max-w-md space-y-6">
                <h2 className="text-xl font-bold">Exportar Dados</h2>
                <div className="space-y-3">
                  <Button className="w-full justify-start gap-2 border-emerald-200 hover:bg-emerald-50" variant="outline" onClick={() => exportToExcel(items, `linha-conexoes-${selectedYear}-${selectedMonth}.xlsx`)}>
                    <Download className="h-4 w-4 text-emerald-600" /> Exportar Excel (.xlsx)
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline" onClick={handleExportJSON}>
                    <Download className="h-4 w-4" /> Exportar JSON
                  </Button>
                </div>
              </div>
            )}

            {!items.length && section !== 'upload' && section !== 'history' && (
              <div className="flex flex-col items-center gap-3 py-20">
                <Upload className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {!sales.length && !targetCodes.length ? "Faça upload dos arquivos para visualizar os dados." : 
                   !sales.length ? "Aguardando Relatório de Vendas..." : 
                   "Aguardando Lista de Códigos..."}
                </p>
                <Button size="sm" variant="outline" onClick={() => setSection('upload')}>Ir para Upload</Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
