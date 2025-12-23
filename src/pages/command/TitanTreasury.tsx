import { useState, useEffect } from "react";
import { collectionGroup, query, orderBy, getDocs, collection, addDoc, serverTimestamp, updateDoc, increment, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { format } from "date-fns";
import { ShieldCheck, TrendingUp, TrendingDown, ArrowRightLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { BananaCard } from "../../components/ui/BananaCard";
import { BananaButton } from "../../components/ui/BananaButton";
import type { Transaction } from "../../types";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { motion, AnimatePresence } from 'framer-motion';

export default function TitanTreasury() {
    const { profile } = useTitanAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [projects, setProjects] = useState<{ id: string, title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalIn: 0,
        totalOut: 0,
        netFlow: 0
    });

    // MODAL STATE
    const [isTransOpen, setIsTransOpen] = useState(false);
    const [transType, setTransType] = useState<'in' | 'out'>('in');
    const [selectedProject, setSelectedProject] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Provisional"); // Default
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                // Fetch Projects for Dropdown
                const projSnap = await getDocs(collection(db, 'projects'));
                setProjects(projSnap.docs.map(d => ({ id: d.id, title: d.data().title || "Untitled Project" })));

                const q = query(collectionGroup(db, 'expenses'), orderBy('createdAt', 'desc'));
                // Listen real-time
                const unsub = onSnapshot(q, (snapshot) => {
                    let inTotal = 0;
                    let outTotal = 0;

                    const ledgerData = snapshot.docs.map(doc => {
                        const data = doc.data();
                        const amt = Number(data.amount) || 0;
                        const type = data.type || 'out';

                        if (type === 'in') inTotal += amt;
                        else outTotal += amt;

                        return {
                            id: doc.id,
                            projectId: doc.ref.parent.parent?.id || 'Unknown',
                            projectName: data.projectName || 'Project',
                            type: type as 'in' | 'out',
                            amount: amt,
                            category: data.category || 'General',
                            date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                            recordedBy: data.recordedBy || 'System',
                        } as Transaction;
                    });

                    setTransactions(ledgerData);
                    setStats({
                        totalIn: inTotal,
                        totalOut: outTotal,
                        netFlow: inTotal - outTotal
                    });
                    setLoading(false);
                });

                return () => unsub();

            } catch (error) {
                console.error("Failed to fetch ledger:", error);
                setLoading(false);
            }
        };

        fetchLedger();
    }, []);

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return alert("Please select a project!");

        setSubmitting(true);
        try {
            const projectTitle = projects.find(p => p.id === selectedProject)?.title || "Unknown Project";

            await addDoc(collection(db, `projects/${selectedProject}/expenses`), {
                title: description || (transType === 'in' ? "Income Recorded" : "Expense Recorded"),
                amount: parseFloat(amount),
                type: transType,
                category: category,
                date: serverTimestamp(),
                recordedBy: profile?.uid,
                createdAt: serverTimestamp(),
                projectName: projectTitle // Denormalized for Global View speed
            });

            // If it's a payment IN, update the project totalPaid
            if (transType === 'in') {
                await updateDoc(doc(db, "projects", selectedProject), {
                    totalPaid: increment(parseFloat(amount))
                });
            }

            alert("Transaction Recorded to " + projectTitle);
            setIsTransOpen(false);
            setAmount("");
            setDescription("");
            setSelectedProject("");
        } catch (error) {
            console.error(error);
            alert("Failed to save");
        } finally {
            setSubmitting(false);
        }
    };

    const formatINR = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8 p-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                        <ShieldCheck className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                            TITAN TREASURY
                        </h1>
                        <p className="text-zinc-400">Global Financial Command Center</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <BananaButton onClick={() => { setTransType('in'); setIsTransOpen(true); }} className="bg-green-500 text-black hover:bg-green-400">
                        <ArrowDownLeft className="w-4 h-4 mr-2" /> Record Income
                    </BananaButton>
                    <BananaButton onClick={() => { setTransType('out'); setIsTransOpen(true); }} variant="secondary">
                        <ArrowUpRight className="w-4 h-4 mr-2" /> Record Expense
                    </BananaButton>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BananaCard className="bg-zinc-900/50 border-white/5 p-6 flex items-center justify-between group hover:border-green-500/30 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Total In</p>
                        <p className="text-2xl font-bold text-green-400">{formatINR(stats.totalIn)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                </BananaCard>

                <BananaCard className="bg-zinc-900/50 border-white/5 p-6 flex items-center justify-between group hover:border-red-500/30 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Out</p>
                        <p className="text-2xl font-bold text-red-400">{formatINR(stats.totalOut)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
                        <TrendingDown className="w-5 h-5 text-red-500" />
                    </div>
                </BananaCard>

                <BananaCard className="bg-zinc-900/50 border-white/5 p-6 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Net Flow</p>
                        <p className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-white' : 'text-red-400'}`}>{formatINR(stats.netFlow)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:bg-yellow-500/20 transition-colors">
                        <ArrowRightLeft className="w-5 h-5 text-yellow-500" />
                    </div>
                </BananaCard>
            </div>

            {/* Master Financial Table */}
            <div className="bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-yellow-500" />
                        Master Ledger
                    </h3>
                    <div className="text-xs text-zinc-500 font-mono">{transactions.length} RECORDS</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-black/20 font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-right">Type</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-zinc-500 animate-pulse">Accessing Titan Treasury...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-zinc-500">No transactions found in the global ledger.</td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 text-zinc-400 font-mono">{format(tx.date, 'dd MMM yyyy')}</td>
                                        <td className="px-6 py-4 font-medium text-white group-hover:text-yellow-500 transition-colors">{tx.projectName || tx.projectId?.substring(0, 8)}</td>
                                        <td className="px-6 py-4 text-zinc-400"><span className="bg-zinc-800 px-2 py-1 rounded text-xs border border-zinc-700">{tx.category}</span></td>
                                        <td className={`px-6 py-4 text-right font-bold ${tx.type === 'in' ? 'text-green-400' : 'text-zinc-300'}`}>{formatINR(tx.amount)}</td>
                                        <td className="px-6 py-4 text-right"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${tx.type === 'in' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{tx.type === 'in' ? 'CREDIT' : 'DEBIT'}</span></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* GLOBAL TRANSACTION MODAL */}
            <AnimatePresence>
                {isTransOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                {transType === 'in' ? <ArrowDownLeft className="text-green-500" /> : <ArrowUpRight className="text-red-500" />}
                                {transType === 'in' ? 'Record Global Income' : 'Record Global Expense'}
                            </h2>
                            <form onSubmit={handleSaveTransaction} className="space-y-4">
                                <div>
                                    <label className="text-sm text-zinc-400">Select Project (Required)</label>
                                    <select required value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-yellow-500 outline-none">
                                        <option value="">-- Choose Project --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400">Amount</label>
                                    <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-mono focus:border-yellow-500 outline-none" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400">Description / Title</label>
                                    <input type="text" required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-yellow-500 outline-none" placeholder="e.g. Client Advance" />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400">Category</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-yellow-500 outline-none">
                                        <option value="Provisional">Provisional</option>
                                        <option value="Labor">Labor</option>
                                        <option value="Material">Material</option>
                                        <option value="Advance">Client Advance</option>
                                        <option value="Operations">Operations</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-4 border-t border-zinc-800 mt-4">
                                    <button type="button" onClick={() => setIsTransOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white">Cancel</button>
                                    <BananaButton disabled={submitting} type="submit" className="flex-1">{submitting ? 'Recording...' : 'Confirm Transaction'}</BananaButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
