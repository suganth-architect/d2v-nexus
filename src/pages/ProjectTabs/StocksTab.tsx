import { useEffect, useState } from "react";
import { doc, collection, onSnapshot, updateDoc, Timestamp, query, orderBy, where, runTransaction, getDoc, getDocs } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { grantXP } from "../../lib/gamification";
import type { InventoryItem } from "../../types";
import { Package, Search, Plus, CheckCircle, ShoppingCart, Minus, TrendingUp, Truck } from "lucide-react";
import { BananaButton } from "../../components/ui/BananaButton";
import { motion } from "framer-motion";
import { TransferStockModal } from "../../components/stocks/TransferStockModal";

interface StocksTabProps {
    projectId: string;
}

export function StocksTab({ projectId }: StocksTabProps) {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Transfer Modal State
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [projectTitle, setProjectTitle] = useState("");

    // Manual Add Stock State
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [addStockForm, setAddStockForm] = useState({ name: '', qty: 0, unit: 'Units', rate: 0 });

    // --- SNAPSHOTS ---
    useEffect(() => {
        const unsubscribeInventory = onSnapshot(collection(db, "projects", projectId, "inventory"), (snap) => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
            setLoading(false);
        });

        const qRequests = query(
            collection(db, "projects", projectId, "material_requests"),
            where("status", "in", ["requested", "pending", "ordered"]), // Show active stuff
            orderBy("createdAt", "desc")
        );
        const unsubscribeRequests = onSnapshot(qRequests, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubscribeInventory();
            unsubscribeRequests();
        };
    }, [projectId]);

    // Fetch Project Title for Transfer Modal
    useEffect(() => {
        const fetchTitle = async () => {
            const snap = await getDoc(doc(db, "projects", projectId));
            if (snap.exists()) setProjectTitle(snap.data().title);
        }
        fetchTitle();
    }, [projectId]);


    // --- ACTIONS ---

    const handleApprove = async (req: any) => {
        // Change status to 'ordered' (or 'approved' if we want a middle step, but user said "Approve [Order] Reject")
        // Let's assume Approve -> Ordered (sent to vendor)
        try {
            await updateDoc(doc(db, "projects", projectId, "material_requests", req.id), {
                status: 'ordered',
                approvedBy: auth.currentUser?.uid || 'system',
                approvedAt: Timestamp.now()
            });
            // STATS TRIGGER
            import("../../lib/statsWorker").then(({ recalcProjectStats }) => recalcProjectStats(projectId));
        } catch (err) {
            console.error("Failed to approve", err);
        }
    };

    const handleReject = async (reqId: string) => {
        if (!confirm("Reject this request?")) return;
        try {
            await updateDoc(doc(db, "projects", projectId, "material_requests", reqId), {
                status: 'rejected'
            });
            // STATS TRIGGER
            import("../../lib/statsWorker").then(({ recalcProjectStats }) => recalcProjectStats(projectId));
        } catch (err) {
            console.error("Failed to reject", err);
        }
    };



    const runAutoAllocator = async (itemName: string, totalNewQty: number) => {
        // This runs AFTER stock is physically added.
        try {
            // 1. Query Pending Requests
            const q = query(
                collection(db, "projects", projectId, "material_requests"),
                where("status", "in", ["requested", "ordered"]),
                where("name", "==", itemName),
                orderBy("createdAt", "asc")
            );
            const snap = await getDocs(q);

            if (snap.empty) return;

            let remainingQty = totalNewQty;

            await runTransaction(db, async (transaction) => {
                for (const d of snap.docs) {
                    if (remainingQty <= 0) break;

                    // Double check status in transaction? skip for efficiency for now, trust the snapshot (optimistic).
                    // Actually, let's read the doc to be safe.
                    const rDoc = await transaction.get(d.ref);
                    if (!rDoc.exists()) continue;
                    const rData = rDoc.data();

                    if (rData.status === 'delivered') continue;

                    // Logic: If we have enough for this specific request?
                    // Prompt: "If request.qty <= addedQty: Mark request delivered."
                    // Implementation: If we have enough remaining from the batch to cover this request.
                    if (rData.quantity <= remainingQty) {
                        // ALLOCATE
                        transaction.update(d.ref, {
                            status: 'delivered',
                            deliveredAt: Timestamp.now(),
                            autoAllocated: true
                        });

                        // Update Task
                        if (rData.taskId) {
                            const taskRef = doc(db, "projects", projectId, "tasks", rData.taskId);
                            transaction.update(taskRef, {
                                requiresMaterial: false,
                                status: rData.taskStatus === 'pending' ? 'ready' : rData.taskStatus // Only ready if pending? Or just ready.
                                // Logic: If task was blocked by material, now it's ready.
                                // Simplification: Just set ready if it exists.
                            });
                            // If we can't read taskStatus here easily, assume we just update requiresMaterial. 
                            // We'll blindly update 'status' to 'ready' if it was 'pending'. 
                            // We can't use conditional update without reading. 
                            // Let's just update requiresMaterial: false. 
                            // And maybe add a log.
                        }

                        // Log
                        const logRef = doc(collection(db, "projects", projectId, "site_logs"));
                        transaction.set(logRef, {
                            type: 'allocation',
                            description: `📦 System Auto-Allocated ${rData.quantity} ${rData.unit} of ${itemName} to ${rData.taskTitle || 'Task'}`,
                            createdAt: Timestamp.now(),
                            isPublic: true
                        });

                        remainingQty -= rData.quantity;
                    }
                }
            });

        } catch (err) {
            console.error("Auto-Allocator Failed", err);
        }
    };

    const handleReceive = async (req: any) => {
        try {
            await runTransaction(db, async (transaction) => {
                const existingItem = items.find(i => i.itemName.toLowerCase() === req.name.toLowerCase() && i.unit === req.unit);

                if (existingItem) {
                    const itemRef = doc(db, "projects", projectId, "inventory", existingItem.id);
                    transaction.update(itemRef, {
                        quantity: Number(existingItem.quantity) + Number(req.quantity),
                        lastUpdated: Timestamp.now()
                    });
                } else {
                    const newInvRef = doc(collection(db, "projects", projectId, "inventory"));
                    transaction.set(newInvRef, {
                        itemName: req.name,
                        quantity: Number(req.quantity),
                        unit: req.unit,
                        minLevel: 10,
                        lastUpdated: Timestamp.now()
                    });
                }

                const reqRef = doc(db, "projects", projectId, "material_requests", req.id);
                transaction.update(reqRef, {
                    status: 'received',
                    receivedAt: Timestamp.now()
                });
            });

            // Grant XP
            if (auth.currentUser?.uid) await grantXP(auth.currentUser.uid, 20, "Stock Received");

            // TRIGGER NEURAL LINK
            // We pass the quantity received to the allocator
            await runAutoAllocator(req.name, Number(req.quantity));

            // STATS TRIGGER
            import("../../lib/statsWorker").then(({ recalcProjectStats }) => recalcProjectStats(projectId));

        } catch (err) {
            console.error("Failed to receive stock", err);
            alert("Failed to process reception. Check console.");
        }
    };

    const handleManualAddStock = async () => {
        if (!addStockForm.name || addStockForm.qty <= 0) return;

        try {
            await runTransaction(db, async (transaction) => {
                const existingItem = items.find(i => i.itemName.toLowerCase() === addStockForm.name.toLowerCase() && i.unit === addStockForm.unit);

                if (existingItem) {
                    const itemRef = doc(db, "projects", projectId, "inventory", existingItem.id);

                    // Weighted Average Cost Calculation
                    const currentQty = Number(existingItem.quantity) || 0;
                    const currentRate = Number(existingItem.avgRate || existingItem.avgPrice) || 0;
                    const addedQty = Number(addStockForm.qty);
                    const addedRate = Number(addStockForm.rate);

                    const newQty = currentQty + addedQty;
                    let newRate = currentRate;

                    if (newQty > 0) {
                        newRate = ((currentQty * currentRate) + (addedQty * addedRate)) / newQty;
                    }

                    transaction.update(itemRef, {
                        quantity: newQty,
                        avgRate: newRate,
                        lastUpdated: Timestamp.now()
                    });
                } else {
                    const newInvRef = doc(collection(db, "projects", projectId, "inventory"));
                    transaction.set(newInvRef, {
                        itemName: addStockForm.name,
                        quantity: Number(addStockForm.qty),
                        unit: addStockForm.unit,
                        minLevel: 10,
                        avgRate: Number(addStockForm.rate),
                        lastUpdated: Timestamp.now()
                    });
                }

                // Log Manual Add
                const logRef = doc(collection(db, "projects", projectId, "site_logs"));
                transaction.set(logRef, {
                    type: 'stock_add',
                    description: `➕ Added ${addStockForm.qty} ${addStockForm.unit} of ${addStockForm.name} manually @ ₹${addStockForm.rate}/${addStockForm.unit}.`,
                    createdAt: Timestamp.now(),
                    userId: auth.currentUser?.uid,
                    isPublic: true
                });
            });

            // TRIGGER NEURAL LINK
            await runAutoAllocator(addStockForm.name, Number(addStockForm.qty));

            setShowAddStockModal(false);
            setAddStockForm({ name: '', qty: 0, unit: 'Units', rate: 0 });

        } catch (err) {
            console.error("Manual add failed", err);
            alert("Failed to add stock.");
        }
    };

    // Filter
    const filteredItems = items.filter(i => i.itemName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6 pb-6">

            {/* LEFT PANEL: THE WAREHOUSE (Inventory) */}
            <div className="flex-1 flex flex-col h-full bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/60">
                    <div>
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Package className="w-4 h-4 text-yellow-500" />
                            Live Inventory
                        </h2>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <BananaButton
                        onClick={() => setShowTransferModal(true)}
                        className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/30 text-xs h-8"
                    >
                        <Truck className="w-4 h-4 mr-1.5" /> Transfer
                    </BananaButton>
                    <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="SEARCH STOCKS..."
                            className="w-full bg-black/50 border border-white/10 rounded-full pl-9 pr-3 py-1.5 text-xs font-bold text-white uppercase focus:border-yellow-500/50 outline-none transition-colors"
                        />
                    </div>
                </div>
                {/* List - Glass Rows */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20 text-zinc-600 animate-pulse text-xs tracking-widest uppercase">Syncing Warehouse...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-20 text-zinc-600 text-xs tracking-widest uppercase border border-dashed border-zinc-800 rounded-xl">Warehouse Empty</div>
                    ) : (
                        filteredItems.map(item => {
                            const isLow = item.quantity < item.minLevel;
                            return (
                                <motion.div
                                    key={item.id}
                                    layout
                                    className={`
                                        group relative p-4 rounded-xl border transition-all duration-300
                                        ${isLow ? 'bg-red-500/5 border-red-500/20' : 'bg-black/20 border-white/5 hover:bg-white/5'}
                                    `}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border
                                                ${isLow ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:text-yellow-500'}
                                            `}>
                                                {item.itemName.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{item.itemName}</h3>
                                                <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                                                    MIN: {item.minLevel} {item.unit}
                                                    {isLow && <span className="text-red-500 font-bold animate-pulse flex items-center gap-1">● LOW STOCK</span>}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-white tracking-tight">{item.quantity}</div>
                                                <div className="text-[10px] text-zinc-500 uppercase">{item.unit}</div>
                                            </div>

                                            <div className="text-right border-l border-white/10 pl-4">
                                                <div className="text-sm font-bold text-green-400">₹{((item.quantity || 0) * (item.avgRate || item.avgPrice || 0)).toLocaleString()}</div>
                                                <div className="text-[10px] text-zinc-500 uppercase">Total Value</div>
                                            </div>

                                            {/* Actions */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setAddStockForm({ name: item.itemName, qty: 0, unit: item.unit, rate: item.avgRate || 0 });
                                                        setShowAddStockModal(true);
                                                    }}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-yellow-400 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decoration */}
                                    {isLow && <div className="absolute right-0 top-0 w-1 h-full bg-red-500/50 rounded-r-xl" />}
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>


            {/* RIGHT PANEL: THE PIPELINE (Incoming Requests) */}
            <div className="w-full lg:w-[450px] flex flex-col h-full bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/60">
                    <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Incoming Requests
                    </h2>
                    <span className="text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                        {requests.length} PENDING
                    </span>
                </div>

                {/* Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                            <CheckCircle className="w-8 h-8 opacity-20" />
                            <p className="text-xs uppercase tracking-widest">All Clear</p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-black/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{req.name}</h4>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">
                                            For: <span className="text-zinc-400">{req.taskTitle || 'Unknown Task'}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-yellow-500">{req.quantity} <span className="text-xs text-zinc-500">{req.unit}</span></div>
                                        <div className={`
                                            text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                                            ${req.status === 'requested' ? 'bg-blue-500/10 text-blue-500' :
                                                req.status === 'ordered' ? 'bg-purple-500/10 text-purple-500' : 'bg-zinc-800 text-zinc-500'}
                                        `}>
                                            {req.status}
                                        </div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                                    {req.status === 'ordered' ? (
                                        <BananaButton
                                            onClick={() => handleReceive(req)}
                                            className="w-full bg-green-500 hover:bg-green-400 text-black border-none text-xs h-8"
                                        >
                                            <TrendingUp className="w-3 h-3 mr-1.5" /> MARK RECEIVED
                                        </BananaButton>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleReject(req.id)}
                                                className="flex-1 py-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase transition-colors"
                                            >
                                                Reject
                                            </button>
                                            <BananaButton
                                                onClick={() => handleApprove(req)}
                                                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black border-none text-xs h-8"
                                            >
                                                ORDER STOCK
                                            </BananaButton>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
            <TransferStockModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                sourceProjectId={projectId}
                sourceProjectName={projectTitle}
            />

            {/* SIMPLE ADD STOCK MODAL */}
            {showAddStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-96 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Add Stock Manually</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-zinc-400 uppercase font-bold">Item Name</label>
                                <input
                                    value={addStockForm.name}
                                    onChange={e => setAddStockForm({ ...addStockForm, name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                                    placeholder="e.g. Cement"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div>
                                    <label className="text-xs text-zinc-400 uppercase font-bold">Qty</label>
                                    <input
                                        type="number"
                                        value={addStockForm.qty}
                                        onChange={e => setAddStockForm({ ...addStockForm, qty: Number(e.target.value) })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 uppercase font-bold">Unit</label>
                                    <input
                                        value={addStockForm.unit}
                                        onChange={e => setAddStockForm({ ...addStockForm, unit: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                                        placeholder="Unit"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 uppercase font-bold">Rate (₹)</label>
                                <input
                                    type="number"
                                    value={addStockForm.rate}
                                    onChange={e => setAddStockForm({ ...addStockForm, rate: Number(e.target.value) })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setShowAddStockModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white"
                                >
                                    CANCEL
                                </button>
                                <BananaButton
                                    onClick={handleManualAddStock}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black border-none"
                                >
                                    ADD STOCK
                                </BananaButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
