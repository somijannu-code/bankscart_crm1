"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
// Removed Link from "next/link" to fix module resolution error
import { 
  Search, Filter, MoreHorizontal, Loader2, RefreshCw, Eye, Hash, Users, Clock, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";

// --- START: Mock Supabase/Firestore Setup ---

// NOTE: Since the file path "@/lib/supabase/client" cannot be resolved, 
// we are mocking a client setup using Firestore (which is available in the environment)
// but maintaining the Supabase object structure for the table logic.

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { 
    getFirestore, collection, query, where, getDocs, updateDoc, doc, 
    onSnapshot, setLogLevel, getDoc 
} from 'firebase/firestore';

setLogLevel('Debug');

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let dbInstance: any = null;
let authInstance: any = null;
let currentUserIdRef: string | null = null;

const initializeFirebase = async () => {
    if (dbInstance && authInstance) return;

    try {
        const app = initializeApp(firebaseConfig);
        dbInstance = getFirestore(app);
        authInstance = getAuth(app);

        if (initialAuthToken) {
            await signInWithCustomToken(authInstance, initialAuthToken);
        } else {
            await signInAnonymously(authInstance);
        }
        currentUserIdRef = authInstance.currentUser?.uid || crypto.randomUUID();
        console.log("Firebase initialized. User ID:", currentUserIdRef);

    } catch (error) {
        console.error("Error initializing Firebase/Supabase client:", error);
    }
};

// Mock createClient to return an object that mimics Supabase functions using Firestore
const createClient = () => {
    if (!dbInstance) {
        console.error("Firebase not initialized. Call initializeFirebase first.");
        return null;
    }

    const getLeadsCollection = (userId) => {
        // Public data path for collaboration
        return collection(dbInstance, 'artifacts', appId, 'public', 'data', 'kyc_leads');
    };

    return {
        from: (tableName: string) => ({
            select: (fields: string) => ({
                eq: (key: string, value: string) => ({
                    order: (field: string, options: { ascending: boolean }) => ({
                        get: async () => {
                            // Firestore implementation of the query
                            const q = query(
                                getLeadsCollection(currentUserIdRef),
                                where('kyc_member_id', '==', currentUserIdRef),
                                // Simplified filtering since Firestore query structure doesn't perfectly match Supabase
                                value !== 'all' ? where(key, '==', value) : null,
                            ).filter(Boolean); // Filter out null/undefined where clauses

                            const snapshot = await getDocs(q);
                            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            return { data, error: null };
                        }
                    })
                })
            }),
            update: (updates: Partial<Lead>) => ({
                eq: (key: string, value: string) => ({
                    // Firestore implementation of update
                    get: async () => {
                        try {
                            const leadDocRef = doc(getLeadsCollection(currentUserIdRef), value);
                            await updateDoc(leadDocRef, updates as any);
                            return { error: null };
                        } catch (e) {
                            console.error("Firestore Update Error:", e);
                            return { error: e };
                        }
                    }
                })
            })
        }),
        channel: (channelName: string) => ({
            on: (type, options, callback) => ({
                subscribe: (statusCallback) => {
                    // Firestore onSnapshot listener for real-time updates
                    const q = query(getLeadsCollection(currentUserIdRef), where('kyc_member_id', '==', currentUserIdRef));
                    const unsubscribe = onSnapshot(q, (snapshot) => {
                        snapshot.docChanges().forEach((change) => {
                            // Mocking Supabase payload structure for the callback
                            const payload = {
                                new: change.type !== 'removed' ? { id: change.doc.id, ...change.doc.data() } as Lead : null,
                                old: change.type === 'removed' ? { id: change.doc.id, ...change.doc.data() } as Lead : null,
                                type: change.type
                            };
                            callback(payload);
                        });
                    }, (error) => {
                        console.error("Firestore Snapshot Error:", error);
                    });
                    
                    statusCallback('SUBSCRIBED');
                    
                    // Return unsubscribe function for cleanup
                    return { unsubscribe, status: 'SUBSCRIBED' };
                }
            }),
            subscribe: () => ({ status: 'SUBSCRIBED' }),
            removeChannel: () => {}
        })
    };
};
// --- END: Mock Supabase/Firestore Setup ---


// Simple manual debounce utility
const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
};

// Lead interface reflecting ALL available columns for the table and editing
interface Lead {
  id: string;
  name: string;
  phone: string;
  loan_amount: number | null;
  status: string;
  created_at: string;
  
