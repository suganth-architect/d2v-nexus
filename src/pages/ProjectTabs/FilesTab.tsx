import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ProjectFile } from '../../types';
import { FileText, Image as ImageIcon, ExternalLink, Plus, Camera, X, Upload, ChevronLeft, HardHat, ShieldCheck, DollarSign } from 'lucide-react';
import { BananaButton } from '../../components/ui/BananaButton';
import { motion, AnimatePresence } from 'framer-motion';

import { useTitanAuth } from '../../hooks/useTitanAuth';

interface FilesTabProps {
    projectId: string;
}

// --- SMART VAULT CONFIGURATION ---
const VAULT_ZONES = [
    {
        id: 'execution',
        label: 'Execution',
        subtext: 'Drawings & Specs',
        icon: HardHat,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        access: ['all'] // Visible to everyone internally
    },
    {
        id: 'client_view',
        label: 'Client View',
        subtext: 'Approved for Client',
        icon: ShieldCheck,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        access: ['all'] // Internally visible, also exposed to client
    },
    {
        id: 'finance',
        label: 'Contracts & Finance',
        subtext: 'Confidential',
        icon: DollarSign,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        access: ['founder', 'accountant'] // RESTRICTED
    },
    {
        id: 'site_logs',
        label: 'Site Photos',
        subtext: 'Live Feed',
        icon: ImageIcon,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
        access: ['all']
    }
];

