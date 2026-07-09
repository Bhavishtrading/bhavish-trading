export function getMarketSession() {

    const now = new Date();

    const day = now.getDay();

    const hour = now.getHours();

    const minute = now.getMinutes();

    const current = hour * 60 + minute;

    const open = 9 * 60 + 15;

    const close = 15 * 60 + 30;

    const isWeekday = day >= 1 && day <= 5;

    const isOpen =
        isWeekday &&
        current >= open &&
        current <= close;

    return {

        isOpen,

        text: isOpen ? "LIVE" : "MARKET CLOSED",

        time: now.toLocaleTimeString("en-IN"),

        date: now.toLocaleDateString("en-IN")

    };

}