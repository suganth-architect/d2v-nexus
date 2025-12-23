import { useNavigate } from "react-router-dom";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { useClientProjects } from "../../hooks/useClientProjects";
import { ArrowRight, Building2, Calendar, MapPin } from "lucide-react";

export function SiteProjectSelector() {
    const { profile } = useTitanAuth();
    const navigate = useNavigate();
    const { projects, loading } = useClientProjects(profile?.email || undefined, profile?.role || undefined, profile?.uid || undefined);

    if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white/40 font-mono animate-pulse">LOADING PROJECTS...</div>;

    if (projects.length === 0) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-6">
                    <Building2 className="w-8 h-8 text-neutral-500" />
                </div>
                <h2 className="text-xl text-white font-medium mb-2">No Active Projects</h2>
                <p className="text-neutral-500 max-w-sm">You verify explicitly assigned to any active projects. Contact the Administrator.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-light mb-2">Project <span className="text-yellow-500">Selection</span></h1>
                    <p className="text-white/40">Select a project to access the Site Portal.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => navigate(`/portal/site/${project.id}`)}
                            className="bg-neutral-900 border border-white/5 p-6 rounded-2xl hover:border-yellow-500/50 hover:bg-neutral-800 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-4 duration-500"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center text-lg font-serif">
                                    {project.title.charAt(0)}
                                </div>
                                <div className="p-2 bg-white/5 rounded-full group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>

                            <h3 className="text-lg font-medium mb-1">{project.title}</h3>

                            <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                                <MapPin className="w-3 h-3" /> {project.location || "Unknown Location"}
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center gap-4 text-xs font-mono text-white/30">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {new Date(project.createdAt?.seconds * 1000).toLocaleDateString()}
                                </div>
                                <div className="px-2 py-0.5 rounded bg-white/5 uppercase">
                                    {project.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
