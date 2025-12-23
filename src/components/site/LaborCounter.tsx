import { Minus, Plus, Users, Hammer, HardHat } from "lucide-react";

interface LaborCounterProps {
    counts: {
        mason: number;
        helper: number;
        carpenter: number;
    };
    onChange: (type: 'mason' | 'helper' | 'carpenter', val: number) => void;
}

export function LaborCounter({ counts, onChange }: LaborCounterProps) {
    const update = (type: 'mason' | 'helper' | 'carpenter', delta: number) => {
        const newVal = Math.max(0, counts[type] + delta);
        onChange(type, newVal);
    };

    return (
        <div className="space-y-4">
            <CounterRow
                label="Masons"
                count={counts.mason}
                icon={<Hammer className="w-5 h-5 text-orange-400" />}
                onDecrement={() => update('mason', -1)}
                onIncrement={() => update('mason', 1)}
            />
            <CounterRow
                label="Helpers"
                count={counts.helper}
                icon={<Users className="w-5 h-5 text-blue-400" />}
                onDecrement={() => update('helper', -1)}
                onIncrement={() => update('helper', 1)}
            />
            <CounterRow
                label="Carpenters"
                count={counts.carpenter}
                icon={<HardHat className="w-5 h-5 text-yellow-400" />}
                onDecrement={() => update('carpenter', -1)}
                onIncrement={() => update('carpenter', 1)}
            />
        </div>
    );
}

function CounterRow({ label, count, icon, onIncrement, onDecrement }: {
    label: string, count: number, icon: any, onIncrement: () => void, onDecrement: () => void
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 rounded-2xl">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-xl">
                    {icon}
                </div>
                <span className="font-semibold text-zinc-200">{label}</span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={onDecrement}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 active:scale-90 transition-all border border-zinc-700"
                >
                    <Minus className="w-5 h-5" />
                </button>
                <span className="w-8 text-center text-xl font-bold font-mono text-white">
                    {count}
                </span>
                <button
                    onClick={onIncrement}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-black active:scale-90 transition-all shadow-lg shadow-orange-500/20"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
