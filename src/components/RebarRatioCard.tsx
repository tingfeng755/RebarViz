'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BeamRatioResult, RebarRatioResult } from '@/lib/calc';

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; badge: string; label: string }> = {
  ok:   { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800', label: '合格' },
  low:  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800', label: '低于ρmin' },
  high: { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   badge: 'bg-red-100 text-red-800',     label: '超过ρmax' },
};

function pct(v: number): string {
  return (v * 100).toFixed(2) + '%';
}

function RatioRow({ label, r }: { label: string; r: RebarRatioResult }) {
  const s = STATUS_STYLE[r.status];
  const [expanded, setExpanded] = useState(false);
  const hasSteps = r.formulaSteps && r.formulaSteps.length > 0;
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${s.bg} ${s.border} ${hasSteps ? 'cursor-pointer' : ''}`}
      onClick={hasSteps ? () => setExpanded(e => !e) : undefined}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          {hasSteps && <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />}
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.badge}`}>{s.label}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className={`text-lg font-bold ${s.text}`}>{pct(r.rho)}</span>
        <span className="text-[10px] text-gray-400">ρ</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-500">
        <div>As = <span className="font-medium text-gray-700">{r.As.toFixed(0)}</span> mm²</div>
        <div>h₀ = <span className="font-medium text-gray-700">{r.h0.toFixed(0)}</span> mm</div>
        <div>ρ<sub>min</sub> = <span className="font-medium text-gray-700">{pct(r.rhoMin)}</span></div>
      </div>
      {expanded && r.formulaSteps && (
        <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-1">
          {r.formulaSteps.map((step, i) => (
            <div key={i} className="text-[11px] leading-relaxed">
              <span className={`font-medium ${s.text}`}>{step.label}</span>
              <div className="text-gray-500 font-mono ml-2">
                <span className="text-gray-400">{step.formula}</span>
                <br />
                <span className="text-gray-600">{step.substitution}</span>
                <br />
                <span className="text-gray-800 font-semibold">{step.result}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RebarRatioCard({ ratios }: { ratios: BeamRatioResult }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <h2 className="text-sm font-semibold text-primary mb-3">配筋率校核 <span className="text-[10px] font-normal text-gray-400 ml-1">GB50010 §8.5.1</span></h2>
      <div className="grid grid-cols-2 gap-3">
        <RatioRow label="上部受拉钢筋" r={ratios.top} />
        <RatioRow label="下部受拉钢筋" r={ratios.bottom} />
      </div>
      <p className="text-[10px] text-gray-400 mt-2">* ρ<sub>min</sub> = max(0.2%, 0.45f<sub>t</sub>/f<sub>y</sub>)，ρ<sub>max</sub> = 2.5% · 点击卡片展开公式推导</p>
    </div>
  );
}
