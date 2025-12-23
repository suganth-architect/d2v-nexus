import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { User, Project } from '../../types';
import { Building2, Mail, Phone, ChevronDown, ChevronUp, MapPin, Landmark } from 'lucide-react';

export function ClientList() {
    const [clients, setClients] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        // 1. Fetch Clients
        const qClients = query(
            collection(db, 'users'),
            where('role', '==', 'client')
        );

        // 2. Fetch Projects (to link clients to projects)
        const qProjects = query(collection(db, 'projects'));

        const unsubClients = onSnapshot(qClients, (snapshot) => {
            setClients(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
        });

        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
            setLoading(false);
        });

        return () => {
            unsubClients();
            unsubProjects();
        };
    }, []);

    const getLinkedProject = (clientUid: string) => {
        return projects.find(p => p.clientUid === clientUid);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-zinc-900 rounded-3xl" />)}
            </div>
        );
    }

    if (clients.length === 0) {
        return (
            <div className="text-center py-20 text-zinc-500">
                No clients found in the directory.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {clients.map(client => {
                if (!client.uid) return null;
                const linkedProject = getLinkedProject(client.uid);
                const isExpanded = expandedId === client.uid;

                return (
                    <div key={client.uid} className="group relative bg-zinc-900/30 backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all hover:scale-[1.01] hover:shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 p-1">
                                <img
                                    src={client.photoURL || `https://ui-avatars.com/api/?name=${client.displayName}&background=random`}
                                    alt={client.displayName}
                                    className="w-full h-full rounded-xl object-cover"
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-lg truncate">{client.displayName}</h3>
                                <p className="text-sm text-zinc-400 truncate">Private Client</p>

                                {linkedProject ? (
                                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-bold uppercase tracking-wide">
                                        <Building2 className="w-3 h-3" />
                                        {linkedProject.title}
                                    </div>
                                ) : (
                                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/50 border border-white/5 rounded-lg text-zinc-500 text-xs font-bold uppercase tracking-wide">
                                        Not Assigned
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-sm text-zinc-400 text-nowrap">
                            <div className="flex flex-col gap-2">
                                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                                    <Mail className="w-4 h-4 text-zinc-500" />
                                    <span className="truncate max-w-[150px]">{client.email}</span>
                                </a>
                                <Phone className="w-4 h-4 text-zinc-500" />
                                <span className="truncate">{client.phone || 'N/A'}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setExpandedId(isExpanded ? null : (client.uid || null))}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded-lg transition-colors ml-2"
                        >
                            {isExpanded ? 'Hide' : 'View'}
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>


                        {/* Identity Card Expansion */}
                        {
                            isExpanded && (
                                <div className="relative z-10 mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300 space-y-4">

                                    {/* Residential Address */}
                                    {client.address && (
                                        <div className="flex items-start gap-3 text-sm text-zinc-300 bg-zinc-800/30 p-3 rounded-lg border border-white/5">
                                            <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                            <p>{client.address}</p>
                                        </div>
                                    )}

                                    {/* KYC Block */}
                                    {/* 
                                    <div className="p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                                      <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                          <Shield className="w-3 h-3" />
                                          KYC Protocol
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                              <span className="text-zinc-500 block">GSTIN / PAN</span>
                                              <span className="text-white font-mono uppercase">{client.panNumber || 'N/A'}</span>
                                          </div>
                                          <div>
                                              <span className="text-zinc-500 block">Aadhar / ID</span>
                                              <span className="text-white font-mono">{client.aadharNumber || 'N/A'}</span>
                                          </div>
                                      </div>
                                    </div> 
                                    */}

                                    {/* Finance Block */}
                                    <div className="p-3 bg-zinc-800/50 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                            <Landmark className="w-3 h-3" />
                                            Payout Channel
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <div>
                                                <span className="text-zinc-500 block">Bank Name</span>
                                                <span className="text-white">{client.bankName || 'N/A'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-zinc-500 block">Account No</span>
                                                    <span className="text-white font-mono">{client.accountNumber || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-zinc-500 block">IFSC Code</span>
                                                    <span className="text-white font-mono uppercase">{client.ifscCode || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    </div>
                );
            })}
        </div >
    );
}
