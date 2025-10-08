"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, DollarSign, BarChart3, TrendingUp, Filter, Users, Calendar } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

// --- TYPES ---

interface LeadDisbursement {
    id: string;
    assigned_to: string; // The Telecaller ID
    disbursed_amount: number;
    disbursed_at: string; // ISO string
}

interface UserMap {
    [id: string]: string; // userId: fullName
}

interface MonthlyDisbursement {
    telecallerId: string;
    telecallerName: string;
    monthKey: string; // YYYY-MM
    totalAmount: number;
}

// --- UTILITIES ---

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
};

const getMonthName = (monthKey: string) => {
    if (!monthKey || monthKey.length !== 7) return "Invalid Date";
    const [year, month] = monthKey.split('-');
    // Date month is 0-indexed, so we use month - 1
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'long' });
};

// --- DATA FETCHING & AGGREGATION HOOK ---

const useDisbursementData = (year: number) => {
    const supabase = createClient();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [disbursements, setDisbursements] = useState<LeadDisbursement[]>([]);
    const [userMap, setUserMap] = useState<UserMap>({});
    const [uniqueMonths, setUniqueMonths] = useState<string[]>([]);
    
    // Fetch all telecallers for mapping IDs to names
    const fetchUsers = useCallback(async (): Promise<UserMap> => {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('role', 'telecaller'); // Assuming telecallers have this role

        if (error) {
            console.error('Error fetching users:', error);
            toast({
                title: "Error",
                description: "Failed to load telecaller names.",
                variant: "destructive",
            });
            return {};
        }
        
        const map: UserMap = {};
        (data as { id: string, full_name: string | null }[]).forEach(user => {
            map[user.id] = user.full_name || `User ID: ${user.id.substring(0, 8)}...`;
        });
        setUserMap(map);
        return map;
    }, [supabase, toast]);

    // Fetch disbursed leads data for the selected year
    const fetchLeads = useCallback(async (selectedYear: number) => {
        setLoading(true);
        setError(null);
        
        const startOfYear = `${selectedYear}-01-01T00:00:00.000Z`;
        const endOfYear = `${selectedYear + 1}-01-01T00:00:00.000Z`;

        // ASSUMPTION: 'disbursed_at' column exists and tracks the disbursement date.
        // The lead must be 'DISBURSED'
        const { data, error } = await supabase
            .from('leads')
            .select('id, assigned_to, disbursed_amount, disbursed_at')
            .eq('status', 'DISBURSED')
            .gte('disbursed_at', startOfYear)
            .lt('disbursed_at', endOfYear);

        if (error) {
            console.error('Error fetching leads:', error);
            setError(`Failed to fetch disbursement data: ${error.message}. Check if 'disbursed_amount', 'disbursed_at', and RLS policies are set correctly.`);
            setDisbursements([]);
            setLoading(false);
            return;
        }

        const validDisbursements = (data || []).filter(
            (d): d is LeadDisbursement => d.disbursed_amount !== null && d.assigned_to !== null
        ) as LeadDisbursement[];
        
        setDisbursements(validDisbursements);
        
        // Extract unique months from the fetched data
        const months = new Set<string>();
        validDisbursements.forEach(d => {
            if (d.disbursed_at) {
                // Extracts YYYY-MM
                months.add(d.disbursed_at.substring(0, 7)); 
            }
        });
        // Sort months chronologically
        setUniqueMonths(Array.from(months).sort());
        
        setLoading(false);
    }, [supabase]);
    
    useEffect(() => {
        const loadData = async () => {
            const users = await fetchUsers();
            if (Object.keys(users).length > 0) {
                await fetchLeads(year);
            } else {
                setLoading(false);
            }
        };
        loadData();
    }, [year, fetchUsers, fetchLeads]);

    // Aggregate data into the final monthly report structure
    const aggregatedData: MonthlyDisbursement[] = useMemo(() => {
        const aggregates: { [key: string]: MonthlyDisbursement } = {}; // Key: telecallerId-monthKey

        disbursements.forEach(d => {
            if (!d.disbursed_at || !d.assigned_to) return;

            const monthKey = d.disbursed_at.substring(0, 7);
            const key = `${d.assigned_to}-${monthKey}`;

            if (!aggregates[key]) {
                aggregates[key] = {
                    telecallerId: d.assigned_to,
                    telecallerName: userMap[d.assigned_to] || `Unknown Telecaller (${d.assigned_to.substring(0, 8)}...)`,
                    monthKey: monthKey,
                    totalAmount: 0,
                };
            }
            aggregates[key].totalAmount += d.disbursed_amount;
        });

        // Sort by Month, then by Telecaller Name
        return Object.values(aggregates).sort((a, b) => {
            if (a.monthKey !== b.monthKey) {
                return a.monthKey.localeCompare(b.monthKey);
            }
            return a.telecallerName.localeCompare(b.telecallerName);
        });
    }, [disbursements, userMap]);

    const grandTotal = useMemo(() => 
        aggregatedData.reduce((sum, item) => sum + item.totalAmount, 0), 
        [aggregatedData]
    );

    return { loading, error, aggregatedData, grandTotal, uniqueMonths };
}

