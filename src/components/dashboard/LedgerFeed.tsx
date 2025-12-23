
import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaCard } from "../ui/BananaCard";
import { ArrowUpRight, ArrowDownLeft, Trash2, Lock, FileText } from "lucide-react";
import { useTitanAuth } from "../../hooks/useTitanAuth";

interface LedgerFeedProps {
    projectId?: string;
}

export function LedgerFeed({ projectId }: LedgerFeedProps) {
    const { profile } = useTitanAuth();
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (!projectId) return;

        const q = query(
            collection(db, `projects/${projectId}/expenses`),
            orderBy("date", "desc"),
            limit(20) // Limit to recent 20 for the feed
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [projectId]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, `projects/${projectId}/expenses`, id));
        } catch (error) {
            console.error("Error deleting expense:", error);
            alert("Failed to delete.");
        }
    };

    const isFounder = profile?.role === 'founder';
    const canDelete = isFounder; // ONLY Founder can delete

    return (
        <BananaCard className="p-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Recent Ledger Activity</h3>

            {transactions.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                    <p>No transactions recorded yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between text-sm group">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'in' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {tx.type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-white truncate max-w-[150px] md:max-w-xs flex items-center gap-2">
                                        {tx.title}
                                        {tx.hasAttachment && <FileText className="w-3 h-3 text-zinc-500" />}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                        {tx.date?.seconds ? new Date(tx.date.seconds * 1000).toLocaleDateString() : 'Just now'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className={`font-mono font-bold ${tx.type === 'in' ? 'text-green-500' : 'text-white'}`}>
                                    {tx.type === 'in' ? '+' : '-'}₹{tx.amount?.toLocaleString()}
                                </div>

                                {/* DELETE / LOCK LOGIC */}
                                <div className="w-5 flex justify-center"> {/* Fixed width container for alignment */}
                                    {canDelete ? (
                                        <button
                                            onClick={() => handleDelete(tx.id)}
                                            className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Record"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <span title="Locked by Admin"><Lock className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100" /></span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
                <button className="text-xs text-zinc-500 hover:text-white transition-colors">View All Transactions</button>
            </div>
        </BananaCard>
    );
}
