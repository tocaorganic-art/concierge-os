import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Wallet, Home, Users, Car, MoreHorizontal, ExternalLink, Sparkles } from "lucide-react";

const CATEGORIA_ICON_ALIASES = {};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import KpiCard from "@/components/shared/KpiCard";
import ExpenseFormDialog from "@/components/expenses/ExpenseFormDialog";

const CATEGORIA_ICON = { imovel: Home, equipe: Users, transporte: Car, outros: MoreHorizontal };

export default function Despesas() {
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
          const Icon = CATEGORIA_ICON[cat] || MoreHorizontal;
          return <KpiCard key={cat} title={cat} value={`R$ ${total.toLocaleString("pt-BR")}`} icon={Icon} />;
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
            <SelectItem value="imovel">Imóvel</SelectItem>
            <SelectItem value="equipe">Equipe/Pessoal</SelectItem>
            <SelectItem value="transporte">Transporte</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
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
                  const Icon = CATEGORIA_ICON[e.categoria] || MoreHorizontal;
                  return (
                    <tr key={e.id} onClick={() => { setEditExpense(e); setShowForm(true); }} className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{e.client_nome}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={e.categoria} /></td>
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
                      <td className="px-5 py-3.5 text-right font-display font-semibold text-sm text-primary">
                        R$ {(e.valor || 0).toLocaleString("pt-BR")}
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
              const Icon = CATEGORIA_ICON[e.categoria] || MoreHorizontal;
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
                    <StatusBadge status={e.categoria} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted-foreground font-mono">
                      {e.data_despesa ? new Date(e.data_despesa).toLocaleDateString("pt-BR") : "—"}
                    </p>
                    <p className="font-display font-bold text-primary text-lg">
                      R$ {(e.valor || 0).toLocaleString("pt-BR")}
                    </p>
                  </div>
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
