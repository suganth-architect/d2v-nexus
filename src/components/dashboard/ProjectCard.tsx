
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";


interface ProjectCardProps {
    project: any; // We can improve typing later or import strict types if available
    isFinancialView: boolean;
    formatINR: (val: number) => string;
}

export function ProjectCard({ project, isFinancialView, formatINR }: ProjectCardProps) {
    return (
        <div className="relative group h-full">
            <Link to={`/project/${project.id}`} className="block h-full">
                <div className="
                    h-full min-h-[180px] flex flex-col justify-between
                    bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl
                    hover:border-yellow-500/30 hover:shadow-[0_0_30px_rgba(234,179,8,0.1)]
                    transition-all duration-300
                    p-6
                ">
                    <div>
                        <div className="flex flex-col items-start gap-1 mb-2 pr-20">
                            <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors truncate w-full">
                                {project.title}
                            </h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase border ${project.status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                {project.status}
                            </span>
                        </div>

                        {project.description && (
                            <p className="text-sm text-zinc-500 line-clamp-2">
                                {project.description}
                            </p>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                        <div className="text-xs text-zinc-500">
                            Tasks: {project.taskCount || 0}
                        </div>
                        {isFinancialView ? (
                            <div className="text-sm font-mono text-zinc-400 font-bold">
                                {formatINR(project.totalContractValue || project.budgetTotal || 0)}
                            </div>
                        ) : (
                            <div className="text-zinc-500 text-xs">
                                ACTIVE SITE
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            <Link
                to={`/portal/client/${project.id}`}
                target="_blank"
                title="View as Client"
                className="
                    absolute top-4 right-4 z-10 
                    flex items-center gap-1 
                    text-[10px] font-bold uppercase tracking-wider
                    bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 
                    hover:bg-yellow-500 hover:text-black 
                    px-3 py-1.5 rounded transition-all duration-300
                "
                onClick={(e) => e.stopPropagation()}
            >
                <ExternalLink className="w-3 h-3" /> View Portal
            </Link>
        </div>
    );
}
