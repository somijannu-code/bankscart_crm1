import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KycSidebar from "@/components/kyc-team/KycSidebar";

// Define the structure for the user's profile data
interface UserProfile {
  full_name: string | null;
  role: string;
}

export default async function KycTeamLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the user's profile (name and role)
  const { data: profile, error } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single();
    
  if (error || profile?.role !== 'kyc_team') {
    // Redirect if user is not a KYC member or profile fetch failed
    console.error("Access denied or profile error:", error);
    redirect("/"); // Redirect to a safe route
  }

  const userProfile: UserProfile = {
    full_name: profile.full_name,
    role: profile.role,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Hidden on mobile, sticky on larger screens */}
      <KycSidebar userProfile={userProfile} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden pt-4 md:ml-64 w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
