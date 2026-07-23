import { KiteConnect } from "kiteconnect";

let kite = null;

export function getKiteClient() {
  if (!kite) {
    kite = new KiteConnect({
      api_key: process.env.KITE_API_KEY,
    });
  }

  return kite;
}

export function setAccessToken(accessToken) {
  const client = getKiteClient();
  client.setAccessToken(accessToken);
  return client;
}