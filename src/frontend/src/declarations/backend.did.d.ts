/* eslint-disable */
// @ts-nocheck
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

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
export interface _SERVICE {
  getJobs: ActorMethod<[], Job[]>;
  getGoals: ActorMethod<[], Goal[]>;
  getSkills: ActorMethod<[], Skill[]>;
  getEarnings: ActorMethod<[], EarningEntry[]>;
  getLessons: ActorMethod<[string], Lesson[]>;
  getTotalEarned: ActorMethod<[], bigint>;
  getActivityLog: ActorMethod<[], LogEntry[]>;
  getWalletPrincipal: ActorMethod<[], string>;
  runCycle: ActorMethod<[], string>;
  setClaudeApiKey: ActorMethod<[string], void>;
  addJob: ActorMethod<[string, string, string, string, string], void>;
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
