import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase"; // Adjust path if needed
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import type { SiteLog, Variation, Invoice, ProjectFile } from "../types";
import { FileText, Image as ImageIcon, Download, ExternalLink } from "lucide-react";

export function ClientPortalPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'feed' | 'financials' | 'files'>('feed');

    // Data States
    const [logs, setLogs] = useState<SiteLog[]>([]);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [files, setFiles] = useState<ProjectFile[]>([]);

    useEffect(() => {
        if (!projectId) return;

        // 1. Project Details
        const unsubProject = onSnapshot(doc(db, "projects", projectId), (doc) => {
            if (doc.exists()) {
                setProject({ id: doc.id, ...doc.data() });
            }
        });

        // 2. Public Site Logs
        const qLogs = query(
            collection(db, "projects", projectId, "site_logs"),
            orderBy("timestamp", "desc")
        );
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            const publicLogs = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as SiteLog))
                .filter(log => log.isPublic === true);
            setLogs(publicLogs);
        });

        // 3. Financials (Variations)
        const qVariations = query(collection(db, "projects", projectId, "variations"), orderBy("createdAt", "desc"));
        const unsubVariations = onSnapshot(qVariations, (snap) => {
            setVariations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Variation)));
        });

        // 4. Financials (Invoices)
        const qInvoices = query(collection(db, "projects", projectId, "invoices"), orderBy("createdAt", "desc"));
        const unsubInvoices = onSnapshot(qInvoices, (snap) => {
            setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
        });

        // 5. Public Files
        const qFiles = query(collection(db, "projects", projectId, "files"), orderBy("createdAt", "desc"));
        const unsubFiles = onSnapshot(qFiles, (snap) => {
            const publicFiles = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as ProjectFile))
                .filter(f => f.isPublic === true);
            setFiles(publicFiles);
        });

        return () => {
            unsubProject();
            unsubLogs();
            unsubVariations();
            unsubInvoices();
            unsubFiles();
        };
    }, [projectId]);

    const formatINR = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    if (!project) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-yellow-500 font-mono animate-pulse">
            LOADING PORTAL...
        </div>
    );

    // Calculate Progress (mock logic or real if available)
    // Assume project.progress is 0-100 if exists, else 0
    const progress = project.progress || 0;

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-yellow-500/30">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-3xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold tracking-tight text-white">{project.title}</h1>
                                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-yellow-500/20">
                                    Client View
                                </span>
                            </div>
                            <p className="text-zinc-500 text-sm">Real-time construction updates</p>
                        </div>
                        <div className="hidden sm:block text-right">
                            <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Budget</div>
                            <div className="font-mono text-zinc-300">{formatINR(project.budgetTotal)}</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                        <span>Project Kickoff</span>
                        <span>Completion</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex mt-8 border-b border-white/5">
                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'feed'
                                ? 'border-yellow-500 text-yellow-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Live Feed
                        </button>
                        <button
                            onClick={() => setActiveTab('financials')}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'financials'
                                ? 'border-yellow-500 text-yellow-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Financials
                        </button>
                        <button
                            onClick={() => setActiveTab('files')}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'files'
                                ? 'border-yellow-500 text-yellow-500'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Project Files
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-3xl mx-auto px-6 py-8">
                {activeTab === 'feed' ? (
                    <div className="space-y-8">
                        {logs.length === 0 ? (
                            <div className="text-center py-20 text-zinc-600">
                                <div className="text-4xl mb-4">📷</div>
                                <div>No site logs shared yet.</div>
                            </div>
                        ) : logs.map(log => (
                            <div key={log.id} className="relative pl-8 border-l border-zinc-800 pb-8 last:pb-0">
                                <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-yellow-500/20 transition-colors group">
                                    {log.imageUrl && (
                                        <div className="aspect-video w-full bg-black relative">
                                            <img
                                                src={log.imageUrl}
                                                alt="Site update"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-mono text-yellow-500/80">
                                                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-zinc-300 leading-relaxed text-sm">
                                            {log.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'files' ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* Drawings Section */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-400" /> Drawings & Plans
                            </h3>
                            <div className="space-y-3">
                                {files.filter(f => f.type === 'plan').length === 0 ? (
                                    <p className="text-zinc-600 italic text-sm">No drawings shared yet.</p>
                                ) : (
                                    files.filter(f => f.type === 'plan').map(file => (
                                        <div key={file.id} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <div>
                                                    <div className="text-zinc-200 font-medium">{file.title}</div>
                                                    <div className="text-xs text-zinc-600">PDF • Shared {file.createdAt?.toDate ? file.createdAt.toDate().toLocaleDateString() : ''}</div>
                                                </div>
                                            </div>
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="View/Download"
                                            >
                                                <Download className="w-5 h-5" />
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Visuals Gallery */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-purple-400" /> Visual Gallery
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {files.filter(f => f.type === 'render' || f.type === 'video').length === 0 ? (
                                    <p className="col-span-full text-zinc-600 italic text-sm">No visuals shared yet.</p>
                                ) : (
                                    files.filter(f => f.type === 'render' || f.type === 'video').map(file => (
                                        <div key={file.id} className="aspect-video bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden relative group">
                                            {file.type === 'render' ? (
                                                <img src={file.url} alt={file.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                                    VIDEO LINK
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                <span className="text-white font-medium truncate">{file.title}</span>
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                                                >
                                                    View Full <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10 animate-fade-in">
                        {/* Summary Card */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl">
                                <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Contract Value</div>
                                <div className="text-2xl font-mono text-white">{formatINR(project.budgetTotal)}</div>
                            </div>
                            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-16 bg-green-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                                <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Total Paid</div>
                                <div className="text-2xl font-mono text-white">{formatINR(project.totalPaid)}</div>
                            </div>
                        </div>

                        {/* Invoices List */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                Invoices
                                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{invoices.length}</span>
                            </h3>
                            <div className="space-y-3">
                                {invoices.length === 0 ? (
                                    <div className="text-zinc-600 italic text-sm">No invoices raised yet.</div>
                                ) : invoices.map(inv => {
                                    // Check overdue (simple check, assuming dueDate is YYYY-MM-DD string)
                                    const isOverdue = inv.status !== 'paid' && new Date(inv.dueDate) < new Date();

                                    return (
                                        <div key={inv.id} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-medium">{inv.title}</span>
                                                    {isOverdue && (
                                                        <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded">OVERDUE</span>
                                                    )}
                                                </div>
                                                <div className="text-zinc-500 text-xs">Due: {inv.dueDate}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-mono text-zinc-300">{formatINR(inv.amount)}</div>
                                                <div className={`text-[10px] font-bold uppercase mt-1 ${inv.status === 'paid' ? 'text-green-500' : 'text-orange-500'
                                                    }`}>
                                                    {inv.status}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Variations List */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                Variations
                                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{variations.length}</span>
                            </h3>
                            <div className="space-y-3">
                                {variations.map(vo => (
                                    <div key={vo.id} className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-zinc-300 font-medium">{vo.title}</span>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${vo.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                                    vo.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                    {vo.status}
                                                </span>
                                            </div>
                                            <div className="text-zinc-600 text-xs max-w-sm truncate">{vo.description}</div>
                                        </div>
                                        <div className="font-mono text-zinc-500">{formatINR(vo.amount)}</div>
                                    </div>
                                ))}
                                {variations.length === 0 && (
                                    <div className="text-zinc-600 italic text-sm">No variations.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
