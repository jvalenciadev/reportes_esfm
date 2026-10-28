import React from 'react';
import { ExternalLinkIcon, BuildingIcon, DatabaseIcon } from '../ui/Icons';

export interface SourceLink {
  title: string;
  url: string;
  institution: string;
  description?: string;
  period?: string;
}

interface SourceBadgeProps {
  sourceName: string;
  institutionTitle: string;
  links: SourceLink[];
  methodology?: string;
}

export function SourceBadge({
  sourceName,
  institutionTitle,
  links,
  methodology,
}: SourceBadgeProps) {
  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 text-xs text-slate-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-slate-200/80 text-slate-700">
            <DatabaseIcon size={14} />
          </span>
          <span className="font-medium text-slate-900 text-xs uppercase tracking-wider">
            Ficha Técnica de Fuente Oficial · {sourceName}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          {institutionTitle}
        </span>
      </div>

      {methodology && (
        <p className="text-slate-600 mb-3 text-[11px] leading-relaxed">
          <strong>Metodología de Registro:</strong> {methodology}
        </p>
      )}

      <div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-1.5">
          Enlaces y Portales Oficiales de Verificación:
        </span>
        <div className="flex flex-wrap gap-2">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-800 transition-all font-medium text-[11px] shadow-2xs hover:shadow-xs"
            >
              <ExternalLinkIcon size={12} className="text-slate-400 shrink-0" />
              <span className="truncate max-w-[280px]">{link.title}</span>
              {link.period && (
                <span className="text-[9px] bg-slate-100 px-1 py-0.2 rounded text-slate-500">
                  {link.period}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
