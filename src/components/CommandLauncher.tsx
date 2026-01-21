import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Landmark, Box, Users, ClipboardCheck, ArrowUpRight } from "lucide-react";
import { cn } from "../lib/cn";

interface CommandLauncherProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CommandLauncher({ isOpen, onClose }: CommandLauncherProps) {
    const commands = [
        {
            title: "Treasury",
            icon: Landmark,
            path: "/command/ledger",
            color: "text-green-400",
            bg: "bg-green-500/10",
            border: "group-hover:border-green-500/30"
        },
        {
            title: "Warehouse",
            icon: Box,
            path: "/portal/global-stocks",
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            border: "group-hover:border-orange-500/30"
        },
        {
            title: "Directory",
            icon: Users,
            path: "/command/directory",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "group-hover:border-blue-500/30"
        },
        {
            title: "Muster Roll",
            icon: ClipboardCheck,
            path: "/command/directory/attendance",
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
            border: "group-hover:border-yellow-500/30"
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                    />

                    {/* Menu */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[320px] p-2"
                    >
                        <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/80 grid grid-cols-2 gap-2">
                            {commands.map((cmd) => (
                                <Link
                                    key={cmd.title}
                                    to={cmd.path}
                                    onClick={onClose}
                                    className={cn(
                                        "group relative flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-zinc-900 transition-all duration-300 hover:bg-white/5",
                                        cmd.border
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
                                        cmd.bg, cmd.color
                                    )}>
                                        <cmd.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">
                                        {cmd.title}
                                    </span>

                                    <ArrowUpRight className="absolute top-2 right-2 w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
