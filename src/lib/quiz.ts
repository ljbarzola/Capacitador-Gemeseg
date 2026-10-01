import { randomInt } from "node:crypto";

// Mezcla Fisher-Yates con aleatoriedad criptográfica (orden aleatorio de preguntas y opciones).
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type GradableQuestion = {
  id: string;
  options: { id: string; isCorrect: boolean }[];
};

export type Answers = Record<string, string[]>;

// Una pregunta es correcta solo si las opciones elegidas coinciden exactamente con las correctas
// (vale para opción única, selección múltiple y verdadero/falso). Sin crédito parcial.
export function gradeQuiz(questions: GradableQuestion[], answers: Answers) {
  let correct = 0;
  for (const question of questions) {
    const expected = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
    const chosen = new Set((answers[question.id] ?? []).filter((id) => question.options.some((o) => o.id === id)));
    if (expected.size > 0 && expected.size === chosen.size && [...expected].every((id) => chosen.has(id))) {
      correct++;
    }
  }
  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, score };
}
