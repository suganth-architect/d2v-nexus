import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

import { Pencil } from "lucide-react";
import { BananaButton } from "../components/ui/BananaButton";
import { AttendanceWidget } from "../components/AttendanceWidget";
import { DailyLogWizard } from "../components/site/DailyLogWizard";

// Import all tabs
import { OpsTab } from "./ProjectTabs/OpsTab";
import { FinanceTab } from "./ProjectTabs/FinanceTab";
import { OverviewTab } from "./ProjectTabs/OverviewTab";
import { ScheduleTab } from "./ProjectTabs/ScheduleTab";
import { SiteLogsTab } from "./ProjectTabs/SiteLogsTab";
import { StocksTab } from "./ProjectTabs/StocksTab";
import { FilesTab } from "./ProjectTabs/FilesTab";
import { DecisionsTab } from "./ProjectTabs/DecisionsTab";
import { SettingsTab } from "./ProjectTabs/SettingsTab";
import { useTitanAuth } from "../hooks/useTitanAuth";

const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    useTitanAuth(); // Keep hook for future, ignore for now

    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ops'); // Default to string, no strict types for now

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editStatus, setEditStatus] = useState("active");
    const [editBudget, setEditBudget] = useState("");

    const [saving, setSaving] = useState(false);

    // Field Ops State
    const [wizardState, setWizardState] = useState<{ open: boolean, mode: 'morning' | 'evening' }>({ open: false, mode: 'morning' });

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        const docRef = doc(db, "projects", id);
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setProject({ id: snap.id, ...data });
                if (!isEditing) {
                    setEditTitle(data.title);
                    setEditStatus(data.status);
                    setEditBudget((data.totalContractValue || data.budgetTotal || 0).toString());
                }
            } else {
                console.error("Project not found in DB!");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id, isEditing]);

    // --- TAB PERMISSION LOGIC ---
    const { profile } = useTitanAuth();
    const isFinancialViewAllowed = profile?.role === 'founder' || profile?.role === 'accountant';

    const ALL_TABS = [
        { id: 'ops', label: 'Tasks' },
        { id: 'schedule', label: 'Schedule' },
        { id: 'decisions', label: 'Decisions' },
        { id: 'finance', label: 'Finance' },
        { id: 'site', label: 'Site Logs' },
        { id: 'stocks', label: 'Stocks' },
        { id: 'files', label: 'Files' },
        { id: 'overview', label: 'Overview' },
        { id: 'settings', label: 'Settings' }
    ];

    // Filter Tabs
    const tabs = ALL_TABS.filter(tab => {
        if (tab.id === 'finance') return isFinancialViewAllowed;
        return true;
    });

    // Valid Active Tab Enforcer
    useEffect(() => {
        if (tabs.length > 0) {
            const isValid = tabs.some(t => t.id === activeTab);
            if (!isValid) {
                console.warn(`Tab ${activeTab} not allowed for ${profile?.role}. Switching to ${tabs[0].id}`);
                setActiveTab(tabs[0].id);
            }
        }
    }, [activeTab, tabs]); // Re-run when tabs change (e.g. auth loads)

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "projects", project.id), {
                title: editTitle,
                status: editStatus,
                totalContractValue: Number(editBudget),
                budgetTotal: Number(editBudget), // Keep legacy synced
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Update failed", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-zinc-500">Loading Project...</div>;
    if (!project) return <div className="p-20 text-center text-red-500">Project Not Found. Check Database.</div>;



    return (
        <div className="space-y-6 relative pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-sm text-zinc-500 mb-1">
                        <Link to="/" className="hover:text-yellow-500">Dashboard</Link> / {project.title}
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">{project.title}<span className="text-[10px] bg-yellow-500 text-black px-1 rounded ml-2">v2.5</span></h1>
                        <button onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-3 mt-2">
                        <span className="text-xs border border-zinc-700 px-2 py-0.5 rounded uppercase text-zinc-400">{project.status}</span>
                        <span className="text-xs text-zinc-500">Contract Value: {formatINR(project.totalContractValue || 0)}</span>
                    </div>
                </div>
            </div>
            {/* Standard Position for Mobile Widget - Hidden for Site Super as we move it prominent */}
            <div className={`${profile?.role === 'site_super' ? 'hidden' : 'md:hidden'}`}><AttendanceWidget projectId={id!} /></div>


            {/* SITE SUPER: FIELD COMMAND */}
            {
                profile?.role === 'site_super' && (
                    <div className="space-y-4 animate-in slide-in-from-top duration-300">
                        {/* 1. Attendance Widget (Prominent) */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-lg">
                            <AttendanceWidget projectId={id!} />
                        </div>

                        {/* 2. Action Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setWizardState({ open: true, mode: 'morning' })}
                                className="flex flex-col items-center justify-center gap-2 p-6 bg-yellow-500/10 border border-yellow-500/50 rounded-2xl hover:bg-yellow-500/20 active:scale-95 transition-all group"
                            >
                                <span className="text-3xl group-hover:scale-110 transition-transform">☀️</span>
                                <span className="font-bold text-yellow-500 text-sm uppercase tracking-wider">Morning Ritual</span>
                            </button>

                            <button
                                onClick={() => setWizardState({ open: true, mode: 'evening' })}
                                className="flex flex-col items-center justify-center gap-2 p-6 bg-purple-500/10 border border-purple-500/50 rounded-2xl hover:bg-purple-500/20 active:scale-95 transition-all group"
                            >
                                <span className="text-3xl group-hover:scale-110 transition-transform">🌙</span>
                                <span className="font-bold text-purple-400 text-sm uppercase tracking-wider">End of Day</span>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-zinc-500 hover:text-white'}`}
                    >
                        {tab.label}
                    </button>
                ))}

                <span className="ml-4 my-auto px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-[10px] font-mono border border-yellow-500/30 whitespace-nowrap">
                    v2.0 OPS ENGINE
                </span>
            </div>

            {/* Content Area */}
            {/* Validated Routing Logic */}
            <div className="min-h-[500px]">
                {/* Fallback Redirect if activeTab is hidden for this user */}
                {!tabs.some(t => t.id === activeTab) && tabs.length > 0 && (
                    // Force switch to first available tab
                    // This is a rendering side-effect, but safe enough here or we can use useEffect
                    // Let's us useEffect for cleaner React
                    null
                )}

                {activeTab === 'ops' && <OpsTab project={project} />}
                {activeTab === 'schedule' && <ScheduleTab projectId={id!} />}
                {activeTab === 'decisions' && <DecisionsTab projectId={id!} />}
                {activeTab === 'finance' && isFinancialViewAllowed && <FinanceTab projectId={id!} />}
                {activeTab === 'stocks' && <StocksTab projectId={id!} />}
                {activeTab === 'files' && <FilesTab projectId={id!} />}
                {activeTab === 'site' && <SiteLogsTab projectId={id!} />}
                {activeTab === 'overview' && <OverviewTab projectId={id!} />}
                {activeTab === 'settings' && <SettingsTab projectId={id!} />}
            </div>

            {/* Edit Modal (Simplified) */}
            {
                isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-md">
                            <h2 className="text-xl font-bold text-white mb-4">Edit Project</h2>
                            <form onSubmit={handleSaveProject} className="space-y-4">
                                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-black border border-zinc-700 p-2 rounded text-white" placeholder="Title" />
                                <input value={editBudget} onChange={e => setEditBudget(e.target.value)} type="number" className="w-full bg-black border border-zinc-700 p-2 rounded text-white" placeholder="Budget" />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 p-2 text-zinc-400">Cancel</button>
                                    <BananaButton type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save'}</BananaButton>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Daily Log Wizard */}
            {wizardState.open && (
                <DailyLogWizard
                    projectId={project.id}
                    userId={profile?.uid || ""}
                    userName={profile?.name || ""}
                    mode={wizardState.mode}
                    onClose={() => setWizardState({ ...wizardState, open: false })}
                />
            )}
        </div>
    );
}
