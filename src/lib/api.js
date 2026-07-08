export async function getNiftyData() {

  return {
    
    nifty: 23882.05,
    change: "+120",
    pcr: 0.95,
    marketStatus: "Bullish",
    strength: 85,
    
    momentum: {
    buying: 82,
    selling: 18,
    trend: "Strong Bullish",
    status: "Increasing",
},

    oi: {
      longBuildUp: 65,
      shortBuildUp: 20,
      shortCovering: 55,
      longUnwinding: 10,
    },

    ai: {
      signal: "BUY CE",
      confidence: 92,
      risk: "Medium",
    },
  };

}