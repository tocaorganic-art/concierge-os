import React from "react";
import { Link } from "react-router-dom";
import { DollarSign } from "lucide-react";
import { formatBRL } from "@/lib/formatBRL";
import { useLanguage } from "@/lib/i18n";

// Faturas (Billing) com vencimento em um dia específico — listadas dentro da
// Agenda, junto das tarefas. Cada chip leva ao Financeiro.
export default function FaturasDoDia({ billings, dateStr }) {
  const { t } = useLanguage();
  const faturas = (billings || [])
    .filter((b) => b.data_vencimento === dateStr && b.status !== "cancelado")
    .sort((a, b) => (b.valor || 0) - (a.valor || 0));

  if (faturas.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-1 pt-2">
        {t("agenda_billings_due")}
      </p>
      {faturas.map((b) => (
        <Link
          key={b.id}
          to={`/faturamento?status=${encodeURIComponent(b.statusCalc || "aberto")}`}
          className="flex items-center gap-2.5 p-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <DollarSign className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{b.client_nome}</p>
            {b.descricao && <p className="text-[10px] text-muted-foreground truncate">{b.descricao}</p>}
          </div>
          <span className="font-mono text-xs text-primary flex-shrink-0">
            {formatBRL(b.valor || 0)}
          </span>
        </Link>
      ))}
    </div>
  );
}