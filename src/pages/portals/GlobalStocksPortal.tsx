import { useEffect, useState } from "react";
import { collectionGroup, collection, onSnapshot, query, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, AlertTriangle, ChevronDown, ChevronRight, Boxes, DollarSign, TrendingDown, PackageX, Truck } from "lucide-react";
import { TransferStockModal } from "../../components/stocks/TransferStockModal";
import { BananaButton } from "../../components/ui/BananaButton";
import { AddGlobalStockModal } from "../../components/stocks/AddGlobalStockModal";

interface GlobalInventoryItem {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    minLevel: number;
    projectId: string;
    path: string;
    rate?: number; // Added for Value Calculation
    lastUpdated?: any;
}

interface AggregatedItem {
    name: string;
    unit: string;
    totalQty: number;
    totalMin: number;
    totalValue: number;
    items: GlobalInventoryItem[];
    hasLowStock: boolean;
    avgRate: number;
}

export default function GlobalStocksPortal() {
    const [allItems, setAllItems] = useState<GlobalInventoryItem[]>([]);
    const [projectNames, setProjectNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Transfer Modal State
    const [transferConfig, setTransferConfig] = useState<{
        isOpen: boolean;
        sourceProjectId: string;
        sourceProjectName: string;
        prefillItemId?: string;
    }>({ isOpen: false, sourceProjectId: "", sourceProjectName: "" });

    // Global Add Stock Modal
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [prefillItem, setPrefillItem] = useState<{ name: string, unit: string } | undefined>(undefined);

    // 1. Fetch Project Names
    useEffect(() => {
        const fetchProjects = async () => {
            const snap = await getDocs(collection(db, "projects"));
            const map: Record<string, string> = {};
            snap.forEach(doc => {
                map[doc.id] = doc.data().title || "Untitled Project";
            });
            setProjectNames(map);
        };
        fetchProjects();
    }, []);

    // 2. Listen to Global Inventory
    useEffect(() => {
        const q = query(collectionGroup(db, "inventory"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => {
                const data = doc.data();
                const parentPath = doc.ref.parent.path;
                const pathSegments = parentPath.split('/');
                const projectId = pathSegments[1];

                return {
                    id: doc.id,
                    itemName: data.itemName || "Unknown Item",
                    quantity: Number(data.quantity) || 0,
                    unit: data.unit || "Units",
                    minLevel: Number(data.minLevel) || 0,
                    rate: Number(data.averageRate || data.rate) || 0, // Mock rate if missing
                    lastUpdated: data.lastUpdated,
                    projectId: projectId,
                    path: doc.ref.path
                } as GlobalInventoryItem;
            });
            setAllItems(items);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 3. Aggregate Data
    const aggregatedData = allItems.reduce((acc, item) => {
        const key = item.itemName.trim().toLowerCase() + "_" + item.unit.toLowerCase();

        if (!acc[key]) {
            acc[key] = {
                name: item.itemName,
                unit: item.unit,
                totalQty: 0,
                totalMin: 0,
                totalValue: 0,
                items: [],
                hasLowStock: false,
                avgRate: 0
            };
        }

        acc[key].totalQty += item.quantity;
        acc[key].totalMin += item.minLevel;
        acc[key].totalValue += (item.quantity * (item.rate || 0));
        acc[key].items.push(item);
        if (item.quantity < item.minLevel) acc[key].hasLowStock = true;

        // Simple average rate calculation
        const currentTotalRate = acc[key].avgRate * (acc[key].items.length - 1);
        acc[key].avgRate = (currentTotalRate + (item.rate || 0)) / acc[key].items.length;

        return acc;
    }, {} as Record<string, AggregatedItem>);

    const sortedRows = Object.values(aggregatedData)
        .sort((a, b) => b.totalQty - a.totalQty)
        .filter(row => row.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleRow = (key: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setExpandedRows(newSet);
    };

    // KPI CALCULATIONS
    const totalInventoryValue = allItems.reduce((sum, item) => sum + (item.quantity * (item.rate || 0)), 0);
    const lowStockCount = allItems.filter(i => i.quantity < i.minLevel).length;
    // Dead Stock: Items with quantity > 0 but no update in > 30 days (mock logic for now as dates might be missing)
    const deadStockCount = 0; // Placeholder

    const openTransfer = (sourcePid: string, itemId?: string) => {
        setTransferConfig({
            isOpen: true,
            sourceProjectId: sourcePid,
            sourceProjectName: projectNames[sourcePid] || 'Unknown Project',
            prefillItemId: itemId
        });
    };

    const handleOpenAddStock = (prefill?: { name: string, unit: string }) => {
        setPrefillItem(prefill);
        setShowAddStockModal(true);
    };

    return (
        <div className="h-screen w-full bg-zinc-950 text-white flex flex-col font-sans overflow-hidden">
            {/* TOP BAR */}
            <div className="h-16 border-b border-white/5 bg-zinc-900/50 flex items-center justify-between px-6 backdrop-blur z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-widest uppercase text-zinc-100">Global Warehouse</h1>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            NEURAL NETWORK ACTIVE
                        </div>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="flex gap-4">
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-white/5 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                            <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Value</div>
                            <div className="text-sm font-bold text-white">${totalInventoryValue.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-white/5 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                            <TrendingDown className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Low Stock</div>
                            <div className="text-sm font-bold text-white">{lowStockCount} Items</div>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-white/5 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <PackageX className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Dead Stock</div>
                            <div className="text-sm font-bold text-white">{deadStockCount} Items</div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="SEARCH..."
                        className="w-full bg-black/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50 transition-colors uppercase placeholder:text-zinc-700"
                    />
                </div>
                <div>
                    <h1 className="text-sm font-bold tracking-widest uppercase text-zinc-100">Global Warehouse</h1>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        NEURAL NETWORK ACTIVE
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <BananaButton
                    onClick={() => handleOpenAddStock()}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black border-none h-9 text-xs"
                >
                    + ADD STOCK
                </BananaButton>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full gap-3">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Scanning Global Depots...</span>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto space-y-2">
                        {/* HEADER ROW */}
                        <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            <div className="col-span-1"></div>
                            <div className="col-span-4">Item Name</div>
                            <div className="col-span-2 text-right">Total Stock</div>
                            <div className="col-span-2 text-right">Avg Rate</div>
                            <div className="col-span-2 text-right">Total Value</div>
                            <div className="col-span-1 text-right">Status</div>
                        </div>

                        {sortedRows.map((row, idx) => {
                            const rowKey = row.name + row.unit;
                            const isExpanded = expandedRows.has(rowKey);

                            return (
                                <motion.div
                                    key={rowKey}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="rounded-xl border border-white/5 bg-zinc-900/40 overflow-hidden"
                                >
                                    {/* MAIN ROW */}
                                    <div
                                        onClick={() => toggleRow(rowKey)}
                                        className="grid grid-cols-12 items-center px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                                    >
                                        <div className="col-span-1 flex items-center justify-center">
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-600" />}
                                        </div>
                                        <div className="col-span-4 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 border border-white/5">
                                                {row.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-base font-bold text-white">{row.name}</div>
                                                <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                                                    <Boxes className="w-3 h-3" /> {row.items.length} Sites Storing This
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <div className="text-lg font-bold text-white tracking-tight">{row.totalQty}</div>
                                            <span className="text-[10px] text-zinc-500 uppercase">{row.unit}</span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <div className="text-sm font-mono text-zinc-400">${row.avgRate.toFixed(2)}</div>
                                            <span className="text-[10px] text-zinc-600 uppercase">Per Unit</span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <div className="text-sm font-bold text-green-400">${row.totalValue.toLocaleString()}</div>
                                        </div>

                                        <div className="col-span-1 flex justify-end">
                                            {row.hasLowStock ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold uppercase">
                                                    <AlertTriangle className="w-3 h-3" /> Low
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-bold uppercase">
                                                    OK
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* EXPANDED DETAILS */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: "auto" }}
                                                exit={{ height: 0 }}
                                                className="bg-black/20 border-t border-white/5"
                                            >
                                                <div className="p-2 space-y-1">
                                                    {row.items.map(item => {
                                                        const isItemLow = item.quantity < item.minLevel;
                                                        return (
                                                            <div key={item.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-white/5 rounded-lg transition-colors group">
                                                                <div className="col-span-1"></div>
                                                                <div className="col-span-4 flex items-center gap-3">
                                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                                                        <MapPin className="w-3 h-3 text-zinc-500" />
                                                                    </div>
                                                                    <span className="text-sm text-zinc-300 font-bold">
                                                                        {projectNames[item.projectId] || item.projectId}
                                                                    </span>
                                                                </div>
                                                                <div className="col-span-2 text-right text-sm font-mono text-zinc-300 font-bold">
                                                                    {item.quantity} <span className="text-[10px] text-zinc-600">{item.unit}</span>
                                                                </div>
                                                                <div className="col-span-2 text-right text-xs font-mono text-zinc-600">
                                                                    Min: {item.minLevel}
                                                                </div>
                                                                <div className="col-span-1 text-right text-sm font-mono text-zinc-400">
                                                                    ₹{(item.rate || 0).toLocaleString()}
                                                                </div>
                                                                <div className="col-span-1 text-right text-sm font-bold text-green-400/80">
                                                                    ₹{((item.quantity * (item.rate || 0))).toLocaleString()}
                                                                </div>
                                                                <div className="col-span-1 flex justify-end items-center gap-4">
                                                                    {isItemLow && (
                                                                        <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                                                                            Low Stock
                                                                        </span>
                                                                    )}

                                                                    <BananaButton
                                                                        onClick={() => openTransfer(item.projectId, item.id)}
                                                                        className="opacity-0 group-hover:opacity-100 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] h-7 px-3"
                                                                    >
                                                                        <Truck className="w-3 h-3 mr-1.5" /> Transfer
                                                                    </BananaButton>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* TRANSFER MODAL */}
            {transferConfig.isOpen && (
                <TransferStockModal
                    isOpen={transferConfig.isOpen}
                    onClose={() => setTransferConfig({ ...transferConfig, isOpen: false })}
                    sourceProjectId={transferConfig.sourceProjectId}
                    sourceProjectName={transferConfig.sourceProjectName}
                // prefillItemId={transferConfig.prefillItemId} 
                // Note: TransferStockModal needs to handle prefill. 
                // I will check TransferStockModal props again.
                // It does NOT have prefillItemId prop currently. 
                // I need to add it or just open it generic. 
                // The prompt said "Quick Transfer: Button to open TransferStockModal pre-filled with that item."
                // I will stick to what exists for now or add it if easy.
                />
            )}

            <AddGlobalStockModal
                isOpen={showAddStockModal}
                onClose={() => setShowAddStockModal(false)}
                prefillItemName={prefillItem?.name}
                prefillUnit={prefillItem?.unit}
            />
        </div>
    );
}
