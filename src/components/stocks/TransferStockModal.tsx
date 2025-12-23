import { useState, useEffect } from "react";
import { Dialog, DialogBackdrop, DialogTitle } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Truck, ArrowRight, AlertTriangle } from "lucide-react";
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, DocumentReference } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { BananaButton } from "../ui/BananaButton";
import type { InventoryItem } from "../../types";

interface TransferStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceProjectId: string;
    sourceProjectName?: string;
    prefillItemId?: string;
}

interface ProjectOption {
    id: string;
    title: string;
}

export function TransferStockModal({ isOpen, onClose, sourceProjectId, sourceProjectName, prefillItemId }: TransferStockModalProps) {
    // Data State
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Form State
    const [selectedItemId, setSelectedItemId] = useState("");
    const [targetProjectId, setTargetProjectId] = useState("");
    const [quantity, setQuantity] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Data on Open
    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset form
            setSelectedItemId(prefillItemId || "");
            setTargetProjectId("");
            setQuantity(0);
        }
    }, [isOpen, sourceProjectId, prefillItemId]);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            // 1. Fetch Source Inventory
            const invQuery = query(collection(db, "projects", sourceProjectId, "inventory"));
            const invSnap = await getDocs(invQuery);
            const items = invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
            setInventory(items);

            // 2. Fetch Potential Destination Projects (excluding current)
            // Assuming we want active projects only, or all projects user has access to.
            // For simplicity, fetching all projects and filtering client side for now, 
            // or we could use a compound query if we had strict index.
            // Note: "!=" might require index. If it fails, fallback to fetch all.
            // Let's safe bet: fetch all. "status" might not exist on all docs.
            const projSnap = await getDocs(collection(db, "projects"));

            const activeProjects: ProjectOption[] = [];
            projSnap.forEach(doc => {
                const data = doc.data();
                if (doc.id !== sourceProjectId && data.status !== 'archived') {
                    activeProjects.push({ id: doc.id, title: data.title || "Untitled Project" });
                }
            });
            setProjects(activeProjects);

        } catch (error) {
            console.error("Failed to load transfer data", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleTransfer = async () => {
        if (!selectedItemId || !targetProjectId || quantity <= 0) return;

        const sourceItem = inventory.find(i => i.id === selectedItemId);
        const targetProject = projects.find(p => p.id === targetProjectId);

        if (!sourceItem || !targetProject) return;
        if (quantity > sourceItem.quantity) {
            alert("Insufficient stock!");
            return;
        }

        setIsSubmitting(true);

        try {


            // RETRYING TRANSACTION LOGIC TO BE CORRECT:
            // Querying inside transaction is not strictly 'transactional' in all SDKs, but we can read the doc if we have the Ref.
            // Strategy: 
            // 1. Query destination OUTSIDE for a matching item ID. 
            // 2. Start Transaction.
            // 3. Get Source.
            // 4. Get Destination (if ID found in step 1) OR just Prepare to Create.
            // 5. Write.

            // This leaves a tiny race if someone creates that item in Dest between Step 1 and 2. 
            // It results in duplicate item entry (two "Cement" rows). This is acceptable for this level of app.

            const destQuery = query(
                collection(db, "projects", targetProjectId, "inventory"),
                where("itemName", "==", sourceItem.itemName),
                where("unit", "==", sourceItem.unit)
            );
            const destSnap = await getDocs(destQuery);
            let destItemRef: DocumentReference | null = null;
            let destItemExists = false;

            if (!destSnap.empty) {
                destItemRef = destSnap.docs[0].ref;
                destItemExists = true;
            } else {
                destItemRef = doc(collection(db, "projects", targetProjectId, "inventory"));
                destItemExists = false;
            }

            // NOW TRANSACTION
            await runTransaction(db, async (transaction) => {
                const sDoc = await transaction.get(doc(db, "projects", sourceProjectId, "inventory", selectedItemId));
                if (!sDoc.exists()) throw "Source missing";

                const sData = sDoc.data() as InventoryItem;
                if (sData.quantity < quantity) throw "Insufficient Qty";

                // WRITE SOURCE
                transaction.update(doc(db, "projects", sourceProjectId, "inventory", selectedItemId), {
                    quantity: Number(sData.quantity) - Number(quantity),
                    lastUpdated: serverTimestamp()
                });

                // WRITE DEST
                if (destItemExists && destItemRef) {
                    const dDoc = await transaction.get(destItemRef);
                    if (dDoc.exists()) {
                        const dData = dDoc.data() as InventoryItem;
                        transaction.update(destItemRef, {
                            quantity: Number(dData.quantity) + Number(quantity),
                            lastUpdated: serverTimestamp()
                        });
                    } else {
                        // Edge case: Deleted between check and now. Fallback to set?
                        // Just set new
                        transaction.set(destItemRef, {
                            itemName: sourceItem.itemName,
                            unit: sourceItem.unit,
                            quantity: Number(quantity),
                            minLevel: sourceItem.minLevel || 0,
                            lastUpdated: serverTimestamp()
                        });
                    }
                } else {
                    if (!destItemRef) destItemRef = doc(collection(db, "projects", targetProjectId, "inventory")); // Should be set outside but just in case
                    transaction.set(destItemRef, {
                        itemName: sourceItem.itemName,
                        unit: sourceItem.unit,
                        quantity: Number(quantity),
                        minLevel: sourceItem.minLevel || 0,
                        lastUpdated: serverTimestamp()
                    });
                }

                // LOGS
                const logRefSource = collection(db, "projects", sourceProjectId, "site_logs");
                const logRefDest = collection(db, "projects", targetProjectId, "site_logs");

                transaction.set(doc(logRefSource), {
                    type: 'transfer_out',
                    description: `🚚 Transferred ${quantity} ${sourceItem.unit} of ${sourceItem.itemName} to ${targetProject.title}`,
                    createdAt: serverTimestamp(),
                    userId: auth.currentUser?.uid,
                    isPublic: true
                });

                transaction.set(doc(logRefDest), {
                    type: 'transfer_in',
                    description: `🚚 Received ${quantity} ${sourceItem.unit} of ${sourceItem.itemName} from ${sourceProjectName || 'Another Project'}`,
                    createdAt: serverTimestamp(),
                    userId: auth.currentUser?.uid,
                    isPublic: true
                });
            });

            // Success
            alert("Transfer Successful!");
            onClose();

        } catch (error) {
            console.error("Transfer failed", error);
            alert("Transfer failed. See console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedItem = inventory.find(i => i.id === selectedItemId);

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog static as={motion.div} open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <DialogBackdrop as={motion.div}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                        >
                            {/* HEADER */}
                            <div className="bg-zinc-950 p-6 border-b border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-lg font-bold text-white">Transfer Stock</DialogTitle>
                                        <p className="text-xs text-zinc-500">Move inventory between active projects</p>
                                    </div>

                                </div>
                                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* BODY */}
                            <div className="p-6 space-y-6">
                                {loadingData ? (
                                    <div className="text-center py-10 text-zinc-500 animate-pulse">Loading Warehouse Data...</div>
                                ) : (
                                    <>
                                        {/* SOURCE ITEM */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Item to Transfer</label>
                                            <select
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                                value={selectedItemId}
                                                onChange={(e) => setSelectedItemId(e.target.value)}
                                            >
                                                <option value="">Select Item...</option>
                                                {inventory.map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.itemName} ({item.quantity} {item.unit} available)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* DESTINATION */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Destination Project</label>
                                            <select
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                                value={targetProjectId}
                                                onChange={(e) => setTargetProjectId(e.target.value)}
                                            >
                                                <option value="">Select Destination...</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.title}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* QUANTITY */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Quantity</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={selectedItem?.quantity || 99999}
                                                    value={quantity}
                                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                                    placeholder="0"
                                                />
                                                <div className="px-4 py-3 bg-zinc-800 rounded-xl text-zinc-400 text-sm font-bold min-w-[60px] text-center">
                                                    {selectedItem?.unit || 'UNIT'}
                                                </div>
                                            </div>
                                            {quantity > (selectedItem?.quantity || 0) && (
                                                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Insufficient Stock
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* FOOTER */}
                            <div className="p-6 bg-zinc-950/50 border-t border-white/5 flex justify-end gap-3">
                                <BananaButton variant="ghost" onClick={onClose}>
                                    Cancel
                                </BananaButton>
                                <BananaButton
                                    onClick={handleTransfer}
                                    disabled={!selectedItemId || !targetProjectId || quantity <= 0 || quantity > (selectedItem?.quantity || 0) || isSubmitting}
                                    isLoading={isSubmitting}
                                    className="bg-blue-500 hover:bg-blue-400 text-white border-none"
                                >
                                    Confirm Transfer <ArrowRight className="w-4 h-4 ml-2" />
                                </BananaButton>
                            </div>

                        </motion.div>
                    </div>
                </Dialog>
            )}
        </AnimatePresence>
    );
}
