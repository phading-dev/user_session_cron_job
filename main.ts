import { process } from "./processor";

async function main() {
  console.log("Starting processing");
  let startTimeMs = Date.now();
  try {
    await process();
  } catch (e) {
    console.error("Error processing user sessions.", e);
  }
  let elapsedTimeMs = Date.now() - startTimeMs;
  console.log("Finished processing. Elapsed time: ", elapsedTimeMs);
}

main();
