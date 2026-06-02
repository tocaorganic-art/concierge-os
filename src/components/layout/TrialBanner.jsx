import React from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function TrialBanner({ daysLeft, onDismiss }) {
  const { t } = useLanguage();
  if (daysLeft === null) return null;

  const expired = daysLeft <= 0;

  return (
    <div className={`relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium ${
      expired ? "bg-red-500/15 border-b border-red-500/30 text-red-300" : "bg-primary/10 border-b border-primary/25 text-foreground"
    }`}>
      <span className="text-primary">✦</span>
      {expired ? (
        <span>
          {t("trial_expired")}{" "}
          <Link to="/planos" className="underline text-primary font-semibold">{t("trial_choose_plan")}</Link>{" "}
          {t("trial_to_continue")}
        </span>
      ) : (
        <span>
          {t("trial_banner")}{" "}
          <strong className="text-primary">{daysLeft} {daysLeft === 1 ? t("trial_day_left") : t("trial_days_left")}</strong>.{" "}
          <Link to="/planos" className="underline text-primary hover:text-primary/80 transition-colors">{t("trial_view_plans")}</Link>
        </span>
      )}
      {!expired && onDismiss && (
        <button onClick={onDismiss} className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}