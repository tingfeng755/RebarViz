import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center relative overflow-hidden">
      {/* 科技感网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      
      <div className="relative z-10 text-center px-4 flex flex-col items-center w-full max-w-5xl mx-auto mt-10">
        
        {/* 顶部小标签 */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800/50 text-xs font-bold text-slate-300 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          基于 22G101 图集
        </div>
        
        {/* 👇 您的专属 3D 大标题在这里！ */}
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tighter mb-2 drop-shadow-xl">
          小宋的
        </h1>
        <h1 className="text-7xl md:text-[110px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-300 tracking-tighter italic drop-shadow-[0_0_40px_rgba(56,189,248,0.3)] mb-10 leading-tight">
          钢筋世界
        </h1>

        {/* 副标题描述 */}
        <p className="text-slate-400 text-lg md:text-xl font-medium mb-12 tracking-widest leading-relaxed">
          输入平法标注，即时生成三维配筋模型<br />
          旋转查看构造细节，AI 助手随时答疑
        </p>

        {/* 按钮组 */}
        <div className="flex flex-col sm:flex-row gap-5 items-center justify-center">
          <Link href="/foundation" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-lg hover:scale-105 transition-transform shadow-[0_0_30px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2">
            开始学习 <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/joint-details" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold text-lg hover:bg-indigo-600/40 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm">
            查看全新功能：梁板节点
          </Link>
        </div>

      </div>
    </div>
  );
}
