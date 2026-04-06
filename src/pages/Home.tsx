import { Calculator, Package, BarChart3, Settings, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const modules = [
  {
    id: 'calculo-mensal',
    title: 'Cálculo Mensal de Vendas',
    subtitle: 'Conexões Instantâneas',
    description: 'Automatize a conversão de vendas SC → UN, cruzamento de dados e geração de relatórios mensais.',
    icon: Calculator,
    path: '/calculo-mensal',
    color: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500',
    ready: true,
  },
  {
    id: 'estoque',
    title: 'Controle de Estoque',
    subtitle: 'Em breve',
    description: 'Gestão de estoque de conectores com alertas de reposição e rastreamento.',
    icon: Package,
    path: '#',
    color: 'from-emerald-500/10 to-green-500/10',
    iconColor: 'text-emerald-500/50',
    ready: false,
  },
  {
    id: 'relatorios',
    title: 'Relatórios Gerenciais',
    subtitle: 'Em breve',
    description: 'Relatórios consolidados de performance de vendas por período e região.',
    icon: BarChart3,
    path: '#',
    color: 'from-violet-500/10 to-purple-500/10',
    iconColor: 'text-violet-500/50',
    ready: false,
  },
  {
    id: 'config',
    title: 'Configurações',
    subtitle: 'Em breve',
    description: 'Configurações gerais do sistema, usuários e preferências.',
    icon: Settings,
    path: '#',
    color: 'from-orange-500/10 to-amber-500/10',
    iconColor: 'text-orange-500/50',
    ready: false,
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
            CI
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ConnectorIQ</h1>
            <p className="text-xs text-muted-foreground">Sistema de Gestão Interna</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Módulos</h2>
          <p className="text-sm text-muted-foreground">Selecione um módulo para começar.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {modules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => mod.ready && navigate(mod.path)}
              disabled={!mod.ready}
              className={`group relative flex flex-col rounded-2xl border bg-gradient-to-br ${mod.color} p-6 text-left transition-all ${
                mod.ready
                  ? 'cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]'
                  : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 ${mod.iconColor}`}>
                  <mod.icon className="h-6 w-6" />
                </div>
                {mod.ready && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                )}
                {!mod.ready && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Em breve
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold">{mod.title}</h3>
              <p className="text-xs font-medium text-muted-foreground">{mod.subtitle}</p>
              <p className="mt-2 text-sm text-muted-foreground/80 leading-relaxed">{mod.description}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
