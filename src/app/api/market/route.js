import { NextResponse } from "next/server";
import { getNiftyPrice } from "../../../services/yahooApi";

export async function GET() {

    const nifty = await getNiftyPrice();

    const data = {

        nifty: nifty.price,

        change: nifty.change,

        changePercent: nifty.changePercent,

        status: nifty.change >= 0 ? "Bullish" : "Bearish",

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