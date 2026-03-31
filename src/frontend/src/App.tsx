import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase,
  ChevronRight,
  Clock,
  Cpu,
  LayoutDashboard,
  Loader2,
  Pause,
  Play,
  Settings,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Toaster, toast } from "sonner";
import type { EarningEntry, Goal, Job, LogEntry, Skill } from "./backend.d";
import {
  useActivityLog,
  useAddJob,
  useEarnings,
  useGoals,
  useHeartbeatStatus,
  useJobs,
  useRunCycle,
  useSetApiKey,
  useSkills,
  useToggleAutoCycle,
  useTotalEarned,
  useWalletPrincipal,
} from "./hooks/useQueries";

// ─── helpers ───────────────────────────────────────────────────────────────
const E8S = 100_000_000n;
function e8sToIcp(e8s: bigint): string {
  const icp = Number(e8s) / Number(E8S);
  return icp.toFixed(2);
}
function truncatePrincipal(p: string): string {
  if (!p || p.length < 12) return p;
  return `${p.slice(0, 8)}...${p.slice(-6)}`;
}
function formatTs(ts: bigint): string {
  const ms = Number(ts / 1_000_000n);
  if (ms === 0) return "—";
  return new Date(ms).toLocaleTimeString();
}
function nsToMinutes(ns: bigint): number {
  return Math.floor(Number(ns / 60_000_000_000n));
}

// ─── agent metadata ────────────────────────────────────────────────────────
const AGENTS = [
  {
    name: "Scout",
    role: "Finding & evaluating jobs",
    icon: "🔍",
    color: "cyan",
  },
  { name: "Writer", role: "Content & copywriting", icon: "✍️", color: "green" },
  { name: "Coder", role: "Programming & ICP dev", icon: "💻", color: "cyan" },
  {
    name: "Researcher",
    role: "Analysis & reports",
    icon: "🔬",
    color: "green",
  },
  {
    name: "Learner",
    role: "Team coaching & R&D",
    icon: "🧠",
    color: "magenta",
  },
  { name: "Paymaster", role: "ICP finance & gas", icon: "💰", color: "green" },
];

// Platform badge colors
const PLATFORM_COLORS: Record<string, string> = {
  "r/forhire": "text-[oklch(0.87_0.17_198)] border-[oklch(0.87_0.17_198/0.4)]",
  "r/InternetComputer":
    "text-[oklch(0.75_0.28_290)] border-[oklch(0.75_0.28_290/0.4)]",
  "r/dfinity": "text-[oklch(0.75_0.28_290)] border-[oklch(0.75_0.28_290/0.4)]",
  "DFINITY Forum":
    "text-[oklch(0.65_0.32_320)] border-[oklch(0.65_0.32_320/0.4)]",
  Gitcoin: "text-[oklch(0.87_0.19_148)] border-[oklch(0.87_0.19_148/0.4)]",
};

function PlatformBadge({ platform }: { platform: string }) {
  const colors =
    PLATFORM_COLORS[platform] ??
    "text-muted-custom border-[oklch(0.22_0.045_232)]";
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${colors} bg-[oklch(0.09_0.018_241/0.6)]`}
    >
      {platform}
    </span>
  );
}

type Tab = "dashboard" | "agents" | "jobs" | "goals" | "wallet" | "settings";

// ─── sub-components ────────────────────────────────────────────────────────
function NeonPanel({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg p-4 card-dark border border-[oklch(0.22_0.045_232)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold tracking-[0.2em] text-heading uppercase mb-3 flex items-center gap-2">
      <span className="inline-block w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_6px_oklch(0.87_0.17_198)]" />
      {children}
    </h2>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    found:
      "bg-[oklch(0.87_0.17_198/0.15)] text-neon-cyan border border-[oklch(0.87_0.17_198/0.4)]",
    assigned:
      "bg-[oklch(0.75_0.15_60/0.15)] text-[oklch(0.75_0.15_60)] border border-[oklch(0.75_0.15_60/0.4)]",
    complete:
      "bg-[oklch(0.87_0.19_148/0.15)] text-neon-green border border-[oklch(0.87_0.19_148/0.4)]",
    idle: "bg-[oklch(0.22_0.045_232/0.5)] text-muted-custom border border-[oklch(0.22_0.045_232)]",
    working:
      "bg-[oklch(0.75_0.15_60/0.15)] text-[oklch(0.75_0.15_60)] border border-[oklch(0.75_0.15_60/0.4)]",
    active:
      "bg-[oklch(0.87_0.19_148/0.15)] text-neon-green border border-[oklch(0.87_0.19_148/0.4)]",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${map[status] ?? map.idle}`}
    >
      {status}
    </span>
  );
}