  // --- NEW FIELDS ADDED for Editing ---
  pan_number: string | null;
  residence_address: string | null;
  permanent_address: string | null;
  office_address: string | null;
  application_number: string | null;
  monthly_salary: number | null; // Renamed from 'nth salary'
  office_email: string | null; // Renamed from 'office mail id'
  personal_email: string | null; // Renamed from 'mail id'
  disbursed_amount: number | null;
  roi_percent: number | null; // Renamed from 'Roi(in percentage)'
  loan_tenure_months: number | null; // Renamed from 'tenure'
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  marital_status: 'MARRIED' | 'UNMARRIED' | null;
  residence_type: 'SELF_OWNED' | 'RENTED' | 'COMPANY_PROVIDED' | null;
  years_of_experience: number | null; // Renamed from 'experience (years)'
  occupation: 'PRIVATE' | 'GOVERNMENT' | 'PUBLIC' | null;
  designation: string | null;
  alt_phone: string | null; // Renamed from 'alternative mobile number'
  bank_name: string | null;
  account_number: string | null;
  telecaller_name: string | null;
  // --- END NEW FIELDS ---
}

interface KycLeadsTableProps {
    currentUserId: string;
    initialStatus: string; // Used to capture status filter from URL
}

// Define the available statuses for consistency
const STATUSES = {
    LOGIN_DONE: "Login Done",
    UNDERWRITING: "Underwriting",
    REJECTED: "Rejected",
    APPROVED: "Approved",
    DISBURSED: "Disbursed",
} as const;

// Static options for Select inputs
const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'];
const MARITAL_OPTIONS = ['MARRIED', 'UNMARRIED'];
const RESIDENCE_OPTIONS = ['SELF_OWNED', 'RENTED', 'COMPANY_PROVIDED'];
const OCCUPATION_OPTIONS = ['PRIVATE', 'GOVERNMENT', 'PUBLIC'];

// Utility functions
const getStatusBadge = (status: string) => {
    switch (status) {
        case STATUSES.LOGIN_DONE:
            return <Badge className="bg-blue-400 text-white hover:bg-blue-500">Login Done</Badge>;
        case STATUSES.UNDERWRITING:
            return <Badge className="bg-amber-500 text-white hover:bg-amber-600">Underwriting</Badge>;
        case STATUSES.REJECTED:
            return <Badge className="bg-red-600 text-white hover:bg-red-700">Rejected</Badge>;
        case STATUSES.APPROVED:
            return <Badge className="bg-green-600 text-white hover:bg-green-700">Approved</Badge>;
        case STATUSES.DISBURSED:
            return <Badge className="bg-purple-600 text-white hover:bg-purple-700">Disbursed</Badge>;
        default:
            return <Badge variant="secondary">Unknown</Badge>;
    }
};

const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(Number(value))) return "N/A";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value));
};

