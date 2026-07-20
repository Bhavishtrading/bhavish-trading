export function calculatePCR(putOI = 0, callOI = 0) {
  if (callOI <= 0) {
    return 0;
  }

  return Number((putOI / callOI).toFixed(2));
}

export function getPCRSignal(pcr) {
  if (pcr >= 1.50) {
    return {
      signal: "Strong Bullish",
      score: 20,
      color: "green",
    };
  }

  if (pcr >= 1.20) {
    return {
      signal: "Bullish",
      score: 15,
      color: "green",
    };
  }

  if (pcr >= 0.90) {
    return {
      signal: "Neutral",
      score: 5,
      color: "yellow",
    };
  }

  if (pcr >= 0.70) {
    return {
      signal: "Bearish",
      score: -10,
      color: "orange",
    };
  }

  return {
    signal: "Strong Bearish",
    score: -20,
    color: "red",
  };
}