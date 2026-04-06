import { useState, useCallback, useMemo } from 'react';
import {
  BarChart3, Upload, Table2, PieChart, History, Download, Settings, Package,
  TrendingUp, Hash, Award, Activity
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { KPICard } from '@/components/dashboard/KPICard';
import { FileUpload } from '@/components/dashboard/FileUpload';
import { SalesTable } from '@/components/dashboard/SalesTable';
import { FamilyImageManager } from '@/components/dashboard/FamilyImageManager';
import { TopSoldChart, FamilyChart, MonthlyComparisonChart, YearComparisonChart, ItemEvolutionChart, ShareChart } from '@/components/dashboard/Charts';
import { parseTotalDoMes, parseCalculoMensal, crossReference, exportToExcel } from '@/lib/excel-parser';
import { buildExportHtml } from '@/lib/export-html';
import { loadHistory, saveMonthData, loadFamilyImages, saveFamilyImages, exportHistoryJSON, importHistoryJSON } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SaleItem, ConnectorRef, HistoryData, FamilyImage, MonthData } from '@/types/sales';
import { getFamily, MONTH_NAMES } from '@/types/sales';
import { toast } from 'sonner';

type Section = 'upload' | 'dashboard' | 'table' | 'charts' | 'history' | 'images' | 'export';

const NAV = [
  { id: 'upload' as Section, label: 'Upload', icon: Upload },
  { id: 'dashboard' as Section, label: 'Dashboard', icon: BarChart3 },
  { id: 'table' as Section, label: 'Relatório', icon: Table2 },
  { id: 'charts' as Section, label: 'Gráficos', icon: PieChart },
  { id: 'images' as Section, label: 'Imagens', icon: Package },
  { id: 'history' as Section, label: 'Histórico', icon: History },
  { id: 'export' as Section, label: 'Exportar', icon: Download },
];

