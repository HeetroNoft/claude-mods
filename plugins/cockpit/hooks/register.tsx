import { atom, read, update } from "claude-code";
import type { Register } from "claude-code";

import type { Card, Layout, Mission, State, Tab } from "../types";
import { ago, clean, liveOthers, order, rowTime, rowWhen, summary, updateCard } from "./cards";
import {
  applyTask,
  bar,
  clock,
  describe,
  finishStep,
  fromTodos,
  planRows,
  BAR_H,
  progressSvg,
  setPlan,
  stepTime,
  tick,
  timed,
} from "./core";

// Cockpit: one band above the prompt, on every surface (terminal, VS Code, the desktop app, the
// web). Its Mission tab is this turn: the plan fills as a progress bar, a line says what Claude
// is doing in plain words, your asks tick off with proof, and a chime plays when the turn ends.
// Its Sessions tab lists your other open sessions, each from the card it writes to
// ~/.claude/session-cards/, with an Ask button that only drafts a line in your prompt.
// Nothing is sent anywhere.

const EMPTY: Mission = {
  steps: [],
  feed: [],
  asks: [],
  nextAsk: 1,
  startedMs: 0,
  nowMs: 0,
  running: false,
  doneBanner: "",
};
const mission = atom({ plugin: "cockpit", key: "mission" } as const, EMPTY);

const FEED = 3;
const plainRows = atom({ plugin: "cockpit", key: "plainRows" } as const, true);
const tab = atom({ plugin: "cockpit", key: "tab" } as const, "mission" as Tab);
const others = atom({ plugin: "cockpit", key: "others" } as const, [] as Card[]);
const isHidden = atom({ plugin: "cockpit", key: "isHidden" } as const, false);
// The band folded to one line, like an accordion; kept for this session only ($.state).
const folded = atom({ plugin: "cockpit", key: "folded" } as const, false);
// Which layout the band draws, set by /cockpit-layout: `tabs` (Mission and Sessions tabs) or
// `stacked` (one view, the other sessions stacked under the mission).
const layout = atom({ plugin: "cockpit", key: "layout" } as const, "tabs" as Layout);
const LAYOUTS: Record<Layout, string> = {
  tabs: "tabs: a Mission and a Sessions tab",
  stacked: "stacked: one view, the other sessions under the mission",
};
const nowMs = atom({ plugin: "cockpit", key: "nowMs" } as const, 0);

// How its own tool calls read in the transcript.
const OWN: Record<string, (i: any) => string> = {
  set_plan: (i) => `Plan: ${(i.steps ?? []).length} steps`,
  step_done: (i) => (i.step == null ? "Step done" : `Step ${i.step} done`),
  add_ask: () => "Ask added",
  tick_ask: () => "Ask ticked off",
};
const set = ($: any, fn: (m: Mission) => Partial<Mission>) =>
  update($, mission, (m) => ({ ...(m ?? EMPTY), ...fn(m ?? EMPTY) }));
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s);

const TOOLS = [
  {
    name: "set_plan",
    description: "Show the task's plan: 3-6 short steps, user's language.",
    inputSchema: {
      type: "object",
      properties: { steps: { type: "array", items: { type: "string" } } },
      required: ["steps"],
    },
  },
  {
    name: "step_done",
    description: "Mark plan step n (1-based) done.",
    inputSchema: { type: "object", properties: { step: { type: "number" } }, required: ["step"] },
  },
  {
    name: "add_ask",
    description: "Add an ask not typed by the user (e.g. from another session).",
    inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
  },
  {
    name: "tick_ask",
    description: "Tick an ask off once really done, with proof.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" }, proof: { type: "string" } },
      required: ["id", "proof"],
    },
  },
];

function reminder(m: Mission) {
  const open = m.asks.filter((a) => !a.done);
  // Every prompt carries this, so each word costs tokens: keep it short.
  const lines = [
    "Cockpit: on a 3+ step task call mcp__cockpit__set_plan once; call mcp__cockpit__step_done only as you start the next step, beside its real work (never alone). The turn's end closes the plan.",
  ];
  if (open.length) {
    lines.push(
      `Open asks: ${open.slice(0, 4).map((a) => `#${a.id} "${short(a.text, 40)}"`).join("; ")}. Tick with mcp__cockpit__tick_ask when done.`,
    );
  }
  return lines.join("\n");
}

// The same text twice (a prompt sent again, an ask added by hand that was typed too) is one ask.
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

async function addAsks($: any, all: string[]) {
  const had = (await read($, mission)).asks;
  const texts = all.filter(
    (t, i) =>
      !had.some((a) => !a.done && same(a.text, t)) && all.findIndex((u) => same(u, t)) === i,
  );
  const first = (await read($, mission)).nextAsk;
  if (!texts.length)
    return had.find((a) => !a.done && all.some((t) => same(a.text, t)))?.id ?? first;
  await set($, (m) => ({
    asks: [...m.asks, ...texts.map((text, i) => ({ id: m.nextAsk + i, text, done: false }))].slice(
      -12,
    ),
    nextAsk: m.nextAsk + texts.length,
  }));
  return first;
}

let timer: { cancel: () => void } | undefined;

// Starts the band's clock. Called from turn.start and, as a fallback, from the first tool
// call: in a live run (03/10/2026) the band stayed hidden on a turn woken by a background job.
async function start($: any) {
  const now = await $.clock.now();
  await set($, () => ({
    running: true,
    startedMs: now,
    nowMs: now,
    doneBanner: "",
    outcome: undefined,
    feed: [],
    waiting: undefined,
    waitingTool: undefined,
  }));
  tickClock($);
}

function tickClock($: any) {
  timer?.cancel();
  timer = $.clock.every(
    1000,
    () => void $.clock.now().then((t: number) => set($, () => ({ nowMs: t }))),
  );
}

// A dialog the person must answer. Only these put the band in the "your turn" state: an ask
// in tool.check is no such thing, since in auto mode the classifier answers it, not the person.
const PERSON_TOOLS: Record<string, string> = {
  AskUserQuestion: "Answer Claude’s question",
  ExitPlanMode: "Approve the proposed plan",
};
// Modes in which the person is not the one asked: in auto mode the classifier answers the
// request (the hook cannot tell its rare fallback to a dialog apart), and the other two never ask.
const NO_DIALOG_MODES = ["auto", "bypassPermissions", "dontAsk"];

