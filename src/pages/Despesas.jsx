import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Wallet, Home, Users, Car, ShoppingBag, MoreHorizontal, ExternalLink, Sparkles, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import KpiCard from "@/components/shared/KpiCard";
import ExpenseFormDialog from "@/components/expenses/ExpenseFormDialog";
import { useLanguage, translateCategoria } from "@/lib/i18n";

function normalizeCat(str) {
  return (str || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z]/g, "");
}

const CATEGORY_META = {
  imovel: { icon: Home, className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  equipepessoal: { icon: Users, className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  equipe: { icon: Users, className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  transporte: { icon: Car, className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  compras: { icon: ShoppingBag, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  outros: { icon: MoreHorizontal, className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
};
const DEFAULT_CATEGORY_META = { icon: MoreHorizontal, className: "bg-purple-500/15 text-purple-400 border-purple-500/20" };

function getCategoryMeta(cat) {
  return CATEGORY_META[normalizeCat(cat)] || DEFAULT_CATEGORY_META;
}

function CategoryBadge({ categoria }) {
  const { t, lang } = useLanguage();
  const meta = getCategoryMeta(categoria);
  const label = categoria ? translateCategoria(categoria, lang) : t("cat_outros");
  return (
    <Badge variant="outline" className={`${meta.className} font-mono text-[10px] uppercase tracking-wider border`}>
      {label}
    </Badge>
  );
}

export default function Despesas() {
  const { lang } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterClient, setFilterClient] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-data_despesa", 500),
  });

  const categoriasDisponiveis = Array.from(
    new Set(expenses.map((e) => e.categoria).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("nome", 200),
  });

  const filtered = expenses.filter((e) => {
    const matchSearch = !search ||
      e.client_nome?.toLowerCase().includes(search.toLowerCase()) ||
      e.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
      e.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = filterCategoria === "all" || e.categoria === filterCategoria;
    const matchClient = filterClient === "all" || e.client_id === filterClient;
    return matchSearch && matchCategoria && matchClient;
  });

  const totalGeral = expenses.reduce((sum, e) => sum + (e.valor || 0), 0);
  const categoriasOrdenadas = Object.entries(
    expenses.reduce((acc, e) => {
      const cat = e.categoria || "Outros";
      acc[cat] = (acc[cat] || 0) + (e.valor || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const totalMargemAdmin = expenses.reduce((sum, e) => sum + (e.margem_admin || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Despesas"
        subtitle="Custos por cliente/evento — imóvel, equipe, transporte e outros"
        action={
          <Button onClick={() => { setEditExpense(null); setShowForm(true); }} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard title="Total de Custos" value={`R$ ${totalGeral.toLocaleString("pt-BR")}`} icon={Wallet} />
        {categoriasOrdenadas.slice(0, isAdmin ? 2 : 3).map(([cat, total]) => {
          const Icon = getCategoryMeta(cat).icon;
          return <KpiCard key={cat} title={translateCategoria(cat, lang)} value={`R$ ${total.toLocaleString("pt-BR")}`} icon={Icon} />;
        })}
        {isAdmin && (
          <KpiCard title="Minha Margem (Admin)" value={`R$ ${totalMargemAdmin.toLocaleString("pt-BR")}`} icon={Sparkles} />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-full sm:w-44 bg-secondary border-border"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary border-border"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categoriasDisponiveis.map((cat) => (
              <SelectItem key={cat} value={cat}>{translateCategoria(cat, lang)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Wallet className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium mb-1">Nenhuma despesa lançada</p>
            <p className="text-muted-foreground text-sm">Tire uma foto da nota fiscal e a IA lança pra você</p>
          </div>
          <Button onClick={() => { setEditExpense(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma despesa encontrada" description="Ajuste os filtros de busca" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Categoria</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Descrição / Fornecedor</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Data</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Valor</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const Icon = getCategoryMeta(e.categoria).icon;
                  return (
                    <tr key={e.id} onClick={() => { setEditExpense(e); setShowForm(true); }} className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{e.client_nome}</td>
                      <td className="px-5 py-3.5"><CategoryBadge categoria={e.categoria} /></td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/70" />
                          <span className="truncate max-w-[260px]">{e.descricao || e.fornecedor || "—"}</span>
                          {e.origem === "ia_nota_fiscal" && <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">
                        {e.data_despesa ? new Date(e.data_despesa).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="font-display font-semibold text-sm text-primary">R$ {(e.valor || 0).toLocaleString("pt-BR")}</p>
                        <span className={`inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${e.status === "pendente" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                          {e.status === "pendente" ? "Pendente" : "Pago"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {e.comprovante_url && (
                          <a href={e.comprovante_url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((e) => {
              const Icon = getCategoryMeta(e.categoria).icon;
              return (
                <div key={e.id} onClick={() => { setEditExpense(e); setShowForm(true); }} className="bg-card border border-border rounded-xl p-4 gold-border-hover cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground text-sm">{e.client_nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <Icon className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{e.descricao || e.fornecedor || "—"}</span>
                      </div>
                    </div>
                    <CategoryBadge categoria={e.categoria} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted-foreground font-mono">
                      {e.data_despesa ? new Date(e.data_despesa).toLocaleDateString("pt-BR") : "—"}
                    </p>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary text-lg">R$ {(e.valor || 0).toLocaleString("pt-BR")}</p>
                      <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${e.status === "pendente" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                        {e.status === "pendente" ? "Pendente" : "Pago"}
                      </span>
                    </div>
                  </div>
                  {e.comprovante_url && (
                    <a href={e.comprovante_url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
                      <Paperclip className="w-3 h-3" /> Comprovante
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => { setEditExpense(null); setShowForm(true); }}
        className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="Nova Despesa"
      >
        <Plus className="w-6 h-6" />
      </button>

      <ExpenseFormDialog open={showForm} onOpenChange={setShowForm} expense={editExpense} />
    </div>
  );
}
