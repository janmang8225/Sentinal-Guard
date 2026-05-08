import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-primary font-body flex">
      <Sidebar />
      <div className="flex-1 ml-[240px] flex flex-col min-w-0 min-h-screen">
        <TopBar />
        <main className="flex-1 p-[32px]">
          <div className="max-w-[1600px] mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
