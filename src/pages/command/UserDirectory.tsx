import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaButton } from "../../components/ui/BananaButton";
import { BananaCard } from "../../components/ui/BananaCard";
import { Plus, Trash2, Mail, Phone, Building2 } from "lucide-react";
import { CreateUserModal } from "../../components/users/CreateUserModal";
import { LeaderboardTab } from "../../components/directory/LeaderboardTab";
import { AttendanceTab } from "../../components/directory/AttendanceTab";
import type { User, Client, Vendor } from "../../types";

export function UserDirectory() {
    const [activeTab, setActiveTab] = useState<'team' | 'clients' | 'vendors' | 'leaderboard' | 'attendance'>('team');

    // Data States
    const [team, setTeam] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);

    const [showAddModal, setShowAddModal] = useState(false);

    // STABLE SUBSCRIPTION (No Flashing)
    useEffect(() => {
        const unsubTeam = onSnapshot(collection(db, "users"), (s) => setTeam(s.docs.map(d => ({ uid: d.id, ...d.data() } as User))));
        const unsubClients = onSnapshot(collection(db, "clients"), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() } as Client))));
        const unsubVendors = onSnapshot(collection(db, "vendors"), (s) => setVendors(s.docs.map(d => ({ id: d.id, ...d.data() } as Vendor))));

        return () => { unsubTeam(); unsubClients(); unsubVendors(); };
    }, []);

    const handleDelete = async (coll: string, id: string) => {
        if (confirm("Are you sure?")) await deleteDoc(doc(db, coll, id));
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Directory</h1>
                    <p className="text-zinc-400">Manage Team, Clients & Ops</p>
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/10">
                    {['team', 'clients', 'vendors', 'leaderboard', 'attendance'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-yellow-500 text-black" : "text-zinc-400 hover:text-white"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Switcher */}
            {activeTab === 'team' && (
                <div className="space-y-4">
                    <div className="flex justify-end"><BananaButton onClick={() => setShowAddModal(true)}><Plus className="w-4 h-4 mr-2" /> Add Member</BananaButton></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {team.map(user => (
                            <BananaCard key={user.uid} className="relative group">
                                <button onClick={() => handleDelete('users', user.uid)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 border border-white/10">
                                        {user.displayName?.[0] || "U"}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{user.displayName}</h3>
                                        <span className="text-xs uppercase font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">{user.role}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 text-sm text-zinc-400 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> {user.email}
                                </div>
                            </BananaCard>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'clients' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {clients.map(client => (
                        <BananaCard key={client.id}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center font-bold text-blue-500">{client.name[0]}</div>
                                <div><h3 className="font-bold text-white">{client.name}</h3><span className="text-xs text-zinc-500">Client</span></div>
                            </div>
                            <div className="space-y-2 text-sm text-zinc-400">
                                <div className="flex gap-2"><Phone className="w-4 h-4" /> {client.phone}</div>
                                <div className="flex gap-2"><Mail className="w-4 h-4" /> {client.email}</div>
                            </div>
                        </BananaCard>
                    ))}
                </div>
            )}

            {activeTab === 'vendors' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {vendors.map(vendor => (
                        <BananaCard key={vendor.id}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center font-bold text-purple-500"><Building2 className="w-6 h-6" /></div>
                                <div><h3 className="font-bold text-white">{vendor.name}</h3><span className="text-xs text-zinc-500">{vendor.service}</span></div>
                            </div>
                            <div className="text-sm text-zinc-400"><span className="text-zinc-500">Balance:</span> <span className="text-white font-mono">{vendor.currentBalance}</span></div>
                        </BananaCard>
                    ))}
                </div>
            )}

            {activeTab === 'leaderboard' && <LeaderboardTab />}
            {activeTab === 'attendance' && <AttendanceTab />}

            <CreateUserModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
        </div>
    );
}
