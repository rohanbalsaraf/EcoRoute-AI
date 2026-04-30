import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ApiKeyManager from '../../components/ApiKeyManager';
import DashboardStats from '../../components/DashboardStats';

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  const user = await currentUser();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-6 md:mb-8 text-white tracking-tight">Developer <span className="text-glow-green">Dashboard</span></h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Profile Card */}
        <div className="glass-panel p-4 flex flex-col justify-center border-glow-hover">
          <h2 className="text-lg font-semibold mb-3 text-white">Profile</h2>
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--text-secondary)] truncate">Email: <span className="text-white font-medium">{user?.emailAddresses[0]?.emailAddress}</span></p>
            <p className="text-xs text-[var(--text-secondary)] truncate">User ID: <span className="font-mono text-[10px] bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-white">{userId}</span></p>
          </div>
        </div>

        {/* API Keys Manager */}
        <ApiKeyManager />

        {/* Usage Analytics */}
        <div className="md:col-span-3 mt-2">
          <DashboardStats />
        </div>
      </div>
    </div>
  );
}