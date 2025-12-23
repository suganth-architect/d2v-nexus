import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, doc, addDoc, serverTimestamp, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaCard } from "../../components/ui/BananaCard";
import { BananaButton } from "../../components/ui/BananaButton";
import { Plus, ShieldCheck, Edit2, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPERS ---
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// --- MAIN FINANCE TAB ---
export function FinanceTab({ projectId }: { projectId: string }) {
    const { profile, loading } = useTitanAuth();
    const [project, setProject] = useState<any>(null);
    const [variations, setVariations] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    // MODAL STATES
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isVariationOpen, setIsVariationOpen] = useState(false);
    const [isTimelineEditOpen, setIsTimelineEditOpen] = useState(false);

    // FORM STATES - PAYMENT
    const [payAmount, setPayAmount] = useState("");
    const [payDate, setPayDate] = useState("");
    const [payNote, setPayNote] = useState("");
    const [payType, setPayType] = useState<"in" | "out">("in"); // 'in' = Client Payment, 'out' = Expense
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

    // FORM STATES - VARIATION
    const [varTitle, setVarTitle] = useState("");
    const [varAmount, setVarAmount] = useState("");
    const [varStatus, setVarStatus] = useState("pending");

    // FORM STATES - TIMELINE
    const [timelineStages, setTimelineStages] = useState<{ name: string, amount: number, date: string, status: string }[]>([]);

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // 1. Fetch Project
        const unsubProject = onSnapshot(doc(db, "projects", projectId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setProject({ id: doc.id, ...data });
                // Init timeline stages if exists, else default
                if (data.paymentTimeline) {
                    setTimelineStages(data.paymentTimeline);
                } else {
                    setTimelineStages([
                        { name: "Mobilization Advance", amount: 0, date: "", status: "pending" },
                        { name: "Plinth Level", amount: 0, date: "", status: "pending" }
                    ]);
                }
            }
        });
        // 2. Fetch Variations
        const unsubVariations = onSnapshot(collection(db, "projects", projectId, "variations"), (snap) => {
            setVariations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        // 3. Fetch Transactions (Reuse 'expenses' collection for both IN and OUT)
        const q = query(collection(db, "projects", projectId, "expenses"), orderBy("date", "desc"));
        const unsubTrans = onSnapshot(q, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubProject();
            unsubVariations();
            unsubTrans();
        };
    }, [projectId]);


    // CALCULATIONS
    // CALCULATIONS
    const totalContractValue = parseFloat(project?.totalContractValue || project?.budget || project?.projectValue || 0);

    const approvedVariations = variations.filter(v => v.status === 'approved');
    const approvedVariationsTotal = approvedVariations.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const finalBudget = totalContractValue + approvedVariationsTotal;

    const totalPaid = transactions
        .filter(t => t.type === 'in')
        .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);



    const balanceDue = finalBudget - totalPaid;


    // --- HANDLERS ---

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const amountVal = parseFloat(payAmount);

            if (editingTransaction) {
                // UPDATE EXISTING
                const oldAmount = parseFloat(editingTransaction.amount);
                const oldType = editingTransaction.type;

                await updateDoc(doc(db, `projects/${projectId}/expenses`, editingTransaction.id), {
                    title: payNote || (payType === 'in' ? "Payment Received" : "Expense Recorded"),
                    amount: amountVal,
                    type: payType, // 'in' or 'out'
                    date: payDate ? new Date(payDate) : editingTransaction.date, // Keep old date if not changed, needs logic check but for now manual override or keep
                    lastEditedBy: profile?.uid,
                    lastEditedAt: serverTimestamp()
                });

                // Re-calc project totals if payment IN changed
                // This is complex if type changed or amount changed. 
                // Simple atomic fix: Reverse old effect, apply new effect.

                if (oldType === 'in') {
                    await updateDoc(doc(db, "projects", projectId), {
                        totalPaid: increment(-oldAmount)
                    });
                }
                if (payType === 'in') {
                    await updateDoc(doc(db, "projects", projectId), {
                        totalPaid: increment(amountVal)
                    });
                }

                alert("Transaction Updated!");

            } else {
                // CREATE NEW
                await addDoc(collection(db, `projects/${projectId}/expenses`), {
                    title: payNote || (payType === 'in' ? "Payment Received" : "Expense Recorded"),
                    amount: amountVal,
                    type: payType, // 'in' or 'out'
                    date: payDate ? new Date(payDate) : serverTimestamp(), // Allow manual date override
                    recordedBy: profile?.uid,
                    createdAt: serverTimestamp()
                });

                // If it's a payment IN, update the project totalPaid for easier querying
                if (payType === 'in') {
                    await updateDoc(doc(db, "projects", projectId), {
                        totalPaid: increment(amountVal)
                    });
                }
                alert("Transaction Recorded!");
            }

            closePaymentModal();
        } catch (error) {
            console.error(error);
            alert("Failed to record transaction");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTransaction = async (tx: any) => {
        if (!window.confirm("Are you sure you want to delete this transaction? This action is irreversible.")) return;
        try {
            await deleteDoc(doc(db, `projects/${projectId}/expenses`, tx.id));

            // Reverse stats
            if (tx.type === 'in') {
                await updateDoc(doc(db, "projects", projectId), {
                    totalPaid: increment(-parseFloat(tx.amount))
                });
            }
            alert("Transaction Deleted");
        } catch (e) {
            console.error(e);
            alert("Failed to delete");
        }
    };

    const openEditTransaction = (tx: any) => {
        setEditingTransaction(tx);
        setPayAmount(tx.amount);
        setPayNote(tx.title);
        // setPayDate is tricky with Firestore timestamp vs string input. 
        // If it's a date object, ISO conversion needed.
        if (tx.date && tx.date.toDate) {
            setPayDate(tx.date.toDate().toISOString().split('T')[0]);
        }
        setPayType(tx.type);
        setIsPaymentOpen(true);
    };

    const closePaymentModal = () => {
        setIsPaymentOpen(false);
        setEditingTransaction(null);
        setPayAmount("");
        setPayNote("");
        setPayDate("");
        setPayType("in"); // Reset default?
    };

    const handleAddVariation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, `projects/${projectId}/variations`), {
                title: varTitle,
                amount: parseFloat(varAmount),
                status: varStatus,
                createdAt: serverTimestamp()
            });
            setIsVariationOpen(false);
            setVarTitle("");
            setVarAmount("");
            alert("Variation Added!");
        } catch (e) {
            console.error(e);
            alert("Failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateTimeline = async () => {
        setSubmitting(true);
        try {
            await updateDoc(doc(db, "projects", projectId), {
                paymentTimeline: timelineStages
            });
            setIsTimelineEditOpen(false);
            alert("Timeline Updated!");
        } catch (e) {
            console.error(e);
            alert("Failed");
        } finally {
            setSubmitting(false);
        }
    };

    // --- RENDER ---

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Finance Core...</div>;

    // --- PERMISSIONS ---
    const isFounder = profile?.role === 'founder';
    const isAccountant = profile?.role === 'accountant';
    const canWrite = isFounder || isAccountant;

    // Remove blocking check to allow Read-Only
    // if (!canWrite) { ... }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 w-fit">
                    <ShieldCheck className="w-3 h-3" /> Secure Finance Vault <span className="ml-2 text-[9px] text-zinc-500 font-mono">v3.0 LIVE</span>
                </div>
                <div className="flex gap-2">
                    {canWrite && (
                        <>
                            <BananaButton onClick={() => { setPayType('in'); setIsPaymentOpen(true); }} className="bg-green-500 text-black hover:bg-green-400">
                                <ArrowDownLeft className="w-4 h-4 mr-2" /> Record Payment
                            </BananaButton>
                            <BananaButton onClick={() => { setPayType('out'); setIsPaymentOpen(true); }} variant="secondary">
                                <ArrowUpRight className="w-4 h-4 mr-2" /> Record Expense
                            </BananaButton>
                        </>
                    )}
                </div>
            </div>

            {/* 2. SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BananaCard className="p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 bg-blue-500/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2">Total Contract Value</h3>
                    <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(finalBudget)}</div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                        Base: {formatCurrency(totalContractValue)}
                        {approvedVariationsTotal > 0 && <span className="text-green-500">(+{formatCurrency(approvedVariationsTotal)})</span>}
                    </div>
                </BananaCard>

                <BananaCard className="p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 bg-green-500/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2">Total Paid to Date</h3>
                    <div className="text-3xl font-bold text-green-400 tracking-tight">{formatCurrency(totalPaid)}</div>
                    <div className="w-full bg-zinc-800 h-1 mt-3 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, (totalPaid / finalBudget) * 100)}%` }}></div>
                    </div>
                </BananaCard>

                <BananaCard className="p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 bg-red-500/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
                    <h3 className="text-zinc-400 text-xs font-bold uppercase mb-2">Balance Due</h3>
                    <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(balanceDue)}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                        {(totalPaid / finalBudget * 100).toFixed(1)}% Collected
                    </div>
                </BananaCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 3. PAYMENT TIMELINE */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Payment Timeline</h3>
                        {canWrite && (
                            <button onClick={() => setIsTimelineEditOpen(true)} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
                                <Edit2 className="w-3 h-3" /> Edit Timeline
                            </button>
                        )}
                    </div>
                    <BananaCard className="p-0 overflow-hidden">
                        <div className="p-4 bg-zinc-900 border-b border-zinc-800 grid grid-cols-12 text-xs font-bold text-zinc-500 uppercase">
                            <div className="col-span-6">Stage</div>
                            <div className="col-span-3 text-right">Amount</div>
                            <div className="col-span-3 text-right">Status</div>
                        </div>
                        <div className="divide-y divide-zinc-800">
                            {timelineStages.length === 0 && <div className="p-6 text-center text-zinc-500 text-sm">No stages defined.</div>}
                            {timelineStages.map((stage, idx) => {
                                // Simple logic to determine status based on totalPaid (Waterfill)
                                // This is purely visual estimation based on ordered stages
                                let accumulatedPrev = timelineStages.slice(0, idx).reduce((acc, s) => acc + s.amount, 0);
                                let isFullyPaid = totalPaid >= (accumulatedPrev + stage.amount);
                                let isPartiallyPaid = !isFullyPaid && totalPaid > accumulatedPrev;

                                return (
                                    <div key={idx} className="p-4 grid grid-cols-12 items-center text-sm">
                                        <div className="col-span-6 font-medium text-white">
                                            {stage.name}
                                            <div className="text-[10px] text-zinc-500">{stage.date || "No Date"}</div>
                                        </div>
                                        <div className="col-span-3 text-right font-mono text-zinc-300">
                                            {formatCurrency(stage.amount)}
                                        </div>
                                        <div className="col-span-3 flex justify-end">
                                            {isFullyPaid ? (
                                                <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20">PAID</span>
                                            ) : isPartiallyPaid ? (
                                                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded border border-yellow-500/20">PARTIAL</span>
                                            ) : (
                                                <span className="text-[10px] text-zinc-600 px-2 py-1">PENDING</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </BananaCard>
                </div>

                {/* 4. VARIATIONS */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Variations & Extras</h3>
                        {canWrite && (
                            <BananaButton onClick={() => setIsVariationOpen(true)} variant="secondary" className="h-8 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> New Variation
                            </BananaButton>
                        )}
                    </div>
                    <div className="space-y-3">
                        {variations.length === 0 && (
                            <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-600 text-sm">
                                No variations recorded.
                            </div>
                        )}
                        {variations.map(v => (
                            <BananaCard key={v.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="text-white text-sm font-bold">{v.title}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase mt-1 inline-block border ${v.status === 'approved' ? 'border-green-500/30 text-green-500 bg-green-500/10' :
                                        v.status === 'rejected' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                                            'border-orange-500/30 text-orange-500 bg-orange-500/10'
                                        }`}>
                                        {v.status}
                                    </span>
                                </div>
                                <div className="text-right font-mono text-white">
                                    {formatCurrency(v.amount)}
                                </div>
                            </BananaCard>
                        ))}
                    </div>
                </div>

            </div>

            {/* 5. RECENT TRANSACTIONS (Payments & Expenses) */}
            <div className="pt-8 border-t border-zinc-800">
                <h3 className="text-lg font-bold text-white mb-6">Recent Transactions</h3>
                <div className="space-y-2">
                    {transactions.map(t => (
                        <div key={t.id} className="group flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-lg hover:bg-zinc-900 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'in' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {t.type === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">{t.title}</h4>
                                    <p className="text-xs text-zinc-500">
                                        {t.date?.toDate ? t.date.toDate().toLocaleDateString() : 'Just now'} • {t.type === 'in' ? 'Payment Received' : 'Expense Out'}
                                    </p>
                                </div>
                            </div>
                            <div className={`font-mono font-bold ${t.type === 'in' ? 'text-green-500' : 'text-white'}`}>
                                {t.type === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                            </div>

                            {/* ACTION BUTTONS */}
                            {canWrite && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                    <button onClick={() => openEditTransaction(t)} className="p-2 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeleteTransaction(t)} className="p-2 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {transactions.length === 0 && <div className="text-zinc-500 text-sm text-center py-8">No transactions found.</div>}
                </div>
            </div>


            {/* --- MODALS --- */}

            {/* PAYMENT MODAL */}
            <AnimatePresence>
                {isPaymentOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6">
                            <h2 className="text-xl font-bold text-white mb-6">
                                {editingTransaction ? 'Edit Transaction' : (payType === 'in' ? 'Record Payment' : 'Record Expense')}
                            </h2>
                            <form onSubmit={handleRecordPayment} className="space-y-4">
                                <div>
                                    <label className="text-zinc-500 text-xs font-bold uppercase">Amount</label>
                                    <input type="number" required value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white text-lg font-mono" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs font-bold uppercase">Date</label>
                                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white" />
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs font-bold uppercase">Reference / Note</label>
                                    <input type="text" required value={payNote} onChange={e => setPayNote(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white" placeholder="Description..." />
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="button" onClick={closePaymentModal} className="flex-1 py-3 text-zinc-400 hover:text-white">Cancel</button>
                                    <BananaButton disabled={submitting} type="submit" className="flex-1">{submitting ? 'Saving...' : 'Confirm'}</BananaButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* VARIATION MODAL */}
            <AnimatePresence>
                {isVariationOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6">
                            <h2 className="text-xl font-bold text-white mb-6">New Variation</h2>
                            <form onSubmit={handleAddVariation} className="space-y-4">
                                <div>
                                    <label className="text-zinc-500 text-xs font-bold uppercase">Variation Title</label>
                                    <input type="text" required value={varTitle} onChange={e => setVarTitle(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white" placeholder="e.g. Extra Power Sockets" />
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs font-bold uppercase">Value (INR)</label>
                                    <input type="number" required value={varAmount} onChange={e => setVarAmount(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white font-mono" placeholder="0" />
                                </div>
                                <div>
                                    <label className="text-zinc-500 text-xs font-bold uppercase">Status</label>
                                    <select value={varStatus} onChange={e => setVarStatus(e.target.value)} className="w-full bg-black border border-zinc-700 rounded p-3 text-white">
                                        <option value="pending">Pending Approval</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="button" onClick={() => setIsVariationOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white">Cancel</button>
                                    <BananaButton disabled={submitting} type="submit" className="flex-1">Add Variation</BananaButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TIMELINE EDIT MODAL */}
            <AnimatePresence>
                {isTimelineEditOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl p-6 h-[80vh] overflow-hidden flex flex-col">
                            <h2 className="text-xl font-bold text-white mb-4">Edit Payment Schedule</h2>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {timelineStages.map((stage, idx) => (
                                    <div key={idx} className="flex gap-2 items-end bg-black/40 p-3 rounded-lg border border-zinc-800">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-zinc-500 uppercase">Stage Name</label>
                                            <input type="text" value={stage.name} onChange={(e) => {
                                                const newStages = [...timelineStages];
                                                newStages[idx].name = e.target.value;
                                                setTimelineStages(newStages);
                                            }} className="w-full bg-transparent border-b border-zinc-700 text-white text-sm focus:border-yellow-500 outline-none py-1" />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-[10px] text-zinc-500 uppercase">Amount</label>
                                            <input type="number" value={stage.amount} onChange={(e) => {
                                                const newStages = [...timelineStages];
                                                newStages[idx].amount = parseFloat(e.target.value) || 0;
                                                setTimelineStages(newStages);
                                            }} className="w-full bg-transparent border-b border-zinc-700 text-white text-sm focus:border-yellow-500 outline-none py-1 font-mono" />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-[10px] text-zinc-500 uppercase">Due Date</label>
                                            <input type="text" placeholder="e.g Nov 10" value={stage.date} onChange={(e) => {
                                                const newStages = [...timelineStages];
                                                newStages[idx].date = e.target.value;
                                                setTimelineStages(newStages);
                                            }} className="w-full bg-transparent border-b border-zinc-700 text-white text-sm focus:border-yellow-500 outline-none py-1" />
                                        </div>
                                        <button onClick={() => {
                                            const newStages = timelineStages.filter((_, i) => i !== idx);
                                            setTimelineStages(newStages);
                                        }} className="p-2 text-zinc-500 hover:text-red-500 opacity-50 hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <ButtonDashed onClick={() => setTimelineStages([...timelineStages, { name: "New Stage", amount: 0, date: "", status: "pending" }])} />
                            </div>

                            <div className="flex gap-2 pt-6 border-t border-zinc-800 mt-4">
                                <div className="text-xs text-zinc-500 flex-1 flex items-center">
                                    Total: {formatCurrency(timelineStages.reduce((a, b) => a + b.amount, 0))}
                                </div>
                                <button type="button" onClick={() => setIsTimelineEditOpen(false)} className="px-6 py-3 text-zinc-400 hover:text-white">Cancel</button>
                                <BananaButton disabled={submitting} onClick={handleUpdateTimeline}>Save Changes</BananaButton>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ButtonDashed({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:text-white hover:border-zinc-500 hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 text-xs uppercase font-bold tracking-wider">
            <Plus className="w-4 h-4" /> Add Payment Stage
        </button>
    );
}
