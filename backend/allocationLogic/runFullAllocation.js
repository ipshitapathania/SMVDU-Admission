import { exec } from "child_process";

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Running ${scriptName} ===`);
    exec(`node ${scriptName}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error in ${scriptName}:`, error);
        return reject(error);
      }
      if (stderr) console.error(`Stderr from ${scriptName}:`, stderr);
      console.log(stdout);

      const allocatedMatch = stdout.match(/Allocated:\s*(\d+)/i);
      const allocatedCount = allocatedMatch
        ? parseInt(allocatedMatch[1], 10)
        : null;

      resolve({ allocatedCount });
    });
  });
}

async function runUntilNoMoreAllocations(scriptName) {
  let totalAllocated = 0;
  while (true) {
    const { allocatedCount } = await runScript(scriptName);
    if (!allocatedCount || allocatedCount === 0) {
      console.log(`No new allocations from ${scriptName}. Moving on.`);
      break;
    }
    totalAllocated += allocatedCount;
    console.log(`${allocatedCount} allocations done this round. Continuing...`);
  }
  return totalAllocated;
}

async function main() {
  try {
    
    await runScript("testInitialAllocation.js");
    await runScript("testSubcategoryAllocation.js");
    await runUntilNoMoreAllocations("testnewinitial.js");
    await runScript("testReservedLogic.js");
    await runUntilNoMoreAllocations("testnewinitial.js");
    await runScript("testReservedSubcategory.js");
    await runScript("testnewReserved.js");
    await runScript("testnewinitial.js");

    console.log("\n=== Full allocation process complete ===");
  } catch (error) {
    console.error("Error during allocation process:", error);
  }
}

main();
