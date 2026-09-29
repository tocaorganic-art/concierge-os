import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/i18n";

export default function AISuggestTime({ tasksToday, onSuggest }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("generateWithAI", {
      type: "schedule_suggestion",
      payload: { tasks_today: tasksToday, new_task_duration: 60 },
    });
    setLoading(false);
    const time = res?.data?.result;
    if (time) onSuggest(time.trim());
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleSuggest} disabled={loading} className="gap-1.5 text-xs h-7 px-2.5 border-primary/30 text-primary hover:bg-primary/10">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {loading ? t("agenda_ai_suggesting") : t("agenda_ai_suggest")}
    </Button>
  );
}