// What the office declares to the engine: the model's tools, the slash commands, and the
// line added to each prompt. Data only, so register.ts stays about events.

export const TOOLS = [
  {
    name: 'plan',
    description: 'Put the plan for this task on your office desk board, with your honest estimate in minutes for each step. The board shows a live "Done by" clock from these estimates and re-estimates from the real time each step takes.',
    inputSchema: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: { type: 'object', properties: { label: { type: 'string' }, minutes: { type: 'number' } }, required: ['label', 'minutes'] },
        },
      },
      required: ['steps'],
    },
  },
  {
    name: 'name_desk',
    description: 'Set the name tag on your desk in the office, for example CEO, CTO or Writer. Use the role the user or your team gave you.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'name_peer',
    description: 'Give a teammate session a short name on your office board, for example CEO. "who" is its session name or address exactly as a message from it shows (from-name or from).',
    inputSchema: { type: 'object', properties: { who: { type: 'string' }, name: { type: 'string' } }, required: ['who', 'name'] },
  },
  {
    name: 'step_done',
    description: 'Mark a plan step on your office desk board as finished (1-based).',
    inputSchema: { type: 'object', properties: { step: { type: 'number' } }, required: ['step'] },
  },
]

export const COMMANDS = [
  { name: 'my-office-desk', description: 'Name your desk in the office, for example /my-office-desk Writer', argumentHint: '[name]' },
  { name: 'my-office', description: 'Show where the office page is', immediate: true },
  { name: 'my-office-leave', description: 'Send a session home to free its desk: /my-office-leave for this one, /my-office-leave <name or id> for another, /my-office-leave others for all but this one', argumentHint: '[name, id or others]' },
  { name: 'my-office-clear', description: 'Delete the desks of sessions that ended or have been silent for 30 minutes; a session waiting for you or for its usage stays' },
  { name: 'my-office-who', description: 'Who is in the office, what each one does, and the usage left; /my-office-who <name> shows a plan', argumentHint: '[name]', immediate: true },
  { name: 'my-office-board', description: 'Show your plan; /my-office-board clear takes it off your board', argumentHint: '[clear]', immediate: true },
  { name: 'my-office-quiet', description: 'Turn the sound at the end of a turn on or off, for every session', argumentHint: '[on|off]' },
  { name: 'my-office-theme', description: 'Change the room on the office page, or list the rooms', argumentHint: '[room]', immediate: true },
]

// Sent once a session and again after a compaction, which can lose it (Desk.hinted).
export const PROMPT_HINT = 'OFFICE (my-office mod): your desk shows a live "Done by" clock. For a task of 2+ steps, call mcp__my-office__plan with each step and your honest minutes estimate. Send plan and mcp__my-office__step_done in the same round as real work, never in a round of their own, and skip the last step: the end of the turn ticks it.'
