'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Columns3, 
  Box, 
  LayoutGrid, 
  GitMerge, 
  Wallpaper, 
  Layers 
} from 'lucide-react';

// 🚀 22G101 导航矩阵：包含了你截图中的所有项目
const NAV_LINKS = [
  { href: '/beam', label: '梁 KL', icon: Columns3 },
  { href: '/column', label: '柱 KZ', icon: Box },
  { href: '/shearwall', label: '墙 Q', icon: Wallpaper },
  { href: '/slab', label: '板 LB', icon: LayoutGrid },
  { href: '/joint', label: '节点', icon: GitMerge },
  { href: '/joint-details', label: '梁板节点', icon: Layers },
  // 核心新增：基础 DJ
  { href: '/foundation', label: '基础 DJ', icon: Box },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo 区域 */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            鹏
          </div>
          <div className="hidden sm:block">
            <span className="text-white font-bold block leading-none text-sm">鹏哥</span>
            <span className="text-slate-500 text-[10px] uppercase tracking-tighter">
              22G101 3D 可视化
            </span>
          </div>
        </Link>

        {/* 右侧主菜单：实现全覆盖挂牌 */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${
                  active 
                    ? 'text-white scale-105' 
                    : 'text-slate-400 hover:text-white hover:scale-105'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-blue-500' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 移动端菜单入口（占位） */}
        <div className="md:hidden text-slate-400">
          <LayoutGrid className="w-6 h-6" />
        </div>
      </div>
    </header>
  );
}
