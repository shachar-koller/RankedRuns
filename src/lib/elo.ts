export type EloResult = {
  winnerNewRating: number;
  loserNewRating: number;
  winnerDelta: number;
  loserDelta: number;
};

export function calculateElo(
  winnerRating: number,
  loserRating: number,
  kFactor = 32,
): EloResult {
  const expectedWinner = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + 10 ** ((winnerRating - loserRating) / 400));

  const winnerNewRating = Math.round(winnerRating + kFactor * (1 - expectedWinner));
  const loserNewRating = Math.round(loserRating + kFactor * (0 - expectedLoser));

  return {
    winnerNewRating,
    loserNewRating,
    winnerDelta: winnerNewRating - winnerRating,
    loserDelta: loserNewRating - loserRating,
  };
}
