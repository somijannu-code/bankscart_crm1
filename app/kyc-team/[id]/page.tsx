"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, MessageSquare, ArrowLeft, Clock, Save, User, DollarSign, Loader2, XCircle, Briefcase, Banknote } from "lucide-react"; 
import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Assuming a toast library is available for notifications (like react-hot-toast)

// --- 1. CONSTANTS AND UTILITIES ---

// Define the available statuses for the loan lifecycle
const STATUSES = {
    LOGIN_DONE: "Login Done",
    UNDERWRITING: "Underwriting",
    REJECTED: "Rejected",
    APPROVED: "Approved",
    DISBURSED: "Disbursed",
} as const;

// All possible status values for the Select component
const STATUS_OPTIONS = Object.values(STATUSES);

// Updated Lead interface to include all requested fields
interface Lead {
  id: string;
  name: string;
  email: string | null; // Personal Mail ID
  phone: string;
  company: string | null;
  designation: string | null;
  source: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  loan_amount: number | null;
  loan_type: string | null;
  // Existing address fields (assuming 'address' is Residence Address)
  address: string | null; 
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;

  // --- NEW FIELDS ---
  pan_number: string | null;
  residence_address: string | null; // Added for explicit separation
  permanent_address: string | null;
  office_address: string | null;
  application_number: string | null;
  nth_salary: number | null;
  office_mail_id: string | null;
  disbursed_amount: number | null;
  roi_percentage: number | null;
  tenure: number | null; // in months
  gender: 'Male' | 'Female' | 'Other' | null;
  marital_status: 'Married' | 'Unmarried' | 'Divorced' | 'Widowed' | null;
  residence_type: 'Self Owned' | 'Rented' | 'Company Provided' | null;
  experience_years: number | null;
  occupation: 'Private' | 'Government' | 'Public' | 'Self-Employed' | null;
  alternative_mobile_number: string | null;
  bank_name: string | null;
  account_number: string | null;
  telecaller_name: string | null;
}

// Utility to format currency
const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(Number(value))) return "N/A";
    // Use 'en-IN' for Indian Rupee formatting
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value));
};

// Utility to format number
const formatNumber = (value: number | null) => {
    if (value === null || isNaN(Number(value))) return "N/A";
    return new Intl.NumberFormat('en-IN').format(Number(value));
};

// Utility to get the status badge style
const getStatusBadge = (status: string) => {
    switch (status) {
        case STATUSES.LOGIN_DONE:
            return <Badge className="bg-blue-500 text-white hover:bg-blue-600">Login Done</Badge>;
        case STATUSES.UNDERWRITING:
            return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Underwriting</Badge>;
        case STATUSES.REJECTED:
            return <Badge className="bg-red-600 text-white hover:bg-red-700">Rejected</Badge>;
        case STATUSES.APPROVED:
            return <Badge className="bg-green-600 text-white hover:bg-green-700">Approved</Badge>;
        case STATUSES.DISBURSED:
            return <Badge className="bg-purple-600 text-white hover:bg-purple-700">Disbursed</Badge>;
        default:
            return <Badge variant="secondary">New</Badge>;
    }
};

// --- MOCK DATA AND MOCK IMPORTS FOR COMPILATION ---

// Static Mock Data
const MOCK_LEAD_DATA: Lead = {
  id: "lead-45678",
  name: "Priya Sharma",
  email: "priya.sharma@example.com",
  phone: "9876543210",
  company: "Tech Solutions Pvt Ltd",
  designation: "Senior Software Engineer",
  source: "Website Form",
  status: STATUSES.UNDERWRITING,
  priority: "high",
  assigned_to: "user-12345",
  created_at: new Date(Date.now() - 86400000).toISOString(),
  updated_at: new Date().toISOString(),
  loan_amount: 500000,
  loan_type: "Personal Loan",
  address: "123, Residency Road, Bengaluru", // Legacy address field
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  zip_code: "560001",
  pan_number: "ABCDE1234F",
  residence_address: "Apartment 301, Sector 4, Noida", 
  permanent_address: "House 50, Gandhi Marg, Jaipur",
  office_address: "Global Tech Park, Outer Ring Road, Bengaluru",
  application_number: "PL4567890",
  nth_salary: 75000,
  office_mail_id: "psharma@techsolutions.com",
  disbursed_amount: 250000, // Added a value to show it works
  roi_percentage: 12.5,
  tenure: 36,
  gender: 'Female',
  marital_status: 'Married',
  residence_type: 'Rented',
  experience_years: 5,
  occupation: 'Private',
  alternative_mobile_number: '9988776655',
  bank_name: 'HDFC Bank',
  account_number: '50100123456789',
  telecaller_name: 'Amit Patel',
};

