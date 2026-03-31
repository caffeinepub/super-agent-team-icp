// @ts-nocheck
export const idlFactory = ({ IDL }) => {
  const Job = IDL.Record({
    id: IDL.Text, title: IDL.Text, description: IDL.Text,
    platform: IDL.Text, jobType: IDL.Text, url: IDL.Text,
    status: IDL.Text, assignedTo: IDL.Text, result: IDL.Text,
    earnedE8s: IDL.Nat, foundAt: IDL.Int, completedAt: IDL.Int,
  });
  const Goal = IDL.Record({
    name: IDL.Text, emoji: IDL.Text, targetE8s: IDL.Nat, savedE8s: IDL.Nat,
  });
  const Skill = IDL.Record({
    agentName: IDL.Text, skillName: IDL.Text, score: IDL.Float64, jobsDone: IDL.Nat,
  });
  const Lesson = IDL.Record({
    agentName: IDL.Text, jobId: IDL.Text, lesson: IDL.Text, learnedAt: IDL.Int,
  });
  const EarningEntry = IDL.Record({
    jobId: IDL.Text, amountE8s: IDL.Nat, wallet: IDL.Text, loggedAt: IDL.Int,
  });
  const LogEntry = IDL.Record({ message: IDL.Text, timestamp: IDL.Int });
  const TransformInput = IDL.Record({
    context: IDL.Vec(IDL.Nat8),
    response: IDL.Record({ body: IDL.Vec(IDL.Nat8), headers: IDL.Vec(IDL.Record({ name: IDL.Text, value: IDL.Text })), status: IDL.Nat }),
  });
  const TransformOutput = IDL.Record({
    body: IDL.Vec(IDL.Nat8),
    headers: IDL.Vec(IDL.Record({ name: IDL.Text, value: IDL.Text })),
    status: IDL.Nat,
  });
  return IDL.Service({
    getJobs:           IDL.Func([], [IDL.Vec(Job)], ['query']),
    getGoals:          IDL.Func([], [IDL.Vec(Goal)], ['query']),
    getSkills:         IDL.Func([], [IDL.Vec(Skill)], ['query']),
    getEarnings:       IDL.Func([], [IDL.Vec(EarningEntry)], ['query']),
    getLessons:        IDL.Func([IDL.Text], [IDL.Vec(Lesson)], ['query']),
    getTotalEarned:    IDL.Func([], [IDL.Nat], ['query']),
    getActivityLog:    IDL.Func([], [IDL.Vec(LogEntry)], ['query']),
    getWalletPrincipal: IDL.Func([], [IDL.Text], ['query']),
    runCycle:          IDL.Func([], [IDL.Text], []),
    setClaudeApiKey:   IDL.Func([IDL.Text], [], []),
    addJob:            IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [], []),
    transform:         IDL.Func([TransformInput], [TransformOutput], ['query']),
  });
};
export const idlService = idlFactory({ IDL: { Record: () => {}, Vec: () => {}, Text: {}, Nat: {}, Int: {}, Float64: {}, Func: () => {}, Service: () => {}, Nat8: {} } });
export const idlInitArgs = [];
export const init = ({ IDL }) => [];
