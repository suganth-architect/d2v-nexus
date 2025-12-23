import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BananaButton } from "../ui/BananaButton";
import { X, Building, MapPin, User, Phone, Mail, IndianRupee, Calendar, FileText, Map, Briefcase, Home } from "lucide-react";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useTitanAuth as useAuth } from "../../hooks/useTitanAuth";
import { logActivity } from "../../lib/logger";

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProjectCreated?: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [location, setLocation] = useState("");
    const [pincode, setPincode] = useState("");
    const [description, setDescription] = useState("");

    const [clientName, setClientName] = useState("");
    const [clientDesignation, setClientDesignation] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientAddress, setClientAddress] = useState("");

    const [budget, setBudget] = useState("");
    const [startDate, setStartDate] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // 1. Validation Logic
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[\d\s-]{10,}$/;

        if (!title.trim() || !clientName.trim()) {
            alert("Title and Client Name are required.");
            return;
        }

        if (Number(budget) <= 0) {
            alert("Budget must be a positive value.");
            return;
        }

        if (clientEmail && !emailRegex.test(clientEmail)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (clientPhone && !phoneRegex.test(clientPhone)) {
            alert("Please enter a valid phone number (at least 10 digits).");
            return;
        }

        setIsLoading(true);

        try {
            const batch = writeBatch(db);

            // 2. Generate IDs
            const projectRef = doc(collection(db, "projects"));
            const projectId = projectRef.id;

            const clientRef = doc(collection(db, "clients"));
            const clientId = clientRef.id;

            // 3. Prepare Payloads
            const numericBudget = Number(budget);

            // Project Document
            batch.set(projectRef, {
                title,
                location,
                pincode,
                description,
                totalContractValue: numericBudget, // MASTER FIELD
                budget: numericBudget, // DEPRECATED MIRROR
                budgetTotal: numericBudget, // DEPRECATED MIRROR
                totalPaid: 0, // Init for accuracy
                currentBalance: numericBudget,
                client: {
                    name: clientName,
                    email: clientEmail,
                    phone: clientPhone,
                    designation: clientDesignation,
                    address: clientAddress,
                    uid: clientId
                },
                clientEmail, // Critical for Security Rules (resource.data.clientEmail == auth.token.email)
                status: "active",
                createdAt: serverTimestamp(),
                startDate: startDate ? new Date(startDate) : null,
                founderUid: user.uid,
                publicView: false
            });

            // Client Rolodex Entry
            batch.set(clientRef, {
                name: clientName,
                email: clientEmail,
                phone: clientPhone,
                designation: clientDesignation,
                currentAddress: clientAddress,
                linkedProjectId: projectId,
                createdAt: serverTimestamp(),
                // Extra metadata for the rolodex
                projectTitle: title,
                totalBudget: numericBudget
            });

            // 4. Default Tasks
            const defaultTasks = [
                { title: "Site Clearing", status: "pending", xpReward: 50 },
                { title: "Layout Marking", status: "pending", xpReward: 100 },
                { title: "Excavation", status: "pending", xpReward: 150 },
                { title: "Foundation", status: "pending", xpReward: 300 }
            ];

            defaultTasks.forEach(task => {
                const taskRef = doc(collection(db, `projects/${projectId}/tasks`));
                batch.set(taskRef, {
                    ...task,
                    createdAt: serverTimestamp()
                });
            });

            // 5. Commit
            await batch.commit();

            // LOG ACTIVITY
            await logActivity(projectId, 'project', `Project Created: ${title}`, {
                budget: numericBudget,
                client: clientName,
                location: location
            }, user.uid);

            // Cleanup
            resetForm();
            onProjectCreated?.();
            onClose();

        } catch (error) {
            console.error("Error creating project:", error);
            alert("Failed to create project. Check console.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setLocation("");
        setPincode("");
        setDescription("");
        setClientName("");
        setClientDesignation("");
        setClientPhone("");
        setClientEmail("");
        setClientAddress("");
        setBudget("");
        setStartDate("");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
                            <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                                Create New Project
                            </h2>
                            <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            <form id="create-project-form" onSubmit={handleSubmit} className="space-y-6">

                                {/* Section: Project Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <Building className="w-4 h-4" /> Project Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Project Title *</label>
                                            <input
                                                required
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                placeholder="Villa 101"
                                                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Total Contract Value (₹) *</label>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <input
                                                    required
                                                    type="number" min="0"
                                                    value={budget}
                                                    onChange={e => setBudget(e.target.value)}
                                                    placeholder="5000000"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm text-zinc-400">Description</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                            <textarea
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                placeholder="A luxury villa project with modern amenities..."
                                                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all resize-none h-20"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Site Location (Address)</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <input
                                                    value={location}
                                                    onChange={e => setLocation(e.target.value)}
                                                    placeholder="123, Gandhi Road, Chennai"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Pincode</label>
                                            <div className="relative">
                                                <Map className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <input
                                                    value={pincode}
                                                    onChange={e => setPincode(e.target.value)}
                                                    placeholder="600001"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Section: Client Info */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        <User className="w-4 h-4" /> Client Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Client Name (Legal) *</label>
                                            <input
                                                required
                                                value={clientName}
                                                onChange={e => setClientName(e.target.value)}
                                                placeholder="Mr. Rajkumar"
                                                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Designation</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <input
                                                    value={clientDesignation}
                                                    onChange={e => setClientDesignation(e.target.value)}
                                                    placeholder="CEO, Tech Corp"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Phone</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="tel"
                                                    value={clientPhone}
                                                    onChange={e => setClientPhone(e.target.value)}
                                                    placeholder="+91 98765 43210"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm text-zinc-400">Email (For Invite)</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="email"
                                                    value={clientEmail}
                                                    onChange={e => setClientEmail(e.target.value)}
                                                    placeholder="client@gmail.com"
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm text-zinc-400">Client Current Address</label>
                                        <div className="relative">
                                            <Home className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                            <input
                                                value={clientAddress}
                                                onChange={e => setClientAddress(e.target.value)}
                                                placeholder="Flat 4B, Ocean View Apartments"
                                                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Section: Start Date */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm text-zinc-400">Start Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 focus:outline-none transition-all select-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
                                    <Building className="w-4 h-4" />
                                    <span>
                                        This will create a new Project Workspace and a Client Entry.
                                    </span>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-zinc-900/50 flex justify-end gap-3">
                            <BananaButton variant="ghost" type="button" onClick={onClose}>
                                Cancel
                            </BananaButton>
                            <BananaButton
                                type="submit"
                                form="create-project-form"
                                isLoading={isLoading}
                                className="min-w-[140px]"
                            >
                                Launch Project
                            </BananaButton>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
