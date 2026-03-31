import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  EarningEntry,
  Goal,
  HeartbeatStatus,
  Job,
  LogEntry,
  Skill,
  backendInterface,
} from "../backend.d";
import { useActor } from "./useActor";

function getActor(actor: unknown): backendInterface {
  return actor as backendInterface;
}

export function useJobs() {
  const { actor, isFetching } = useActor();
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      if (!actor) return [];
      return getActor(actor).getJobs();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useGoals() {
  const { actor, isFetching } = useActor();
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: async () => {
      if (!actor) return [];
      return getActor(actor).getGoals();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useSkills() {
  const { actor, isFetching } = useActor();
  return useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: async () => {
      if (!actor) return [];
      return getActor(actor).getSkills();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useEarnings() {
  const { actor, isFetching } = useActor();
  return useQuery<EarningEntry[]>({
    queryKey: ["earnings"],
    queryFn: async () => {
      if (!actor) return [];
      return getActor(actor).getEarnings();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useTotalEarned() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["totalEarned"],
    queryFn: async () => {
      if (!actor) return 0n;
      return getActor(actor).getTotalEarned();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useActivityLog() {
  const { actor, isFetching } = useActor();
  return useQuery<LogEntry[]>({
    queryKey: ["activityLog"],
    queryFn: async () => {
      if (!actor) return [];
      return getActor(actor).getActivityLog();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useWalletPrincipal() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["walletPrincipal"],
    queryFn: async () => {
      if (!actor) return "";
      return getActor(actor).getWalletPrincipal();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useHeartbeatStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<HeartbeatStatus>({
    queryKey: ["heartbeatStatus"],
    queryFn: async () => {
      if (!actor) {
        return {
          lastCycleAt: 0n,
          heartbeatCount: 0n,
          autoCycleEnabled: false,
          intervalNs: 1_800_000_000_000n,
        };
      }
      return getActor(actor).getHeartbeatStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useRunCycle() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return getActor(actor).runCycle();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["earnings"] });
      qc.invalidateQueries({ queryKey: ["totalEarned"] });
      qc.invalidateQueries({ queryKey: ["activityLog"] });
      qc.invalidateQueries({ queryKey: ["heartbeatStatus"] });
    },
  });
}

export function useToggleAutoCycle() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return getActor(actor).toggleAutoCycle();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["heartbeatStatus"] });
    },
  });
}

export function useSetApiKey() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (key: string) => {
      if (!actor) throw new Error("No actor");
      return getActor(actor).setClaudeApiKey(key);
    },
  });
}

export function useAddJob() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      title: string;
      desc: string;
      platform: string;
      jobType: string;
      url: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return getActor(actor).addJob(
        args.title,
        args.desc,
        args.platform,
        args.jobType,
        args.url,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
