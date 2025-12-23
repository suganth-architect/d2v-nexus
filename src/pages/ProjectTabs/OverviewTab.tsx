import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ProjectTimeline } from "../../components/ui/ProjectTimeline";
import { BananaCard } from "../../components/ui/BananaCard";
import { useTitanAuth } from "../../hooks/useTitanAuth";

export function OverviewTab({ projectId }: { projectId: string }) {
    const { profile } = useTitanAuth();
    const [project, setProject] = useState<any>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "projects", projectId), (doc) => {
            if (doc.exists()) setProject(doc.data());
        });
        return () => unsub();
    }, [projectId]);

    if (!project) return null;

    const isFinancialViewAllowed = profile?.role === 'founder';

    // Budget Calculations
    const total = project.totalContractValue || 0;
    const current = project.currentBalance !== undefined ? project.currentBalance : total;
    const spent = total - current;
    const progress = (spent / total) * 100;

    const formatINR = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(val);

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            {/* Timeline Section */}
            <ProjectTimeline project={project} projectId={projectId} />

            {/* Budget Bar - RESTRICTED */}
            {isFinancialViewAllowed && (
                <div className="space-y-4">
                    <h3 className="text-zinc-400 font-bold">Financial Health</h3>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex justify-between text-sm sm:text-base mb-2">
                            <span className="text-zinc-400">Spent: <span className="text-white">{formatINR(spent)}</span></span>
                            <span className="text-zinc-400">Budget: <span className="text-white">{formatINR(total)}</span></span>
                        </div>
                        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-yellow-500 transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className={`grid grid-cols-2 ${isFinancialViewAllowed ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                {isFinancialViewAllowed && (
                    <BananaCard className="text-center py-6">
                        <div className="text-zinc-500 text-xs uppercase mb-2">Financial Completion</div>
                        <div className="text-2xl font-bold text-white">{Math.round(progress)}%</div>
                    </BananaCard>
                )}
                <BananaCard className="text-center py-6">
                    <div className="text-zinc-500 text-xs uppercase mb-2">Task Efficiency</div>
                    {/* Placeholder for task efficiency - could use completed/total ratio */}
                    <div className="text-2xl font-bold text-white">
                        {project.taskCount ? Math.round((project.taskCount / (project.taskCount + 5)) * 100) : 100}%
                    </div>
                </BananaCard>
                <BananaCard className="text-center py-6">
                    <div className="text-zinc-500 text-xs uppercase mb-2">Status</div>
                    <div className={`text-2xl font-bold uppercase ${project.status === 'active' ? 'text-green-500' : 'text-zinc-400'}`}>
                        {project.status || 'Active'}
                    </div>
                </BananaCard>
            </div>
        </div>
    );
}
