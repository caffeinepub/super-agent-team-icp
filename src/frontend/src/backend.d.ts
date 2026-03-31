import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> { __kind__: "Some"; value: T; }
export interface None { __kind__: "None"; }
export type Option<T> = Some<T> | None;
export interface Job {
  id: string;
  title: string;
  description: string;
  platform: string;
  jobType: string;
  url: string;
  status: string;
  assignedTo: string;
  result: string;
  earnedE8s: bigint;
  foundAt: bigint;
  completedAt: bigint;
}
export interface Goal {
  name: string;
  emoji: string;
  targetE8s: bigint;
  savedE8s: bigint;
}
export interface Skill {
  agentName: string;
  skillName: string;
  score: number;
  jobsDone: bigint;
}
export interface Lesson {
  agentName: string;
  jobId: string;
  lesson: string;
  learnedAt: bigint;
}
export interface EarningEntry {
  jobId: string;
  amountE8s: bigint;
  wallet: string;
  loggedAt: bigint;
}
export interface LogEntry {
  message: string;
  timestamp: bigint;
}
export interface HeartbeatStatus {
  lastCycleAt: bigint;
  heartbeatCount: bigint;
  autoCycleEnabled: boolean;
  intervalNs: bigint;
}
export interface backendInterface {
  getJobs(): Promise<Job[]>;
  getGoals(): Promise<Goal[]>;
  getSkills(): Promise<Skill[]>;
  getEarnings(): Promise<EarningEntry[]>;
  getLessons(agentName: string): Promise<Lesson[]>;
  getTotalEarned(): Promise<bigint>;
  getActivityLog(): Promise<LogEntry[]>;
  getWalletPrincipal(): Promise<string>;
  getHeartbeatStatus(): Promise<HeartbeatStatus>;
  runCycle(): Promise<string>;
  setClaudeApiKey(key: string): Promise<void>;
  toggleAutoCycle(): Promise<void>;
  addJob(title: string, desc: string, platform: string, jobType: string, url: string): Promise<void>;
  _initializeAccessControlWithSecret(adminToken: string): Promise<void>;
}
