import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";

interface BananaButtonProps extends HTMLMotionProps<"button"> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    isLoading?: boolean;
    children: React.ReactNode;
}

export function BananaButton({ className, variant = "primary", isLoading, children, ...props }: BananaButtonProps) {
    const variants = {
        primary: "bg-yellow-400 text-zinc-950 font-bold hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]",
        secondary: "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700",
        ghost: "bg-transparent text-zinc-400 hover:text-white",
        danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
    };

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            disabled={isLoading || props.disabled}
            className={cn(
                "px-4 py-2 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2",
                variants[variant],
                (isLoading || props.disabled) && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            {isLoading && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
        </motion.button>
    );
}
