import React from "react";
import { Link } from "react-router-dom";
import { X, Flame, Clock, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function TrialBanner({ daysLeft, onDismiss }) {
  const { t } = useLanguage();
  if (daysLeft === null) return null;

  const expired = daysLeft <= 0;
  const urgent = !expired && daysLeft < 3;

  const bgClass = expired
    ? "bg-red-500/15 border-red-500/30 text-red-300"
    : urgent
    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
    : "bg-primary/10 border-primary/25 text-foreground";

  const Icon = expired ? Flame : urgent ? Clock : null;

  return (
    <div className={`relative flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b ${bgClass}`}>
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <Sparkles className="w-3.5 h-3.5 text-primary mr-1" />
      {expired ? (
        <span>
          {t("trial_expired")}{" "}
          <Link to="/planos" className="underline font-semibold hover:opacity-80 transition-opacity">
            {t("trial_choose_plan")}
          </Link>{" "}
          {t("trial_to_continue")}
        </span>
      ) : (
        <span>
          {t("trial_banner")}{" "}
          <strong className={urgent ? "text-amber-300" : "text-primary"}>
            {daysLeft} {daysLeft === 1 ? t("trial_day_left") : t("trial_days_left")}
          </strong>.{" "}
          <Link to="/planos" className="inline-flex items-center gap-0.5 underline font-semibold hover:opacity-80 transition-colors">
            {t("trial_view_plans")} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </span>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3 text-current opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}