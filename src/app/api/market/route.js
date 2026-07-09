import { NextResponse } from "next/server";

export async function GET() {

    const data = {

        nifty: 24850,

        change: 120,

        changePercent: 0.48,

        status: "Bullish",

        pcr: 0.96,

        strength: 88,

        oi: {
            longBuildUp: 65,
            shortBuildUp: 20,
            shortCovering: 55,
            longUnwinding: 10
        },

        ai: {
            signal: "BUY CE",
            confidence: 92,
            risk: "Medium"
        },

        momentum: {
            buying: 82,
            selling: 18,
            trend: "Strong Bullish",
            status: "Increasing"
        }

    };

    return NextResponse.json(data);

}