import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { CreateUserModal } from "../../components/users/CreateUserModal";
import { BananaButton } from "../../components/ui/BananaButton";
import { UserPlus, Trash2, Mail, Phone } from "lucide-react";
import type { User } from "../../types";

export function UserDirectory() {
    const [users, setUsers] = useState<User[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const userList = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
            setUsers(userList);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (uid: string) => {
        if (!confirm("Revoke access for this user?")) return;
        try { await deleteDoc(doc(db, "users", uid)); } catch (e) { console.error(e); }
    };

    const RoleBadge = ({ role }: { role: string }) => {
        switch (role) {
            case 'founder': return <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[10px] uppercase font-bold">Founder</span>;
            case 'site_super': return <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-[10px] uppercase font-bold">Site Super</span>;
            case 'architect': return <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] uppercase font-bold">Architect</span>;
            case 'client': return <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-[10px] uppercase font-bold">Client</span>;
            default: return <span className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-[10px] uppercase font-bold">{role}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Team Directory</h1>
                    <p className="text-zinc-500 text-sm">Manage invites & roles</p>
                </div>
                <BananaButton onClick={() => setIsCreateOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" /> Add Member
                </BananaButton>
            </div>

            {loading ? (
                <div className="p-10 text-center text-zinc-500 animate-pulse">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user) => (
                        <div key={user.uid} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-yellow-500/30 transition-all group relative">
                            <button onClick={() => user.uid && handleDelete(user.uid)} className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500 border border-zinc-700">
                                    {user.photoURL ? <img src={user.photoURL} className="w-full h-full rounded-full object-cover" /> : (user.displayName?.charAt(0) || "U")}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">{user.displayName}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <RoleBadge role={user.role} />
                                        {user.status === 'invited' && <span className="text-[10px] text-yellow-500 animate-pulse">● Invite Sent</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-zinc-400"><Mail className="w-3 h-3" /> {user.email}</div>
                                {user.phone && <div className="flex items-center gap-2 text-xs text-zinc-400"><Phone className="w-3 h-3" /> {user.phone}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <CreateUserModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
        </div>
    );
}
