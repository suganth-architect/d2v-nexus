import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Vendor } from '../../types';
import { Truck, Phone, IndianRupee, Briefcase, ChevronDown, ChevronUp, Shield, Landmark } from 'lucide-react';

export function VendorList() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        // Query vendors collection
        const q = query(collection(db, 'vendors'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setVendors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching vendors:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-40 bg-zinc-900 rounded-3xl" />)}
            </div>
        );
    }

    if (vendors.length === 0) {
        return (
            <div className="text-center py-20 text-zinc-500">
                <div className="flex justify-center mb-4">
                    <Truck className="w-12 h-12 opacity-20" />
                </div>
                No vendors registered in the network.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {vendors.map(vendor => {
                const isExpanded = expandedId === vendor.id;

                return (
                    <div key={vendor.id} className="group relative bg-zinc-900/30 backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all hover:scale-[1.01] hover:shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-white text-lg">{vendor.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" />
                                        {vendor.service}
                                    </span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 text-zinc-400">
                                <Truck className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="relative z-10 mt-6 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Billed</p>
                                <p className="text-white font-mono flex items-center gap-1">
                                    <IndianRupee className="w-3 h-3 text-zinc-500" />
                                    {vendor.totalBilled?.toLocaleString() || '0'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Balance</p>
                                <p className={`font-mono flex items-center gap-1 ${vendor.currentBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    <IndianRupee className="w-3 h-3 opacity-50" />
                                    {vendor.currentBalance?.toLocaleString() || '0'}
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-sm text-zinc-400">
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-zinc-500" />
                                <span>{vendor.contact}</span>
                            </div>
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : vendor.id)}
                                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs font-bold uppercase tracking-wider bg-purple-500/10 px-2 py-1 rounded-lg transition-colors"
                            >
                                {isExpanded ? 'Hide Profile' : 'View Profile'}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        </div>

                        {/* Identity Card Expansion */}
                        {isExpanded && (
                            <div className="relative z-10 mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300 space-y-4">
                                {/* KYC Block */}
                                <div className="p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                        <Shield className="w-3 h-3" />
                                        KYC Protocol
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-zinc-500 block">GSTIN / PAN</span>
                                            <span className="text-white font-mono uppercase">{(vendor as any).panNumber || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500 block">Aadhar / ID</span>
                                            <span className="text-white font-mono">{(vendor as any).aadharNumber || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Finance Block */}
                                <div className="p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                        <Landmark className="w-3 h-3" />
                                        Financial Channel
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <span className="text-zinc-500 block">Bank Name</span>
                                            <span className="text-white">{(vendor as any).bankName || 'N/A'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-zinc-500 block">Account No</span>
                                                <span className="text-white font-mono">{(vendor as any).accountNumber || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500 block">IFSC Code</span>
                                                <span className="text-white font-mono uppercase">{(vendor as any).ifscCode || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-zinc-600 text-center italic">
                                    Verified Vendor Identity • Titan OS
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
