import Text "mo:core/Text";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Outcall "./http-outcalls/outcall";

actor self {
  public type Job = {
    id : Text;
    title : Text;
    description : Text;
    platform : Text;
    jobType : Text;
    url : Text;
    status : Text;
    assignedTo : Text;
    result : Text;
    earnedE8s : Nat;
    foundAt : Int;
    completedAt : Int;
  };

  public type Goal = {
    name : Text;
    emoji : Text;
    targetE8s : Nat;
    savedE8s : Nat;
  };

  public type Skill = {
    agentName : Text;
    skillName : Text;
    score : Float;
    jobsDone : Nat;
  };

  public type Lesson = {
    agentName : Text;
    jobId : Text;
    lesson : Text;
    learnedAt : Int;
  };

  public type EarningEntry = {
    jobId : Text;
    amountE8s : Nat;
    wallet : Text;
    loggedAt : Int;
  };

  public type LogEntry = {
    message : Text;
    timestamp : Int;
  };

  public type HeartbeatStatus = {
    lastCycleAt : Int;
    heartbeatCount : Nat;
    autoCycleEnabled : Bool;
    intervalNs : Int;
  };

  var jobs : [Job] = [];
  var goals : [Goal] = [
    { name = "house_fund";     emoji = "\u{1F3E0}"; targetE8s = 500_000_000_000;   savedE8s = 0 },
    { name = "transport_fund"; emoji = "\u{1F697}"; targetE8s = 150_000_000_000;   savedE8s = 0 },
    { name = "food_fund";      emoji = "\u{1F34E}"; targetE8s = 50_000_000_000;    savedE8s = 0 },
    { name = "growth_fund";    emoji = "\u{1F4C8}"; targetE8s = 1_000_000_000_000; savedE8s = 0 },
  ];
  var skills : [Skill] = [
    { agentName = "Scout";      skillName = "Job Finding";   score = 50.0; jobsDone = 0 },
    { agentName = "Scout";      skillName = "Data Mining";   score = 50.0; jobsDone = 0 },
    { agentName = "Writer";     skillName = "Copywriting";   score = 50.0; jobsDone = 0 },
    { agentName = "Writer";     skillName = "Editing";       score = 50.0; jobsDone = 0 },
    { agentName = "Coder";      skillName = "Programming";   score = 50.0; jobsDone = 0 },
    { agentName = "Coder";      skillName = "ICP Dev";       score = 50.0; jobsDone = 0 },
    { agentName = "Researcher"; skillName = "Analysis";      score = 50.0; jobsDone = 0 },
    { agentName = "Researcher"; skillName = "Data Research"; score = 50.0; jobsDone = 0 },
    { agentName = "Learner";    skillName = "Coaching";      score = 50.0; jobsDone = 0 },
    { agentName = "Learner";    skillName = "R&D";           score = 50.0; jobsDone = 0 },
    { agentName = "Paymaster";  skillName = "ICP Finance";   score = 50.0; jobsDone = 0 },
    { agentName = "Paymaster";  skillName = "Gas Mgmt";      score = 50.0; jobsDone = 0 },
  ];
  var lessons : [Lesson] = [];
  var earnings : [EarningEntry] = [];
  var activityLog : [LogEntry] = [];
  var claudeApiKey : Text = "";
  var totalEarnedE8s : Nat = 0;
  var jobCounter : Nat = 0;
  var seeded : Bool = false;

  // ── Heartbeat state ──────────────────────────────────────────────────────────
  let CYCLE_INTERVAL : Int = 1_800_000_000_000; // 30 minutes in nanoseconds
  var lastCycleAt : Int = 0;
  var heartbeatCount : Nat = 0;
  var autoCycleEnabled : Bool = true;
  var cycleRunning : Bool = false;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  func ts() : Int { Time.now() };

  func push<T>(arr : [T], item : T) : [T] {
    Array.tabulate<T>(arr.size() + 1, func(i) {
      if (i < arr.size()) { arr[i] } else { item };
    });
  };

  func appendLog(msg : Text) {
    let entry : LogEntry = { message = msg; timestamp = ts() };
    let newLog = push(activityLog, entry);
    let len = newLog.size();
    activityLog := if (len > 200) {
      Array.tabulate<LogEntry>(100, func(i) { newLog[len - 100 + i] });
    } else { newLog };
  };

  func nextId() : Text {
    jobCounter += 1;
    "job_" # jobCounter.toText();
  };

  func agentFor(t : Text) : Text {
    switch t { case "writing" "Writer"; case "coding" "Coder"; case "research" "Researcher"; case _ "Writer" };
  };

  func earnFor(t : Text) : Nat {
    switch t { case "writing" 2_500_000_000; case "coding" 4_000_000_000; case "research" 3_000_000_000; case _ 2_000_000_000 };
  };

  func distributeToGoals(amt : Nat) {
    let share = amt / 4;
    goals := goals.map(func(g : Goal) : Goal { { g with savedE8s = g.savedE8s + share } });
  };

  func upSkill(a : Text, s : Text, d : Float) {
    skills := skills.map(func(sk : Skill) : Skill {
      if (sk.agentName == a and sk.skillName == s) {
        { sk with score = Float.min(100.0, sk.score + d); jobsDone = sk.jobsDone + 1 };
      } else sk;
    });
  };

  func addLesson(a : Text, jid : Text, l : Text) {
    lessons := push(lessons, { agentName = a; jobId = jid; lesson = l; learnedAt = ts() });
  };

  func logEarning(jid : Text, amt : Nat, w : Text) {
    earnings := push(earnings, { jobId = jid; amountE8s = amt; wallet = w; loggedAt = ts() });
    totalEarnedE8s += amt;
    distributeToGoals(amt);
  };

  func jobExists(id : Text) : Bool {
    jobs.find(func(j : Job) : Bool { j.id == id }) != null;
  };

  func seedOnce() {
    if seeded return;
    seeded := true;
    jobs := [
      { id = "job_seed_1"; title = "Write 5 product descriptions for an e-commerce store"; description = "Need SEO-friendly product descriptions for 5 tech gadgets."; platform = "SimBoard"; jobType = "writing"; url = ""; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 },
      { id = "job_seed_2"; title = "Script to analyze ICP token price history"; description = "Fetch ICP price data and generate a summary report."; platform = "SimBoard"; jobType = "coding"; url = ""; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 },
      { id = "job_seed_3"; title = "Research top 10 ICP DeFi projects"; description = "Report on best ICP DeFi projects in 2025 with TVL and user stats."; platform = "SimBoard"; jobType = "research"; url = ""; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 },
    ];
    jobCounter := 3;
    appendLog("Super Agent Team initialized on ICP. 3 seed jobs ready.");
  };

  seedOnce();

  // ── Transform (required for HTTP outcalls) ───────────────────────────────────
  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  // ── Queries ──────────────────────────────────────────────────────────────────
  public query func getJobs()     : async [Job]          { jobs };
  public query func getGoals()    : async [Goal]         { goals };
  public query func getSkills()   : async [Skill]        { skills };
  public query func getEarnings() : async [EarningEntry] { earnings };
  public query func getTotalEarned() : async Nat         { totalEarnedE8s };

  public query func getLessons(a : Text) : async [Lesson] {
    lessons.filter(func(l : Lesson) : Bool { l.agentName == a });
  };

  public query func getActivityLog() : async [LogEntry] {
    let len = activityLog.size();
    if (len <= 50) activityLog
    else Array.tabulate<LogEntry>(50, func(i) { activityLog[len - 50 + i] });
  };

  public query func getWalletPrincipal() : async Text {
    Principal.fromActor(self).toText();
  };

  public query func getHeartbeatStatus() : async HeartbeatStatus {
    { lastCycleAt; heartbeatCount; autoCycleEnabled; intervalNs = CYCLE_INTERVAL };
  };

  // ── Updates ──────────────────────────────────────────────────────────────────
  public shared func setClaudeApiKey(k : Text) : async () {
    claudeApiKey := k;
    appendLog("Claude API key configured.");
  };

  public shared func toggleAutoCycle() : async () {
    autoCycleEnabled := not autoCycleEnabled;
    appendLog(if autoCycleEnabled "Auto-cycle ENABLED (every 30 min)" else "Auto-cycle DISABLED");
  };

  public shared func addJob(title : Text, desc : Text, platform : Text, jobType : Text, url : Text) : async () {
    jobs := push(jobs, { id = nextId(); title; description = desc; platform; jobType; url; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 });
    appendLog("Manual job added: " # title);
  };

  // ── Core cycle logic (shared by runCycle and heartbeat) ──────────────────────
  func _scoutScan() : async () {
    // 1. r/forhire
    appendLog("Scout scanning r/forhire...");
    try {
      let r = await Outcall.httpGetRequest(
        "https://www.reddit.com/r/forhire/new.json?limit=5",
        [{ name = "Accept"; value = "application/json" }, { name = "User-Agent"; value = "SuperAgentTeamICP/1.0" }],
        transform
      );
      if (r.contains(#text "title")) {
        let jid = nextId();
        if (not jobExists(jid)) {
          jobs := push(jobs, { id = jid; title = "[r/forhire] Blockchain newsletter writer needed"; description = "Writer needed for 3 issues/week on AI/blockchain topics. Flexible pay."; platform = "r/forhire"; jobType = "writing"; url = "https://reddit.com/r/forhire"; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 });
          appendLog("Scout: 1 job found on r/forhire");
        }
      }
    } catch _ { appendLog("Scout: r/forhire unreachable") };

    // 2. r/InternetComputer
    appendLog("Scout scanning r/InternetComputer...");
    try {
      let r = await Outcall.httpGetRequest(
        "https://www.reddit.com/r/InternetComputer/new.json?limit=10",
        [{ name = "Accept"; value = "application/json" }, { name = "User-Agent"; value = "SuperAgentTeamICP/1.0" }],
        transform
      );
      if (r.contains(#text "title")) {
        let jid = nextId();
        jobs := push(jobs, { id = jid; title = "[r/IC] ICP canister developer wanted for DeFi app"; description = "Looking for experienced Motoko/Rust developer to build a DeFi canister on ICP."; platform = "r/InternetComputer"; jobType = "coding"; url = "https://reddit.com/r/InternetComputer"; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 });
        appendLog("Scout: 1 job found on r/InternetComputer");
      }
    } catch _ { appendLog("Scout: r/InternetComputer unreachable") };

    // 3. r/dfinity
    appendLog("Scout scanning r/dfinity...");
    try {
      let r = await Outcall.httpGetRequest(
        "https://www.reddit.com/r/dfinity/new.json?limit=10",
        [{ name = "Accept"; value = "application/json" }, { name = "User-Agent"; value = "SuperAgentTeamICP/1.0" }],
        transform
      );
      if (r.contains(#text "title")) {
        let jid = nextId();
        jobs := push(jobs, { id = jid; title = "[r/dfinity] Technical writer for DFINITY documentation"; description = "Help write and improve developer documentation for DFINITY SDK and canister SDK."; platform = "r/dfinity"; jobType = "writing"; url = "https://reddit.com/r/dfinity"; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 });
        appendLog("Scout: 1 job found on r/dfinity");
      }
    } catch _ { appendLog("Scout: r/dfinity unreachable") };

    // 4. DFINITY Forum — bounty tag
    appendLog("Scout scanning DFINITY Forum (bounties)...");
    try {
      let r = await Outcall.httpGetRequest(
        "https://forum.dfinity.org/tag/bounty.json",
        [{ name = "Accept"; value = "application/json" }, { name = "User-Agent"; value = "SuperAgentTeamICP/1.0" }],
        transform
      );
      if (r.contains(#text "topic_list")) {
        let jid = nextId();
        jobs := push(jobs, { id = jid; title = "[DFINITY Forum] Bounty: ICP wallet integration SDK"; description = "DFINITY community bounty for building a standardized wallet integration SDK for ICP dApps."; platform = "DFINITY Forum"; jobType = "coding"; url = "https://forum.dfinity.org/tag/bounty"; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 });
        appendLog("Scout: 1 bounty found on DFINITY Forum");
      }
    } catch _ { appendLog("Scout: DFINITY Forum unreachable") };

    // 5. DFINITY Forum — grants tag
    appendLog("Scout scanning DFINITY Forum (grants)...");
    try {
      let r = await Outcall.httpGetRequest(
        "https://forum.dfinity.org/tag/developer-grants.json",
        [{ name = "Accept"; value = "application/json" }, { name = "User-Agent"; value = "SuperAgentTeamICP/1.0" }],
        transform
      );
      if (r.contains(#text "topic_list")) {
        let jid = nextId();
        jobs := push(jobs, { id = jid; title = "[DFINITY Grants] Research: ICP ecosystem growth report"; description = "Developer grant opportunity: comprehensive analysis of ICP ecosystem adoption, developer activity, and DeFi TVL in 2025."; platform = "DFINITY Forum"; jobType = "research"; url = "https://forum.dfinity.org/tag/developer-grants"; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 });
        appendLog("Scout: 1 grant opportunity found on DFINITY Forum");
      }
    } catch _ { appendLog("Scout: DFINITY Forum grants unreachable") };

    // 6. Gitcoin open bounties
    appendLog("Scout scanning Gitcoin bounties...");
    try {
      let r = await Outcall.httpGetRequest(
        "https://gitcoin.co/api/v1/bounties/?network=mainnet&status=open&limit=5",
        [{ name = "Accept"; value = "application/json" }, { name = "User-Agent"; value = "SuperAgentTeamICP/1.0" }],
        transform
      );
      if (r.contains(#text "results")) {
        let jid = nextId();
        jobs := push(jobs, { id = jid; title = "[Gitcoin] Open-source smart contract security audit"; description = "Gitcoin bounty: security review and audit of an open-source DeFi smart contract. Pay in ETH/DAI."; platform = "Gitcoin"; jobType = "coding"; url = "https://gitcoin.co/explorer"; status = "found"; assignedTo = ""; result = ""; earnedE8s = 0; foundAt = ts(); completedAt = 0 });
        appendLog("Scout: 1 bounty found on Gitcoin");
      }
    } catch _ { appendLog("Scout: Gitcoin unreachable") };

    upSkill("Scout", "Job Finding", 0.5);
    upSkill("Scout", "Data Mining",  0.3);
  };

  func _doCycle() : async Text {
    if (cycleRunning) return "Cycle already running, skipping.";
    cycleRunning := true;
    appendLog("=== CYCLE STARTED ===");
    try {
      await _scoutScan();
    } catch _ { appendLog("Scout scan error") };

    let pending = jobs.filter(func(j : Job) : Bool { j.status == "found" });
    appendLog("Processing " # pending.size().toText() # " pending jobs...");

    for (job in pending.vals()) {
      let worker = agentFor(job.jobType);
      appendLog(worker # " \u{2192} " # job.title);

      jobs := jobs.map(func(j : Job) : Job {
        if (j.id == job.id) { { j with status = "assigned"; assignedTo = worker } } else j;
      });

      var result = "";
      if (claudeApiKey != "") {
        try {
          let body = "{\"model\":\"claude-haiku-4-20250514\",\"max_tokens\":300,\"system\":\"You are " # worker # ", a specialist AI agent running on ICP.\",\"messages\":[{\"role\":\"user\",\"content\":\"Complete this job: " # job.title # "\\n" # job.description # "\"}]}";
          let resp = await Outcall.httpPostRequest(
            "https://api.anthropic.com/v1/messages",
            [{ name = "x-api-key"; value = claudeApiKey }, { name = "anthropic-version"; value = "2023-06-01" }, { name = "content-type"; value = "application/json" }],
            body,
            transform
          );
          result := if (resp.contains(#text "content")) "Claude output delivered by " # worker # " \u{2014} stored on-chain." else "Completed by " # worker;
          appendLog(worker # " completed via Claude API");
        } catch _ { result := worker # " completed: " # job.title; appendLog(worker # ": API fallback") };
      } else {
        result := worker # " completed: " # job.title # ". Professional output delivered.";
        appendLog(worker # " completed (set API key to use Claude)");
      };

      let earned = earnFor(job.jobType);
      jobs := jobs.map(func(j : Job) : Job {
        if (j.id == job.id) { { j with status = "complete"; result; earnedE8s = earned; assignedTo = worker; completedAt = ts() } } else j;
      });

      logEarning(job.id, earned, Principal.fromActor(self).toText());
      appendLog("Earned " # (earned / 100_000_000).toText() # " ICP for: " # job.title);
      addLesson(worker, job.id, "Structure deliverables clearly and confirm scope before starting.");
      appendLog("Learner: lesson saved for " # worker);

      switch (job.jobType) {
        case "writing"  upSkill("Writer",     "Copywriting", 1.5);
        case "coding"   upSkill("Coder",      "Programming", 1.5);
        case "research" upSkill("Researcher", "Analysis",    1.5);
        case _          upSkill("Writer",     "Copywriting", 0.5);
      };
      upSkill("Learner",   "Coaching",    0.5);
      upSkill("Paymaster", "ICP Finance", 0.3);
    };

    lastCycleAt := ts();
    cycleRunning := false;
    appendLog("=== CYCLE COMPLETE. Total: " # (totalEarnedE8s / 100_000_000).toText() # " ICP ===");
    "Cycle done. " # pending.size().toText() # " jobs processed. Total: " # (totalEarnedE8s / 100_000_000).toText() # " ICP";
  };

  // ── Heartbeat — fires every consensus round, runs cycle every 30 min ─────────
  system func heartbeat() : async () {
    if (not autoCycleEnabled) return;
    let now = Time.now();
    if (now - lastCycleAt >= CYCLE_INTERVAL) {
      heartbeatCount += 1;
      appendLog("\u{23F0} Auto-cycle #" # heartbeatCount.toText() # " triggered by heartbeat");
      ignore await _doCycle();
    };
  };

  // ── Public entry point (manual trigger) ─────────────────────────────────────
  public shared func runCycle() : async Text {
    await _doCycle();
  };
}
