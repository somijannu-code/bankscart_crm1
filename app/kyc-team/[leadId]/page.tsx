import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Phone, CheckCircle, XCircle, Upload, Loader2, DollarSign } from "lucide-react";
// import { toast } from "sonner"; // Assuming you use toast

interface KycLeadDetailPageProps {
    params: {
        leadId: string;
    };
}

// Server Action for status update
const handleStatusUpdate = async (leadId: string, newStatus: "KYC Approved" | "KYC Rejected") => {
    "use server";
    const supabase = await createClient();
    
    // Perform update
    const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", leadId);
    
    // NOTE: In a production app, you would add security checks here 
    // to ensure the user updating the status is the assigned kyc_member_id.

    if (error) {
        console.error("Status update error:", error);
        return { success: false, message: "Failed to update status." };
    }
    return { success: true, message: `Lead status updated to ${newStatus}.` };
};

async function LeadDetails({ leadId }: { leadId: string }) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch the lead, joining on the 'telecaller' who created it
    const { data: lead, error } = await supabase
        .from("leads")
        .select(`
            *,
            telecaller:users!inner(full_name) // Assuming lead table has telecaller_id
        `)
        .eq("id", leadId)
        .eq("kyc_member_id", user.id) // Crucial: Only show leads assigned to this user
        .single();

    if (error || !lead) {
        // Lead not found or not assigned to this user
        redirect("/kyc-team");
    }

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="w-7 h-7" />
                KYC Verification: {lead.full_name}
            </h1>
            <p className="text-gray-500">
                Current Status: 
                <span className={`font-semibold ml-1 ${lead.status === 'Awaiting KYC' ? 'text-orange-600' : 'text-gray-900'}`}>
                    {lead.status}
                </span>
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead Information */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Lead Details</CardTitle>
                        <CardDescription>Customer information received from the telecaller.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p className="flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-500"/><strong>Phone:</strong> {lead.phone}</p>
                        <p className="flex items-center"><DollarSign className="h-4 w-4 mr-2 text-gray-500"/><strong>Loan Amount:</strong> ₹{lead.loan_amount?.toLocaleString() || "N/A"}</p>
                        <p className="flex items-center"><Users className="h-4 w-4 mr-2 text-gray-500"/><strong>Telecaller:</strong> {lead.telecaller?.full_name || "N/A"}</p>
                        <p className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-gray-500"/><strong>Date Assigned:</strong> {new Date(lead.created_at).toLocaleDateString()}</p>
                    </CardContent>
                </Card>

                {/* KYC Actions & Uploads */}
                <Card>
                    <CardHeader>
                        <CardTitle>KYC Actions</CardTitle>
                        <CardDescription>Finalize the verification status.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Verification Status</h3>
                        
                        {/* Status Update Buttons (Client Side Component) */}
                        <KycStatusButtons 
                            leadId={leadId} 
                            currentStatus={lead.status}
                            updateAction={handleStatusUpdate}
                        />

                        {/* Document Upload Area (Placeholder) */}
                        <div className="pt-4 border-t">
                            <h3 className="text-lg font-semibold mb-2">Documents</h3>
                            <Input placeholder="Search/Upload File..." className="mb-2"/>
                            <Button variant="outline" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />
                                Manage Documents
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Client Component to wrap the Server Action and handle client-side state/feedback
const KycStatusButtons = ({ leadId, currentStatus, updateAction }: { 
    leadId: string, 
    currentStatus: string, 
    updateAction: (leadId: string, status: "KYC Approved" | "KYC Rejected") => Promise<{ success: boolean; message: string; }>
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleAction = async (newStatus: "KYC Approved" | "KYC Rejected") => {
        setIsLoading(true);
        const result = await updateAction(leadId, newStatus);
        
        if (result.success) {
            // toast.success(result.message);
            router.refresh(); // Refresh data on the page
        } else {
            // toast.error(result.message);
        }
        setIsLoading(false);
    };

    if (currentStatus === "KYC Approved" || currentStatus === "KYC Rejected") {
        return (
            <p className={`font-bold text-center p-3 rounded-md ${currentStatus === "KYC Approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {currentStatus}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <Button 
                onClick={() => handleAction("KYC Approved")} 
                disabled={isLoading} 
                className="w-full bg-green-600 hover:bg-green-700"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve KYC
            </Button>
            <Button 
                onClick={() => handleAction("KYC Rejected")} 
                disabled={isLoading} 
                variant="destructive" 
                className="w-full"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject KYC
            </Button>
        </div>
    );
}

export default function KycLeadPageWrapper({ params }: KycLeadDetailPageProps) {
    return <LeadDetails leadId={params.leadId} />;
}
