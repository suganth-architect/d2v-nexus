import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, X, HardHat, Check } from 'lucide-react';
import type { ProjectFile } from '../../types';

interface FilePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string, title: string) => void;
    projectId: string;
}

export function FilePickerModal({ isOpen, onClose, onSelect, projectId }: FilePickerModalProps) {
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Query only 'execution' files (Drawings & Specs)
        // Or should we allow selecting from all? Requirement said: "Source: Queries files collection where category == 'execution'"
        // But maybe fallback to all for flexibility? Let's stick to 'execution' first, or maybe allow switching?
        // Let's just fetch ALL and filter in UI to allow searching everything if needed, but default view is important.
        // Actually, fetching everything is safer for small projects.

        const q = query(
            collection(db, `projects/${projectId}/files`),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawFiles = snapshot.docs.map(doc => {
                const data = doc.data();
                // Mapper logic identical to FilesTab to ensure consistency
                let category = data.category;
                if (!category) {
                    if (data.folder === 'contracts' || data.folder === 'invoices') category = 'finance';
                    else if (data.folder === 'photos' || data.type === 'render') category = 'site_logs';
                    else if (data.isPublic) category = 'client_view';
                    else category = 'execution';
                }
                return { id: doc.id, ...data, category } as ProjectFile & { category: string };
            });

            // Filter initially for Execution? Or just show all?
            // "Source: Queries files collection where category == 'execution' (Drawings/Specs)."
            // I will filter locally.
            setFiles(rawFiles);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, isOpen]);

    // FILTER LOGIC
    const filteredFiles = files.filter(f => {
        // Search match
        if (searchTerm && !f.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        // If no search, maybe restrict to 'execution'? 
        // User might want to attach a photo or contract. 
        // Let's Show ALL if searching, but maybe prioritize execution? 
        // Requirement said: "Source: Queries files collection where category == 'execution'".
        // I will adhere to requirement but allow "search anything".

        if (!searchTerm) {
            // @ts-ignore
            return f.category === 'execution';
        }
        return true;
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* HEADER */}
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <HardHat className="w-5 h-5 text-blue-500" />
                                Select Construction Document
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* SEARCH */}
                        <div className="p-4 border-b border-zinc-800 bg-zinc-950/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search drawings, specs, or contracts..."
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-zinc-600"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* GRID */}
                        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950/50">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse">
                                    Loading vault...
                                </div>
                            ) : filteredFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                                    <p>No matching files found.</p>
                                    {!searchTerm && <p className="text-xs mt-2 text-zinc-600">Showing 'Execution' folder only. Search to see more.</p>}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {filteredFiles.map((file) => (
                                        <button
                                            key={file.id}
                                            onClick={() => onSelect(file.url, file.title)}
                                            className="group relative flex flex-col aspect-[4/5] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-blue-500/50 hover:ring-1 hover:ring-blue-500/50 transition-all text-left"
                                        >
                                            {/* PREVIEW */}
                                            <div className="flex-1 w-full bg-zinc-800/50 flex items-center justify-center overflow-hidden relative">
                                                {file.url.startsWith('data:image') || file.type?.includes('image') ? (
                                                    <img src={file.url} alt={file.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <FileText className="w-12 h-12 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                                )}

                                                {/* Category Badge */}
                                                <div className="absolute top-2 right-2">
                                                    {/* @ts-ignore */}
                                                    {file.category === 'execution' && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                                    {/* @ts-ignore */}
                                                    {file.category === 'client_view' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                                                </div>
                                            </div>

                                            {/* FOOTER */}
                                            <div className="p-3 border-t border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                                                <h4 className="text-xs font-bold text-zinc-300 truncate group-hover:text-white mb-1">{file.title}</h4>
                                                <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">
                                                    {/* @ts-ignore */}
                                                    {file.category?.replace('_', ' ')}
                                                </p>
                                            </div>

                                            {/* Hover Selection Overlay */}
                                            <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                                                <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
