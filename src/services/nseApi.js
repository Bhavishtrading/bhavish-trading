export async function fetchOptionChain() {

  try {

    console.log("🚀 NSE Data Service Started");

    return {
      success: false,
      message: "NSE API not connected yet",
      data: null,
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      message: error.message,
      data: null,
    };

  }

}