import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Receipt, DollarSign, AlertCircle, CheckCircle2, Wallet } from "lucide-react";
import { useLanguage, translateCategoria } from "@/lib/i18n";
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
import PixPaymentCard from "@/components/billing/PixPaymentCard";

export default function Billing() {
  const { t, lang } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editBilling, setEditBilling] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
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
    const matchCategoria = filterCategoria === "all" || b.categoria === filterCategoria;
    return matchSearch && matchStatus && matchCategoria;
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

  // Reserva Financeira = apenas crédito real (depósitos do cliente / saldo que sobrou), nunca cobrança a receber.
  const reservaFinanceira = billings
    .filter((b) => (b.categoria || "").trim().toLowerCase() === "reserva financeira" && b.status === "recebido")
    .reduce((sum, b) => sum + (b.valor || 0), 0);

  const categoriasDisponiveis = Array.from(
    new Set(billings.map((b) => b.categoria).filter(Boolean))
  ).sort();

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
        title={t("billing_title")}
        subtitle={t("billing_subtitle")}
        action={
          <Button onClick={() => { setEditBilling(null); setShowForm(true); }} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> {t("btn_new_charge")}
          </Button>
        }
      />

      {/* Dados da empresa e forma de pagamento (Contas a Pagar) — referência rápida para copiar/enviar ao cliente */}
      <PixPaymentCard />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <KpiCard title={t("billing_received_month")} value={`${t("currency_symbol")} ${thisMonthReceived.toLocaleString(t("locale_date"))}`} icon={CheckCircle2} />
        <KpiCard title={t("billing_pending")} value={`${t("currency_symbol")} ${pendingTotal.toLocaleString(t("locale_date"))}`} icon={DollarSign} />
        <KpiCard title={t("billing_overdue")} value={`${t("currency_symbol")} ${overdueTotal.toLocaleString(t("locale_date"))}`} icon={AlertCircle} />
        {categoriasDisponiveis.some((c) => c.trim().toLowerCase() === "reserva financeira") && (
          <KpiCard title={translateCategoria("Reserva Financeira", lang)} value={`R$ ${reservaFinanceira.toLocaleString("pt-BR")}`} icon={Wallet} />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        {categoriasDisponiveis.length > 0 && (
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary border-border"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categoriasDisponiveis.map((c) => (
                <SelectItem key={c} value={c}>{translateCategoria(c, lang)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
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
            <p className="text-foreground font-medium mb-1">{t("billing_no_charges")}</p>
            <p className="text-muted-foreground text-sm">{t("billing_no_charges_desc")}</p>
          </div>
          <Button onClick={() => { setEditBilling(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> {t("btn_new_charge")}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title={t("billing_no_charges_filtered")} description={t("billing_adjust_filters")} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_client")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_description")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_due_date")}</th>
                  <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_status")}</th>
                  <th className="text-right px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t("col_value")}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{b.client_nome}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {b.descricao || "—"}
                      {b.categoria && (
                        <span className="ml-2 inline-flex items-center text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                          {translateCategoria(b.categoria, lang)}
                        </span>
                      )}
                    </td>
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
                          {t("billing_mark_received")}
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
                    {b.categoria && (
                      <span className="inline-flex items-center text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 mt-1">
                        {translateCategoria(b.categoria, lang)}
                      </span>
                    )}
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
                    {t("billing_mark_received_full")}
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