// --- MAIN COMPONENT ---

export default function TelecallerDisbursementReport() {
    
    // Get current year as default
    const currentYear = useMemo(() => new Date().getFullYear(), []);
    
    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or 'YYYY-MM'

    const { loading, error, aggregatedData, grandTotal, uniqueMonths } = useDisbursementData(Number(selectedYear));

    const availableYears = useMemo(() => {
        // Simple list of 5 years around the current year
        const years = [];
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push(String(i));
        }
        return years;
    }, [currentYear]);

    // Filtered data based on the selected month
    const filteredData = useMemo(() => {
        if (selectedMonth === 'all') {
            return aggregatedData;
        }
        return aggregatedData.filter(d => d.monthKey === selectedMonth);
    }, [aggregatedData, selectedMonth]);


    return (
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="h-7 w-7 text-green-600" />
                    Telecaller Disbursement Report
                </h1>
            </div>

            {/* Overall Summary Card and Filters */}
            <Card className="shadow-lg">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    
                    {/* Grand Total Metric */}
                    <div className="md:col-span-1 border-r md:border-r-2 border-green-200 pr-6">
                        <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Grand Total Disbursed ({selectedYear})
                        </p>
                        <p className="text-4xl font-extrabold text-green-700 mt-2 break-words">
                            {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : formatCurrency(grandTotal)}
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <Calendar className="h-4 w-4" /> Select Year
                            </label>
                            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={loading}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <Filter className="h-4 w-4" /> Filter Month
                            </label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={loading || uniqueMonths.length === 0}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Months" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Months</SelectItem>
                                    {uniqueMonths.map(monthKey => (
                                        <SelectItem key={monthKey} value={monthKey}>{getMonthName(monthKey)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <BarChart3 className="h-5 w-5 text-gray-700" />
                        Monthly Performance Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-500" />
                            Loading disbursement data...
                        </div>
                    ) : error ? (
                        <div className="p-6 text-red-700 bg-red-50 border border-red-200 rounded-lg m-4">
                            <p className="font-semibold">Error:</p>
                            <p className="text-sm">{error}</p>
                            <p className="text-xs mt-2">Check console for details and ensure the `leads` table has `status: 'DISBURSED'`, `disbursed_amount`, and `disbursed_at` columns.</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            <p className="text-lg font-semibold">No Disbursed Leads Found</p>
                            <p className="text-sm">No leads marked as 'DISBURSED' were found for the selected year/month, or the required data columns are missing.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50">
                                    <TableRow>
                                        <TableHead className="w-[40px] text-gray-600">#</TableHead>
                                        <TableHead className="text-gray-600 flex items-center gap-1"><Users className="h-4 w-4" /> Telecaller Name</TableHead>
                                        <TableHead className="text-gray-600">Month</TableHead>
                                        <TableHead className="text-right text-gray-600">Total Disbursed Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((item, index) => (
                                        <TableRow key={item.telecallerId + item.monthKey} className="hover:bg-green-50">
                                            <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                            <TableCell className="font-semibold text-gray-800">{item.telecallerName}</TableCell>
                                            <TableCell className="text-sm text-gray-600">{getMonthName(item.monthKey)}</TableCell>
                                            <TableCell className="text-right font-bold text-green-700">
                                                {formatCurrency(item.totalAmount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