// ─── Heartbeat Status Bar ──────────────────────────────────────────────────
function HeartbeatBar() {
  const { data: hb } = useHeartbeatStatus();
  const toggleMutation = useToggleAutoCycle();

  const nowNs = BigInt(Date.now()) * 1_000_000n;
  const lastCycleAt = hb?.lastCycleAt ?? 0n;
  const intervalNs = hb?.intervalNs ?? 1_800_000_000_000n;
  const autoCycleEnabled = hb?.autoCycleEnabled ?? false;
  const heartbeatCount = hb?.heartbeatCount ?? 0n;

  const elapsedNs = lastCycleAt > 0n ? nowNs - lastCycleAt : -1n;
  const elapsedMin = elapsedNs >= 0n ? nsToMinutes(elapsedNs) : -1;

  const remainingNs =
    lastCycleAt > 0n && autoCycleEnabled ? intervalNs - elapsedNs : intervalNs;
  const nextMin = nsToMinutes(remainingNs > 0n ? remainingNs : 0n);

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync();
      toast.success(
        autoCycleEnabled ? "Auto-cycle paused" : "Auto-cycle enabled",
      );
    } catch {
      toast.error("Failed to toggle auto-cycle");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 flex-wrap px-3 py-2 rounded-lg border border-[oklch(0.22_0.045_232)] bg-[oklch(0.09_0.018_241)] text-[11px]"
      data-ocid="heartbeat.panel"
    >
      {/* Status badge */}
      <span
        className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold uppercase tracking-widest text-[10px] border ${
          autoCycleEnabled
            ? "bg-[oklch(0.87_0.19_148/0.15)] text-neon-green border-[oklch(0.87_0.19_148/0.4)]"
            : "bg-[oklch(0.65_0.32_320/0.12)] text-[oklch(0.65_0.32_320)] border-[oklch(0.65_0.32_320/0.4)]"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full inline-block ${
            autoCycleEnabled
              ? "bg-neon-green shadow-[0_0_4px_oklch(0.87_0.19_148)] animate-pulse"
              : "bg-[oklch(0.65_0.32_320)]"
          }`}
        />
        {autoCycleEnabled ? "AUTO" : "PAUSED"}
      </span>

      {/* Separator */}
      <span className="text-[oklch(0.22_0.045_232)]">/</span>

      {/* Last cycle */}
      <span className="flex items-center gap-1 text-muted-custom font-mono-custom">
        <Clock className="w-3 h-3" />
        Last:{" "}
        <span className="text-heading">
          {elapsedMin >= 0 ? `${elapsedMin}m ago` : "Never"}
        </span>
      </span>

      {/* Next cycle */}
      {autoCycleEnabled && (
        <span className="text-muted-custom font-mono-custom">
          Next: <span className="text-neon-cyan">{nextMin}m</span>
        </span>
      )}

      {/* Cycle count */}
      <span className="text-muted-custom font-mono-custom">
        Cycles: <span className="text-heading">{String(heartbeatCount)}</span>
      </span>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Toggle button */}
      <button
        type="button"
        data-ocid="heartbeat.toggle"
        onClick={handleToggle}
        disabled={toggleMutation.isPending}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all disabled:opacity-50 ${
          autoCycleEnabled
            ? "border-[oklch(0.65_0.32_320/0.5)] text-[oklch(0.65_0.32_320)] hover:bg-[oklch(0.65_0.32_320/0.1)]"
            : "border-[oklch(0.87_0.19_148/0.5)] text-neon-green hover:bg-[oklch(0.87_0.19_148/0.1)]"
        }`}
      >
        {toggleMutation.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : autoCycleEnabled ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3" />
        )}
        {autoCycleEnabled ? "Pause" : "Enable"}
      </button>
    </motion.div>
  );
}

