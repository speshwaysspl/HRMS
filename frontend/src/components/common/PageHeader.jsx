import React from "react";

const PageHeader = ({ icon: Icon, title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <div className="min-w-0">
      <h1 className="text-xl md:text-2xl font-semibold text-ink flex items-center gap-2">
        {Icon && <Icon className="text-brand-700 flex-shrink-0" />}
        <span className="truncate">{title}</span>
      </h1>
      {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
