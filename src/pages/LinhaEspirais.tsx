import { useState, useCallback, useMemo } from 'react';
import {
  BarChart3, Upload, Table2, History, Download, Package,
  TrendingUp, Activity
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { KPICard } from '@/components/dashboard/KPICard';
import { FileUpload } from '@/components/dashboard/FileUpload';
import { MonthlyComparisonChart } from '@/components/dashboard/Charts';
import { parseEspirais, parseEspiraisCodes, generateEspiraisCodesTemplate } from '@/lib/espirais-parser';
import { exportToExcel } from '@/lib/excel-parser';
import { 
  loadEspiraisHistory, 
  saveEspiraisMonthData, 
  exportEspiraisHistoryJSON, 
  importEspiraisHistoryJSON 
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { EspiralItem, EspiraisHistoryData, EspiraisMonthData } from '@/types/sales';
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

export default function LinhaEspirais() {
  const [section, setSection] = useState<Section>(() => {
    const d = new Date();
    return loadEspiraisHistory()[String(d.getFullYear())]?.[String(d.getMonth() + 1)] ? 'dashboard' : 'upload';
  });
  
  const [salesBuffer, setSalesBuffer] = useState<ArrayBuffer | null>(null);
  const [targetCodes, setTargetCodes] = useState<string[]>([]);
  const [items, setItems] = useState<EspiralItem[]>(() => {
    const d = new Date();
    const data = loadEspiraisHistory()[String(d.getFullYear())]?.[String(d.getMonth() + 1)];
    return data ? data.items : [];
  });
  
  const [history, setHistory] = useState<EspiraisHistoryData>(loadEspiraisHistory);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));

  const handleSalesFile = useCallback((buf: ArrayBuffer) => {
    setSalesBuffer(buf);
    if (targetCodes.length > 0) {
      try {
        const parsed = parseEspirais(buf, targetCodes);
        setItems(parsed);
        toast.success(`${parsed.length} produtos rastreados carregados`);
        setSection('dashboard');
      } catch { toast.error('Erro ao ler arquivo de Vendas'); }
    } else {
      toast.info('Relatório de vendas carregado. Agora envie a lista de códigos.');
    }
  }, [targetCodes]);

  const handleCodesFile = useCallback((buf: ArrayBuffer) => {
    try {
      const codes = parseEspiraisCodes(buf);
      setTargetCodes(codes);
      if (salesBuffer) {
        const parsed = parseEspirais(salesBuffer, codes);
        setItems(parsed);
        toast.success(`${codes.length} códigos carregados e dados processados`);
        setSection('dashboard');
      } else {
        toast.success(`${codes.length} códigos carregados. Agora envie o relatório de vendas.`);
      }
    } catch { toast.error('Erro ao ler arquivo de Códigos'); }
  }, [salesBuffer]);

  const handleLengthChange = useCallback((code: string, newLength: number) => {
    setItems(prev => {
      const next = [...prev];
      const idx = next.findIndex(i => i.code === code);
      if (idx !== -1) {
        const item = { ...next[idx] };
        item.lengthPerUnit = newLength;
        item.totalLength = item.qty * newLength;
        next[idx] = item;
      }
      return next.sort((a, b) => b.totalLength - a.totalLength);
    });
  }, []);

  const handleSaveMonth = useCallback(() => {
    if (!items.length) return;
    const totalLength = items.reduce((s, i) => s + i.totalLength, 0);
    const data: EspiraisMonthData = {
      year: Number(selectedYear),
      month: Number(selectedMonth),
      items,
      totalLength,
      totalSKUs: items.length,
      topItem: items[0]?.code || '',
      importedAt: new Date().toISOString(),
    };
    saveEspiraisMonthData(data);
    setHistory(loadEspiraisHistory());
    toast.success(`Dados salvos: ${MONTH_NAMES[data.month - 1]} ${data.year}`);
  }, [items, selectedYear, selectedMonth]);

  const handleExportJSON = useCallback(() => {
    const json = exportEspiraisHistoryJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'historico-espirais-tubos.json'; a.click();
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
          const data = importEspiraisHistoryJSON(reader.result as string);
          setHistory(data);
          toast.success('Histórico importado com sucesso');
        } catch { toast.error('Erro ao importar JSON'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const totalMeters = useMemo(() => items.reduce((s, i) => s + i.totalLength, 0), [items]);
  const totalEspirais = useMemo(() => items.filter(i => i.type === 'ESPIRAL').reduce((s, i) => s + i.totalLength, 0), [items]);
  const totalTubos = useMemo(() => items.filter(i => i.type === 'TUBO PU').reduce((s, i) => s + i.totalLength, 0), [items]);
  
  // Itens com metragem não detectada
  const undefinedLengthItems = useMemo(() => items.filter(i => i.lengthPerUnit === 0), [items]);

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

  const growth = prevMonthData ? ((totalMeters - prevMonthData.totalLength) / prevMonthData.totalLength) * 100 : undefined;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarContent className="pt-4">
            <div className="mb-6 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white text-xs font-bold">LE</div>
                <span className="text-sm font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">Espirais e Tubos</span>
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
            <h1 className="text-lg font-bold">Linha de Espirais e Tubos PU</h1>
            <span className="text-xs text-muted-foreground">Extração de Metragens</span>
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
                
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-orange-700 dark:text-orange-400">Instruções de Códigos</h3>
                    <p className="text-xs text-orange-600/80 dark:text-orange-400/80">Baixe a planilha modelo abaixo, insira todos os códigos de Espirais ou Tubos na **Coluna C** e faça o upload.</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={generateEspiraisCodesTemplate}>
                    <Download className="h-4 w-4 mr-2 text-orange-600" />
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
                
                {items.length > 0 && <p className="text-sm text-orange-600 font-semibold">✓ {items.length} itens identificados com os códigos fornecidos!</p>}
                {salesBuffer && targetCodes.length === 0 && <p className="text-sm text-amber-600 font-semibold">⚠ Relatório carregado, mas aguardando Lista de Códigos...</p>}
                {!salesBuffer && targetCodes.length > 0 && <p className="text-sm text-amber-600 font-semibold">⚠ Lista de códigos carregada, mas aguardando Relatório de Vendas...</p>}
              </div>
            )}

            {section === 'dashboard' && (
              <div className="space-y-6">
                {undefinedLengthItems.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <h3 className="font-bold text-sm text-amber-600">Atenção: Metragens não identificadas</h3>
                    <p className="text-xs text-amber-600/80">Foram encontrados {undefinedLengthItems.length} itens onde a metragem automática falhou. Vá para "Relatório" para revisar.</p>
                  </div>
                )}
              
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KPICard title="Total (Metros)" value={totalMeters} icon={TrendingUp} trend={growth} />
                  <KPICard title="Metros (Espirais)" value={totalEspirais} icon={Package} />
                  <KPICard title="Metros (Tubos PU)" value={totalTubos} icon={Package} />
                  <KPICard title="Item Top" value={items[0]?.code || '—'} icon={Activity} subtitle={items[0] ? `${items[0].totalLength.toLocaleString('pt-BR')} metros` : undefined} />
                </div>
                
                <div className="grid gap-4 lg:grid-cols-1">
                  {/* Reuse the MonthlyComparisonChart by adapting history data slightly if necessary, or assuming it expects totalUN -> wait! 
                      MonthlyComparisonChart expects 'totalUN'. Let's check how it reads it: it reads item.totalUN. 
                      Since our items use totalLength, maybe the chart won't render points correctly unless we map it. 
                      Actually, let's remap it for the chart so it doesn't break! 
                   */}
                  <MonthlyComparisonChart 
                    history={Object.fromEntries(
                      Object.entries(history).map(([y, mData]) => [
                        y, 
                        Object.fromEntries(
                          Object.entries(mData).map(([m, data]) => [
                            m, 
                            { ...data, totalUN: data.totalLength } // mock totalUN for the chart
                          ])
                        )
                      ])
                    )} 
                    year={selectedYear} 
                  />
                </div>
              </div>
            )}

            {section === 'table' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Conferência de Metragens</h2>
                </div>
                
                <div className="rounded-xl border bg-card overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 font-semibold text-muted-foreground w-12">#</th>
                        <th className="p-3 font-semibold text-muted-foreground">Tipo</th>
                        <th className="p-3 font-semibold text-muted-foreground">Código</th>
                        <th className="p-3 font-semibold text-muted-foreground max-w-xs truncate">Descrição</th>
                        <th className="p-3 font-semibold text-muted-foreground text-center">Qtde Numérica</th>
                        <th className="p-3 font-semibold text-muted-foreground text-right">Metros por UN</th>
                        <th className="p-3 font-semibold text-muted-foreground text-right w-40">Total Metros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const isUndefined = item.lengthPerUnit === 0;
                        
                        return (
                          <tr key={item.code} className={`border-b transition-colors hover:bg-muted/30 ${isUndefined ? 'bg-amber-500/5' : ''}`}>
                            <td className="p-3 text-muted-foreground">{i + 1}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.type === 'ESPIRAL' ? 'bg-orange-100 text-orange-800 ring-orange-600/20' : 'bg-blue-100 text-blue-800 ring-blue-600/20'}`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-medium">{item.code}</td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate" title={item.description}>{item.description}</td>
                            <td className="p-3 text-center font-mono">
                              {item.qty.toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                value={item.lengthPerUnit}
                                onChange={(e) => handleLengthChange(item.code, Number(e.target.value))}
                                className={`h-8 w-24 ml-auto text-right font-mono ${isUndefined ? 'border-amber-300 focus-visible:ring-amber-500' : ''}`}
                              />
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-mono font-bold text-base">{item.totalLength.toLocaleString('pt-BR')} M</span>
                            </td>
                          </tr>
                        );
                      })}
                      {items.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum dado processado.</td></tr>
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
                      import('@/lib/storage').then(({ saveEspiraisHistory }) => saveEspiraisHistory({}));
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
                              className="rounded-lg border p-3 text-left transition-colors hover:border-orange-500/40 hover:bg-orange-500/5"
                            >
                              <p className="text-xs font-semibold">{MONTH_NAMES[Number(m) - 1]}</p>
                              <p className="font-mono text-lg font-bold text-orange-600">{data.totalLength.toLocaleString('pt-BR')}</p>
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
                  <Button className="w-full justify-start gap-2 border-orange-200 hover:bg-orange-50" variant="outline" onClick={() => exportToExcel(
                    // Remap para a função existente do excel export
                    items.map(i => ({
                      code: i.code,
                      unitOrigin: i.unit,
                      quantity: i.qty,
                      qtyPerBag: i.lengthPerUnit,
                      totalUN: i.totalLength,
                      family: i.type,
                    })), 
                    `espirais-tubos-${selectedYear}-${selectedMonth}.xlsx`
                  )}>
                    <Download className="h-4 w-4 text-orange-600" /> Exportar Excel (.xlsx)
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
                  {!salesBuffer && !targetCodes.length ? "Faça upload dos arquivos para visualizar os dados." : 
                   !salesBuffer ? "Aguardando Relatório de Vendas..." : 
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
