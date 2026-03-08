'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Columns3, Box, LayoutGrid, GitMerge, ChevronLeft, ChevronRight, PanelLeftOpen, Settings, Wallpaper } from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { href: '/beam', label: '梁 KL', desc: '框架梁', icon: Columns3 },
  { href: '/column', label: '柱 KZ', desc: '框架柱', icon: Box },
  { href: '/shearwall', label: '墙 Q', desc: '剪力墙', icon: Wallpaper },
  { href: '/slab', label: '板 LB', desc: '楼板', icon: LayoutGrid },
  { href: '/joint', label: '节点', desc: '梁柱节点', icon: GitMerge },
  { href: '/foundation', label: '基础 DJ', desc: '独立基础', icon: Box }, 
];

export function Sidebar() {
  const pathname = usePathname();
  const [mode, setMode] = useState('expanded');
  const collapsed = mode === 'collapsed';
  const hidden = mode === 'hidden';
  return (
    <>
      {hidden && <button onClick={() => setMode('expanded')} className="fixed left-0 top-1/2 z-50 w-6 h-12 bg-white border border-gray-200 rounded-r-lg flex items-center justify-center text-gray-400 shadow-sm cursor-pointer"><PanelLeftOpen className="w-4 h-4" /></button>}
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-gray-200 bg-gray-50 transition-all duration-200 ${hidden ? 'w-0 border-r-0' : collapsed ? 'w-16' : 'w-52'}`}>
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV.map(({ href, label, desc, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-accent/10 text-accent border border-accent/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <div className="min-w-0"><div className="truncate">{label}</div><div className={`text-[10px] truncate ${active ? 'text-accent/70' : 'text-gray-400'}`}>{desc}</div></div>}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => setMode(collapsed ? 'expanded' : 'collapsed')} className="py-3 border-t border-gray-200 text-gray-400 flex justify-center cursor-pointer">{collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button>
      </aside>
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium ${active ? 'text-accent' : 'text-gray-400'}`}>
            <Icon className="w-5 h-5" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
