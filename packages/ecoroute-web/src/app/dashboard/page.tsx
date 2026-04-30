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
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Developer Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          <p className="text-gray-600 truncate">Email: {user?.emailAddresses[0]?.emailAddress}</p>
          <p className="text-gray-600 truncate">User ID: <span className="font-mono text-xs">{userId}</span></p>
        </div>

        {/* API Keys Manager */}
        <ApiKeyManager />

        {/* Usage Analytics */}
        <div className="md:col-span-3">
          <DashboardStats />
        </div>
      </div>
    </div>
  );
}