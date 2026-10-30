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
  { name: 'office-desk', description: 'Name your desk in the office, for example /office-desk Writer', argumentHint: '[name]' },
  { name: 'office', description: 'Show where the office page is', immediate: true },
  { name: 'office-leave', description: 'Send a session home to free its desk: /office-leave for this one, /office-leave <name or id> for another, /office-leave others for all but this one', argumentHint: '[name, id or others]' },
  { name: 'office-who', description: 'Who is in the office, what each one does, and the usage left; /office-who <name> shows a plan', argumentHint: '[name]', immediate: true },
  { name: 'office-board', description: 'Show your plan; /office-board clear takes it off your board', argumentHint: '[clear]', immediate: true },
  { name: 'office-quiet', description: 'Turn the sound at the end of a turn on or off, for every session', argumentHint: '[on|off]' },
  { name: 'office-theme', description: 'Change the room on the office page, or list the rooms', argumentHint: '[room]', immediate: true },
]

export const PROMPT_HINT = 'OFFICE (office mod): your desk shows a live "Done by" clock. For a task of 2+ steps, call mcp__office__plan with each step and your honest minutes estimate, then mcp__office__step_done as each step finishes.'
