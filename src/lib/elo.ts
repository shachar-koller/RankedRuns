export type EloResult = {
  winnerNewRating: number;
  loserNewRating: number;
  winnerDelta: number;
  loserDelta: number;
  marginMultiplier: number;
  repeatMatchMultiplier: number;
};

export function calculateElo(
  winnerRating: number,
  loserRating: number,
  kFactor = 32,
  options: { winnerScore?: number; loserScore?: number; gameTo?: number; repeatMatchMultiplier?: number } = {},
): EloResult {
  const expectedWinner = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + 10 ** ((winnerRating - loserRating) / 400));
  const marginMultiplier =
    options.winnerScore && options.loserScore !== undefined && options.gameTo
      ? calculateMarginMultiplier(options.winnerScore, options.loserScore, options.gameTo)
      : 1;
  const repeatMatchMultiplier = options.repeatMatchMultiplier ?? 1;

  const winnerNewRating = Math.round(
    winnerRating + kFactor * marginMultiplier * repeatMatchMultiplier * (1 - expectedWinner),
  );
  const loserNewRating = Math.round(
    loserRating + kFactor * marginMultiplier * repeatMatchMultiplier * (0 - expectedLoser),
  );

  return {
    winnerNewRating,
    loserNewRating,
    winnerDelta: winnerNewRating - winnerRating,
    loserDelta: loserNewRating - loserRating,
    marginMultiplier,
    repeatMatchMultiplier,
  };
}

export function calculateMarginMultiplier(winnerScore: number, loserScore: number, gameTo: number) {
  const marginPct = (winnerScore - loserScore) / gameTo;
  return Math.min(2, Math.max(0.75, 0.5 + 1.5 * marginPct));
}
