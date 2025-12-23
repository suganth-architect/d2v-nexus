import { useState, useEffect } from "react";
import { collection, getDocs, doc, runTransaction, Timestamp, query, where } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { BananaButton } from "../ui/BananaButton";

interface AddGlobalStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    prefillItemName?: string;
    prefillUnit?: string;
}

export function AddGlobalStockModal({ isOpen, onClose, prefillItemName = '', prefillUnit = '' }: AddGlobalStockModalProps) {
    const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);

    const [form, setForm] = useState({
        projectId: '',
        name: prefillItemName,
        qty: 0,
        unit: prefillUnit || 'Units',
        rate: 0
    });

    useEffect(() => {
        if (isOpen) {
            setForm(f => ({ ...f, name: prefillItemName, unit: prefillUnit }));
            fetchProjects();
        }
    }, [isOpen, prefillItemName, prefillUnit]);

    const fetchProjects = async () => {
        try {
            const q = query(collection(db, "projects"), where("status", "==", "active"));
            const snap = await getDocs(q);
            setProjects(snap.docs.map(d => ({ id: d.id, title: d.data().title })));
        } catch (err) {
            console.error("Failed to fetch projects", err);
        }
    };

    const handleAddStock = async () => {
        if (!form.projectId || !form.name || form.qty <= 0) return;

        try {
            await runTransaction(db, async (transaction) => {
                const projectRef = doc(db, "projects", form.projectId);
                // Check if project exists (sanity check)
                const pDoc = await transaction.get(projectRef);
                if (!pDoc.exists()) throw new Error("Project not found");


                // We can't use query in transaction easily for "find one", so we might need to rely on ID. 
                // But here we don't know the ID.
                // In StocksTab, we read ALL items then found it. 
                // For Global, strictly we should probably query.
                // Firestore transactions require reads before writes. 
                // But we can't do a query inside a transaction roughly? Actually we can but it's tricky.
                // Let's do a loose read first to find ID, then transaction.
                // Wait, race condition risk. 
                // Better approach: Read the collection using getDocs inside transaction? No, expensive.
                // Let's assume we can generate a deterministic ID? No.
                // Let's stick to: Read all inventory for that project? No, too big.
                // Let's do: getDocs with query outside transaction to find candidates, then read inside transaction.
            });

            // Re-implementing Transaction Logic properly:
            // 1. Find the Item ID (if exists)
            const q = query(
                collection(db, "projects", form.projectId, "inventory"),
                where("itemName", "==", form.name),
                where("unit", "==", form.unit)
            );
            const snap = await getDocs(q);
            let itemId = null;
            if (!snap.empty) {
                itemId = snap.docs[0].id;
            }

            await runTransaction(db, async (transaction) => {
                let currentQty = 0;
                let currentRate = 0;
                let itemRef;

                if (itemId) {
                    itemRef = doc(db, "projects", form.projectId, "inventory", itemId);
                    const itemDoc = await transaction.get(itemRef);
                    if (itemDoc.exists()) {
                        const data = itemDoc.data();
                        currentQty = Number(data.quantity) || 0;
                        currentRate = Number(data.avgRate || data.avgPrice) || 0;
                    }
                } else {
                    itemRef = doc(collection(db, "projects", form.projectId, "inventory"));
                }

                // CALC WAC
                const addedQty = Number(form.qty);
                const addedRate = Number(form.rate);
                const newQty = currentQty + addedQty;
                let newRate = currentRate;

                if (newQty > 0) {
                    newRate = ((currentQty * currentRate) + (addedQty * addedRate)) / newQty;
                }

                if (itemId) {
                    transaction.update(itemRef!, {
                        quantity: newQty,
                        avgRate: newRate,
                        lastUpdated: Timestamp.now()
                    });
                } else {
                    transaction.set(itemRef!, {
                        itemName: form.name,
                        quantity: newQty,
                        unit: form.unit,
                        minLevel: 10,
                        avgRate: newRate,
                        lastUpdated: Timestamp.now()
                    });
                }

                // Log Manual Add
                const logRef = doc(collection(db, "projects", form.projectId, "site_logs"));
                transaction.set(logRef, {
                    type: 'stock_add',
                    description: `➕ Global Command: Added ${form.qty} ${form.unit} of ${form.name} to ${projects.find(p => p.id === form.projectId)?.title} @ ₹${form.rate}`,
                    createdAt: Timestamp.now(),
                    userId: auth.currentUser?.uid,
                    isPublic: true
                });
            });

            onClose();
            setForm({ projectId: '', name: '', qty: 0, unit: 'Units', rate: 0 });

        } catch (err) {
            console.error("Global Add Failed", err);
            alert("Failed to add stock.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-96 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4">Add Stock (Global)</h3>

                <div className="space-y-4">
                    {/* Project Selector */}
                    <div>
                        <label className="text-xs text-zinc-400 uppercase font-bold">Target Project</label>
                        <select
                            value={form.projectId}
                            onChange={e => setForm({ ...form, projectId: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-yellow-500/50"
                        >
                            <option value="">Select Project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-400 uppercase font-bold">Item Name</label>
                        <input
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                            placeholder="e.g. Cement"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs text-zinc-400 uppercase font-bold">Qty</label>
                            <input
                                type="number"
                                value={form.qty}
                                onChange={e => setForm({ ...form, qty: Number(e.target.value) })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                            />
                        </div>
                        <div className="w-24">
                            <label className="text-xs text-zinc-400 uppercase font-bold">Unit</label>
                            <input
                                value={form.unit}
                                onChange={e => setForm({ ...form, unit: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                                placeholder="Unit"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-400 uppercase font-bold">Rate (₹)</label>
                        <input
                            type="number"
                            value={form.rate}
                            onChange={e => setForm({ ...form, rate: Number(e.target.value) })}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white"
                        >
                            CANCEL
                        </button>
                        <BananaButton
                            onClick={handleAddStock}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black border-none"
                            isLoading={false} // Add logic if needed
                        >
                            ADD STOCK
                        </BananaButton>
                    </div>
                </div>
            </div>
        </div>
    );
}
