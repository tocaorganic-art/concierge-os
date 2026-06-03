import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { generateWithAI } from "@/functions/generateWithAI";

export default function AISuggestTime({ tasksToday, onSuggest }) {
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    const res = await generateWithAI({
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
      {loading ? "Sugerindo..." : "Sugerir com IA"}
    </Button>
  );
}