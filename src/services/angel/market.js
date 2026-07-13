import axios from "axios";

const BASE_URL = process.env.ANGEL_BASE_URL;

export async function getLTP(payload, headers) {
  const response = await axios.post(
    `${BASE_URL}/rest/secure/angelbroking/order/v1/getLtpData`,
    payload,
    { headers }
  );

  return response.data;
}

export async function searchScrip(payload, headers) {
  const response = await axios.post(
    `${BASE_URL}/rest/secure/angelbroking/order/v1/searchScrip`,
    payload,
    { headers }
  );

  return response.data;
}