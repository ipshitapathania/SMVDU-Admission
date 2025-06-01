// testReservedLogic.js
import { PrismaClient } from "./prisma/generated/prisma/index.js";
import { runReservedCategoryAllocation } from "./iterations/reservedCategory.js";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main(round) {
  console.log(
    `\n=== Starting Reserved Category Allocation for Round ${round} ===`
  );
  try {
    console.log("Starting reserved category allocation process...");
    const results = await runReservedCategoryAllocation(round);

    console.log("\n=== FINAL ALLOCATION RESULTS ===");
    console.log("Allocated Students:");
    results.allocated.forEach((allocation) => {
      console.log(
        `- ${allocation.studentId}: ${allocation.departmentId} ` +
          `(${allocation.category}-${allocation.subCategory}) ` +
          `Choice ${allocation.choiceNumber}`
      );
    });

    console.log("\nFailures:");
    results.failures.forEach((failure) => {
      if (failure.student) {
        console.log(
          `- Student ${failure.student}: ${failure.details || failure.error}`
        );
      } else {
        console.log(`- System error: ${failure.details || failure.error}`);
      }
    });

    console.log("\nVacated Seats:");
    results.vacated.forEach((vacated) => {
      console.log(
        `- ${vacated.departmentId} (${vacated.category}-${vacated.subCategory})`
      );
    });

    // Optional: Save results to file
    const outputPath = path.join(process.cwd(), "allocation-results.json");
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${outputPath}`);
  } catch (error) {
    console.error("Error in testReservedLogic:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(round);
