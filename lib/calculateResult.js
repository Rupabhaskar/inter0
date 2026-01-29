
import { questionsData } from "../data/questions";

export function calculateResult(questions, answers) {
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  questions.forEach((q, i) => {
    if (answers[i] === undefined) {
      skipped++;
    } else if (answers[i] === q.correct) {
      score += 4;     // JEE correct
      correct++;
    } else {
      score -= 1;     // JEE negative
      wrong++;
    }
  });

  return {
    score,
    correct,
    wrong,
    skipped,
    total: questions.length,
  };
}