export function FilesTab({ projectId }: FilesTabProps) {
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [activeZone, setActiveZone] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const { profile } = useTitanAuth();

    const isFinancialIncluded = ['founder', 'accountant'].includes(profile?.role || '');

    // Modal
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [targetCategory, setTargetCategory] = useState('execution'); // Default
    const [submitting, setSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, `projects/${projectId}/files`),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // SMART MIGRATION LOGIC
            const rawFiles = snapshot.docs.map(doc => {
                const data = doc.data();
                let category = data.category;

                // Fallback Logic for legacy files
                if (!category) {
                    if (data.folder === 'contracts' || data.folder === 'invoices') category = 'finance';
                    else if (data.folder === 'photos' || data.type === 'render') category = 'site_logs';
                    else if (data.isPublic) category = 'client_view';
                    else category = 'execution'; // Default bucket
                }

                return { id: doc.id, ...data, category } as ProjectFile & { category: string };
            });
            setFiles(rawFiles);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [projectId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            // For images, we resize. For PDFs/others, we just base64 (careful with size)
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 1000; // Increased quality slightly
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;

                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const base64String = canvas.toDataURL(file.type);
                    setNewUrl(base64String);
                    if (!newTitle) setNewTitle(file.name.split('.')[0]);
                    setIsAddOpen(true);
                };
            } else {
                // Non-image files (PDFs etc) - direct base64
                // WARNING: Firebase document limit 1MB. Large files should use Storage bucket.
                // For now, assuming small docs.
                setNewUrl(event.target?.result as string);
                if (!newTitle) setNewTitle(file.name.split('.')[0]);
                setIsAddOpen(true);
            }
        };
    }

    // Drag and Drop Handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            if (activeZone) setTargetCategory(activeZone);
            processFile(e.dataTransfer.files[0]);
        }
    };


    const handleAddFile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, `projects/${projectId}/files`), {
                title: newTitle,
                url: newUrl,
                category: targetCategory, // NEW CORE FIELD
                isPublic: targetCategory === 'client_view', // Auto-sync permission
                createdAt: serverTimestamp(),
                uploadedBy: profile?.uid || 'anon',
                type: 'file', // Generic
                version: 1
            });
            setIsAddOpen(false);
            setNewTitle('');
            setNewUrl('');
            setTargetCategory('execution'); // Reset
        } catch (error) {
            console.error("Error adding file:", error);
            alert("Failed to add file");
        } finally {
            setSubmitting(false);
        }
    };

    // Toggle logic mostly for "isPublic" within other folders?
    // Actually, moving to 'client_view' is the new "Make Public".
    // But let's keep isPublic generic for now if we want cross-folder public access?
    // NO, Strict Zone Logic: Only 'client_view' is public.
    const moveToZone = async (file: ProjectFile, zoneId: string) => {
        try {
            await updateDoc(doc(db, `projects/${projectId}/files`, file.id), {
                category: zoneId,
                isPublic: zoneId === 'client_view'
            });
        } catch (error) {
            console.error("Error moving file:", error);
        }
    }


    // Filter Files by Active Zone + Permissions
    const filteredFiles = files.filter(f => {
        // Permission Check
        // @ts-ignore
        if (f.category === 'finance' && !isFinancialIncluded) return false;

        if (!activeZone) return false;

        // @ts-ignore
        return f.category === activeZone;
    });

    // Get a specific folder's latest photo for preview
    const getZonePreview = (zoneId: string) => {
        // @ts-ignore
        const zoneFiles = files.filter(f => f.category === zoneId && f.url && f.url.startsWith('data:image'));
        if (zoneFiles.length > 0) return zoneFiles[0].url;
        return null;
    };

    const visibleZones = VAULT_ZONES.filter(z => {
        if (z.id === 'finance' && !isFinancialIncluded) return false;
        return true;
    });

    if (loading) return <div className="text-zinc-500 animate-pulse">Initializing Neural Net...</div>;

    return (
        <div
            className="space-y-6 min-h-[600px] relative"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {dragActive && (
                <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                        <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
                        <h3 className="text-2xl font-bold text-white">Ingest File</h3>
                        <p className="text-blue-200">{activeZone ? `Adding to ${VAULT_ZONES.find(z => z.id === activeZone)?.label}` : "Drop to upload"}</p>
                    </div>
                </div>
            )}


            {/* HEADER / NAV */}
            {activeZone ? (
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setActiveZone(null)}
                        className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            {VAULT_ZONES.find(z => z.id === activeZone)?.icon && (() => {
                                const Icon = VAULT_ZONES.find(z => z.id === activeZone)!.icon;
                                return <Icon className={`w-6 h-6 ${VAULT_ZONES.find(z => z.id === activeZone)?.color}`} />;
                            })()}
                            {VAULT_ZONES.find(z => z.id === activeZone)?.label}
                        </h2>
                    </div>
                    <div className="flex-1" />
                    <BananaButton onClick={() => {
                        setTargetCategory(activeZone);
                        setIsAddOpen(true);
                    }}>
                        <Plus className="w-4 h-4 mr-2" /> Upload
                    </BananaButton>
                </div>
            ) : (
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Smart Vault</h2>
                        <p className="text-zinc-500 text-sm">Secure Document Neural Net</p>
                    </div>
                    <BananaButton onClick={() => setIsAddOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Quick Upload
                    </BananaButton>
                </div>
            )}

            {/* ZONE GRID (Roots) */}
            {!activeZone && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visibleZones.map((zone) => {
                        const preview = getZonePreview(zone.id);
                        // @ts-ignore
                        const count = files.filter(f => f.category === zone.id).length;

                        return (
                            <motion.button
                                key={zone.id}
                                onClick={() => setActiveZone(zone.id)}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className={`
                                    relative flex flex-col items-start p-8 rounded-3xl border transition-all text-left overflow-hidden h-64 group
                                    ${zone.bg} ${zone.border}
                                `}
                            >
                                {/* Background Image/Preview */}
                                {preview && (
                                    <>
                                        <div className="absolute inset-0 bg-black/60 z-0 group-hover:bg-black/70 transition-colors" /> {/* Scrim */}
                                        <img src={preview} alt="Zone Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 z-[-1] blur-sm group-hover:blur-none transition-all duration-500" />
                                    </>
                                )}

                                <div className={`p-4 rounded-2xl bg-black/40 backdrop-blur-md mb-4 ${zone.color} relative z-10 border border-white/5`}>
                                    <zone.icon className="w-8 h-8" />
                                </div>
                                <div className="mt-auto relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-1">{zone.label}</h3>
                                    <p className="text-sm text-zinc-400 font-medium">{zone.subtext} • {count} files</p>
                                </div>

                                {/* Hover Arrow */}
                                <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-x-2">
                                    <div className="p-3 bg-white text-black rounded-full">
                                        <ArrowRightIcon className="w-5 h-5" />
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
            )}

            {/* FILE LIST (Zone View) */}
            {activeZone && (
                <div className={activeZone === 'site_logs' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>

                    {filteredFiles.length === 0 && (
                        <div className="col-span-full py-20 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">
                            <p>This vault zone is empty.</p>
                            <button onClick={() => { setTargetCategory(activeZone); setIsAddOpen(true); }} className="text-blue-500 font-bold hover:underline mt-2">Initialize Data</button>
                        </div>
                    )}

                    {filteredFiles.map((file) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={file.id}
                            className={`
                                group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors
                                ${activeZone === 'site_logs' ? 'aspect-square' : 'p-4 flex items-center gap-4'}
                            `}
                        >
                            {activeZone === 'site_logs' ? (
                                <>
                                    <img src={file.url} alt={file.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <p className="text-white font-medium truncate text-sm">{file.title}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-zinc-400">{new Date(file.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 backdrop-blur-md">
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // LIST VIEW
                                <>
                                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                        {file.url.startsWith('data:image') || file.type?.includes('image') ? (
                                            <img src={file.url} className='w-full h-full object-cover rounded-lg' alt="thumb" />
                                        ) : (
                                            <FileText className="w-6 h-6 text-zinc-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-zinc-200 font-medium truncate">{file.title}</h4>
                                        <p className="text-xs text-zinc-500 truncate">
                                            Added {new Date(file.createdAt?.seconds * 1000).toLocaleDateString()} by User
                                        </p>
                                    </div>

                                    {/* Action Chips */}
                                    <div className="flex items-center gap-2">
                                        {/* If active zone is NOT client_view, show button to move to client_view */}
                                        {activeZone !== 'client_view' && activeZone !== 'finance' && (
                                            <button
                                                onClick={() => moveToZone(file, 'client_view')}
                                                className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-green-500/10 text-zinc-500 hover:text-green-400 text-xs font-medium transition-colors border border-transparent hover:border-green-500/20"
                                                title="Approve for Client"
                                            >
                                                Approve
                                            </button>
                                        )}

                                        <a href={file.url} target="_blank" download={file.title} rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}


            {/* UPLOAD MODAL */}
            <AnimatePresence>
                {isAddOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl"
                        >
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-500" />
                                Upload to Vault
                            </h2>
                            <form onSubmit={handleAddFile} className="space-y-6">

                                {/* Zone Selector */}
                                <div>
                                    <label className="block text-zinc-500 text-xs font-bold uppercase mb-2">Target Zone</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {visibleZones.map(z => (
                                            <button
                                                key={z.id}
                                                type="button"
                                                onClick={() => setTargetCategory(z.id)}
                                                className={`
                                                    flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all
                                                    ${targetCategory === z.id
                                                        ? `${z.bg} ${z.border} ${z.color.replace('text-', 'text-')} ring-1 ring-offset-2 ring-offset-zinc-900 ring-${z.color.split('-')[1]}-500`
                                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                                    }
                                                `}
                                            >
                                                <z.icon className="w-4 h-4" />
                                                {z.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-zinc-500 text-xs font-bold uppercase mb-2">Document Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="e.g. Ground Floor Electrical Layout"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-zinc-500 text-xs font-bold uppercase mb-2">File</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="modal-file-input"
                                        />

                                        {!newUrl ? (
                                            <label htmlFor="modal-file-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-xl hover:border-blue-500 hover:bg-zinc-800/50 transition-all cursor-pointer">
                                                <Camera className="w-8 h-8 text-zinc-600 group-hover:text-blue-500 mb-2 transition-colors" />
                                                <span className="text-xs font-bold text-zinc-500 uppercase">Click to Select</span>
                                            </label>
                                        ) : (
                                            <div className="relative w-full h-48 bg-black rounded-xl overflow-hidden border border-zinc-700 flex items-center justify-center">
                                                {newUrl.startsWith('data:image') ? (
                                                    <img src={newUrl} alt="Preview" className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <FileText className="w-12 h-12 text-zinc-500 mx-auto mb-2" />
                                                        <p className="text-zinc-300 text-xs break-all px-4">Document Ready</p>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setNewUrl('')}
                                                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddOpen(false)}
                                        className="flex-1 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <BananaButton type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl">
                                        {submitting ? "Uploading..." : "Secure Upload"}
                                    </BananaButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ArrowRightIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    )
}