const waitOn = ($: any, tool: string, text: string) =>
  set($, () => ({ waiting: text, waitingTool: tool }));
const waitOff = ($: any, tool?: string) =>
  set($, (m) =>
    m.waiting && (!tool || !m.waitingTool || m.waitingTool === tool)
      ? { waiting: undefined, waitingTool: undefined }
      : {},
  );

// ---- other sessions ----
// Each session writes one card; the Sessions tab reads every card but its own.

let dir = "";
let selfId = "";
let mine: Card | null = null;

async function scan($: any) {
  if (!dir) return;
  const now = await $.clock.now();
  const entries = await $.fs.list(dir).catch(() => []);
  const cards: Card[] = [];
  for (const e of entries) {
    if (e.kind !== "file" || !e.name.endsWith(".json")) continue;
    try {
      cards.push(JSON.parse(await $.fs.read(`${dir}/${e.name}`)));
    } catch {
      /* a half-written card is skipped until the next scan */
    }
  }
  const list = liveOthers(cards, selfId, now);
  // Say once, by name, when another session starts waiting for you.
  const before = new Map((await read($, others)).map((c: Card) => [c.id, c.state]));
  for (const c of list)
    if (c.state === "needs" && before.has(c.id) && before.get(c.id) !== "needs")
      $.ui.toast(`${c.place} is waiting on you${c.waitingFor ? `: ${c.waitingFor}` : ""}`);
  await update($, others, () => list);
  await update($, nowMs, () => now);
}

// This session's own state goes on its card, so the other sessions can show it.
async function mark($: any, state: State, waitingFor?: string) {
  if (!mine) return;
  const now = await $.clock.now();
  const startMs =
    state === "running" && mine.state !== "running" && mine.state !== "needs" ? now : mine.startMs;
  mine = {
    ...mine,
    state,
    startMs,
    endMs: state === "done" ? now : undefined,
    waitingFor,
    updatedMs: now,
  };
  await $.fs.write(`${dir}/${selfId}.json`, JSON.stringify(mine)).catch(() => undefined);
}

async function writeMine($: any, prompt: string) {
  const now = await $.clock.now();
  mine = updateCard(mine, selfId, await $.session.cwd(), prompt, now);
  await $.fs.write(`${dir}/${selfId}.json`, JSON.stringify(mine));
}

// Setup runs once: at session start or, after /reload-plugins (which does not fire
// session.start), on the first prompt or tool call.
let ready: Promise<void> | undefined;
function setup($: any): Promise<void> {
  ready ??= doSetup($).catch(() => undefined); // a missing engine call must not stop the hooks
  return ready.then(() => setupCards($));
}
async function doSetup($: any) {
  for (const t of TOOLS) await $.tool.register(t);
  await $.command.register({
    name: "cockpit",
    description: "Clear the Mission tab of the cockpit",
  });
  await $.command.register({
    name: "cockpit-rows",
    description: "Turn the plain-English tool rows on or off",
  });
  await $.command.register({
    name: "cockpit-fold",
    description: "Fold the cockpit to one line, or open it again",
  });
  await $.command.register({
    name: "cockpit-layout",
    description: "Switch the cockpit layout: tabs or stacked (no name switches to the other one)",
  });
  await $.command.register({
    name: "cockpit-sessions",
    description: "List your other open sessions, and show or hide their tab",
  });
  // After a reload the clock's timer is gone while a turn may still run: start it again.
  if ((await read($, mission)).running) tickClock($);
}

// The session cards set up apart, and again at the next event if they failed, so a missing
// HOME or session id never leaves the Sessions tab empty for the rest of the session.
let cardsReady: Promise<void> | undefined;
let cardTimers: { cancel: () => void }[] = [];
async function setupCards($: any): Promise<void> {
  // Another session id means another session in the same module (a test run): start over.
  if (cardsReady && selfId && (await $.session.id().catch(() => selfId)) !== selfId)
    cardsReady = undefined;
  cardsReady ??= doCards($).catch(() => {
    cardsReady = undefined;
  });
  return cardsReady;
}
async function doCards($: any) {
  const home = (await $.env.get("HOME")) || (await $.env.get("USERPROFILE")) || ""; // HOME can be unset on Windows
  dir = `${home.replace(/\\/g, "/")}/.claude/session-cards`;
  selfId = await $.session.id();
  await scan($);
  for (const t of cardTimers) t.cancel();
  cardTimers = [$.clock.every(2000, () => void scan($))];
  // Timers and the sliding block move between scans only while another session is running.
  cardTimers.push(
    $.clock.every(500, async () => {
      if (!(await read($, others)).some((c: Card) => c.state === "running")) return;
      const t = await $.clock.now();
      await update($, nowMs, () => t);
    }),
  );
}

// ---- drawing ----
// Two layouts, switched by /cockpit-layout: `tabs` keeps a Mission and a Sessions tab;
// `stacked` is one view, the other sessions under the mission. Both open on one header
// line (state, progress, time) and list the plan as: finished steps folded into one line, the
// step under way with what Claude is doing beneath it, then the steps to come.

type Phase = "idle" | "working" | "waiting" | "done" | "stopped" | "error" | "refusal";

function phaseOf(m: Mission): Phase {
  if (m.running) return m.waiting ? "waiting" : "working";
  if (m.outcome && m.outcome !== "done") return m.outcome;
  // A turn that ended well but left its plan open ended on a question: it is your turn, not
  // "Done" over 0/3 steps (04/11/2026).
  if (m.outcome === "done" && m.steps.some((s) => s.status !== "done")) return "waiting";
  return m.doneBanner ? "done" : "idle";
}

// One colour per state, from the person's theme, so the panel reads the same in light and dark.
const LOOK: Record<Phase, { glyph: string; label: string; color: string }> = {
  idle: { glyph: "○", label: "Idle", color: "inactive" },
  working: { glyph: "●", label: "Working", color: "claude" },
  waiting: { glyph: "⚑", label: "Your turn", color: "warning" },
  done: { glyph: "✓", label: "Done", color: "success" },
  stopped: { glyph: "■", label: "Stopped", color: "inactive" },
  error: { glyph: "✕", label: "Error", color: "error" },
  refusal: { glyph: "✕", label: "Refused by the model", color: "error" },
};

// ● pairs with ✓ and ○ at the same size, in a monospaced run and in a proportional face.
const MARK = { done: "✓", now: "●", todo: "○" } as const;

