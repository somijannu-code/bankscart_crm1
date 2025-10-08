"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LayoutDashboard, FileText, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserProfile {
    full_name: string | null;
    role: string;
}

const navItems = [
    { name: "Dashboard", href: "/kyc-team", icon: LayoutDashboard },
    { name: "My Leads", href: "/kyc-team/leads", icon: FileText },
];

// Note: Sign-out logic would typically be placed here
const handleSignOut = () => {
    // Implement client-side sign-out logic using Supabase client
    console.log("Signing out...");
    window.location.href = "/logout"; // Example redirection after sign out
};

export default function KycSidebar({ userProfile }: { userProfile: UserProfile }) {
    const pathname = usePathname();

    return (
        <>
            {/* Mobile/Tablet Backdrop & Menu Button - Not implemented for brevity in single file, 
                but this is the fixed sidebar for desktop */}
            
            {/* Desktop Sidebar */}
            <div className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-white border-r border-gray-200 md:block shadow-lg">
                <div className="flex h-full flex-col justify-between p-6">
                    {/* Header/Logo */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-2 text-2xl font-bold text-primary">
                            <ShieldCheck className="w-8 h-8 text-purple-600" />
                            <span>KYC Portal</span>
                        </div>

                        {/* User Profile Info */}
                        <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                            <User className="w-5 h-5 mr-3 text-gray-600" />
                            <div>
                                <p className="text-sm font-semibold">{userProfile.full_name || "KYC User"}</p>
                                <p className="text-xs text-gray-500 capitalize">{userProfile.role}</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.name} href={item.href} passHref>
                                        <div
                                            className={`
                                                flex items-center px-4 py-2 rounded-lg transition-colors duration-150
                                                ${isActive
                                                    ? "bg-purple-100 text-purple-700 font-semibold"
                                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                                                }
                                            `}
                                        >
                                            <item.icon className="w-5 h-5 mr-3" />
                                            {item.name}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Footer / Logout */}
                    <div className="mt-auto">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={handleSignOut}
                        >
                            <LogOut className="w-5 h-5 mr-3" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
