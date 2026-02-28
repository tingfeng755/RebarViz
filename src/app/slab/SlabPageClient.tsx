'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { SlabParams } from '@/lib/types';
import { SLAB_PRESETS } from '@/lib/rebar';
import { calcSlab } from '@/lib/calc';
import { decodeShareParams } from '@/lib/useShareUrl';
import { validateSlabRebar, validateDimension } from '@/lib/validate';
import { SlabCrossSection } from '@/components/CrossSection';
import { SlabExplain } from '@/components/NotationExplain';
import { WeightCalc } from '@/components/WeightCalc';
import { ShareButton } from '@/components/ShareButton';
import { Field, NumField, Legend, ResetButton, SelectField, Section } from '@/components/FormControls';
import { ViewerSkeleton } from '@/components/ViewerSkeleton';
import { CONCRETE_GRADES } from '@/lib/anchor';
import { AISidebar } from '@/components/AISidebar';
import { buildSlabContext } from '@/lib/ai-context';
import { Sparkles } from 'lucide-react';

const DATA_TABS = [
  { key: 'section', label: '截面图' },
  { key: 'weight', label: '用量估算' },
] as const;

const SlabViewer = dynamic(() => import('@/components/SlabViewer'), {
  ssr: false,
  loading: () => <ViewerSkeleton />,
});

const presetList = [
  { key: 'simple', label: '薄板 120mm', color: 'bg-blue-50 text-blue-700' },
  { key: 'standard', label: '标准板 150mm', color: 'bg-green-50 text-green-700' },
  { key: 'thick', label: '厚板 200mm', color: 'bg-purple-50 text-purple-700' },
] as const;

const DEFAULT = { ...SLAB_PRESETS.standard };

export function SlabPageClient() {
  const [params, setParams] = useState<SlabParams>(DEFAULT);
  const [dataTab, setDataTab] = useState<typeof DATA_TABS[number]['key']>('section');
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    const shared = decodeShareParams<SlabParams>(window.location.search);
    if (shared && shared.thickness) setParams(shared);
  }, []);

  const update = (patch: Partial<SlabParams>) => setParams(p => ({ ...p, ...patch }));
  const calcResult = useMemo(() => calcSlab(params), [params]);
  const aiContext = useMemo(() => buildSlabContext(params), [params]);

  const errors = useMemo(() => ({
    thickness: validateDimension(params.thickness, 'thickness', 60, 400),
    bottomX: validateSlabRebar(params.bottomX, 'bottomX'),
    bottomY: validateSlabRebar(params.bottomY, 'bottomY'),
    topX: params.topX ? validateSlabRebar(params.topX, 'topX') : null,
    topY: params.topY ? validateSlabRebar(params.topY, 'topY') : null,
    distribution: validateSlabRebar(params.distribution, 'distribution'),
  }), [params]);

  return (
    <main className="px-4 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左栏：参数输入 */}
        <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-76px)] lg:overflow-y-auto lg:scrollbar-thin">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-primary">参数输入</h2>
              <div className="flex items-center gap-2">
                <ResetButton onClick={() => setParams(DEFAULT)} />
                <ShareButton params={params} />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted mb-2 block">快速示例</label>
              <div className="flex flex-wrap gap-2">
                {presetList.map(({ key, label, color }) => (
                  <button key={key} onClick={() => setParams({ ...SLAB_PRESETS[key] })}
                    className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors hover:opacity-80 ${color}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Field label="板编号" value={params.id} onChange={v => update({ id: v })} />
              <NumField label="板厚 (mm)" value={params.thickness} onChange={v => update({ thickness: v })} error={errors.thickness?.message} min={60} max={400} />
            </div>

            <Section title="材料与构造">
              <SelectField label="混凝土等级" value={params.concreteGrade} onChange={v => update({ concreteGrade: v as any })}
                options={CONCRETE_GRADES.map(g => ({ value: g, label: g }))} />
              <NumField label="保护层 (mm)" value={params.cover} onChange={v => update({ cover: v })} min={10} max={30} />
            </Section>

            <Section title="底筋" defaultOpen>
              <Field label="X向底筋" value={params.bottomX} onChange={v => update({ bottomX: v })} placeholder="如: C12@150" error={errors.bottomX?.message} />
              <Field label="Y向底筋" value={params.bottomY} onChange={v => update({ bottomY: v })} placeholder="如: C10@200" error={errors.bottomY?.message} />
            </Section>

            <Section title="面筋">
              <p className="text-[11px] text-muted -mt-1">留空表示无面筋</p>
              <Field label="X向面筋" value={params.topX} onChange={v => update({ topX: v })} placeholder="如: C10@200" error={errors.topX?.message} />
              <Field label="Y向面筋" value={params.topY} onChange={v => update({ topY: v })} placeholder="如: C10@200" error={errors.topY?.message} />
            </Section>

            <Section title="分布筋">
              <Field label="分布筋" value={params.distribution} onChange={v => update({ distribution: v })} placeholder="如: A6@250" error={errors.distribution?.message} />
            </Section>
          </div>

          <Legend items={[
            { color: '#C0392B', label: 'X向底筋' },
            { color: '#E67E22', label: 'Y向底筋' },
            { color: '#8E44AD', label: 'X向面筋' },
            { color: '#7D3C98', label: 'Y向面筋' },
            { color: '#BDC3C7', label: '混凝土板（半透明）', opacity: 0.6 },
          ]} />
        </div>

        {/* 中栏：3D模型 + 数据 tab */}
        <div className={`${showAI ? 'lg:col-span-6' : 'lg:col-span-9'} space-y-4 min-w-0 transition-all`}>
          <SlabViewer params={params} />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center border-b border-gray-100">
              {DATA_TABS.map(t => (
                <button key={t.key} onClick={() => setDataTab(t.key)}
                  className={`px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer ${dataTab === t.key ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-muted hover:text-primary hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
              <button onClick={() => setShowAI(a => !a)}
                className={`ml-auto mr-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${showAI ? 'bg-accent text-white' : 'text-muted hover:text-primary hover:bg-gray-50'}`}>
                <Sparkles className="w-3.5 h-3.5" />
                AI
              </button>
            </div>
            <div className="p-5">
              {dataTab === 'section' && (
                <>
                  <h2 className="text-sm font-semibold text-primary mb-3">截面配筋示意</h2>
                  <div className="flex justify-center">
                    <SlabCrossSection params={params} />
                  </div>
                </>
              )}
              {dataTab === 'weight' && <WeightCalc result={calcResult} />}
            </div>
          </div>
        </div>

        {/* 右栏：AI 侧边栏（可收起） */}
        {showAI && (
          <div className="lg:col-span-3">
            <AISidebar
              componentType="slab"
              currentParams={params}
              onApplyParams={(p) => update(p as Partial<SlabParams>)}
              context={aiContext}
              notationSlot={<SlabExplain params={params} />}
            />
          </div>
        )}
      </div>
    </main>
  );
}
