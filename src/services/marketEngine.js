export function calculateMarketStatus(data) {

    let score = 0;

    if (data.pcr > 0.9)
        score += 20;

    if (data.strength > 80)
        score += 20;

    if (data.oi.longBuildUp > data.oi.shortBuildUp)
        score += 20;

    if (data.momentum.buying > data.momentum.selling)
        score += 20;

    if (data.ai.confidence > 80)
        score += 20;

    return score;

}