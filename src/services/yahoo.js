import yahooFinance from "yahoo-finance2";

export async function getNiftyHistory() {
  try {
    const result = await yahooFinance.chart("^NSEI", {
      period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      interval: "5m",
    });

    return result.quotes || [];
  } catch (error) {
    console.error("Yahoo Error:", error.message);
    return [];
  }
}