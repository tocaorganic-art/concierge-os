import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useLanguage, safeLocaleDate } from "@/lib/i18n";
import { formatBRL } from "@/lib/formatBRL";

export default function ProposalPdfButton({ proposal, variant = "ghost", size = "sm" }) {
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const generatePdf = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const gold = [240, 122, 46];
      const white = [232, 225, 210];
      const dimmed = [140, 130, 110];
      const dark = [10, 10, 8];
      const cardBg = [20, 20, 18];

      const W = 210;
      const H = 297;

      // Background
      doc.setFillColor(...dark);
      doc.rect(0, 0, W, H, "F");

      // Top gold accent bar
      doc.setFillColor(...gold);
      doc.rect(0, 0, W, 2, "F");

      // Header area
      doc.setFillColor(...cardBg);
      doc.rect(0, 2, W, 45, "F");

      // Logo text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...gold);
      doc.text("Concierge", 20, 22);
      doc.setTextColor(...white);
      doc.text("OS", 20 + doc.getTextWidth("Concierge"), 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...dimmed);
      doc.text(t("pdf_commercial_proposal"), 20, 29);

      // Concierge name (right)
      if (user?.full_name) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...dimmed);
        doc.text(t("pdf_prepared_by"), W - 20, 18, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...white);
        doc.text(user.full_name, W - 20, 25, { align: "right" });
      }

      // Divider
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.3);
      doc.line(20, 47, W - 20, 47);

      let y = 60;

      // Client + destination
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...white);
      doc.text(proposal.client_nome || "Cliente", 20, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...gold);
      doc.text(`✦ ${proposal.destino || "Destino"}`, 20, y);
      y += 14;

      // Info card
      doc.setFillColor(...cardBg);
      doc.roundedRect(20, y, W - 40, 48, 3, 3, "F");

      const col1 = 28;
      const col2 = W / 2 + 4;
      let infoY = y + 10;

      const labelStyle = () => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...dimmed);
      };
      const valueStyle = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...white);
      };

      // Chegada
      labelStyle(); doc.text(t("pdf_checkin"), col1, infoY);
      valueStyle(); doc.text(proposal.data_chegada ? new Date(proposal.data_chegada).toLocaleDateString(safeLocaleDate(t)) : "—", col1, infoY + 5);

      // Saída
      labelStyle(); doc.text(t("pdf_checkout"), col2, infoY);
      valueStyle(); doc.text(proposal.data_saida ? new Date(proposal.data_saida).toLocaleDateString(safeLocaleDate(t)) : "—", col2, infoY + 5);

      infoY += 18;

      // PAX
      labelStyle(); doc.text(t("pdf_guests"), col1, infoY);
      valueStyle(); doc.text(proposal.num_pax > 0 ? `${proposal.num_pax}` : "—", col1, infoY + 5);

      // Status
      const statusMap = {
        lead: t("pdf_status_lead"), proposta: t("pdf_status_proposta"),
        confirmado: t("pdf_status_confirmado"), concluido: t("pdf_status_concluido"), cancelado: t("pdf_status_cancelado"),
      };
      labelStyle(); doc.text(t("pdf_status"), col2, infoY);
      valueStyle(); doc.text(statusMap[proposal.status] || proposal.status || "—", col2, infoY + 5);

      y += 62;

      // Services
      if (proposal.servicos) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...gold);
        doc.text(t("pdf_services"), 20, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...white);
        const lines = doc.splitTextToSize(proposal.servicos, W - 40);
        lines.forEach((line) => {
          doc.text(`• ${line}`, 22, y);
          y += 6;
        });
        y += 4;
      }

      // Observations
      if (proposal.observacoes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...gold);
        doc.text("OBSERVAÇÕES", 20, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...dimmed);
        const lines = doc.splitTextToSize(proposal.observacoes, W - 40);
        lines.forEach((line) => {
          doc.text(line, 22, y);
          y += 5.5;
        });
        y += 4;
      }

      // Value highlight box
      if (proposal.valor > 0) {
        y += 4;
        doc.setFillColor(...gold);
        doc.roundedRect(20, y, W - 40, 28, 3, 3, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...dark);
        doc.text(t("pdf_total_investment"), W / 2, y + 8, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(...dark);
        doc.text(formatBRL(proposal.valor), W / 2, y + 20, { align: "center" });
        y += 36;
      }

      // Footer
      doc.setFillColor(...cardBg);
      doc.rect(0, H - 18, W, 18, "F");
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.3);
      doc.line(0, H - 18, W, H - 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...dimmed);
      const today = new Date().toLocaleDateString(safeLocaleDate(t), { day: "numeric", month: "long", year: "numeric" });
      doc.text(`${t("pdf_generated_on")} ${today} · Concierge OS`, W / 2, H - 9, { align: "center" });

      // Bottom gold bar
      doc.setFillColor(...gold);
      doc.rect(0, H - 2, W, 2, "F");

      const filename = `proposta-${(proposal.client_nome || "cliente").toLowerCase().replace(/\s+/g, "-")}-${(proposal.destino || "destino").toLowerCase().replace(/\s+/g, "-")}.pdf`;
      doc.save(filename);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={(e) => { e.stopPropagation(); generatePdf(); }}
      disabled={loading}
      className="gap-1.5 text-muted-foreground hover:text-primary"
      title={t("btn_generate_pdf")}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">PDF</span>
    </Button>
  );
}