// The bar's fill: the accent while work goes on, green once done, the state's own colour when
// it needs you or went wrong. The rest of the track is the same line, faint.
const fillColor = (p: Phase) =>
  p === "working" ? "claude" : p === "done" || p === "idle" ? "success" : LOOK[p].color;

// An SVG cannot read the person's theme, so the bar takes fixed colours chosen to read on a
// light and a dark editor alike, one per theme key the text uses.
const HEX: Record<string, string> = {
  claude: "#D97757",
  success: "#3FA266",
  warning: "#D9A021",
  error: "#E5534B",
  inactive: "#8B949E",
};
const TRACK = "rgba(139,148,158,0.28)";
// The room above and below the picture bar, in pixels (a Box gap would be a whole row).
const BAR_PAD = 8;

// The line under the step at work: the tool running, what you are asked, or how the turn ended.
function activity(m: Mission, phase: Phase) {
  if (phase === "waiting") return m.waiting ?? (m.running ? "" : "Claude is waiting for your answer");
  if (phase === "working") return m.feed[0] ?? "Thinking…";
  if (phase === "idle") return m.feed[0] ?? "";
  return m.doneBanner;
}

const turnTime = (m: Mission) => (m.startedMs ? clock(m.nowMs - m.startedMs) : "");
const doneCount = (m: Mission) => m.steps.filter((s) => s.status === "done").length;

// ---- the other sessions, shared by both layouts ----

const SESSION_LOOK: Record<string, { glyph: string; color: string }> = {
  running: { glyph: "▸", color: "claude" },
  needs: { glyph: "⚑", color: "warning" },
  done: { glyph: "✓", color: "success" },
};
const IDLE_LOOK = { glyph: "·", color: "inactive" };
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s);
const whatOf = (c: Card) =>
  c.state === "needs" && c.waitingFor
    ? `asks: ${c.waitingFor}`
    : c.purpose || c.now || "just started";
// The Ask button only drafts a line in the prompt: the person sends it, or not.
const askText = (c: Card) =>
  `Ask the session in ${c.place} working on "${cut(c.purpose || c.now, 60)}": `;
const tallyLine = (list: Card[]) => {
  const t = summary(list);
  return [t.needs ? `${t.needs} waiting on you` : "", `${t.running} working`, `${t.done} finished`]
    .filter(Boolean)
    .join(" · ");
};

type Ctx = { el: any; m: Mission; phase: Phase; now: number; ask: (c: Card) => () => void };

// ---- terminal: laid out in character cells ----

// The header: the state, the bar, the step count and the turn's time on the left, the buttons on
// the right. The bar takes whatever room the rest leaves, and goes when too little is left.
function THeader({
  c,
  width,
  handle,
  buttons,
  buttonsW,
  tail,
}: {
  c: Ctx;
  width: number;
  handle: any;
  buttons: any[];
  buttonsW: number;
  tail?: { text: string; color: string };
}) {
  const { Box, Text } = c.el;
  const { m, phase } = c;
  const look = LOOK[phase];
  const n = m.steps.length;
  const count = n ? `  ${doneCount(m)}/${n}` : "";
  const time = turnTime(m);
  const fixed =
    5 +
    look.label.length +
    2 +
    2 +
    count.length +
    (time ? time.length + 2 : 0) +
    buttonsW +
    (tail ? tail.text.length + 5 : 0);
  const cells = n ? Math.min(24, width - fixed) : 0;
  const b = bar(m.steps, Math.max(1, cells));
  return (
    <Box flexDirection="row" justifyContent="space-between" width={width}>
      <Box flexDirection="row" gap={1} flexShrink={1}>
        {handle}
        <Text wrap="truncate-end">
          <Text bold color={look.color}>{`${look.glyph} ${look.label}`}</Text>
          {cells >= 6 && <Text color={fillColor(phase)}>{`  ${b.fill}${b.tip}`}</Text>}
          {cells >= 6 && (
            <Text color="subtle" dimColor>
              {b.empty}
            </Text>
          )}
          {count && <Text bold>{count}</Text>}
          {time && <Text color="inactive">{`  ${time}`}</Text>}
          {tail && <Text color={tail.color}>{`  ·  ${tail.text}`}</Text>}
        </Text>
      </Box>
      {buttons.length > 0 && (
        <Box flexDirection="row" gap={2} flexShrink={0}>
          {buttons}
        </Box>
      )}
    </Box>
  );
}