function AgentCard({
  agent,
  skills,
  jobs,
}: { agent: (typeof AGENTS)[0]; skills: Skill[]; jobs: Job[] }) {
  const agentSkills = skills
    .filter((s) => s.agentName === agent.name)
    .slice(0, 2);
  const hasActiveJob = jobs.some(
    (j) => j.assignedTo === agent.name && j.status === "assigned",
  );
  const status = hasActiveJob ? "working" : "idle";
  const ringColor =
    agent.color === "cyan"
      ? "ring-[oklch(0.87_0.17_198/0.7)] shadow-[0_0_12px_oklch(0.87_0.17_198/0.4)]"
      : agent.color === "green"
        ? "ring-[oklch(0.87_0.19_148/0.7)] shadow-[0_0_12px_oklch(0.87_0.19_148/0.4)]"
        : "ring-[oklch(0.65_0.32_320/0.7)] shadow-[0_0_12px_oklch(0.65_0.32_320/0.4)]";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="rounded-lg p-3 border border-[oklch(0.22_0.045_232)] bg-[oklch(0.11_0.022_240)] flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ring-2 ${ringColor} bg-[oklch(0.08_0.018_242)] flex-shrink-0`}
        >
          {agent.icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-heading leading-tight">
            {agent.name}
          </p>
          <p className="text-[10px] text-muted-custom leading-tight truncate">
            {agent.role}
          </p>
        </div>
        <StatusPill status={status} />
      </div>
      {agentSkills.length > 0 && (
        <div className="space-y-1.5">
          {agentSkills.map((sk) => (
            <div key={sk.skillName}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-muted-custom capitalize">
                  {sk.skillName}
                </span>
                <span className="font-mono-custom text-heading">
                  {sk.score.toFixed(0)}/100
                </span>
              </div>
              <div className="h-1 rounded-full bg-[oklch(0.22_0.045_232)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[oklch(0.87_0.17_198)] shadow-[0_0_4px_oklch(0.87_0.17_198/0.6)]"
                  style={{ width: `${Math.min(100, sk.score)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {agentSkills.length === 0 && (
        <p className="text-[10px] text-muted-custom">No skills recorded yet</p>
      )}
    </motion.div>
  );
}

function JobCard({ job }: { job: Job }) {
  const edgeMap: Record<string, string> = {
    found: "border-l-[3px] border-l-[oklch(0.87_0.17_198)]",
    assigned: "border-l-[3px] border-l-[oklch(0.75_0.15_60)]",
    complete: "border-l-[3px] border-l-[oklch(0.87_0.19_148)]",
  };
  return (
    <div
      className={`rounded p-2 bg-[oklch(0.09_0.020_240)] border border-[oklch(0.22_0.045_232)] ${edgeMap[job.status] ?? ""} mb-2`}
    >
      <p className="text-xs font-semibold text-heading leading-snug line-clamp-1">
        {job.title}
      </p>
      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
        <PlatformBadge platform={job.platform} />
        <span className="text-[10px] text-muted-custom">{job.jobType}</span>
      </div>
      {job.assignedTo && (
        <p className="text-[10px] text-neon-cyan mt-0.5">→ {job.assignedTo}</p>
      )}
      {job.status === "complete" && job.earnedE8s > 0n && (
        <p className="text-[10px] text-neon-green font-mono-custom">
          {e8sToIcp(job.earnedE8s)} ICP
        </p>
      )}
    </div>
  );
}

function KanbanBoard({ jobs }: { jobs: Job[] }) {
  const columns = [
    { key: "found", label: "Found", color: "text-neon-cyan" },
    { key: "assigned", label: "Assigned", color: "text-[oklch(0.75_0.15_60)]" },
    { key: "complete", label: "Complete", color: "text-neon-green" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {columns.map((col) => {
        const colJobs = jobs.filter((j) => j.status === col.key);
        return (
          <div
            key={col.key}
            className="rounded-lg bg-[oklch(0.09_0.018_241)] border border-[oklch(0.18_0.035_236)] p-2"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${col.color}`}
              >
                {col.label}
              </span>
              <span className="text-[10px] font-mono-custom text-muted-custom">
                {colJobs.length}
              </span>
            </div>
            <ScrollArea className="h-40">
              {colJobs.length === 0 ? (
                <p
                  className="text-[10px] text-muted-custom text-center py-4"
                  data-ocid="jobs.empty_state"
                >
                  No jobs
                </p>
              ) : (
                colJobs.slice(0, 10).map((j) => <JobCard key={j.id} job={j} />)
              )}
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

function GoalBar({ goal }: { goal: Goal }) {
  const pct =
    goal.targetE8s > 0n
      ? Math.min(100, Number((goal.savedE8s * 100n) / goal.targetE8s))
      : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-heading">
          {goal.emoji} {goal.name.replace(/_/g, " ")}
        </span>
        <span className="text-xs font-mono-custom text-neon-cyan">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[oklch(0.22_0.045_232)] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[oklch(0.87_0.17_198)] shadow-[0_0_8px_oklch(0.87_0.17_198/0.6)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-custom font-mono-custom">
        <span>{e8sToIcp(goal.savedE8s)} ICP</span>
        <span>{e8sToIcp(goal.targetE8s)} ICP</span>
      </div>
    </div>
  );
}

function ActivityEntry({ entry, idx }: { entry: LogEntry; idx: number }) {
  return (
    <div
      className="flex gap-3 items-start"
      data-ocid={`activity.item.${idx + 1}`}
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_6px_oklch(0.87_0.17_198/0.8)] mt-1" />
        <div className="w-px flex-1 bg-[oklch(0.22_0.045_232)] min-h-[16px]" />
      </div>
      <div className="pb-3">
        <p className="text-xs text-body leading-snug">{entry.message}</p>
        <p className="text-[10px] font-mono-custom text-muted-custom mt-0.5">
          {formatTs(entry.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── tab views ─────────────────────────────────────────────────────────────
function DashboardView() {
  const { data: jobs = [] } = useJobs();
  const { data: goals = [] } = useGoals();
  const { data: skills = [] } = useSkills();
  const { data: log = [] } = useActivityLog();
  const { data: total } = useTotalEarned();
  const { data: principal = "" } = useWalletPrincipal();

  const reversedLog = [...log].reverse().slice(0, 20);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: agents */}
      <div className="space-y-3">
        <NeonPanel>
          <SectionTitle>My AI Agents</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {AGENTS.map((a) => (
              <AgentCard key={a.name} agent={a} skills={skills} jobs={jobs} />
            ))}
          </div>
        </NeonPanel>
      </div>

      {/* Center: pipeline + goals */}
      <div className="space-y-4">
        <NeonPanel>
          <SectionTitle>Live Job Pipeline Board</SectionTitle>
          <KanbanBoard jobs={jobs} />
        </NeonPanel>
        <NeonPanel>
          <SectionTitle>Team Goals &amp; Progress</SectionTitle>
          <div className="space-y-4">
            {goals.length === 0 ? (
              <p
                className="text-xs text-muted-custom"
                data-ocid="goals.empty_state"
              >
                Loading goals...
              </p>
            ) : (
              goals.map((g) => <GoalBar key={g.name} goal={g} />)
            )}
          </div>
        </NeonPanel>
      </div>

      {/* Right: wallet + activity log */}
      <div className="space-y-4">
        <NeonPanel>
          <SectionTitle>ICP Wallet Panel</SectionTitle>
          <div className="text-center py-2">
            <p className="text-3xl font-bold neon-cyan font-mono-custom">
              {total !== undefined ? e8sToIcp(total) : "0.00"}
            </p>
            <p className="text-xs text-muted-custom mt-1">ICP Earned Total</p>
          </div>
          <div className="mt-3 p-2 rounded bg-[oklch(0.09_0.018_241)] border border-[oklch(0.22_0.045_232)]">
            <p className="text-[10px] text-muted-custom">Principal</p>
            <p className="text-xs font-mono-custom text-heading truncate">
              {truncatePrincipal(principal) || "Not connected"}
            </p>
          </div>
        </NeonPanel>
        <NeonPanel className="flex-1">
          <SectionTitle>Agent Activity Log</SectionTitle>
          <ScrollArea className="h-64">
            {reversedLog.length === 0 ? (
              <p
                className="text-xs text-muted-custom"
                data-ocid="activity.empty_state"
              >
                No activity yet. Run a cycle!
              </p>
            ) : (
              <div>
                {reversedLog.map((entry, i) => (
                  <ActivityEntry
                    key={entry.message.slice(0, 30) + String(i)}
                    entry={entry}
                    idx={i}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </NeonPanel>
      </div>
    </div>
  );
}

function AgentsView() {
  const { data: skills = [], isLoading } = useSkills();
  const { data: jobs = [] } = useJobs();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-heading">AI Agent Team</h2>
      {isLoading ? (
        <div
          className="flex items-center gap-2 text-muted-custom"
          data-ocid="agents.loading_state"
        >
          <Loader2 className="animate-spin w-4 h-4" /> Loading agents...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map((a) => (
            <div
              key={a.name}
              className="rounded-lg p-4 card-dark border border-[oklch(0.22_0.045_232)] space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[oklch(0.08_0.018_242)] ring-2 ring-[oklch(0.87_0.17_198/0.5)] shadow-[0_0_12px_oklch(0.87_0.17_198/0.3)]">
                  {a.icon}
                </div>
                <div>
                  <p className="font-bold text-heading">{a.name}</p>
                  <p className="text-xs text-muted-custom">{a.role}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-custom">
                  Skills
                </p>
                {skills.filter((s) => s.agentName === a.name).length === 0 ? (
                  <p className="text-xs text-muted-custom">No skills yet</p>
                ) : (
                  skills
                    .filter((s) => s.agentName === a.name)
                    .map((sk) => (
                      <div key={sk.skillName}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-body capitalize">
                            {sk.skillName}
                          </span>
                          <span className="font-mono-custom text-neon-cyan">
                            {sk.score.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[oklch(0.22_0.045_232)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[oklch(0.87_0.17_198)] shadow-[0_0_4px_oklch(0.87_0.17_198/0.5)]"
                            style={{ width: `${Math.min(100, sk.score)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-custom mt-0.5">
                          {Number(sk.jobsDone)} jobs done
                        </p>
                      </div>
                    ))
                )}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-custom">Active jobs:</span>
                <span className="font-mono-custom text-neon-green">
                  {
                    jobs.filter(
                      (j) => j.assignedTo === a.name && j.status === "assigned",
                    ).length
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobsView() {
  const { data: jobs = [], isLoading, isError } = useJobs();
  const addJob = useAddJob();
  const [form, setForm] = useState({
    title: "",
    desc: "",
    platform: "",
    jobType: "general",
    url: "",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await addJob.mutateAsync(form);
    toast.success("Job added!");
    setForm({ title: "", desc: "", platform: "", jobType: "general", url: "" });
  };

  return (
    <div className="space-y-6">
      {/* Add job form */}
      <NeonPanel>
        <SectionTitle>Add Job Manually</SectionTitle>
        <form
          onSubmit={handleAdd}
          className="space-y-3"
          data-ocid="addjob.modal"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-custom">Title *</Label>
              <Input
                data-ocid="addjob.input"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Job title"
                className="bg-[oklch(0.09_0.018_241)] border-[oklch(0.22_0.045_232)] text-heading placeholder:text-muted-custom"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-custom">Platform</Label>
              <Input
                value={form.platform}
                onChange={(e) =>
                  setForm((p) => ({ ...p, platform: e.target.value }))
                }
                placeholder="e.g. DFINITY Forum"
                className="bg-[oklch(0.09_0.018_241)] border-[oklch(0.22_0.045_232)] text-heading placeholder:text-muted-custom"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-custom">Type</Label>
              <Select
                value={form.jobType}
                onValueChange={(v) => setForm((p) => ({ ...p, jobType: v }))}
              >
                <SelectTrigger
                  data-ocid="addjob.select"
                  className="bg-[oklch(0.09_0.018_241)] border-[oklch(0.22_0.045_232)] text-heading"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["writing", "coding", "research", "design", "general"].map(
                    (t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-custom">URL</Label>
              <Input
                value={form.url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="https://..."
                className="bg-[oklch(0.09_0.018_241)] border-[oklch(0.22_0.045_232)] text-heading placeholder:text-muted-custom"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-custom">Description</Label>
            <Textarea
              data-ocid="addjob.textarea"
              value={form.desc}
              onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
              placeholder="Job details..."
              rows={2}
              className="bg-[oklch(0.09_0.018_241)] border-[oklch(0.22_0.045_232)] text-heading placeholder:text-muted-custom"
            />
          </div>
          <Button
            type="submit"
            data-ocid="addjob.submit_button"
            disabled={addJob.isPending || !form.title.trim()}
            className="bg-[oklch(0.87_0.17_198)] text-[oklch(0.08_0.018_242)] font-bold hover:bg-[oklch(0.82_0.18_198)] shadow-neon-cyan"
          >
            {addJob.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Add Job
          </Button>
        </form>
      </NeonPanel>

      {/* Job table */}
      <NeonPanel>
        <SectionTitle>All Jobs</SectionTitle>
        {isLoading && (
          <div
            className="text-muted-custom text-sm"
            data-ocid="jobs.loading_state"
          >
            Loading...
          </div>
        )}
        {isError && (
          <div
            className="text-destructive text-sm"
            data-ocid="jobs.error_state"
          >
            Failed to load jobs.
          </div>
        )}
        {!isLoading && !isError && (
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <p
                className="text-sm text-muted-custom"
                data-ocid="jobs.empty_state"
              >
                No jobs yet. Run a cycle to find some!
              </p>
            ) : (
              jobs.slice(0, 30).map((j, i) => (
                <div
                  key={j.id}
                  data-ocid={`jobs.item.${i + 1}`}
                  className={`flex items-start justify-between gap-3 p-3 rounded border-l-2 ${
                    j.status === "found"
                      ? "border-l-neon-cyan"
                      : j.status === "assigned"
                        ? "border-l-[oklch(0.75_0.15_60)]"
                        : "border-l-neon-green"
                  } bg-[oklch(0.09_0.018_241)] border border-[oklch(0.22_0.045_232)]`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-heading line-clamp-1">
                      {j.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <PlatformBadge platform={j.platform} />
                      <span className="text-xs text-muted-custom">
                        {j.jobType}
                      </span>
                    </div>
                    {j.assignedTo && (
                      <p className="text-xs text-neon-cyan">→ {j.assignedTo}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusPill status={j.status} />
                    {j.earnedE8s > 0n && (
                      <span className="text-xs font-mono-custom text-neon-green">
                        {e8sToIcp(j.earnedE8s)} ICP
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </NeonPanel>
    </div>
  );
}

function GoalsView() {
  const { data: goals = [], isLoading } = useGoals();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-heading">Family Goals</h2>
      {isLoading ? (
        <div className="text-muted-custom" data-ocid="goals.loading_state">
          Loading goals...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => (
            <NeonPanel key={g.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-xs font-mono-custom text-neon-cyan">
                  {g.targetE8s > 0n
                    ? Math.min(
                        100,
                        Number((g.savedE8s * 100n) / g.targetE8s),
                      ).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <p className="text-base font-bold text-heading capitalize">
                {g.name.replace(/_/g, " ")}
              </p>
              <div className="h-3 rounded-full bg-[oklch(0.22_0.045_232)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[oklch(0.87_0.17_198)] shadow-[0_0_10px_oklch(0.87_0.17_198/0.7)]"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${g.targetE8s > 0n ? Math.min(100, Number((g.savedE8s * 100n) / g.targetE8s)) : 0}%`,
                  }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-sm font-mono-custom">
                <span className="text-neon-green">
                  {e8sToIcp(g.savedE8s)} ICP saved
                </span>
                <span className="text-muted-custom">
                  {e8sToIcp(g.targetE8s)} ICP target
                </span>
              </div>
            </NeonPanel>
          ))}
          {goals.length === 0 && (
            <p
              className="text-sm text-muted-custom"
              data-ocid="goals.empty_state"
            >
              No goals configured yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function WalletView() {
  const { data: principal = "", isLoading: pLoading } = useWalletPrincipal();
  const { data: total } = useTotalEarned();
  const { data: earnings = [], isLoading: eLoading } = useEarnings();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-heading">ICP Wallet</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NeonPanel>
          <SectionTitle>Wallet Balance</SectionTitle>
          <div className="text-center py-4">
            <p className="text-5xl font-bold neon-cyan font-mono-custom">
              {total !== undefined ? e8sToIcp(total) : "0.00"}
            </p>
            <p className="text-sm text-muted-custom mt-2">ICP</p>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[oklch(0.09_0.018_241)] border border-[oklch(0.22_0.045_232)] space-y-1">
            <p className="text-xs text-muted-custom uppercase tracking-widest">
              Principal ID
            </p>
            {pLoading ? (
              <div
                className="h-4 bg-[oklch(0.22_0.045_232)] rounded animate-pulse"
                data-ocid="wallet.loading_state"
              />
            ) : (
              <p className="text-sm font-mono-custom text-heading break-all">
                {principal || "Not connected"}
              </p>
            )}
          </div>
        </NeonPanel>
        <NeonPanel>
          <SectionTitle>Recent Transactions</SectionTitle>
          <ScrollArea className="h-56">
            {eLoading ? (
              <div
                className="text-muted-custom text-xs"
                data-ocid="earnings.loading_state"
              >
                Loading...
              </div>
            ) : earnings.length === 0 ? (
              <p
                className="text-xs text-muted-custom"
                data-ocid="earnings.empty_state"
              >
                No transactions yet.
              </p>
            ) : (
              <div className="space-y-2">
                {[...earnings]
                  .reverse()
                  .slice(0, 20)
                  .map((e, i) => (
                    <div
                      key={e.jobId + String(i)}
                      data-ocid={`earnings.item.${i + 1}`}
                      className="flex justify-between items-center p-2 rounded bg-[oklch(0.09_0.018_241)] border border-[oklch(0.22_0.045_232)]"
                    >
                      <div>
                        <p className="text-xs text-body font-mono-custom truncate max-w-[140px]">
                          {e.jobId}
                        </p>
                        <p className="text-[10px] text-muted-custom">
                          {formatTs(e.loggedAt)}
                        </p>
                      </div>
                      <span className="text-sm font-bold font-mono-custom text-neon-green">
                        +{e8sToIcp(e.amountE8s)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </NeonPanel>
      </div>
    </div>
  );
}

function SettingsView() {
  const [apiKey, setApiKey] = useState("");
  const setKeyMutation = useSetApiKey();

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    await setKeyMutation.mutateAsync(apiKey);
    toast.success("Claude API key saved!");
    setApiKey("");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-bold text-heading">Settings</h2>
      <NeonPanel>
        <SectionTitle>Claude API Key</SectionTitle>
        <p className="text-xs text-muted-custom mb-3">
          Set your Anthropic API key to enable real AI agent work. It will be
          stored securely on-chain.
        </p>
        <form
          onSubmit={handleSaveKey}
          className="space-y-3"
          data-ocid="settings.modal"
        >
          <div>
            <Label className="text-xs text-muted-custom">API Key</Label>
            <Input
              type="password"
              data-ocid="settings.input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="bg-[oklch(0.09_0.018_241)] border-[oklch(0.22_0.045_232)] text-heading placeholder:text-muted-custom font-mono-custom"
            />
          </div>
          <Button
            type="submit"
            data-ocid="settings.save_button"
            disabled={setKeyMutation.isPending || !apiKey.trim()}
            className="bg-[oklch(0.87_0.17_198)] text-[oklch(0.08_0.018_242)] font-bold hover:bg-[oklch(0.82_0.18_198)] shadow-neon-cyan"
          >
            {setKeyMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save API Key
          </Button>
          {setKeyMutation.isSuccess && (
            <p
              className="text-xs text-neon-green"
              data-ocid="settings.success_state"
            >
              ✓ Key saved successfully.
            </p>
          )}
          {setKeyMutation.isError && (
            <p
              className="text-xs text-destructive"
              data-ocid="settings.error_state"
            >
              Failed to save key.
            </p>
          )}
        </form>
      </NeonPanel>
    </div>
  );
}

// ─── nav tabs ──────────────────────────────────────────────────────────────
const NAV_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-3.5 h-3.5" />,
  },
  { key: "agents", label: "Agents", icon: <Cpu className="w-3.5 h-3.5" /> },
  { key: "jobs", label: "Jobs", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { key: "goals", label: "Goals", icon: <Target className="w-3.5 h-3.5" /> },
  { key: "wallet", label: "Wallet", icon: <Wallet className="w-3.5 h-3.5" /> },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className="w-3.5 h-3.5" />,
  },
];

// ─── main app ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const runCycle = useRunCycle();
  const { data: principal = "" } = useWalletPrincipal();
  const { data: total } = useTotalEarned();

  const handleRunCycle = async () => {
    try {
      const msg = await runCycle.mutateAsync();
      toast.success(String(msg || "Cycle completed!"));
    } catch {
      toast.error("Cycle failed. Check your API key in Settings.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster theme="dark" position="top-right" />

      {/* Header */}
      <header className="border-b border-[oklch(0.22_0.045_232)] bg-[oklch(0.09_0.018_241)] sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.87_0.17_198/0.15)] border border-[oklch(0.87_0.17_198/0.5)] flex items-center justify-center shadow-neon-cyan">
              <Zap className="w-4 h-4 text-neon-cyan" />
            </div>
            <div>
              <p className="text-sm font-bold text-heading tracking-wider leading-none">
                NEXUS AI
              </p>
              <p className="text-[9px] text-muted-custom tracking-[0.15em] leading-none mt-0.5">
                ICP AGENT TEAM
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav
            className="flex items-center gap-1 flex-1 overflow-x-auto"
            aria-label="Main navigation"
          >
            {NAV_TABS.map((t) => (
              <button
                type="button"
                key={t.key}
                data-ocid={`nav.${t.key}.link`}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap ${
                  tab === t.key
                    ? "bg-[oklch(0.87_0.17_198/0.15)] text-neon-cyan border border-[oklch(0.87_0.17_198/0.5)] shadow-neon-cyan"
                    : "text-muted-custom hover:text-heading hover:bg-[oklch(0.15_0.03_236)]"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Wallet chip */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[oklch(0.87_0.17_198/0.1)] border border-[oklch(0.87_0.17_198/0.4)] shadow-neon-cyan">
            <Wallet className="w-3.5 h-3.5 text-neon-cyan" />
            <div className="text-right">
              <p className="text-xs font-mono-custom font-bold text-neon-cyan leading-none">
                {total !== undefined ? `${e8sToIcp(total)} ICP` : "0.00 ICP"}
              </p>
              <p className="text-[9px] text-muted-custom leading-none mt-0.5">
                {truncatePrincipal(principal) || "Not connected"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Page title block */}
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            <span className="neon-cyan">AI AGENT SQUAD</span>
            <span className="text-heading"> DASHBOARD</span>
          </h1>
          <p className="text-sm text-muted-custom mt-1">
            Live AI agent system on ICP blockchain — autonomous job discovery,
            execution &amp; earnings
          </p>
        </motion.div>

        {/* Heartbeat / Auto-cycle status bar */}
        <div className="mb-6">
          <HeartbeatBar />
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {tab === "dashboard" && <DashboardView />}
            {tab === "agents" && <AgentsView />}
            {tab === "jobs" && <JobsView />}
            {tab === "goals" && <GoalsView />}
            {tab === "wallet" && <WalletView />}
            {tab === "settings" && <SettingsView />}
          </motion.div>
        </AnimatePresence>

        {/* RUN CYCLE button */}
        <div className="mt-8 flex justify-center">
          <motion.button
            type="button"
            data-ocid="run_cycle.primary_button"
            onClick={handleRunCycle}
            disabled={runCycle.isPending}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative flex items-center gap-3 px-10 py-4 rounded-xl font-extrabold text-base tracking-widest uppercase text-white shadow-neon-magenta transition-all disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.65 0.32 320), oklch(0.45 0.28 288))",
            }}
          >
            <span className="absolute inset-0 rounded-xl ring-2 ring-[oklch(0.65_0.32_320/0.5)]" />
            {runCycle.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {runCycle.isPending ? "Running Cycle..." : "RUN CYCLE"}
            {!runCycle.isPending && <ChevronRight className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[oklch(0.22_0.045_232)] mt-10">
        <div className="max-w-[1200px] mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-custom">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
