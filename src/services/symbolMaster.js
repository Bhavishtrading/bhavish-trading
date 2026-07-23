import axios from "axios";

let symbolData = null;

const SYMBOL_MASTER_URL =
  "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

export async function loadSymbolMaster() {
  if (symbolData) {
    return symbolData;
  }

  console.log("Downloading Angel One Symbol Master...");

  const response = await axios.get(SYMBOL_MASTER_URL);

  symbolData = response.data;

  console.log("Total Symbols:", symbolData.length);

  return symbolData;
}

export async function getNiftyOptions() {
  const data = await loadSymbolMaster();

  return data.filter(
    (item) =>
      item.exch_seg === "NFO" &&
      item.name === "NIFTY"
  );
}