// The mission: the plan, the step at work with its activity beneath, then your asks.
function TMission({ c, inner }: { c: Ctx; inner: number }) {
  const { Box, Text } = c.el;
  const { m, phase } = c;
  const look = LOOK[phase];
  const plan = planRows(m.steps, 4);
  const act = activity(m, phase);
  const actColor =
    phase === "waiting"
      ? "warning"
      : phase === "working" || phase === "idle"
        ? "inactive"
        : look.color;
  const TIME = 9;
  const open = m.asks.filter((a) => !a.done);
  const asksDone = m.asks.length - open.length;
  const ASK = 10;
  const rows: any[] = [];

  if (plan.done) {
    const all = !plan.open.length;
    rows.push(
      <Text
        key="done"
        color={all ? "success" : "inactive"}
      >{`${MARK.done} ${all ? `All ${plan.done} steps done` : `${plan.done} step${plan.done > 1 ? "s" : ""} done`}`}</Text>,
    );
    if (!all) rows.push(<Box key="gap-done" height={1} />);
  }
  for (const [i, st] of plan.open.entries()) {
    const t = stepTime(st, m.nowMs);
    const now = st.status === "now";
    rows.push(
      <Box key={`s${i}`} flexDirection="row">
        <Box flexGrow={1} flexShrink={1}>
          <Text wrap="truncate-end" color={now ? look.color : "text"} bold={now}>
            <Text color={now ? look.color : "inactive"}>{`${MARK[st.status]} `}</Text>
            {st.label}
          </Text>
        </Box>
        {t && (
          <Box width={TIME} flexShrink={0} justifyContent="flex-end">
            <Text color="inactive">{t}</Text>
          </Box>
        )}
      </Box>,
    );
    if (now && act && (phase === "working" || phase === "waiting")) {
      rows.push(
        <Text
          key="act"
          wrap="truncate-end"
          color={actColor}
          bold={phase === "waiting"}
        >{`  └ ${act}`}</Text>,
      );
      // The step at work and its activity stand apart from the steps to come.
      if (i < plan.open.length - 1 || plan.more) rows.push(<Box key="gap-act" height={1} />);
    }
  }
  if (plan.more)
    rows.push(<Text key="more" color="inactive">{`… ${plan.more} more to come`}</Text>);
  // No plan, or the step at work is not listed: the activity stands on its own line.
  const shown =
    plan.open.some((s) => s.status === "now") && (phase === "working" || phase === "waiting");
  if (!shown && act && !(phase === "done" && m.steps.length))
    rows.push(
      <Text
        key="act"
        wrap="truncate-end"
        color={actColor}
        bold={phase === "waiting"}
      >{`${phase === "waiting" ? "⚑" : "›"} ${act}`}</Text>,
    );

  return (
    <Box flexDirection="column" width={inner}>
      {rows}
      {m.asks.length > 0 && (
        <Box flexDirection="row" marginTop={rows.length ? 1 : 0}>
          <Box width={ASK} flexShrink={0}>
            <Text color="inactive">{`Asks ${asksDone}/${m.asks.length}`}</Text>
          </Box>
          <Box flexDirection="column" flexShrink={1}>
            {open.length === 0 && <Text color="success">{`${MARK.done} all done`}</Text>}
            {open.slice(0, 3).map((a) => (
              <Text key={`a${a.id}`} wrap="truncate-end">
                <Text color="inactive">{`${MARK.todo} `}</Text>
                {cut(a.text, Math.max(10, inner - ASK - 2))}
              </Text>
            ))}
            {open.length > 3 && <Text color="inactive">{`+ ${open.length - 3} more`}</Text>}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// One session per row: its state, its place, what it does, how long, and Ask.
function TSessionRow({ c, s, inner }: { c: Ctx; s: Card; inner: number }) {
  const { Box, Text, Button } = c.el;
  const l = SESSION_LOOK[s.state ?? ""] ?? IDLE_LOOK;
  const needs = s.state === "needs";
  const PLACE = 14,
    WHEN = 18,
    ASK = 8;
  const whatW = Math.max(8, inner - 2 - PLACE - WHEN - ASK);
  return (
    <Box key={`row-${s.id}`} flexDirection="row">
      <Text wrap="truncate-end">
        <Text color={l.color} bold>{`${l.glyph} `}</Text>
        <Text bold>{cut(s.place, PLACE - 1).padEnd(PLACE)}</Text>
        <Text color={needs ? "warning" : "text"}>{cut(whatOf(s), whatW).padEnd(whatW)}</Text>
        <Text color={needs ? "warning" : "inactive"}>{rowWhen(s, c.now).padStart(WHEN)}</Text>
      </Text>
      <Box marginLeft={1}>
        <Button
          key={`ask-${s.id}`}
          label="Ask"
          variant={needs ? "primary" : undefined}
          onPress={c.ask(s)}
        />
      </Box>
    </Box>
  );
}

function TSessions({
  c,
  list,
  inner,
  max = 5,
}: {
  c: Ctx;
  list: Card[];
  inner: number;
  max?: number;
}) {
  const { Box, Text } = c.el;
  return (
    <Box flexDirection="column" width={inner}>
      {list.slice(0, max).map((s) => TSessionRow({ c, s, inner }))}
      <Box marginTop={1}>
        <Text
          color="inactive"
          wrap="truncate-end"
        >{`${tallyLine(list)}${list.length > max ? ` · ${list.length - max} more: /cockpit-sessions` : ""}`}</Text>
      </Box>
    </Box>
  );
}

// ---- VS Code, the desktop app, the web: laid out like a page ----
// Nothing here is counted in cells: rows flex to the pane's width and the bar is a picture.
// A Text never nests a run of another weight: VS Code puts such a run on a line of its own
// (29/10/2026), so every change of weight is a Box of its own.

function GHeader({
  c,
  handle,
  buttons,
  tail,
}: {
  c: Ctx;
  handle: any;
  buttons: any[];
  tail?: { text: string; color: string };
}) {
  const { Box, Text } = c.el;
  const { m, phase } = c;
  const look = LOOK[phase];
  const n = m.steps.length;
  const meta = [n ? `${doneCount(m)}/${n} steps` : "", turnTime(m)].filter(Boolean).join(" · ");
  return (
    <Box
      flexDirection="row"
      flexWrap="nowrap"
      alignItems="center"
      justifyContent="space-between"
      gap="sm"
      width="100%"
    >
      <Box
        flexDirection="row"
        flexWrap="nowrap"
        alignItems="center"
        gap="sm"
        flexShrink={1}
        minWidth={0}
      >
        {handle}
        <Box flexShrink={0}>
          <Text weight="semibold" color={look.color}>{`${look.glyph} ${look.label}`}</Text>
        </Box>
        {meta && (
          <Box flexShrink={0}>
            <Text size="footnote" color="inactive" tabular>
              {meta}
            </Text>
          </Box>
        )}
        {tail && (
          <Box flexShrink={1} minWidth={0}>
            <Text size="footnote" wrap="truncate-end" color={tail.color}>{`· ${tail.text}`}</Text>
          </Box>
        )}
      </Box>
      {buttons.length > 0 && (
        <Box flexDirection="row" flexWrap="nowrap" gap="xs" flexShrink={0}>
          {buttons}
        </Box>
      )}
    </Box>
  );
}

function GMission({ c }: { c: Ctx }) {
  const { Box, Text, Svg } = c.el;
  const { m, phase } = c;
  const look = LOOK[phase];
  const n = m.steps.length;
  const plan = planRows(m.steps, 4);
  const act = activity(m, phase);
  const actColor =
    phase === "waiting"
      ? "warning"
      : phase === "working" || phase === "idle"
        ? "inactive"
        : look.color;
  const open = m.asks.filter((a) => !a.done);
  // One list row: the mark rides in the label's own Text, so the two never land on two lines.
  const item = (
    key: string,
    mark: string,
    markColor: string,
    label: string,
    color = "text",
    weight = "regular",
    time?: string,
  ) => {
    const line = (
      <Text wrap="truncate-end" color={color} weight={weight}>
        <Text mono color={markColor}>{`${mark} `}</Text>
        {` ${label}`}
      </Text>
    );
    if (!time) return <Box key={key}>{line}</Box>;
    return (
      <Box key={key} flexDirection="row" flexWrap="nowrap" justifyContent="space-between" gap="sm">
        <Box flexShrink={1} minWidth={0}>
          {line}
        </Box>
        <Box flexShrink={0}>
          <Text size="footnote" color="inactive" tabular>
            {time}
          </Text>
        </Box>
      </Box>
    );
  };
  const actLine = (key: string, indent: boolean) => (
    <Box key={key} paddingLeft={indent ? "lg" : 0}>
      <Text
        wrap="truncate-end"
        size={indent ? "footnote" : undefined}
        color={actColor}
        weight={phase === "waiting" ? "semibold" : "regular"}
      >
        {indent ? `↳ ${act}` : `${phase === "waiting" ? "⚑" : "›"} ${act}`}
      </Text>
    </Box>
  );
  const rows: any[] = [];
  if (plan.done) {
    const all = !plan.open.length;
    rows.push(
      item(
        "done",
        MARK.done,
        "success",
        all ? `All ${plan.done} steps done` : `${plan.done} step${plan.done > 1 ? "s" : ""} done`,
        all ? "success" : "inactive",
      ),
    );
  }
  for (const [i, st] of plan.open.entries()) {
    const now = st.status === "now";
    rows.push(
      item(
        `s${i}`,
        MARK[st.status],
        now ? look.color : "inactive",
        st.label,
        now ? look.color : "text",
        now ? "semibold" : "regular",
        stepTime(st, m.nowMs),
      ),
    );
    if (now && act && (phase === "working" || phase === "waiting")) rows.push(actLine("act", true));
  }
  if (plan.more) rows.push(item("more", "…", "inactive", `${plan.more} more to come`, "inactive"));
  const shown =
    plan.open.some((s) => s.status === "now") && (phase === "working" || phase === "waiting");
  if (!shown && act && !(phase === "done" && n)) rows.push(actLine("act", false));

  return (
    <Box flexDirection="column" width="100%" gap="sm">
      {/* Gaps here are whole rows (sm = none, md = a full row): the room around the bar is
          drawn in the picture itself, BAR_PAD px above and below. */}
      {n > 0 && (
        <Box width="100%">
          <Svg
            source={progressSvg(m.steps, HEX[fillColor(phase)] ?? HEX.claude, TRACK, BAR_PAD, m.running)}
            alt={`Progress: ${doneCount(m)} of ${n} steps`}
            height={BAR_H + 2 * BAR_PAD}
          />
        </Box>
      )}
      {rows.length > 0 && (
        <Box flexDirection="column" width="100%">
          {rows}
        </Box>
      )}
      {m.asks.length > 0 && (
        <Box flexDirection="row" flexWrap="nowrap" gap="sm" alignItems="flex-start">
          <Box flexShrink={0}>
            <Text
              size="footnote"
              color="inactive"
              tabular
            >{`Asks ${m.asks.length - open.length}/${m.asks.length}`}</Text>
          </Box>
          <Box flexDirection="column" flexShrink={1} minWidth={0}>
            {open.length === 0 && item("all", MARK.done, "success", "all done", "success")}
            {open.slice(0, 3).map((a) => item(`a${a.id}`, MARK.todo, "inactive", a.text))}
            {open.length > 3 &&
              item("amore", "+", "inactive", `${open.length - 3} more`, "inactive")}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// A session row; its Ask shows under the pointer, and always on a session that waits on you.
function GSessionRow({ c, s }: { c: Ctx; s: Card }) {
  const { Box, Text, Button } = c.el;
  const l = SESSION_LOOK[s.state ?? ""] ?? IDLE_LOOK;
  const needs = s.state === "needs";
  return (
    <Box
      key={`row-${s.id}`}
      flexDirection="row"
      flexWrap="nowrap"
      alignItems="center"
      gap="sm"
      width="100%"
    >
      <Box flexShrink={0}>
        <Text mono color={l.color}>
          {l.glyph}
        </Text>
      </Box>
      <Box flexShrink={0}>
        <Text weight="semibold">{s.place}</Text>
      </Box>
      <Box flexShrink={1} flexGrow={1} minWidth={0}>
        <Text wrap="truncate-end" color={needs ? "warning" : "inactive"}>
          {whatOf(s)}
        </Text>
      </Box>
      <Box flexShrink={0}>
        <Text size="footnote" color={needs ? "warning" : "inactive"} tabular>
          {rowWhen(s, c.now)}
        </Text>
      </Box>
      <Box
        flexShrink={0}
        display={needs ? "flex" : "none"}
        hover={needs ? undefined : { display: "flex" }}
      >
        <Button
          key={`ask-${s.id}`}
          label="Ask"
          variant={needs ? "primary" : "secondary"}
          onPress={c.ask(s)}
        />
      </Box>
    </Box>
  );
}

function GSessions({ c, list, max = 5 }: { c: Ctx; list: Card[]; max?: number }) {
  const { Box, Text } = c.el;
  return (
    <Box flexDirection="column" width="100%" gap="sm">
      {list.slice(0, max).map((s) => GSessionRow({ c, s }))}
      <Text
        size="footnote"
        color="inactive"
      >{`${tallyLine(list)}${list.length > max ? ` · ${list.length - max} more: /cockpit-sessions` : ""}`}</Text>
    </Box>
  );
}

// The folded band's tail: the step under way, then who needs you among the other sessions.
function foldTail(m: Mission, phase: Phase, list: Card[]) {
  const current = m.steps.find((s) => s.status === "now");
  const t = summary(list);
  const text = [
    current && phase !== "done" ? `› ${current.label}` : "",
    t.needs
      ? `⚑ ${t.needs} waiting`
      : list.length
        ? `${list.length} other session${list.length > 1 ? "s" : ""}`
        : "",
  ]
    .filter(Boolean)
    .join("  ·  ");
  return text ? { text, color: t.needs ? "warning" : "inactive" } : undefined;
}

const hasContent = (m: Mission) =>
  m.running || !!m.doneBanner || m.steps.length > 0 || m.asks.length > 0 || m.feed.length > 0;

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    cardsReady = undefined; // a new session: read its id and HOME afresh
    mine = null;
    await setup($);
    return next(e);
  });

  on("command.run", { command: "cockpit-rows" }, async ($) => {
    await setup($);
    await update($, plainRows, (v) => !v);
    return {
      text: (await read($, plainRows))
        ? "Plain-English tool rows: on."
        : "Plain-English tool rows: off, the full rows are back.",
    };
  });

  on("command.run", { command: "cockpit" }, async ($) => {
    await setup($);
    await update($, mission, () => EMPTY);
    return { text: "Cockpit: Mission tab cleared." };
  });

  on("command.run", { command: "cockpit-fold" }, async ($) => {
    await setup($);
    await update($, folded, (f) => !f);
    return {
      text: (await read($, folded))
        ? "Cockpit folded to one line (c or /cockpit-fold opens it)."
        : "Cockpit open.",
    };
  });

  on("command.run", { command: "cockpit-layout" }, async ($, e: any) => {
    await setup($);
    const asked = String(e.args ?? "")
      .trim()
      .toLowerCase();
    if (asked && !(asked in LAYOUTS))
      return {
        text: `No layout "${asked}". Pick one:\n${Object.values(LAYOUTS)
          .map((l) => `  /cockpit-layout ${l}`)
          .join("\n")}`,
      };
    const was = (await read($, layout)) === "stacked" ? "stacked" : "tabs";
    const next: Layout = (asked as Layout) || (was === "tabs" ? "stacked" : "tabs");
    // A new layout opens on the mission, the list of the other sessions shut.
    await update($, tab, () => "mission" as Tab);
    await update($, layout, () => next);
    return { text: `Cockpit layout ${LAYOUTS[next]}.` };
  });

  on("command.run", { command: "cockpit-sessions" }, async ($) => {
    await setup($);
    await update($, isHidden, (h) => !h);
    const hidden = await read($, isHidden);
    const list = order(await read($, others));
    const now = await $.clock.now();
    const word: Record<string, string> = {
      running: "working",
      needs: "WAITING ON YOU",
      done: "finished",
    };
    const lines = list.map(
      (c) =>
        `${word[c.state ?? ""] ?? "idle"} · ${c.place}: ${c.state === "needs" && c.waitingFor ? `asks: ${c.waitingFor}` : c.purpose || c.now} (${rowTime(c, now) || ago(now - c.updatedMs)})`,
    );
    const head = hidden
      ? "Sessions tab hidden (/cockpit-sessions brings it back)."
      : "Sessions tab shown.";
    return {
      text: `${head}\n${list.length ? `${list.length} other session${list.length > 1 ? "s" : ""}:\n${lines.join("\n")}` : "No other session is running the cockpit."}`,
    };
  });

  on("turn.start", async ($, e, next) => {
    await setup($);
    await start($);
    return next(e);
  });

  on("prompt.submit", async ($, e, next) => {
    await setup($);
    // A typed prompt is a new task: the old plan leaves the panel, finished or not, so a stale
    // plan never shows over new work with its clock still running (04/11/2026). Except when
    // Claude's last turn ended on a question, its plan left open: the answer goes on with it.
    // A finished plan leaves at any prompt, typed or not.
    const before = await read($, mission);
    const typedPrompt = (e as any).origin?.kind === "composer" || (e as any).origin?.kind === undefined;
    const allDone = before.steps.every((st: { status: string }) => st.status === "done");
    const askedYou = !before.running && before.outcome === "done" && !allDone;
    if (before.steps.length && (allDone || (typedPrompt && !askedYou))) await set($, () => ({ steps: [] }));
    await waitOff($); // the person typed: nothing waits on them any more
    const typed = (e as any).origin?.kind === "composer";
    // Only what a person typed describes the session on its card: not job notices or peer messages.
    if ((typed || (e as any).origin?.kind === undefined) && e.text.trim())
      await writeMine($, e.text).catch(() => undefined);
    await mark($, "running").catch(() => undefined);
    // Asks are no longer picked out of typed prompts: each one cost a tick_ask call with proof.
    // They come only from add_ask now.
    return next({ ...e, context: [...(e.context ?? []), reminder(await read($, mission))] });
  });

  on("tool.call", { tool: "mcp__cockpit__add_ask" }, async ($, e: any) => {
    await setup($);
    const text = String(e.text ?? "").trim();
    if (!text) return { result: "Nothing added: text was empty." };
    const id = await addAsks($, [text]);
    return { result: `Ask #${id} is on the cockpit.` };
  });

  on("tool.call", { tool: "mcp__cockpit__set_plan" }, async ($, e: any) => {
    await setup($);
    if (!(await read($, mission)).running) await start($);
    const steps = setPlan(Array.isArray(e.steps) ? e.steps.slice(0, 8) : [], await $.clock.now());
    // A new plan is a new job: asks already ticked off drop away, open ones stay.
    await set($, (m2) => ({ steps, asks: m2.asks.filter((a) => !a.done) }));
    return { result: `Plan shown with ${steps.length} steps.` };
  });

  on("tool.call", { tool: "mcp__cockpit__step_done" }, async ($, e: any) => {
    await setup($);
    const m = await read($, mission);
    const n = Number(e.step);
    if (!m.steps[n - 1]) return { result: `No step ${n}.` };
    const now = await $.clock.now();
    await set($, (m2) => ({ steps: finishStep(m2.steps, n, now) }));
    await $.audio.play({ asset: "sounds/step.wav" }).catch(() => undefined);
    return { result: `Step ${n} done.` };
  });

  on("tool.call", { tool: "mcp__cockpit__tick_ask" }, async ($, e: any) => {
    await setup($);
    const proof = String(e.proof ?? "").trim();
    if (!proof) return { result: "Not ticked: proof is required." };
    const r = tick((await read($, mission)).asks, Number(e.id), proof);
    if (r.found) await set($, () => ({ asks: r.asks }));
    return { result: r.found ? `Ask #${e.id} ticked.` : `No ask #${e.id}.` };
  });

  // A permission dialog is about to be put to the person: the only sure sign they are needed.
  // tool.check's "ask" is not one: it goes to the mode's decider, the classifier in auto mode.
  // A settings hook beneath may still answer it, and then no dialog shows.
  on("classic.PermissionRequest", async ($, e: any, next) => {
    await setup($);
    const r: any = await next(e);
    if (r?.decision || NO_DIALOG_MODES.includes(String(e.permission_mode ?? ""))) return r;
    const tool = String(e.tool_name ?? "");
    const what = describe(tool, e.tool_input ?? {}) || "a tool";
    await waitOn($, tool, `Allow: ${what.charAt(0).toLowerCase()}${what.slice(1)}`);
    await mark($, "needs", clean(what, 40)).catch(() => undefined);
    await $.audio.play({ asset: "sounds/ask.wav" }).catch(() => undefined);
    return r;
  });

  on("tool.call", async ($, e: any, next) => {
    await setup($);
    if (!(await read($, mission)).running) await start($);
    if (mine?.state === "needs") await mark($, "running").catch(() => undefined);
    const line = describe(e.tool, e);
    if (line)
      await set($, (m) => ({ feed: [line, ...m.feed.filter((f) => f !== line)].slice(0, FEED) }));
    if (e.tool === "TodoWrite" || e.tool === "TaskCreate" || e.tool === "TaskUpdate") {
      const now = await $.clock.now();
      await set($, (m) => ({
        steps: timed(
          m.steps,
          e.tool === "TodoWrite" ? fromTodos(e.todos) : applyTask(m.steps, e.tool, e),
          now,
        ),
      }));
    }
    // A question or a plan to approve waits on the person whatever the mode.
    const person = PERSON_TOOLS[e.tool];
    if (person) {
      await waitOn($, e.tool, person);
      await mark($, "needs", person).catch(() => undefined);
      await $.audio.play({ asset: "sounds/ask.wav" }).catch(() => undefined);
    }
    try {
      return await next(e);
    } finally {
      // Allowed, refused or answered: the dialog for this tool is over either way.
      await waitOff($, e.tool);
      if (person) await mark($, "running").catch(() => undefined);
    }
  });

  on("turn.complete", async ($, e, next) => {
    await setup($);
    if (e.agentId) return next(e);
    await mark($, "done").catch(() => undefined);
    await scan($);
    timer?.cancel();
    timer = undefined;
    const m = await read($, mission);
    const now = await $.clock.now();
    const reason = (e as any).reason ?? (e.isAborted ? "aborted" : "answer");
    const outcome =
      reason === "aborted"
        ? "stopped"
        : reason === "error"
          ? "error"
          : reason === "refusal"
            ? "refusal"
            : "done";
    const head = {
      done: "Done",
      stopped: "Stopped",
      error: "Stopped by an error",
      refusal: "Refused",
    }[outcome];
    // a turn that ends well closes its plan, so nobody has to tick the last step; a question leaves it open
    const closed =
      outcome === "done" &&
      !String(e.answer ?? "")
        .trim()
        .endsWith("?");
    const steps = closed ? m.steps.map((s) => ({ ...s, status: "done" as const })) : m.steps;
    const parts = [`${head} in ${clock(now - m.startedMs)}`];
    if (steps.length)
      parts.push(`${steps.filter((s) => s.status === "done").length}/${steps.length} steps`);
    if (m.asks.length) parts.push(`${m.asks.filter((a) => a.done).length}/${m.asks.length} asks`);
    await set($, () => ({
      steps,
      running: false,
      nowMs: now,
      doneBanner: parts.join(" · "),
      outcome,
      waiting: undefined,
      waitingTool: undefined,
    }));
    // The chime means "done": an interrupted, failed or refused turn ends quietly.
    if (outcome === "done") await $.audio.play({ asset: "sounds/done.wav" }).catch(() => undefined);
    return next(e);
  });

  // A session that closes drops off the other sessions' tab at their next scan.
  on("session.end", async ($, e, next) => {
    await setup($);
    if (mine)
      await $.fs
        .write(`${dir}/${selfId}.json`, JSON.stringify({ ...mine, updatedMs: 0 }))
        .catch(() => undefined);
    return next(e);
  });

  // One band on every surface: VS Code, the desktop app and the web draw it too, so there is
  // no side pane (VS Code showed both at once: 04/11/2026).
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const m = await read($, mission);
    const p = e.props as any;
    const list = (await read($, isHidden)) ? [] : order(await read($, others));
    if (p.hasSurvey || (!hasContent(m) && !list.length)) return next(e);
    await read($, nowMs); // redraws the sessions' timers as the clock ticks
    const now = await $.clock.now();
    const el = $.ui.resolve(e);
    const { Box, Text, Button } = el;
    const c: Ctx = {
      el,
      m,
      phase: phaseOf(m),
      now,
      ask: (s) => () => void $.prompt.fill({ text: askText(s) }),
    };
    const has = hasContent(m);
    // An older value ('a', 'b') or none reads as tabs.
    const lay: Layout = (await read($, layout)) === "stacked" ? "stacked" : "tabs";
    const picked = await read($, tab);
    // A: the Sessions tab exists only while another session is open; with no turn, it is the band.
    // B: no tabs; 'sessions' means the strip's list of the other sessions is open.
    const current: Tab = lay === "stacked" || !list.length ? "mission" : !has ? "sessions" : picked;
    const listOpen = lay === "stacked" && (picked === "sessions" || !has);
    const tally = summary(list);
    const needing = list.filter((s) => s.state === "needs");
    const pick = (t: Tab) => () => void update($, tab, () => t);
    const toggle = () => void update($, folded, (f) => !f);
    const terminal = e.surface === "terminal";
    const isFolded = await read($, folded);
    const sessionsLabel = `Sessions ${list.length}${tally.needs ? ` · ⚑ ${tally.needs}` : ""}`;

    // The accordion's handle: ▾ folds the band, ▸ opens it; c presses it while the band has the focus.
    const handle = (open: boolean) =>
      terminal ? (
        <Button key="fold" plain hotkey="c" onPress={toggle}>
          {open ? "▾" : "▸"}
        </Button>
      ) : (
        <Button key="fold" variant="secondary" hotkey="c" onPress={toggle}>
          {open ? "▾" : "▸"}
        </Button>
      );

    // Terminal tabs read as a row of words, the one shown at full strength. A page has native
    // buttons, so it gets one: the way to the other tab.
    const tabs: any[] = [];
    let tabsW = 0;
    if (lay === "tabs" && list.length) {
      if (terminal) {
        tabs.push(
          <Button
            key="tab-mission"
            plain
            hotkey="1"
            dimColor={current !== "mission"}
            onPress={pick("mission")}
          >
            Mission
          </Button>,
        );
        tabs.push(
          <Button
            key="tab-sessions"
            plain
            hotkey="2"
            dimColor={current !== "sessions"}
            onPress={pick("sessions")}
          >
            {sessionsLabel}
          </Button>,
        );
        tabsW = `1: Mission  2: ${sessionsLabel}  `.length;
      } else {
        tabs.push(
          current === "mission" ? (
            <Button key="tab-sessions" variant="secondary" hotkey="2" onPress={pick("sessions")}>
              {`Show sessions [${list.length}]${tally.needs ? ` · ⚑ ${tally.needs}` : ""}`}
            </Button>
          ) : (
            <Button key="tab-mission" variant="secondary" hotkey="1" onPress={pick("mission")}>
              Show Missions
            </Button>
          ),
        );
      }
    }
    // B's strip: who waits on you, always; the rest behind a Show button.
    const othersBtn = (label: string) =>
      terminal ? (
        <Button
          key="others"
          plain
          hotkey="s"
          dimColor
          onPress={pick(listOpen ? "mission" : "sessions")}
        >
          {label}
        </Button>
      ) : (
        <Button
          key="others"
          variant="secondary"
          hotkey="s"
          onPress={pick(listOpen ? "mission" : "sessions")}
        >
          {label}
        </Button>
      );
    const rest = list.filter((s) => s.state !== "needs");

    if (!terminal) {
      if (isFolded)
        return GHeader({ c, handle: handle(false), buttons: [], tail: foldTail(m, c.phase, list) });
      const strip = lay === "stacked" && list.length > 0 && (
        <Box flexDirection="column" width="100%" gap="sm" marginTop="sm">
          {needing.slice(0, 3).map((s) => GSessionRow({ c, s }))}
          {rest.length > 0 && (
            <Box
              flexDirection="row"
              flexWrap="nowrap"
              alignItems="center"
              justifyContent="space-between"
              gap="sm"
              width="100%"
            >
              <Box flexShrink={1} minWidth={0}>
                <Text
                  size="footnote"
                  color="inactive"
                  wrap="truncate-end"
                >{`Others · ${tallyLine(rest)}`}</Text>
              </Box>
              <Box flexShrink={0}>{othersBtn(listOpen ? "Hide" : "Show")}</Box>
            </Box>
          )}
          {listOpen && rest.slice(0, 5).map((s) => GSessionRow({ c, s }))}
        </Box>
      );
      return (
        <Box flexDirection="column" width="100%" gap="sm">
          {GHeader({ c, handle: handle(true), buttons: tabs })}
          {current === "sessions" ? GSessions({ c, list }) : has && GMission({ c })}
          {strip}
        </Box>
      );
    }

    const width = Math.max(
      30,
      Math.min(current === "sessions" || lay === "stacked" ? 100 : 80, p.bodyColumns ?? 80),
    );
    if (isFolded)
      return THeader({
        c,
        width,
        handle: handle(false),
        buttons: [],
        buttonsW: 0,
        tail: foldTail(m, c.phase, list),
      });
    const inner = width - 4;

    // A short window leaves two or three rows: no frame, the header and one line under it.
    if ((p.maxRows ?? 12) < 10) {
      const current2 = m.steps.find((s) => s.status === "now");
      const act = activity(m, c.phase);
      const asks = m.asks.length
        ? `Asks ${m.asks.filter((a) => a.done).length}/${m.asks.length}`
        : "";
      const line =
        current === "sessions"
          ? list
              .slice(0, 3)
              .map((s) => `${(SESSION_LOOK[s.state ?? ""] ?? IDLE_LOOK).glyph} ${s.place}`)
              .join("   ")
          : [current2 && c.phase !== "done" ? `› ${current2.label}` : "", act, asks]
              .filter(Boolean)
              .join("  ·  ");
      return (
        <Box flexDirection="column" width={width}>
          {THeader({ c, width, handle: handle(true), buttons: tabs, buttonsW: tabsW })}
          <Text wrap="truncate-end" color={c.phase === "waiting" ? "warning" : "inactive"}>
            {line}
          </Text>
        </Box>
      );
    }

    const needsYou = c.phase === "waiting" || tally.needs > 0;
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={needsYou ? "warning" : "promptBorder"}
        borderDimColor={!needsYou}
        paddingX={1}
        width={width}
      >
        {THeader({ c, width: inner, handle: handle(true), buttons: tabs, buttonsW: tabsW })}
        {(current === "sessions" || has) && (
          <Box marginTop={1}>
            {current === "sessions" ? TSessions({ c, list, inner }) : TMission({ c, inner })}
          </Box>
        )}
        {lay === "stacked" && list.length > 0 && (
          <Box flexDirection="column" marginTop={has ? 1 : 0}>
            {has && (
              <Text color="subtle" dimColor>
                {"─".repeat(inner)}
              </Text>
            )}
            {needing.slice(0, 3).map((s) => TSessionRow({ c, s, inner }))}
            {rest.length > 0 && (
              <Box
                flexDirection="row"
                justifyContent="space-between"
                width={inner}
                marginTop={needing.length ? 1 : 0}
              >
                <Text color="inactive" wrap="truncate-end">{`Others · ${tallyLine(rest)}`}</Text>
                {othersBtn(listOpen ? "▾ hide" : "▸ show")}
              </Box>
            )}
            {listOpen && rest.slice(0, 5).map((s) => TSessionRow({ c, s, inner }))}
          </Box>
        )}
      </Box>
    );
  });

  // Plain rows in the transcript: "Editing intro.md" in place of a tool name and a
  // full folder path. /cockpit-rows turns them off and puts the engine's own rows back.
  on("ui.render", { component: "ToolUse" }, async ($, e, next) => {
    const p = e.props as any;
    if (!(await read($, plainRows))) return next(e);
    const own = OWN[String(p.tool).replace(/^mcp__cockpit__/, "")];
    const line = own ? own(p.input ?? {}) : describe(String(p.tool), p.input ?? {});
    if (!line || String(p.tool).startsWith("mcp__open-loops__")) return next(e);
    const { Text } = $.ui.resolve(e);
    return (
      <Text>
        <Text color={p.isErrored ? "error" : p.isRunning ? "claude" : "success"}>● </Text>
        <Text bold={!!own}>{line}</Text>
      </Text>
    );
  });

  // Its own tools' results say nothing a reader needs: the band already shows them.
  on("ui.render", { component: "ToolResult" }, async ($, e, next) => {
    const p = e.props as any;
    if (!(await read($, plainRows)) || !String(p.tool ?? "").startsWith("mcp__cockpit__"))
      return next(e);
    const { Box } = $.ui.resolve(e);
    return <Box />;
  });
};