// Mock Next.js Router to resolve "next/navigation" error
const useRouter = () => ({
  push: (path: string) => console.log(`[MOCK] Navigating to: ${path}`),
  back: () => console.log("[MOCK] Going back..."),
});

// Mock Supabase client to resolve "@/lib/supabase/client" error
const createClient = () => ({
    from: (table: string) => ({
        select: (columns: string) => ({
            eq: () => ({
                single: async () => ({
                    // Return mock data for the fetch operation
                    data: MOCK_LEAD_DATA, 
                    error: null,
                }),
            }),
        }),
        update: () => ({
            eq: async () => ({ error: null }),
        }),
    }),
    // Mock the real-time channel setup
    channel: (name: string) => ({
        on: () => ({
            subscribe: () => ({
                unsubscribe: () => {},
            }),
        }),
    }),
    removeChannel: () => {},
});


// --- 2. INLINE STATUS UPDATER COMPONENT ---

interface LeadStatusUpdaterProps {
    leadId: string;
    currentStatus: string;
    onStatusUpdate: (newStatus: string) => void;
}

const LeadStatusUpdater = ({ leadId, currentStatus, onStatusUpdate }: LeadStatusUpdaterProps) => {
    const [newStatus, setNewStatus] = useState(currentStatus);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Use the mocked client
    const supabase = createClient(); 

    // Reset status selector if parent component updates currentStatus (e.g., from real-time listener)
    useEffect(() => {
        setNewStatus(currentStatus);
    }, [currentStatus]);

    const handleUpdate = useCallback(async () => {
        if (newStatus === currentStatus) {
            return;
        }

        setIsUpdating(true);
        
        // This update call now uses the mock, which will succeed silently
        const { error } = await supabase 
            .from('leads')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', leadId);
        
        setIsUpdating(false);

        if (error) {
            console.error("MOCK: Error updating status:", error);
            setNewStatus(currentStatus); 
        } else {
            // MOCK: Simulate success and update local state
            console.log(`MOCK: Successfully updated status to ${newStatus}`);
            onStatusUpdate(newStatus); 
        }
    }, [newStatus, currentStatus, leadId, supabase, onStatusUpdate]);

    const isSaveDisabled = isUpdating || newStatus === currentStatus;

    return (
        <Card className="shadow-lg border-2 border-purple-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-purple-700">
                    <Clock className="h-5 w-5" />
                    Update Loan Status
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Label htmlFor="status-select" className="min-w-[80px]">Current Status:</Label>
                    <div className="flex-grow">
                        {getStatusBadge(currentStatus)}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Label htmlFor="status-select" className="min-w-[80px]">Set New Status:</Label>
                    <Select 
                        value={newStatus} 
                        onValueChange={setNewStatus}
                        disabled={isUpdating}
                    >
                        <SelectTrigger id="status-select" className="w-full">
                            <SelectValue placeholder="Select a new status" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map(status => (
                                <SelectItem key={status} value={status}>
                                    {status}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button 
                    onClick={handleUpdate} 
                    disabled={isSaveDisabled}
                    className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                    {isUpdating ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Status Change
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

// --- 3. MAIN LEAD PROFILE PAGE ---

interface LeadProfilePageProps {
  params: {
    id: string;
  };
}

export default function KycLeadProfilePage({ params }: LeadProfilePageProps) {
  const router = useRouter(); // Mocked router
  const leadId = params.id;
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient(); // Mocked client

  const fetchLead = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // In the mock, the select query is irrelevant, it just returns MOCK_LEAD_DATA
    const { data, error } = await supabase
      .from('leads')
      .select('...')
      .eq('id', leadId)
      .single();

    if (error) {
      console.error("MOCK: Error fetching lead (Mocked data was expected):", error);
      setError(`MOCK: Lead not found or error fetching data: ${error.message}`);
      setLead(null);
    } else {
      // Map 'address' to 'residence_address' if needed, 
      const leadData: Lead = {
          ...(data as Lead),
          // Fallback logic for address fields: Use 'address' if 'residence_address' is null
          residence_address: data.residence_address || data.address,
      }
      setLead(leadData);
    }
    setIsLoading(false);
  }, [leadId, supabase]);

  useEffect(() => {
    fetchLead();

    // The real-time listener is now mocked and does nothing
    const channel = supabase.channel(`lead_${leadId}_changes`);

    const subscription = channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` },
        (payload) => {
          // This block is only for logging in the mock
          console.log("MOCK: Real-time listener received update.");
          // In a real app, you would update state here:
          // setLead(prev => ({ ...(prev as Lead), ...(payload.new as Lead) }));
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]); 

  const handleStatusUpdate = (newStatus: string) => {
      // Update the local state instantly after successful update from LeadStatusUpdater
      setLead(prev => (prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null));
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2 text-lg text-gray-600">Loading Lead Profile...</p>
      </div>
    );
  }
  
  // Since we are mocking, this error state should not be hit, but we keep the check
  if (error || !lead) { 
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-xl">
        <XCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold mt-4 text-red-700">Error Loading Lead</h1>
        <p className="text-gray-600 mt-2">{error || "The requested lead could not be found."}</p>
        <Button onClick={() => router.push('/kyc-team/leads')} className="mt-4 bg-purple-600 hover:bg-purple-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header and Quick Status */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.back()} variant="outline" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
          {getStatusBadge(lead.status)}
        </div>
        <div className="text-sm text-gray-500">
            Last Updated: {new Date(lead.updated_at).toLocaleString()}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Lead Details & Loan Info (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. KYC & Personal Details (Updated) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                        <User className="h-5 w-5" />
                        KYC & Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem label="Full Name" value={lead.name} valueClass="font-semibold" />
                    <DetailItem icon={<Phone className="h-4 w-4 text-gray-500" />} label="Mobile Number" value={lead.phone} />
                    <DetailItem icon={<Phone className="h-4 w-4 text-gray-500" />} label="Alternative Mobile" value={lead.alternative_mobile_number || 'N/A'} />
                    <DetailItem icon={<Mail className="h-4 w-4 text-gray-500" />} label="Personal Email" value={lead.email || 'N/A'} />
                    <DetailItem label="PAN Number" value={lead.pan_number || 'N/A'} valueClass="font-mono text-base" />
                    <DetailItem label="Gender" value={lead.gender || 'N/A'} />
                    <DetailItem label="Marital Status" value={lead.marital_status || 'N/A'} />
                    <DetailItem label="Residence Type" value={lead.residence_type || 'N/A'} />
                    <DetailItem label="Telecaller Name" value={lead.telecaller_name || 'N/A'} />
                </CardContent>
            </Card>

            {/* 2. Employment & Financial Details (New Card for better grouping) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Briefcase className="h-5 w-5" />
                        Employment & Salary Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem label="Company Name" value={lead.company || 'N/A'} />
                    <DetailItem label="Occupation" value={lead.occupation || 'N/A'} />
                    <DetailItem label="Designation" value={lead.designation || 'N/A'} />
                    <DetailItem label="Work Experience (Yrs)" value={lead.experience_years ? `${lead.experience_years} Years` : 'N/A'} />
                    <DetailItem icon={<Mail className="h-4 w-4 text-gray-500" />} label="Office Mail ID" value={lead.office_mail_id || 'N/A'} />
                    <DetailItem label="Net Take Home Salary" value={formatCurrency(lead.nth_salary)} valueClass="font-bold text-base text-purple-600" />
                </CardContent>
            </Card>

            {/* 3. Loan Details (Updated) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                        <DollarSign className="h-5 w-5" />
                        Loan & Approval Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem label="Application Number" value={lead.application_number || 'N/A'} valueClass="font-semibold text-blue-600" />
                    <DetailItem label="Requested Amount" value={formatCurrency(lead.loan_amount)} valueClass="font-bold text-lg text-green-700" />
                    <DetailItem label="Disbursed Amount" value={formatCurrency(lead.disbursed_amount)} valueClass="font-bold text-lg text-purple-700" />
                    <DetailItem label="Loan Type" value={lead.loan_type || 'N/A'} />
                    <DetailItem label="ROI (Percentage)" value={lead.roi_percentage ? `${lead.roi_percentage}%` : 'N/A'} />
                    <DetailItem label="Tenure (Months)" value={lead.tenure ? `${lead.tenure} Months` : 'N/A'} />
                    <DetailItem label="Priority" value={<Badge variant="secondary" className={`capitalize ${lead.priority === 'urgent' ? 'bg-red-500 text-white' : lead.priority === 'high' ? 'bg-amber-500 text-white' : 'bg-gray-200'}`}>{lead.priority}</Badge>} />
                    <DetailItem label="Current Status" value={getStatusBadge(lead.status)} valueClass="flex items-center" />
                    <DetailItem label="Assigned To" value={lead.assigned_to ? lead.assigned_to.substring(0, 8) + '...' : 'Unassigned'} />
                </CardContent>
            </Card>

            {/* 4. Address Details (Updated for multiple addresses) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                        <MapPin className="h-5 w-5" />
                        Address Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6">
                    {/* Residence Address (using existing fields) */}
                    <div className="p-3 border rounded-lg bg-white shadow-sm">
                        <p className="text-sm font-semibold text-purple-600 mb-1">Residence Address</p>
                        <p className="text-gray-700 text-sm">
                            {lead.residence_address || lead.address || 'N/A (No Street/Locality)'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {lead.city}, {lead.state} - {lead.zip_code} ({lead.country})
                        </p>
                        {(!lead.address && !lead.city) && <p className="text-gray-500 italic text-sm mt-1">No Residence Address details available.</p>}
                    </div>

                    {/* Permanent Address */}
                    <div className="p-3 border rounded-lg bg-white shadow-sm">
                        <p className="text-sm font-semibold text-purple-600 mb-1">Permanent Address</p>
                        <p className="text-gray-700 text-sm">
                            {lead.permanent_address || <span className="italic text-gray-500">N/A</span>}
                        </p>
                    </div>

                    {/* Office Address */}
                    <div className="p-3 border rounded-lg bg-white shadow-sm">
                        <p className="text-sm font-semibold text-purple-600 mb-1">Office Address</p>
                        <p className="text-gray-700 text-sm">
                            {lead.office_address || <span className="italic text-gray-500">N/A</span>}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 5. Bank Details (New Card) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Banknote className="h-5 w-5" />
                        Bank Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem label="Bank Name" value={lead.bank_name || 'N/A'} />
                    <DetailItem label="Account Number" value={lead.account_number || 'N/A'} valueClass="font-mono text-base" />
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Status Updater & Tabs (1/3 width on large screens) */}
        <div className="lg:col-span-1 space-y-6">
            {/* Status Update Component */}
            <LeadStatusUpdater 
                leadId={lead.id} 
                currentStatus={lead.status} 
                onStatusUpdate={handleStatusUpdate}
            />

            {/* Activity Tabs (Simplified stubs) */}
            <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="notes">Notes/Calls</TabsTrigger>
                </TabsList>
                
                {/* Timeline Content Stub */}
                <TabsContent value="timeline">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-gray-500 space-y-2">
                                <div className="p-2 border-l-4 border-purple-400">
                                    <p className="font-semibold">Status changed to {lead.status}</p>
                                    <p className="text-xs">{new Date(lead.updated_at).toLocaleString()}</p>
                                </div>
                                <div className="p-2 border-l-4 border-gray-300">
                                    <p className="font-semibold">Lead created</p>
                                    <p className="text-xs">{new Date(lead.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notes/Calls Content Stub */}
                <TabsContent value="notes">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Notes & Follow-ups
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500">
                                Feature coming soon: Add notes, call logs, and follow-ups.
                            </p>
                            <Textarea placeholder="Add a quick note..." className="mt-3" rows={3} />
                            <Button size="sm" className="mt-2 w-full bg-purple-600 hover:bg-purple-700">Save Note</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
      </div>
    </div>
  );
}

// Simple helper component for displaying details
const DetailItem = ({ label, value, icon, valueClass = '' }: { label: string, value: React.ReactNode, icon?: React.ReactNode, valueClass?: string }) => (
    <div className="flex flex-col space-y-1 p-2 bg-gray-50 rounded-lg">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className={`flex items-center gap-2 ${valueClass}`}>
            {icon}
            <span className="text-sm text-gray-800 break-words">{value}</span>
        </div>
    </div>
);
