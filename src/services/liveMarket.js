export function getMarketSession() {
  // Convert to IST
  const now = new Date();

  const ist = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  const day = ist.getDay();

  const hour = ist.getHours();

  const minute = ist.getMinutes();

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

    text: isOpen ? "🟢 LIVE" : "🔴 MARKET CLOSED",

    time: ist.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),

    date: ist.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
}