export const supportTopics = [
  'Study pressure', 'Feeling overwhelmed', 'Loneliness', 'Friendships',
  'Relationships', 'Family', 'Work or money', 'Moving away from home',
  'Adjusting to Australia', 'Something else', 'I’m not sure yet',
] as const

// K6: six standard distress items, each scored 0–4 over the past four weeks.
export const k6Questions = [
  'Nervous?',
  'Hopeless?',
  'Restless or fidgety?',
  'So depressed that nothing could cheer you up?',
  'That everything was an effort?',
  'Worthless?',
] as const

export const k6Options = [
  'None of the time', 'A little of the time', 'Some of the time',
  'Most of the time', 'All of the time',
] as const

export type IntakeAnswers = {
  adult: boolean | null
  listenerGender: string
  topics: string[]
  k6: (number | null)[]
  note: string
}

export const emptyIntake: IntakeAnswers = {
  adult: null, listenerGender: '', topics: [], k6: Array(6).fill(null), note: '',
}

export function k6Score(answers: IntakeAnswers): number | null {
  return answers.k6.length === 6 && answers.k6.every(value => value !== null)
    ? answers.k6.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null
}
