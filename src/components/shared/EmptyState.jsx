import React from "react";
import { Inbox } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function EmptyState({ icon: Icon = Inbox, title, description }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground mb-1">{title || t("common_empty_default_title")}</p>
      {description && <p className="text-sm text-muted-foreground max-w-xs">{description}</p>}
    </div>
  );
}