export default function Index() {
  const [section, setSection] = useState<Section>('upload');
  const [sales, setSales] = useState<Array<{ code: string; unit: string; qty: number }>>([]);
  const [refs, setRefs] = useState<ConnectorRef[]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [items, setItems] = useState<SaleItem[]>([]);
  const [history, setHistory] = useState<HistoryData>(loadHistory);
  const [familyImages, setFamilyImages] = useState<FamilyImage>(loadFamilyImages);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));

  const recalculate = useCallback((s: typeof sales, r: ConnectorRef[], ov: Record<string, number>) => {
    if (s.length && r.length) {
      const result = crossReference(s, r, ov);
      setItems(result);
      return result;
    }
    return [];
  }, []);

  const handleSalesFile = useCallback((buf: ArrayBuffer) => {
    try {
      const parsed = parseTotalDoMes(buf);
      setSales(parsed);
      recalculate(parsed, refs, overrides);
      toast.success(`${parsed.length} registros carregados do Total do Mês`);
      if (refs.length) setSection('dashboard');
    } catch { toast.error('Erro ao ler arquivo Total do Mês'); }
  }, [refs, overrides, recalculate]);

  const handleRefsFile = useCallback((buf: ArrayBuffer) => {
    try {
      const parsed = parseCalculoMensal(buf);
      setRefs(parsed);
      recalculate(sales, parsed, overrides);
      toast.success(`${parsed.length} conectores carregados da planilha base`);
      if (sales.length) setSection('dashboard');
    } catch { toast.error('Erro ao ler arquivo Cálculo Mensal'); }
  }, [sales, overrides, recalculate]);

  const handleQtyChange = useCallback((code: string, newQty: number) => {
    setOverrides(prev => {
      const next = { ...prev, [code]: newQty };
      recalculate(sales, refs, next);
      return next;
    });
  }, [sales, refs, recalculate]);

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
    saveMonthData(data);
    setHistory(loadHistory());
    toast.success(`Dados salvos: ${MONTH_NAMES[data.month - 1]} ${data.year}`);
  }, [items, selectedYear, selectedMonth]);

  const handleImageSet = useCallback((family: string, dataUrl: string) => {
    setFamilyImages(prev => {
      const next = { ...prev, [family]: dataUrl };
      saveFamilyImages(next);
      return next;
    });
  }, []);

  const handleExportJSON = useCallback(() => {
    const json = exportHistoryJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'historico-conectores.json'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportHTML = useCallback(() => {
    const html = buildExportHtml({
      items,
      history,
      familyImages,
      selectedYear,
      selectedMonth,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${selectedYear}-${selectedMonth}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [familyImages, history, items, selectedMonth, selectedYear]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = importHistoryJSON(reader.result as string);
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
  const topCodes = useMemo(() => items.slice(0, 5).map(i => i.code), [items]);
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">CI</div>
                <span className="text-sm font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">ConnectorIQ</span>
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
            <h1 className="text-lg font-bold">ConnectorIQ</h1>
            <span className="text-xs text-muted-foreground">Dashboard de Vendas de Conectores</span>
            <div className="ml-auto flex items-center gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
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
                  <h2 className="text-xl font-bold">Upload de Planilhas</h2>
                  <p className="text-sm text-muted-foreground">Carregue os dois arquivos Excel para processar os dados.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FileUpload
                    label="Total do Mês"
                    description="Planilha mensal de vendas (.xlsx). Colunas: A=código, F=unidade, H=quantidade"
                    onFile={handleSalesFile}
                  />
                  <FileUpload
                    label="Cálculo Mensal"
                    description="Planilha base de conectores (.xlsx). Colunas: B=código, C=QTY/BAG"
                    onFile={handleRefsFile}
                  />
                </div>
                {sales.length > 0 && <p className="text-sm text-accent">✓ {sales.length} registros de vendas carregados</p>}
                {refs.length > 0 && <p className="text-sm text-accent">✓ {refs.length} conectores de referência carregados</p>}
                {items.length > 0 && <p className="text-sm font-semibold text-primary">✓ {items.length} itens cruzados — resultado pronto!</p>}
              </div>
            )}

            {section === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <KPICard title="Total UN" value={totalUN} icon={TrendingUp} trend={growth} />
                  <KPICard title="SKUs Vendidos" value={items.length} icon={Hash} />
                  <KPICard title="Item Top" value={items[0]?.code || '—'} icon={Award} subtitle={items[0] ? `${items[0].totalUN.toLocaleString('pt-BR')} UN` : undefined} />
                  <KPICard title="Média/Item" value={items.length ? Math.round(totalUN / items.length) : 0} icon={Activity} />
                  <KPICard title="Famílias" value={families.length} icon={Package} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <TopSoldChart items={items} />
                  <FamilyChart items={items} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ShareChart items={items} />
                  <MonthlyComparisonChart history={history} year={selectedYear} />
                </div>
              </div>
            )}

            {section === 'table' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Relatório Detalhado</h2>
                <SalesTable items={items} familyImages={familyImages} onQtyChange={handleQtyChange} />
              </div>
            )}

            {section === 'charts' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">Gráficos Detalhados</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  <TopSoldChart items={items} />
                  <FamilyChart items={items} />
                  <ShareChart items={items} />
                  <MonthlyComparisonChart history={history} year={selectedYear} />
                  <YearComparisonChart history={history} year={selectedYear} />
                  <ItemEvolutionChart history={history} year={selectedYear} codes={topCodes} />
                </div>
              </div>
            )}

            {section === 'images' && (
              <div className="mx-auto max-w-3xl space-y-6">
                <h2 className="text-xl font-bold">Imagens dos Conectores</h2>
                <p className="text-sm text-muted-foreground">Clique numa família para fazer upload de uma foto representativa.</p>
                {families.length > 0 ? (
                  <FamilyImageManager families={families} images={familyImages} onImageSet={handleImageSet} />
                ) : (
                  <p className="text-sm text-muted-foreground">Carregue os dados primeiro para ver as famílias disponíveis.</p>
                )}
              </div>
            )}

            {section === 'history' && (
              <div className="mx-auto max-w-2xl space-y-6">
                <h2 className="text-xl font-bold">Histórico</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleImportJSON}>Importar JSON</Button>
                  <Button size="sm" variant="outline" onClick={handleExportJSON}>Exportar JSON</Button>
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
                              className="rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                            >
                              <p className="text-xs font-semibold">{MONTH_NAMES[Number(m) - 1]}</p>
                              <p className="font-mono text-lg font-bold">{data.totalUN.toLocaleString('pt-BR')}</p>
                              <p className="text-[10px] text-muted-foreground">{data.totalSKUs} SKUs</p>
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
                  <Button className="w-full justify-start gap-2" variant="outline" onClick={() => exportToExcel(items, `conectores-${selectedYear}-${selectedMonth}.xlsx`)}>
                    <Download className="h-4 w-4" /> Exportar Excel (.xlsx)
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline" onClick={handleExportJSON}>
                    <Download className="h-4 w-4" /> Exportar JSON
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline" onClick={handleExportHTML}>
                    <Download className="h-4 w-4" /> Exportar HTML
                  </Button>
                </div>
              </div>
            )}

            {!items.length && section !== 'upload' && section !== 'history' && (
              <div className="flex flex-col items-center gap-3 py-20">
                <Upload className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Faça upload das planilhas para visualizar os dados.</p>
                <Button size="sm" variant="outline" onClick={() => setSection('upload')}>Ir para Upload</Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
