import axios from "axios";

const BASE_URL = process.env.ANGEL_BASE_URL;

console.log("BASE_URL =", BASE_URL);

export async function angelLogin(payload, headers) {
  console.log(
    "Login URL =",
    `${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`
  );

  const response = await axios.post(
    `${BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`,
    payload,
    { headers }
  );

  return response.data;
}

export async function getProfile(jwtToken, headers) {
  const response = await axios.get(
    `${BASE_URL}/rest/secure/angelbroking/user/v1/getProfile`,
    {
      headers: {
        ...headers,
        Authorization: `Bearer ${jwtToken}`,
      },
    }
  );

  return response.data;
}