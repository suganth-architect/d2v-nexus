import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";

export function BananaCard({ className, children, ...props }: HTMLMotionProps<"div">) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
                "bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
