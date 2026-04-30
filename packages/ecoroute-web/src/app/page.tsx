import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  // Automatically redirect logged-in developers to the dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl mb-6">
          Carbon-Aware Routing <br />
          <span className="text-green-600">for Developers.</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 mb-8">
          The EcoRoute API allows you to integrate real-time, green route optimization into your logistics, delivery, and transportation apps with just a few lines of code.
        </p>
        
        <div className="flex justify-center gap-4">
          <Link 
            href="/sign-up" 
            className="rounded-md bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            Start Building for Free
          </Link>
          <a 
            href="https://github.com/your-username/ecoroute" 
            target="_blank" 
            rel="noopener noreferrer"
            className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            View Documentation
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Greenest Path</h3>
            <p className="mt-2 text-sm text-gray-600">Calculates routes minimizing CO2 output based on gradient, vehicle type, and traffic signals.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Multi-Model</h3>
            <p className="mt-2 text-sm text-gray-600">Support for Petrol, Diesel, Hybrid, and EV consumption patterns out-of-the-box.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Sub-millisecond</h3>
            <p className="mt-2 text-sm text-gray-600">Powered by a blazingly fast Rust core and in-memory caching for massive scale.</p>
          </div>
        </div>
      </div>
    </main>
  );
}