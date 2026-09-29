import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

// Gera um PDF do evento (título, data, observação, checklist, comentários,
// fotos). Segue o mesmo estilo visual (fundo escuro + dourado) de
// src/components/proposals/ProposalPdfButton.jsx, para o relatório sair
// consistente com o resto do app.
async function urlToDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function EventPdfButton({ task, variant = "outline", size = "sm" }) {
  const [loading, setLoading] = useState(false);

  const generatePdf = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const gold = [240, 122, 46];
      const white = [232, 225, 210];
      const dimmed = [140, 130, 110];
      const dark = [10, 10, 8];
      const cardBg = [20, 20, 18];
      const W = 210;
      const H = 297;

      doc.setFillColor(...dark);
      doc.rect(0, 0, W, H, "F");
      doc.setFillColor(...gold);
      doc.rect(0, 0, W, 2, "F");
      doc.setFillColor(...cardBg);
      doc.rect(0, 2, W, 40, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...gold);
      doc.text("Concierge", 20, 20);
      doc.setTextColor(...white);
      doc.text("OS", 20 + doc.getTextWidth("Concierge"), 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...dimmed);
      doc.text("Relatório de evento", 20, 27);

      if (user?.full_name) {
        doc.setFontSize(9);
        doc.setTextColor(...dimmed);
        doc.text("Gerado por", W - 20, 16, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...white);
        doc.text(user.full_name, W - 20, 22, { align: "right" });
      }

      doc.setDrawColor(...gold);
      doc.setLineWidth(0.3);
      doc.line(20, 42, W - 20, 42);

      let y = 55;
      const ensureSpace = (needed) => {
        if (y + needed > H - 20) {
          doc.addPage();
          doc.setFillColor(...dark);
          doc.rect(0, 0, W, H, "F");
          y = 20;
        }
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...white);
      doc.text(task.titulo || "Evento", 20, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...gold);
      const dataFmt = task.data ? new Date(`${task.data}T00:00:00`).toLocaleDateString("pt-BR") : "—";
      doc.text(`${dataFmt}${task.horario ? ` · ${task.horario}` : ""}${task.tipo ? ` · ${task.tipo}` : ""}`, 20, y);
      y += 6;
      if (task.client_nome) {
        doc.setTextColor(...dimmed);
        doc.text(`Cliente: ${task.client_nome}`, 20, y);
        y += 6;
      }
      if (task.responsavel_nome) {
        doc.setTextColor(...dimmed);
        doc.text(`Responsável: ${task.responsavel_nome}`, 20, y);
        y += 6;
      }
      doc.setTextColor(...dimmed);
      doc.text(`Status: ${task.status || "pendente"}`, 20, y);
      y += 10;

      if (task.descricao) {
        ensureSpace(16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...gold);
        doc.text("OBSERVAÇÃO", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...white);
        const lines = doc.splitTextToSize(task.descricao, W - 40);
        lines.forEach((line) => { ensureSpace(6); doc.text(line, 20, y); y += 6; });
        y += 4;
      }

      if ((task.checklist || []).length > 0) {
        ensureSpace(16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...gold);
        doc.text("CHECKLIST", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        task.checklist.forEach((item) => {
          ensureSpace(6);
          if (item.concluido) doc.setTextColor(120, 200, 140);
          else doc.setTextColor(...dimmed);
          doc.text(`${item.concluido ? "[x]" : "[ ]"} ${item.titulo}`, 22, y);
          y += 5.5;
        });
        y += 4;
      }

      if ((task.comentarios || []).length > 0) {
        ensureSpace(16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...gold);
        doc.text("COMENTÁRIOS", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        [...task.comentarios].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || "")).forEach((c) => {
          ensureSpace(10);
          doc.setTextColor(...dimmed);
          const quando = c.timestamp ? new Date(c.timestamp).toLocaleString("pt-BR") : "";
          doc.text(`${c.autor_nome || "Equipe"} — ${quando}`, 22, y);
          y += 5;
          doc.setTextColor(...white);
          const lines = doc.splitTextToSize(c.texto || "", W - 44);
          lines.forEach((line) => { ensureSpace(5); doc.text(line, 22, y); y += 5; });
          y += 2;
        });
        y += 2;
      }

      if ((task.fotos || []).length > 0) {
        ensureSpace(60);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...gold);
        doc.text("FOTOS", 20, y);
        y += 6;

        const imgSize = 55;
        let x = 20;
        for (const foto of task.fotos) {
          ensureSpace(imgSize + 10);
          try {
            const dataUrl = await urlToDataUrl(foto.url);
            doc.addImage(dataUrl, "JPEG", x, y, imgSize, imgSize, undefined, "FAST");
          } catch {
            doc.setDrawColor(...dimmed);
            doc.rect(x, y, imgSize, imgSize);
            doc.setFontSize(7);
            doc.setTextColor(...dimmed);
            doc.text("Foto indisponível", x + 5, y + imgSize / 2);
          }
          if (foto.legenda) {
            doc.setFontSize(7);
            doc.setTextColor(...dimmed);
            doc.text(doc.splitTextToSize(foto.legenda, imgSize), x, y + imgSize + 5);
          }
          x += imgSize + 10;
          if (x + imgSize > W - 20) {
            x = 20;
            y += imgSize + 14;
          }
        }
        y += imgSize + 14;
      }

      doc.setFillColor(...cardBg);
      doc.rect(0, H - 16, W, 16, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...dimmed);
      const hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
      doc.text(`Gerado em ${hoje} · Concierge OS`, W / 2, H - 7, { align: "center" });

      const filename = `evento-${(task.titulo || "evento").toLowerCase().replace(/\s+/g, "-").slice(0, 40)}.pdf`;
      doc.save(filename);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={generatePdf} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Gerar PDF
    </Button>
  );
}
