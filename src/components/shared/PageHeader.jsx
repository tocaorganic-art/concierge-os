import React from "react";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-5 md:mb-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="hidden md:block">{action}</div>}
    </div>
  );
}