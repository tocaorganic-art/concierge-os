import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Receipt, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import KpiCard from "@/components/shared/KpiCard";
import BillingFormDialog from "@/components/billing/BillingFormDialog";

export default function Billing() {
  const [showForm, setShowForm] = useState(false);
  const [editBilling, setEditBilling] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data: billings = [], isLoading } = useQuery({
    queryKey: ["billings"],
    queryFn: () => base44.entities.Billing.list("-created_date", 200),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Billing.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billings"] }),
  });

  const filtered = billings.filter((b) => {
    const matchSearch = !search || b.client_nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthReceived = billings
    .filter((b) => {
      if (b.status !== "recebido" || !b.data_pagamento) return false;
      const d = new Date(b.data_pagamento);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, b) => sum + (b.valor || 0), 0);

  const pendingTotal = billings.filter((b) => b.status === "pendente").reduce((sum, b) => sum + (b.valor || 0), 0);
  const overdueTotal = billings.filter((b) => b.status === "atrasado").reduce((sum, b) => sum + (b.valor || 0), 0);

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
        title="Faturamento"
        subtitle="Controle de cobranças e recebimentos"
        action={
          <Button onClick={() => { setEditBilling(null); setShowForm(true); }} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Cobrança
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard title="Recebido no Mês" value={`R$ ${thisMonthReceived.toLocaleString("pt-BR")}`} icon={CheckCircle2} />
        <KpiCard title="Pendente" value={`R$ ${pendingTotal.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <KpiCard title="Atrasado" value={`R$ ${overdueTotal.toLocaleString("pt-BR")}`} icon={AlertCircle} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 md:w-40 bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {billings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium mb-1">Nenhuma cobrança registrada ainda</p>
            <p className="text-muted-foreground text-sm">Crie sua primeira cobrança para começar a acompanhar os recebimentos.</p>
          </div>
          <Button onClick={() => { setEditBilling(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Cobrança
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma cobrança encontrada" description="Tente ajustar os filtros de busca." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Descrição</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Vencimento</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Valor</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{b.client_nome}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{b.descricao || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">
                      {b.data_vencimento ? new Date(b.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3.5 text-right font-display font-semibold text-sm text-primary">
                      R$ {(b.valor || 0).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5">
                      {b.status !== "recebido" && (
                        <Button variant="ghost" size="sm" className="text-xs text-green-400 hover:text-green-300"
                          onClick={() => toggleStatus.mutate({ id: b.id, status: "recebido" })}>
                          Marcar recebido
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-xl p-4 gold-border-hover">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground text-sm">{b.client_nome}</p>
                    {b.descricao && <p className="text-xs text-muted-foreground mt-0.5">{b.descricao}</p>}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">Vencimento</p>
                    <p className="text-sm text-foreground font-mono">
                      {b.data_vencimento ? new Date(b.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <p className="font-display font-bold text-primary text-lg">
                    R$ {(b.valor || 0).toLocaleString("pt-BR")}
                  </p>
                </div>
                {b.status !== "recebido" && (
                  <button
                    onClick={() => toggleStatus.mutate({ id: b.id, status: "recebido" })}
                    className="mt-3 w-full py-2 rounded-lg border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/10 transition-colors"
                  >
                    Marcar como recebido
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB mobile */}
      <button
        onClick={() => { setEditBilling(null); setShowForm(true); }}
        className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="Nova Cobrança"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BillingFormDialog open={showForm} onOpenChange={setShowForm} billing={editBilling} />
    </div>
  );
}