export default function KycLeadsTable({ currentUserId, initialStatus }: KycLeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus || "all"); 
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const init = async () => {
        await initializeFirebase();
        const client = createClient();
        setSupabaseClient(client);
    };
    init();
  }, []);

  // Define the list of all fields to select from the database
  const ALL_FIELDS = [
      'id', 'name', 'phone', 'loan_amount', 'status', 'created_at',
      'pan_number', 'residence_address', 'permanent_address', 'office_address', 
      'application_number', 'monthly_salary', 'office_email', 'personal_email', 
      'disbursed_amount', 'roi_percent', 'loan_tenure_months', 'gender', 
      'marital_status', 'residence_type', 'years_of_experience', 'occupation', 
      'designation', 'alt_phone', 'bank_name', 'account_number', 'telecaller_name'
  ].join(', ');

  // 1. Data Fetching function
  const fetchLeads = async (setLoading = false) => {
    if (!supabaseClient) return;
    if (setLoading) setIsLoading(true);
    
    // Using the simplified mock query interface
    const query = supabaseClient.from("leads")
      .select(ALL_FIELDS)
      .eq("kyc_member_id", currentUserId)
      .order("created_at", { ascending: false });

    // The mock client 'get' simulates the Supabase fetch
    const { data, error } = await query.get();

    if (error) {
      console.error("Error fetching leads:", error);
    } else {
      // Data needs filtering client-side if the status filter is applied, 
      // as the mock Firestore query only filters on 'kyc_member_id'
      const filteredData = statusFilter === 'all' 
        ? data 
        : data.filter(lead => lead.status === statusFilter);
        
      setLeads(filteredData as Lead[]);
    }
    if (setLoading) setIsLoading(false);
  };

  // 2. Real-time Listener and Initial Load
  useEffect(() => {
    if (!supabaseClient) return;
    
    // Initial fetch
    fetchLeads(true); 

    const channel = supabaseClient.channel(`kyc_leads_user_${currentUserId}`);
    let subscription: { unsubscribe: () => void } | null = null;

    const channelHandler = channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          const changedLead = payload.new as Lead | null;
          const oldLead = payload.old as Lead | null;
          
          const isRelevant = 
             changedLead?.kyc_member_id === currentUserId || 
             oldLead?.kyc_member_id === currentUserId; 

          if (isRelevant) {
             console.log("Relevant lead change detected. Refetching leads...");
             // Simple refetch for real-time update
             fetchLeads(false); 
          }
        }
      );
    
    subscription = channelHandler.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to KYC leads changes for user: ${currentUserId}`);
        }
    });


    return () => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
        }
        // NOTE: channel.removeChannel is mocked/simplified in this environment
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseClient, currentUserId, statusFilter]); 
  
  // 3. Update Handler (Debounced for efficient API usage)
  const handleUpdate = useCallback(debounce(async (id: string, field: keyof Lead, value: string | number | null) => {
      if (!supabaseClient) return;
      console.log(`Updating ${field} for lead ${id} to ${value}`);
      
      const updateQuery = supabaseClient
          .from('leads')
          .update({ [field]: value })
          .eq('id', id);

      // The mock client 'get' simulates the Supabase execute
      const { error } = await updateQuery.get(); 

      if (error) {
          console.error(`Error updating lead ${id} field ${field}:`, error);
      } else {
          console.log("Update successful.");
      }
  }, 1000), [supabaseClient]); // 1 second debounce

  // 4. Client-side Search Logic
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return leads.filter(
        (lead) => 
            lead.name.toLowerCase().includes(lowerCaseSearch) ||
            lead.phone.includes(lowerCaseSearch) ||
            lead.id.toLowerCase().includes(lowerCaseSearch) ||
            lead.pan_number?.toLowerCase().includes(lowerCaseSearch) ||
            lead.application_number?.toLowerCase().includes(lowerCaseSearch) ||
            lead.telecaller_name?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [leads, searchTerm]);


  // 5. Reusable Editable Components

  interface EditableCellProps {
      lead: Lead;
      field: keyof Lead;
      placeholder?: string;
      type?: 'text' | 'number';
      className?: string;
  }

  const EditableCell = ({ lead, field, placeholder = 'Enter data', type = 'text', className = '' }: EditableCellProps) => {
      const initialValue = lead[field] !== null ? String(lead[field]) : '';
      const [value, setValue] = useState(initialValue);
      const [isSaving, setIsSaving] = useState(false);

      useEffect(() => {
          // Sync local state when lead data changes from external sources
          setValue(lead[field] !== null ? String(lead[field]) : '');
      }, [lead, field]);


      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = e.target.value;
          setValue(newValue);
          setIsSaving(true);
          
          let finalValue: string | number | null = newValue;
          if (type === 'number') {
            finalValue = parseFloat(newValue);
            if (isNaN(finalValue)) finalValue = null;
          }
          if (finalValue === '') finalValue = null;

          handleUpdate(lead.id, field, finalValue);
          // Set isSaving back to false after debounce delay
          setTimeout(() => setIsSaving(false), 1200); 
      };

      return (
          <Input 
              type={type}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              className={`h-8 px-2 text-xs w-full min-w-[100px] border-gray-200 focus:border-purple-400 ${className} ${isSaving ? 'ring-2 ring-purple-500' : ''}`}
              disabled={isSaving}
          />
      );
  };


  interface EditableSelectCellProps {
    lead: Lead;
    field: keyof Lead;
    options: string[];
    placeholder: string;
    className?: string;
  }

  const EditableSelectCell = ({ lead, field, options, placeholder, className = '' }: EditableSelectCellProps) => {
    const [value, setValue] = useState(lead[field] || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setValue(lead[field] || '');
    }, [lead, field]);

    const handleSelectChange = (newValue: string) => {
        setValue(newValue);
        setIsSaving(true);

        const finalValue = newValue === '' ? null : newValue;
        handleUpdate(lead.id, field, finalValue);
        setTimeout(() => setIsSaving(false), 1200);
    };

    return (
        <Select value={value as string} onValueChange={handleSelectChange}>
            <SelectTrigger className={`h-8 px-2 text-xs w-full min-w-[100px] border-gray-200 focus:border-purple-400 ${className} ${isSaving ? 'ring-2 ring-purple-500' : ''}`}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="" disabled>{placeholder}</SelectItem>
                {options.map(option => (
                    <SelectItem key={option} value={option}>{option.replace('_', ' ')}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
  };


  return (
    <div className="space-y-4">
      {/* Controls: Search, Filter, Refresh */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-1/2">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by Name, Phone, PAN, App No, or Telecaller..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full"
          />
        </div>
        <div className="flex gap-4 items-center">
            {/* Status Filter Select */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px] text-sm">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.values(STATUSES).map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

          <Button onClick={() => fetchLeads(true)} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="min-w-[150px]">Lead Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="min-w-[120px] hidden sm:table-cell">App No</TableHead>
                <TableHead className="min-w-[120px] hidden sm:table-cell">PAN</TableHead>
                <TableHead className="min-w-[120px] hidden md:table-cell">Gender</TableHead>
                <TableHead className="min-w-[120px] hidden lg:table-cell">Marital Status</TableHead>
                <TableHead className="min-w-[120px] hidden xl:table-cell">Occupation</TableHead>
                <TableHead className="min-w-[120px] hidden 2xl:table-cell">Designation</TableHead>
                <TableHead className="min-w-[120px] hidden 3xl:table-cell">Telecaller</TableHead>
                <TableHead className="min-w-[120px]">Loan Req</TableHead>
                <TableHead className="min-w-[140px]">Status</TableHead>
                <TableHead className="text-right min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" />
                    <p className="mt-2 text-gray-600">Loading leads...</p>
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-gray-500">
                    <Users className="w-6 h-6 mx-auto mb-2"/>
                    No assigned leads found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-purple-50 transition-colors">
                    
                    {/* 1. Name and ID */}
                    <TableCell className="font-medium text-purple-700 hover:underline">
                      {/* Using a standard <a> tag instead of <Link> */}
                      <a href={`/kyc-team/${lead.id}`} className="block">{lead.name}</a> 
                      <p className="text-xs text-gray-500 mt-0.5">ID: {lead.id.substring(0, 8)}</p>
                    </TableCell>

                    {/* 2. Phone (Editable Text for quick correction) */}
                    <TableCell className="text-xs p-1">
                      <EditableCell lead={lead} field="phone" placeholder="Phone" className="text-xs" />
                    </TableCell>
                    
                    {/* 3. Application Number (Editable Text) */}
                    <TableCell className="hidden sm:table-cell p-1">
                      <EditableCell lead={lead} field="application_number" placeholder="Enter App No" className="text-xs" />
                    </TableCell>

                    {/* 4. PAN Number (Editable Text) */}
                    <TableCell className="hidden sm:table-cell p-1">
                      <EditableCell lead={lead} field="pan_number" placeholder="Enter PAN" className="text-xs uppercase" />
                    </TableCell>

                    {/* 5. Gender (Editable Select) */}
                    <TableCell className="hidden md:table-cell p-1">
                      <EditableSelectCell lead={lead} field="gender" options={GENDER_OPTIONS} placeholder="Select Gender" className="text-xs" />
                    </TableCell>
                    
                    {/* 6. Marital Status (Editable Select) */}
                    <TableCell className="hidden lg:table-cell p-1">
                      <EditableSelectCell lead={lead} field="marital_status" options={MARITAL_OPTIONS} placeholder="Select Status" className="text-xs" />
                    </TableCell>

                    {/* 7. Occupation (Editable Select) */}
                    <TableCell className="hidden xl:table-cell p-1">
                      <EditableSelectCell lead={lead} field="occupation" options={OCCUPATION_OPTIONS} placeholder="Select Occu." className="text-xs" />
                    </TableCell>

                    {/* 8. Designation (Editable Text) */}
                    <TableCell className="hidden 2xl:table-cell p-1">
                      <EditableCell lead={lead} field="designation" placeholder="Enter Desig." className="text-xs" />
                    </TableCell>
                    
                    {/* 9. Telecaller Name (Editable Text) */}
                    <TableCell className="hidden 3xl:table-cell p-1">
                      <EditableCell lead={lead} field="telecaller_name" placeholder="Enter Telecaller" className="text-xs" />
                    </TableCell>

                    {/* 10. Loan Required (Read-only) */}
                    <TableCell className="font-semibold text-xs text-center">
                        {formatCurrency(lead.loan_amount)}
                    </TableCell>
                    
                    {/* 11. Status (Read-only) */}
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    
                    {/* 12. Actions */}
                    <TableCell className="text-right p-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            {/* Using a standard <a> tag instead of <Link> */}
                            <a href={`/kyc-team/${lead.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Details
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="text-center py-2 text-sm text-gray-600">
        Displaying {filteredLeads.length} leads. **Editing is active**: changes are saved automatically 1 second after you stop typing.
      </div>
    </div>
  );
}
