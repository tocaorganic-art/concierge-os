import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, FileText, MapPin, Calendar } from "lucide-react";
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

  const { data: proposals = [] } = useQuery({
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

  return (
    <div>
      <PageHeader
        title="Propostas"
        subtitle={`${proposals.length} propostas registradas`}
        action={
          <Button onClick={() => { setEditProposal(null); setShowForm(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou destino..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
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
        <div className="grid gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => { setEditProposal(p); setShowForm(true); }}
              className="bg-card border border-border rounded-xl p-5 gold-border-hover cursor-pointer flex items-center gap-6 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-medium text-foreground">{p.client_nome}</p>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {p.destino}
                  </span>
                  {p.data_chegada && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(p.data_chegada).toLocaleDateString("pt-BR")}
                      {p.data_saida && ` — ${new Date(p.data_saida).toLocaleDateString("pt-BR")}`}
                    </span>
                  )}
                  {p.num_pax > 0 && <span className="font-mono text-xs">{p.num_pax} pax</span>}
                </div>
              </div>
              {p.valor > 0 && (
                <p className="font-display text-xl font-bold text-primary flex-shrink-0">
                  R$ {p.valor.toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ProposalFormDialog open={showForm} onOpenChange={setShowForm} proposal={editProposal} />
    </div>
  );
}