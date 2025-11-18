const BASE_URL = "http://localhost:5000/api/auth/";

export async function handleLoginPassCheck(username, pass) {
  try {
    const response = await fetch(BASE_URL + "login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username, unhashedPass: pass })
    });
    const jsonResponse = await response.json(); //json-ify readablestream data
    console.log(jsonResponse)
    if (jsonResponse) return jsonResponse;
  } catch (e) {
    console.log(e, "Request failed.");
  }
}