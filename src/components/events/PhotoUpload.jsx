import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Botão de captura/upload de foto — mesmo padrão de
// src/components/expenses/ExpenseFormDialog.jsx (input type="file" com
// capture="environment", que no celular abre a câmera nativa direto e no
// desktop abre o seletor de arquivo/galeria).
export default function PhotoUpload({ onUpload, uploading }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      await onUpload(file);
    } catch (err) {
      setError(err?.message || "Falha ao enviar a foto.");
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="gap-2"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {uploading ? "Enviando..." : "Adicionar foto"}
      </Button>
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}
