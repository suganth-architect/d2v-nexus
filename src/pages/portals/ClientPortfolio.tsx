
import { useNavigate } from "react-router-dom";
import { useTitanAuth } from "../../hooks/useTitanAuth";
import { useClientProjects } from "../../hooks/useClientProjects";

export function ClientPortfolio() {
    const { profile } = useTitanAuth();
    const { projects } = useClientProjects(profile?.email || undefined, profile?.role || undefined, profile?.uid || undefined);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 md:p-12 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-light tracking-tight text-white">
                        Client <span className="text-yellow-500 font-serif italic">Portal</span>
                    </h1>
                    <p className="text-white/40 font-light">
                        Select an active project to enter your dashboard.
                    </p>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="group relative h-[400px] w-full rounded-3xl overflow-hidden bg-neutral-900 border border-white/5 shadow-2xl transition-all duration-500 hover:shadow-yellow-500/10 hover:border-yellow-500/20"
                        >
                            {/* Background Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                style={{ backgroundImage: `url(${project.imageUrl || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2666&auto=format&fit=crop'})` }}
                            />

                            {/* Average Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

                            {/* Content */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end items-start">

                                {/* Status Badge */}
                                <div className="mb-auto">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase border border-white/10 bg-white/5 backdrop-blur-md text-white/80">
                                        {project.status.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Title & Location */}
                                <div className="space-y-1 mb-6">
                                    <h3 className="text-2xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                                        {project.title}
                                    </h3>
                                    {project.location && (
                                        <p className="text-sm text-white/50 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            {project.location}
                                        </p>
                                    )}
                                </div>

                                {/* Enter Button */}
                                <button
                                    onClick={() => navigate(`/portal/client/${project.id}`)}
                                    className="w-full py-4 rounded-xl bg-white/10 hover:bg-yellow-500 hover:text-black border border-white/10 hover:border-yellow-400 backdrop-blur-md transition-all duration-300 font-medium tracking-wide flex items-center justify-center gap-2 group/btn"
                                >
                                    Enter Site
                                    <svg className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
