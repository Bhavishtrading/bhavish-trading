export function calculatePCR(putOI, callOI) {
  if (!callOI || callOI === 0) {
    return 0;
  }

  return Number((putOI / callOI).toFixed(2));
}

export function getPCRSignal(pcr) {
  if (pcr >= 1.2) {
    return "Strong Bullish";
  }

  if (pcr >= 0.9) {
    return "Bullish";
  }

  if (pcr >= 0.7) {
    return "Neutral";
  }

  return "Bearish";
}