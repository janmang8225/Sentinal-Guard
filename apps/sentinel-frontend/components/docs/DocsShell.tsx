'use client';

import { useEffect, useState } from 'react';
import DocsNavbar from '@/components/docs/DocsNavbar';
import DocsRightNav from '@/components/docs/DocsRightNav';
import DocsSidebar from '@/components/docs/DocsSidebar';
import type { DocsPageConfig } from '@/components/docs/DocsPages';

interface Props {
  page: DocsPageConfig;
}

export default function DocsShell({ page }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(page.toc[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [page]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FC] font-[Inter,system-ui,sans-serif]">
      <DocsNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 overflow-y-auto
            border-r border-[#E2E8F0] bg-white pt-16 transition-transform duration-300
            md:static md:z-auto md:translate-x-0 md:pt-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <DocsSidebar
            onLinkClick={() => setSidebarOpen(false)}
            variant={page.sidebarVariant}
          />
        </aside>

        <main className="flex-1 overflow-y-auto">{page.content}</main>

        <aside className="hidden w-56 flex-shrink-0 overflow-y-auto xl:block">
          <DocsRightNav activeSection={activeSection} items={page.toc} />
        </aside>
      </div>
    </div>
  );
}
