'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Columns3, Box, LayoutGrid, GitMerge, Wallpaper } from 'lucide-react';

const NAV = [
  { href: '/beam', label: '梁 KL', icon: Columns3 },
  { href: '/column', label: '柱 KZ', icon: Box },
  { href: '/shearwall', label: '墙 Q', icon: Wallpaper },
  { href: '/slab', label: '板 LB', icon: LayoutGrid },
  { href: '/joint-details', label: '节点', icon: GitMerge }, 
  { href: '/foundation', label: '基础 DJ', icon: Box },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 backdrop-blur-md bg-slate-900/90 h-14 shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
           {/* 👇 Logo 已经为您换成了“宋” */}
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(37,99,235,0.5)]">宋</div>
           
           {/* 👇 您的全新招牌在这里！ */}
           <div className="flex items-baseline gap-1.5 hidden sm:flex">
             <span className="text-white font-bold text-sm tracking-wide">小宋的</span>
             <span className="text-blue-400 font-black text-sm italic tracking-widest">钢筋世界</span>
           </div>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-6 h-full">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className={`flex items-center gap-1.5 text-xs font-bold transition-all duration-200 h-full border-b-2 ${pathname === l.href ? 'text-white border-blue-500 bg-blue-500/10 px-2' : 'text-slate-400 border-transparent hover:text-slate-200 px-2'}`}>
              <l.icon className="w-3.5 h-3.5" />{l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
