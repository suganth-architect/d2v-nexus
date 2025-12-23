import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Trash2, Plus } from "lucide-react";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BananaButton } from "../ui/BananaButton";

interface TaskMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
    projectId: string;
    taskTitle: string;
}

export function TaskMaterialModal({ isOpen, onClose, taskId, projectId, taskTitle }: TaskMaterialModalProps) {
    const [newItem, setNewItem] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("pcs");
    const [spec, setSpec] = useState("");
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !taskId) return;
        // Query global project requests for this specific task
        const q = query(
            collection(db, "projects", projectId, "material_requests"),
            where("taskId", "==", taskId),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [isOpen, taskId, projectId]);

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;

        setLoading(true);
        try {
            await addDoc(collection(db, "projects", projectId, "material_requests"), {
                // Core Data
                projectId,
                taskId,
                taskTitle,

                // Item Data
                name: newItem,
                quantity,
                unit,
                spec,

                // Meta
                status: "requested",
                requestedBy: "site_super", // Placeholder, ideally from auth context
                createdAt: serverTimestamp()
            });

            // STATS TRIGGER
            import("../../lib/statsWorker").then(({ incrementStat }) => {
                incrementStat(projectId, 'stats.pendingStock', 1);
            });

            setNewItem("");
            setQuantity("");
            setSpec("");
        } catch (error) {
            console.error("Failed to add material", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (materialId: string) => {
        if (!confirm("Remove this item?")) return;
        try {
            await deleteDoc(doc(db, "projects", projectId, "material_requests", materialId));
            // STATS TRIGGER
            import("../../lib/statsWorker").then(({ recalcProjectStats }) => recalcProjectStats(projectId));
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Package className="w-5 h-5 text-orange-500" />
                                    Material Nexus
                                </h2>
                                <p className="text-xs text-zinc-500 mt-1">Requesting items for: <span className="text-white">{taskTitle}</span></p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Input Panel */}
                            <div className="w-full md:w-1/3 bg-zinc-900/50 p-6 border-r border-zinc-800 flex flex-col gap-4">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Add New Item</h3>
                                <form onSubmit={handleAddMaterial} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Item Name</label>
                                        <input
                                            value={newItem}
                                            onChange={e => setNewItem(e.target.value)}
                                            placeholder="e.g. Cement Bags"
                                            className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Qty</label>
                                            <input
                                                value={quantity}
                                                onChange={e => setQuantity(e.target.value)}
                                                placeholder="0"
                                                className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white outline-none"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Unit</label>
                                            <select
                                                value={unit}
                                                onChange={e => setUnit(e.target.value)}
                                                className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white outline-none"
                                            >
                                                <option value="pcs">pcs</option>
                                                <option value="kg">kg</option>
                                                <option value="m">m</option>
                                                <option value="sqm">sqm</option>
                                                <option value="lit">lit</option>
                                                <option value="bags">bags</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Specification (Optional)</label>
                                        <textarea
                                            value={spec}
                                            onChange={e => setSpec(e.target.value)}
                                            placeholder="Brand, grade, etc."
                                            className="w-full bg-black border border-zinc-700 rounded p-2 text-sm text-white outline-none h-20 resize-none"
                                        />
                                    </div>
                                    <BananaButton type="submit" isLoading={loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white border-none">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add to List
                                    </BananaButton>
                                </form>
                            </div>

                            {/* List Panel */}
                            <div className="flex-1 bg-black p-0 overflow-y-auto">
                                {materials.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50">
                                        <Package className="w-16 h-16" />
                                        <p>No materials requested yet.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-zinc-900">
                                        {materials.map((mat) => (
                                            <div key={mat.id} className="p-4 flex items-center justify-between group hover:bg-zinc-900/50 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold border border-zinc-800">
                                                        {mat.quantity}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-zinc-200">{mat.name}</h4>
                                                            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">{mat.unit}</span>
                                                        </div>
                                                        {mat.spec && <p className="text-xs text-zinc-500 mt-1">{mat.spec}</p>}
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold uppercase px-1.5 rounded ${mat.status === 'ordered' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                                {mat.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDelete(mat.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-zinc-950 p-4 border-t border-zinc-800 text-right">
                            <p className="text-xs text-zinc-600">All items requested here will automatically forward to the Procurement Dashboard.</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
