export const supportTopics = [
  'Study pressure', 'Feeling overwhelmed', 'Loneliness', 'Friendships',
  'Relationships', 'Family', 'Work or money', 'Moving away from home',
  'Adjusting to Australia', 'Something else', 'I’m not sure yet',
] as const

export const longSupportTopics = [
  'Stress', 'University or study', 'Feeling overwhelmed', 'Loneliness', 'Friendships',
  'Relationships or dating', 'Family', 'Work', 'Money or financial pressure',
  'Moving away from home', 'Adjusting to Australia', 'Cultural adjustment',
  'Confidence or self-esteem', 'Motivation', 'Uncertainty about the future',
  'Grief or loss', 'Something else', 'I’m not sure — I just want someone to talk to',
] as const

export const sharedExperiences = [
  'International student experience', 'Moving away from home', 'University or study stress',
  'Making friends or loneliness', 'Relationship difficulties', 'Family difficulties',
  'Work and study balance', 'Financial stress', 'Adjusting to university',
  'Living independently', 'None in particular',
] as const

export const supportStyles = [
  'Having someone listen and give me space to talk',
  'Being asked questions that help me work things out',
  'Talking through practical next steps',
  'Hearing relevant experiences from someone who has been through something similar',
  'Encouragement and reassurance', 'A mixture of these', 'I’m not sure yet',
] as const

// K6: six standard distress items, each scored 0–4 over the past four weeks.
export const k6Questions = [
  'Nervous?', 'Hopeless?', 'Restless or fidgety?',
  'So depressed that nothing could cheer you up?', 'That everything was an effort?', 'Worthless?',
] as const
export const k6Options = ['None of the time', 'A little of the time', 'Some of the time', 'Most of the time', 'All of the time'] as const

// The long questionnaire uses the 10 wellbeing prompts supplied in Questionare.docx.
// Values are stored as 1–5 so the listener receives a conventional 10–50 total.
export const k10Questions = [
  'Tired for no clear reason?', 'Nervous, anxious or on edge?',
  'So anxious that it has been hard to calm down?',
  'Like there is too much going on and you cannot switch off?',
  'Restless or like you cannot properly relax?', 'So restless that it is hard to sit still?',
  'Down, sad or really low?', 'Like everyday things take much more effort than usual?',
  'So down that it is hard to feel better?',
  'Like things feel hopeless or there is not much to look forward to?',
] as const
export const k10Options = ['Never', 'Rarely', 'Sometimes', 'Often', 'Almost always'] as const

export type QuestionnaireType = 'short' | 'long'
export type LongAnswers = {
  course: string; courseYear: string; studentType: string; timeInAustralia: string
  languages: string; preferredLanguage: string; culturalContext: string
  preferenceImportance: string; sharedExperiences: string[]; matchingPriority: string
  whatsGoingOn: string; supportStyle: string; sessionGoal: string; listenerAvoid: string
  impact: number | null; oneThing: string; conversationStart: string; anythingElse: string
}
export const emptyLongAnswers: LongAnswers = {
  course: '', courseYear: '', studentType: '', timeInAustralia: '', languages: '', preferredLanguage: '', culturalContext: '',
  preferenceImportance: '', sharedExperiences: [], matchingPriority: '', whatsGoingOn: '', supportStyle: '', sessionGoal: '', listenerAvoid: '',
  impact: null, oneThing: '', conversationStart: '', anythingElse: '',
}

export type IntakeAnswers = {
  questionnaire: QuestionnaireType
  adult: boolean | null
  listenerGender: string
  topics: string[]
  k6: (number | null)[]
  k10: (number | null)[]
  note: string
  long: LongAnswers
}

export const emptyIntake: IntakeAnswers = {
  questionnaire: 'short', adult: null, listenerGender: '', topics: [],
  k6: Array(6).fill(null), k10: Array(10).fill(null), note: '', long: emptyLongAnswers,
}

export function k6Score(answers: IntakeAnswers): number | null {
  return answers.k6.length === 6 && answers.k6.every(value => value !== null)
    ? answers.k6.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null
}
export function k10Score(answers: IntakeAnswers): number | null {
  return answers.k10.length === 10 && answers.k10.every(value => value !== null)
    ? answers.k10.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null
}
export function wellbeingScore(answers: IntakeAnswers) {
  return answers.questionnaire === 'long' ? k10Score(answers) : k6Score(answers)
}
export function wellbeingScoreLabel(answers: IntakeAnswers) {
  return answers.questionnaire === 'long' ? 'K10 wellbeing score' : 'K6 distress score'
}
