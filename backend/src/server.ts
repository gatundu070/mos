import "./config/env.js";

async function main(): Promise<void> {
  try {
    console.log("The server is running");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log("Failed to start the server: ", errMsg);
    process.exit();
  }
}

main();
