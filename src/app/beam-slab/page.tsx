import React from 'react';

export default function BeamSlabJointPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800">
      <h1 className="text-5xl font-extrabold mb-6 text-blue-600">🚧 梁与板节点 3D 可视化</h1>
      <p className="text-xl mb-4 font-medium">产品经理听风的全新需求！</p>
      <p className="text-gray-500 mb-10">专属程序员正在疯狂计算板筋锚入梁内的 3D 坐标，核心算法排布中...</p>
      
      <div className="flex gap-4">
        <a href="/beam" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition">
          先看单根梁
        </a>
        <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg">
          返回主控制台
        </a>
      </div>
    </div>
  );
}
