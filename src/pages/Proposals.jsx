import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, FileText, MapPin, Calendar } from "lucide-react";
import ProposalPdfButton from "@/components/proposals/ProposalPdfButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ProposalFormDialog from "@/components/proposals/ProposalFormDialog";

export default function Proposals() {
  const [showForm, setShowForm] = useState(false);
  const [editProposal, setEditProposal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => base44.entities.Proposal.list("-created_date", 200),
  });

  const filtered = proposals.filter((p) => {
    const matchSearch =
      !search ||
      p.client_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.destino?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

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
        title="Propostas"
        subtitle={`${proposals.length} propostas registradas`}
        action={
          <Button onClick={() => { setEditProposal(null); setShowForm(true); }} className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
        }
      />

      <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou destino..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 md:w-40 bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="proposta">Proposta</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhuma proposta" description="Crie sua primeira proposta para começar." />
      ) : (
        <>
        <div className="grid gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => { setEditProposal(p); setShowForm(true); }}
              className="bg-card border border-border rounded-xl p-4 md:p-5 gold-border-hover cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{p.client_nome}</p>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.valor > 0 && (
                    <p className="font-display text-lg font-bold text-primary">
                      R$ {p.valor.toLocaleString("pt-BR")}
                    </p>
                  )}
                  <ProposalPdfButton proposal={p} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {p.destino}
                </span>
                {p.data_chegada && (
                  <span className="flex items-center gap-1.5 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(p.data_chegada).toLocaleDateString("pt-BR")}
                    {p.data_saida && ` — ${new Date(p.data_saida).toLocaleDateString("pt-BR")}`}
                  </span>
                )}
                {p.num_pax > 0 && <span className="font-mono text-xs">{p.num_pax} pax</span>}
              </div>
            </div>
          ))}
        </div>

        {/* FAB mobile */}
        <button
          onClick={() => { setEditProposal(null); setShowForm(true); }}
          className="fixed bottom-6 right-6 z-30 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          aria-label="Nova Proposta"
        >
          <Plus className="w-6 h-6" />
        </button>
        </>
      )}

      <ProposalFormDialog open={showForm} onOpenChange={setShowForm} proposal={editProposal} />
    </div>
  );
}