import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title = "Nenhum dado", description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground mb-1">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-xs">{description}</p>}
    </div>
  );
}