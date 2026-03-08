/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Layers } from 'lucide-react';

const LAB_MAP = {
  'HPB300': { 'C25': 39, 'C30': 34, 'C35': 30, 'C40': 27, 'C45': 25, 'C50': 24 },
  'HRB400': { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 },
  'HRBF400': { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 },
  'RRB400': { 'C25': 40, 'C30': 35, 'C35': 31, 'C40': 29, 'C45': 26, 'C50': 24 },
  'HRB500': { 'C25': 49, 'C30': 43, 'C35': 38, 'C40': 34, 'C45': 31, 'C50': 29 },
  'HRBF500': { 'C25': 49, 'C30': 43, 'C35': 38, 'C40': 34, 'C45': 31, 'C50': 29 }
};
const REBAR_GRADES = Object.keys(LAB_MAP);
const Z_MAP = { '一级': 1.15, '二级': 1.15, '三级': 1.05, '四级': 1.0, '非抗震': 1.0 };

// 顺滑折弯钢筋组件
function SmoothBar({ points, radius, color }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

function JointScene({ config, onSelect }) {
  const s = 0.001;
  const L = 3000; 

  const conc = config.conc || 'C30';
  const seismic = config.seismic || '二级';
  const c = Number(config.cover) || 20; 
  const isEdge = Boolean(config.isEdge); // 🚀 边节点开关
  
  const bB = Number(config.beamB) || 250;
  const bH = Number(config.beamH) || 500;
  const tD = Number(config.beamTopD) || 20;
  const tN = Math.max(2, Number(config.beamTopN) || 3);
  const botD = Number(config.beamBotD) || 20;
  const botN = Math.max(2, Number(config.beamBotN) || 3);
  const stirrupD = Number(config.stirrupD) || 8;
  const stirrupS = Math.max(50, Number(config.stirrupS) || 100);

  const sH = Number(config.slabH) || 120;
  const sbDx = Number(config.slabBotDx) || 10;
  const sbSx = Math.max(50, Number(config.slabBotSx) || 200);
  const sbDy = Number(config.slabBotDy) || 10;
  const sbSy = Math.max(50, Number(config.slabBotSy) || 200);

  const hasTop = Boolean(config.hasTop);
  const stDx = Number(config.slabTopDx) || 8;
  const stSx = Math.max(50, Number(config.slabTopSx) || 200);
  const stDy = Number(config.slabTopDy) || 8;
  const stSy = Math.max(50, Number(config.slabTopSy) || 200);

  const beamTopY = 0;
  const beamBotY = -bH * s;
  const slabBotY = -sH * s;

  // ==== 梁钢筋矩阵 ====
  const beamTopY_rebar = beamTopY - c*s - tD*s/2;
  const beamBotY_rebar = beamBotY + c*s + botD*s/2;

  const beamTopBars = useMemo(() => Array.from({length: tN}, (_, i) => {
    const x = -bB*s/2 + c*s + tD*s/2 + i * ((bB*s - 2*c*s - tD*s)/(tN-1));
    return { pts: [new THREE.Vector3(x, beamTopY_rebar, -L*s/2), new THREE.Vector3(x, beamTopY_rebar, L*s/2)], id: `bt-${i}` };
  }), [bB, tD, tN, c, beamTopY_rebar]);

  const beamBotBars = useMemo(() => Array.from({length: botN}, (_, i) => {
    const x = -bB*s/2 + c*s + botD*s/2 + i * ((bB*s - 2*c*s - botD*s)/(botN-1));
    return { pts: [new THREE.Vector3(x, beamBotY_rebar, -L*s/2), new THREE.Vector3(x, beamBotY_rebar, L*s/2)], id: `bb-${i}` };
  }), [bB, botD, botN, c, beamBotY_rebar]);

  const stirrups = useMemo(() => Array.from({length: Math.floor(L / stirrupS) + 1}, (_, i) => -L*s/2 + i * (stirrupS * s)), [L, stirrupS]);

  // ==== 板钢筋矩阵 ====
  const slabW = isEdge ? (1500*s + bB*s/2) : 2000*s;
  const slabPosX = isEdge ? (1500*s - bB*s/2)/2 : 0;
  
  const slabBotY_X = slabBotY + c*s + sbDx*s/2;
  const slabBotY_Z = slabBotY_X + sbDx*s/2 + sbDy*s/2;
  const slabTopY_X = beamTopY - c*s - stDx*s/2; 
  const slabTopY_Z = slabTopY_X - stDx*s/2 - stDy*s/2;

  // 🔵 垂直梁的底筋 (如果边节点，伸入梁并向上弯折)
  const slabBotBarsX = useMemo(() => {
    const startX = isEdge ? 1500*s : 1000*s;
    const endX = isEdge ? (-bB*s/2 + c*s + sbDx*s) : -1000*s;
    const bendUp = isEdge ? 15 * sbDx * s : 0;
    
    return Array.from({length: Math.floor((L*s) / (sbSx*s)) + 1}, (_, i) => {
      const z = -L*s/2 + i * (sbSx*s);
      const pts = [
        new THREE.Vector3(startX, slabBotY_X, z),
        new THREE.Vector3((startX+endX)/2, slabBotY_X, z), // 保证平滑直线的基准点
        new THREE.Vector3(endX, slabBotY_X, z)
      ];
      if (isEdge) pts.push(new THREE.Vector3(endX, slabBotY_X + bendUp, z));
      return { pts, id: `sbx-${i}` };
    });
  }, [isEdge, bB, c, sbDx, sbSx, L, slabBotY_X]);

  // 🟣 垂直梁的面筋 (如果边节点，伸入梁并向下弯折)
  const slabTopBarsX = useMemo(() => {
    if(!hasTop) return [];
    const startX = isEdge ? 1500*s : 1000*s;
    const endX = isEdge ? (-bB*s/2 + c*s + stDx*s) : -1000*s;
    const bendDown = isEdge ? 15 * stDx * s : 0;

    return Array.from({length: Math.floor((L*s) / (stSx*s)) + 1}, (_, i) => {
      const z = -L*s/2 + i * (stSx*s);
      const pts = [
        new THREE.Vector3(startX, slabTopY_X, z),
        new THREE.Vector3((startX+endX)/2, slabTopY_X, z),
        new THREE.Vector3(endX, slabTopY_X, z)
      ];
      if (isEdge) pts.push(new THREE.Vector3(endX, slabTopY_X - bendDown, z));
      return { pts, id: `stx-${i}` };
    });
  }, [isEdge, hasTop, bB, c, stDx, stSx, L, slabTopY_X]);

  // 平行梁的钢筋 (直接生成X轴阵列)
  const slabBotGridZ = useMemo(() => {
    const startX = isEdge ? (bB*s/2 + c*s) : -1000*s;
    const span = 1500*s - startX;
    const n = Math.max(2, Math.floor(span / (sbSy*s)) + 1);
    return Array.from({length: n}, (_, i) => startX + i * (span/(n-1)));
  }, [isEdge, bB, c, sbSy]);

  const slabTopGridZ = useMemo(() => {
    if(!hasTop) return [];
    const startX = isEdge ? (bB*s/2 + c*s) : -1000*s;
    const span = 1500*s - startX;
    const n = Math.max(2, Math.floor(span / (stSy*s)) + 1);
    return Array.from({length: n}, (_, i) => startX + i * (span/(n-1)));
  }, [isEdge, hasTop, bB, c, stSy]);

  // ==== 点击互动卡片事件 ====
  const handleBeamTopClick = (e) => {
    e.stopPropagation();
    const lab = LAB_MAP[config.beamTopGrade]?.[conc] || 35;
    const zeta = Z_MAP[seismic] || 1.0;
    const lae = Math.ceil(lab * zeta * tD);
    onSelect({
      name: '框架梁 (KL) 通长纵筋', spec: `${config.beamTopGrade} Φ${tD}`,
      val: `laE = ${lae} mm`, formula: `laE = ζaE × lab = ${zeta} × ${lab}d`,
      desc: `22G101：框架梁纵筋基本锚固长度需乘以抗震锚固系数 ${zeta}。`
    });
  };

  const handleSlabBotClick = (e) => {
    e.stopPropagation();
    const bend = isEdge ? 15 * sbDx : Math.max(5 * sbDx, 50);
    onSelect({
      name: isEdge ? '边节点 - 板底受力筋' : '中间支座 - 板底受力筋', 
      spec: `${config.slabBotGrade} Φ${sbDx}`,
      val: isEdge ? `向上弯折 ${bend} mm` : `直锚 ≥ ${bend} mm`,
      formula: isEdge ? `端支座构造: 伸至外侧向上弯折 15d` : `直锚要求: max(5d, 伸至支座中心线)`,
      desc: isEdge ? `22G101：端支座直线锚固不足时，可伸至外侧钢筋内侧并向上弯折 15d。` : `22G101：板下部钢筋伸入中间支座锚固不应小于 5d 且越过中心线。`
    });
  };

  const handleSlabTopClick = (e) => {
    e.stopPropagation();
    const bend = isEdge ? 15 * stDx : 0;
    onSelect({
      name: isEdge ? '边节点 - 板面负筋' : '中间支座 - 板面连通筋', 
      spec: `${config.slabTopGrade} Φ${stDx}`,
      val: isEdge ? `向下弯折 ${bend} mm` : `双向连通布置`,
      formula: isEdge ? `端支座构造: 伸至外侧向下弯折 15d` : `中间支座: 连通不弯折`,
      desc: isEdge ? `22G101：板面筋伸入端支座应满足水平段锚固，并在端部向下弯折 15d。` : `22G101：板面筋在中间支座连续通过。`
    });
  };

  return (
    <group position={[0, 0, 0]}>
      {/* 梁板混凝土壳 */}
      <mesh position={[0, beamBotY/2, 0]}><boxGeometry args={[bB*s, bH*s, L*s]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.15} depthWrite={false}/></mesh>
      <mesh position={[slabPosX, slabBotY/2, 0]}><boxGeometry args={[slabW, sH*s, L*s]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.15} depthWrite={false}/></mesh>

      {/* 梁纵筋/箍筋 */}
      {beamTopBars.map(rb => <group key={rb.id} onClick={handleBeamTopClick}><SmoothBar points={rb.pts} radius={tD*s/2} color="#dc2626" /></group>)}
      {beamBotBars.map(rb => <group key={rb.id} onClick={handleBeamTopClick}><SmoothBar points={rb.pts} radius={botD*s/2} color="#ef4444" /></group>)}
      <group>
        {stirrups.map((z, i) => (<mesh key={`st-${i}`} position={[0, beamBotY/2, z]}><boxGeometry args={[(bB-2*c)*s, (bH-2*c)*s, stirrupD*s]} /><meshStandardMaterial color="#22c55e" wireframe={true} /></mesh>))}
      </group>

      {/* 🔵 板底筋 */}
      {slabBotBarsX.map(rb => <group key={rb.id} onClick={handleSlabBotClick}><SmoothBar points={rb.pts} radius={sbDx*s/2} color="#2563eb" /></group>)}
      <group onClick={handleSlabBotClick}>
        {slabBotGridZ.map((x, i) => (<mesh key={`sbz-${i}`} position={[x, slabBotY_Z, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[sbDy*s/2, sbDy*s/2, L*s, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>))}
      </group>

      {/* 🟣 恢复的面筋 */}
      {hasTop && slabTopBarsX.map(rb => <group key={rb.id} onClick={handleSlabTopClick}><SmoothBar points={rb.pts} radius={stDx*s/2} color="#a855f7" /></group>)}
      {hasTop && (
        <group onClick={handleSlabTopClick}>
          {slabTopGridZ.map((x, i) => (<mesh key={`stz-${i}`} position={[x, slabTopY_Z, 0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[stDy*s/2, stDy*s/2, L*s, 8]} /><meshStandardMaterial color="#c084fc" /></mesh>))}
        </group>
      )}
    </group>
  );
}

export default function JointDetailsPage() {
  const [mounted, setMounted] = useState(false);
  const [sel, setSel] = useState(null);
  
  const [cfg, setCfg] = useState({ 
    conc:'C30', seismic:'二级', cover: 20, isEdge: false,
    beamB: 250, beamH: 500,
    beamTopGrade: 'HRB400', beamTopD: 20, beamTopN: 3,
    beamBotGrade: 'HRB400', beamBotD: 20, beamBotN: 3,
    stirrupGrade: 'HPB300', stirrupD: 8, stirrupS: 100,
    waistGrade: 'HRB400', waistD: 14, waistN: 2,
    slabH: 120,
    slabBotGrade: 'HRB400', slabBotDx: 10, slabBotSx: 200, slabBotDy: 10, slabBotSy: 200,
    hasTop: false, slabTopGrade: 'HRB400', slabTopDx: 8, slabTopSx: 200, slabTopDy: 8, slabTopSy: 200
  });

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (key, value) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-slate-100 overflow-hidden text-slate-900 pt-14">
      {/* ================= 左侧 3D 区域 ================= */}
      <div className="flex-1 relative">
        <div className="absolute top-6 left-6 z-10">
          <h1 className="text-2xl font-black italic tracking-tighter text-slate-800 drop-shadow-sm">梁板节点 <span className="text-blue-600">3D 剖析</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">22G101 框架梁与楼板构造</p>
        </div>
        
        {/* 左侧计算弹窗 */}
        {sel && (
          <div className="absolute top-24 left-6 z-50 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in slide-in-from-left">
             <div className="flex justify-between items-center mb-4">
               <span className="font-black text-slate-800 flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div>{sel.name}</span>
               <button onClick={()=>setSel(null)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
             </div>
             <div className="bg-slate-900 rounded-xl p-5 text-center text-white shadow-inner">
                <p className="text-[10px] text-slate-400 uppercase mb-2 tracking-widest border-b border-slate-700 pb-2">{sel.spec}</p>
                <p className="text-4xl font-black font-mono text-yellow-400 tracking-tighter drop-shadow-md">{sel.val}</p>
                <p className="text-[11px] text-emerald-400 mt-3 font-mono bg-emerald-400/10 py-1 rounded">{sel.formula}</p>
             </div>
             <p className="text-xs text-slate-600 mt-4 leading-relaxed border-l-4 border-blue-500 pl-3 bg-blue-50/50 py-2 rounded-r-lg">{sel.desc}</p>
          </div>
        )}

        <div className="w-full h-full">
          {mounted && (
            <Canvas camera={{position:[3.5, 2.5, 3.5], fov:40}}>
              <ambientLight intensity={0.8} />
              <pointLight position={[10, 10, 10]} intensity={1.5} />
              <JointScene config={cfg} onSelect={setSel} />
              <Grid args={[10, 10]} cellColor="#cbd5e1" sectionColor="#94a3b8" position={[0, -cfg.beamH*0.001, 0]} />
              <OrbitControls makeDefault target={[0, -0.25, 0]} />
            </Canvas>
          )}
        </div>
      </div>

      {/* ================= 右侧 控制台 ================= */}
      <div className="w-full lg:w-[480px] bg-white border-l border-slate-200 shadow-2xl overflow-y-auto flex flex-col">
        <div className="p-5 bg-slate-900 text-white sticky top-0 z-20 shadow-md">
          <h3 className="font-black italic tracking-wider text-lg flex items-center gap-2"><Layers className="w-5 h-5"/> 节点参数控制台</h3>
        </div>

        <div className="p-5 space-y-6">
          
          {/* ============ 1. 外部条件 ============ */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
               <div className="w-5 h-5 bg-slate-800 text-white rounded flex items-center justify-center font-black text-xs">1</div>
               <h4 className="font-bold text-slate-800 text-sm">外部条件与材料</h4>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">混凝土强度</label><select value={cfg.conc} onChange={e=>handleChange('conc', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500">{Object.keys(LAB_MAP['HRB400']).map(g=><option key={g} value={g}>{g}</option>)}</select></div>
               <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">抗震等级</label><select value={cfg.seismic} onChange={e=>handleChange('seismic', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500">{Object.keys(Z_MAP).map(g=><option key={g} value={g}>{g}</option>)}</select></div>
             </div>
          </section>

          {/* ============ 2. 框架梁 ============ */}
          <section className="space-y-4">
             <div className="flex items-center gap-2 border-b-2 border-red-100 pb-2">
               <div className="w-5 h-5 bg-red-500 text-white rounded flex items-center justify-center font-black text-xs">2</div>
               <h4 className="font-bold text-slate-800 text-sm">框架梁 (KL) 集中标注</h4>
             </div>
             
             {/* 梁尺寸 */}
             <div className="bg-red-50/30 p-3 rounded-xl border border-red-100 space-y-3">
               <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">梁截面尺寸 (mm)</p>
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">梁宽 b</label><input type="number" value={cfg.beamB} onChange={e=>handleChange('beamB', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500">梁高 h</label><input type="number" value={cfg.beamH} onChange={e=>handleChange('beamH', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400" /></div>
               </div>
             </div>

             {/* 梁纵筋 */}
             <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 space-y-3">
               <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">通长纵筋 (上部/下部)</p>
               {/* 顶筋 - 完全展开 */}
               <div className="grid grid-cols-3 gap-2">
                 <div className="space-y-1"><label className="text-[10px] text-red-600 font-bold">上部牌号</label><select value={cfg.beamTopGrade} onChange={e=>handleChange('beamTopGrade', e.target.value)} className="w-full p-1.5 bg-white border border-red-200 rounded text-xs">{REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                 <div className="space-y-1"><label className="text-[10px] text-red-600 font-bold">直径 Φ (mm)</label><input type="number" value={cfg.beamTopD} onChange={e=>handleChange('beamTopD', e.target.value)} className="w-full p-1.5 bg-white border border-red-200 rounded text-xs font-mono" /></div>
                 <div className="space-y-1"><label className="text-[10px] text-red-600 font-bold">根数 n</label><input type="number" value={cfg.beamTopN} onChange={e=>handleChange('beamTopN', e.target.value)} className="w-full p-1.5 bg-white border border-red-200 rounded text-xs font-mono" /></div>
               </div>
               {/* 底筋 - 完全展开 */}
               <div className="grid grid-cols-3 gap-2 pt-2 border-t border-red-100">
                 <div className="space-y-1"><label className="text-[10px] text-red-600 font-bold">下部牌号</label><select value={cfg.beamBotGrade} onChange={e=>handleChange('beamBotGrade', e.target.value)} className="w-full p-1.5 bg-white border border-red-200 rounded text-xs">{REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                 <div className="space-y-1"><label className="text-[10px] text-red-600 font-bold">直径 Φ (mm)</label><input type="number" value={cfg.beamBotD} onChange={e=>handleChange('beamBotD', e.target.value)} className="w-full p-1.5 bg-white border border-red-200 rounded text-xs font-mono" /></div>
                 <div className="space-y-1"><label className="text-[10px] text-red-600 font-bold">根数 n</label><input type="number" value={cfg.beamBotN} onChange={e=>handleChange('beamBotN', e.target.value)} className="w-full p-1.5 bg-white border border-red-200 rounded text-xs font-mono" /></div>
               </div>
             </div>

             {/* 箍筋 */}
             <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 space-y-2">
               <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">箍筋</p>
               <div className="grid grid-cols-3 gap-2">
                 <div className="space-y-1"><label className="text-[10px] text-green-700 font-bold">箍筋牌号</label><select value={cfg.stirrupGrade} onChange={e=>handleChange('stirrupGrade', e.target.value)} className="w-full p-1.5 bg-white border border-green-200 rounded text-xs">{REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                 <div className="space-y-1"><label className="text-[10px] text-green-700 font-bold">直径 Φ (mm)</label><input type="number" value={cfg.stirrupD} onChange={e=>handleChange('stirrupD', e.target.value)} className="w-full p-1.5 bg-white border border-green-200 rounded text-xs font-mono" /></div>
                 <div className="space-y-1"><label className="text-[10px] text-green-700 font-bold">间距 S (mm)</label><input type="number" value={cfg.stirrupS} onChange={e=>handleChange('stirrupS', e.target.value)} className="w-full p-1.5 bg-white border border-green-200 rounded text-xs font-mono" /></div>
               </div>
             </div>

             {/* 腰筋 */}
             <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 space-y-2">
               <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">侧面构造/受扭腰筋 (G/N)</p>
               <div className="grid grid-cols-3 gap-2">
                 <div className="space-y-1"><label className="text-[10px] text-orange-700 font-bold">腰筋牌号</label><select value={cfg.waistGrade} onChange={e=>handleChange('waistGrade', e.target.value)} className="w-full p-1.5 bg-white border border-orange-200 rounded text-xs">{REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
                 <div className="space-y-1"><label className="text-[10px] text-orange-700 font-bold">直径 Φ (mm)</label><input type="number" value={cfg.waistD} onChange={e=>handleChange('waistD', e.target.value)} className="w-full p-1.5 bg-white border border-orange-200 rounded text-xs font-mono" /></div>
                 <div className="space-y-1"><label className="text-[10px] text-orange-700 font-bold">单侧根数 n</label><input type="number" value={cfg.waistN} onChange={e=>handleChange('waistN', e.target.value)} className="w-full p-1.5 bg-white border border-orange-200 rounded text-xs font-mono" /></div>
               </div>
             </div>
          </section>

          {/* ============ 3. 楼板 ============ */}
          <section className="space-y-4 pb-12">
             <div className="flex items-center gap-2 border-b-2 border-blue-100 pb-2">
               <div className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center font-black text-xs">3</div>
               <h4 className="font-bold text-slate-800 text-sm">楼板 (LB) 配置</h4>
             </div>
             
             {/* 🚀 边节点切换开关 */}
             <div className="flex justify-between items-center bg-sky-50 p-3 rounded-xl border border-sky-100 shadow-sm">
               <span className="text-[11px] font-black text-sky-700 uppercase tracking-widest">切换为板边缘节点 (边梁)</span>
               <input type="checkbox" checked={cfg.isEdge} onChange={e=>handleChange('isEdge', e.target.checked)} className="w-4 h-4 accent-sky-600 cursor-pointer" />
             </div>

             <div className="bg-blue-50/30 p-3 rounded-xl border border-blue-100 space-y-3">
               <div className="space-y-1"><label className="text-[11px] font-bold text-slate-500">板厚度 h (mm)</label><input type="number" value={cfg.slabH} onChange={e=>handleChange('slabH', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-blue-400" /></div>
             </div>

             {/* 板底筋 */}
             <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
               <div className="flex justify-between items-center">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">板底受力筋</p>
                 <select value={cfg.slabBotGrade} onChange={e=>handleChange('slabBotGrade', e.target.value)} className="w-24 p-1 bg-white border border-blue-200 rounded text-xs font-bold text-blue-700">{REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2 border-r border-blue-100 pr-2">
                   <p className="text-[10px] font-bold text-slate-500 text-center bg-blue-100/50 rounded py-1">X向 (垂直梁)</p>
                   <div className="space-y-1"><label className="text-[10px] text-blue-700">钢筋直径 Φ (mm)</label><input type="number" value={cfg.slabBotDx} onChange={e=>handleChange('slabBotDx', e.target.value)} className="w-full p-1.5 bg-white border border-blue-200 rounded text-xs font-mono"/></div>
                   <div className="space-y-1"><label className="text-[10px] text-blue-700">排布间距 S (mm)</label><input type="number" value={cfg.slabBotSx} onChange={e=>handleChange('slabBotSx', e.target.value)} className="w-full p-1.5 bg-white border border-blue-200 rounded text-xs font-mono"/></div>
                 </div>
                 <div className="space-y-2 pl-2">
                   <p className="text-[10px] font-bold text-slate-500 text-center bg-blue-100/50 rounded py-1">Y向 (平行梁)</p>
                   <div className="space-y-1"><label className="text-[10px] text-blue-700">钢筋直径 Φ (mm)</label><input type="number" value={cfg.slabBotDy} onChange={e=>handleChange('slabBotDy', e.target.value)} className="w-full p-1.5 bg-white border border-blue-200 rounded text-xs font-mono"/></div>
                   <div className="space-y-1"><label className="text-[10px] text-blue-700">排布间距 S (mm)</label><input type="number" value={cfg.slabBotSy} onChange={e=>handleChange('slabBotSy', e.target.value)} className="w-full p-1.5 bg-white border border-blue-200 rounded text-xs font-mono"/></div>
                 </div>
               </div>
             </div>

             {/* 板面筋 */}
             <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-3">
               <div className="flex justify-between items-center">
                 <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">配置板面负筋</p>
                 <input type="checkbox" checked={cfg.hasTop} onChange={e=>handleChange('hasTop', e.target.checked)} className="w-4 h-4 accent-purple-600 cursor-pointer" />
               </div>
               
               {cfg.hasTop && (
                 <div className="space-y-3 animate-in fade-in zoom-in duration-300 mt-2 pt-3 border-t border-purple-100">
                   <div className="flex justify-between items-center mb-2">
                     <label className="text-[10px] font-bold text-purple-600">面筋统一牌号</label>
                     <select value={cfg.slabTopGrade} onChange={e=>handleChange('slabTopGrade', e.target.value)} className="w-24 p-1 bg-white border border-purple-200 rounded text-xs font-bold text-purple-700">{REBAR_GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2 border-r border-purple-100 pr-2">
                       <p className="text-[10px] font-bold text-slate-500 text-center bg-purple-100/50 rounded py-1">X向 面筋</p>
                       <div className="space-y-1"><label className="text-[10px] text-purple-700">钢筋直径 Φ (mm)</label><input type="number" value={cfg.slabTopDx} onChange={e=>handleChange('slabTopDx', e.target.value)} className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs font-mono"/></div>
                       <div className="space-y-1"><label className="text-[10px] text-purple-700">排布间距 S (mm)</label><input type="number" value={cfg.slabTopSx} onChange={e=>handleChange('slabTopSx', e.target.value)} className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs font-mono"/></div>
                     </div>
                     <div className="space-y-2 pl-2">
                       <p className="text-[10px] font-bold text-slate-500 text-center bg-purple-100/50 rounded py-1">Y向 面筋</p>
                       <div className="space-y-1"><label className="text-[10px] text-purple-700">钢筋直径 Φ (mm)</label><input type="number" value={cfg.slabTopDy} onChange={e=>handleChange('slabTopDy', e.target.value)} className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs font-mono"/></div>
                       <div className="space-y-1"><label className="text-[10px] text-purple-700">排布间距 S (mm)</label><input type="number" value={cfg.slabTopSy} onChange={e=>handleChange('slabTopSy', e.target.value)} className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs font-mono"/></div>
                     </div>
                   </div>
                 </div>
               )}
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
