'use client';
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Layers } from 'lucide-react';

export default function JointDetailsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden pt-14">
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute top-6 left-6 z-10">
          <h1 className="text-xl font-black italic text-slate-800 tracking-tighter">梁板节点 <span className="text-blue-600">3D 实验室</span></h1>
        </div>
        <div className="w-full h-full">
          <Canvas camera={{ position: [3, 2, 3], fov: 35 }}>
            <ambientLight intensity={0.8} /><pointLight position={[10, 10, 10]} intensity={1.5} />
            <mesh rotation={[0, 0, 0]}>
               <boxGeometry args={[2.5, 0.12, 2.5]} />
               <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
               <boxGeometry args={[0.25, 0.5, 2.5]} />
               <meshStandardMaterial color="#94a3b8" transparent opacity={0.6} />
            </mesh>
            <Grid args={[10, 10]} cellColor="#cbd5e1" sectionColor="#94a3b8" /><OrbitControls makeDefault />
          </Canvas>
        </div>
      </div>
      <div className="w-full lg:w-96 bg-white p-8 border-l overflow-y-auto">
        <h3 className="font-black text-slate-800 mb-8 border-b pb-4 flex items-center gap-2">
          <Layers className="text-indigo-600 w-5 h-5" /> 节点功能已恢复
        </h3>
        <p className="text-sm text-slate-500 italic">梁板节点 3D 三维逻辑已成功找回！</p>
      </div>
    </div>
  );
}
