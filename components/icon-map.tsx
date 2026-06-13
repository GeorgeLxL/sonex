import {
  Globe,
  Smartphone,
  Building2,
  Layers,
  Bot,
  Cloud,
  Cpu,
  Sparkles,
  BrainCircuit,
  Workflow,
  Server,
  Database,
  ShieldCheck,
  Code,
  Zap,
  Rocket,
  type LucideIcon,
} from "lucide-react";

/** Icon names stored in the DB (services.icon / capabilities.icon). */
export const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  smartphone: Smartphone,
  "building-2": Building2,
  layers: Layers,
  bot: Bot,
  cloud: Cloud,
  cpu: Cpu,
  sparkles: Sparkles,
  "brain-circuit": BrainCircuit,
  workflow: Workflow,
  server: Server,
  database: Database,
  shield: ShieldCheck,
  code: Code,
  zap: Zap,
  rocket: Rocket,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function IconByName({
  name,
  size = 20,
  strokeWidth,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[name ?? ""] ?? Code;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}
