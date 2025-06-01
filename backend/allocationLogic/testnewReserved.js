// testReservedPhase2.js
import { PrismaClient } from "./prisma/generated/prisma/index.js";
import { runReservedCategoryPhase2 } from "./iterations/newreserved.js";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main(round) {
  try {
    console.log("Starting reserved category phase 2 allocation process...");
    const results = await runReservedCategoryPhase2(round);

    console.log(`\n=== PHASE ${round} ALLOCATION RESULTS ===`);
    console.log("Allocated Students:");
    results.allocated.forEach((allocation) => {
      console.log(
        `- ${allocation.studentId}: ${allocation.departmentId} ` +
          `(${allocation.category}-${allocation.subCategory}) ` +
          `Choice ${allocation.choiceNumber}`
      );
    });

    console.log("\nUpgraded Students:");
    results.allocated
      .filter((a) => a.choiceNumber)
      .forEach((allocation) => {
        const original = results.vacated.find(
          (v) => v.studentId === allocation.studentId
        );
        if (original) {
          console.log(
            `- ${allocation.studentId}: ` +
              `Upgraded from ${original.departmentId} ` +
              `to ${allocation.departmentId} (Choice ${allocation.choiceNumber})`
          );
        }
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

    // Save results to file
    const outputPath = path.join(
      process.cwd(),
      "phase2-allocation-results.json"
    );
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${outputPath}`);

    // Verification checks
    await verifyAllocationQuality(results);
  } catch (error) {
    console.error("Error in testReservedPhase2:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyAllocationQuality(results) {
  console.log("\n=== VERIFICATION CHECKS ===");

  // 1. Check no higher CRL student got worse allocation
  const allocations = await prisma.allocatedSeat.findMany({
    where: { category: { not: "GEN" } },
    orderBy: { jeeRank: "asc" },
    include: { student: true },
  });

  let rankingViolations = 0;
  allocations.reduce((prev, curr) => {
    if (prev && curr.jeeRank < prev.jeeRank) {
      console.warn(
        `Rank violation: ${curr.studentId} (CRL:${curr.jeeRank}) has seat while ` +
          `${prev.studentId} (CRL:${prev.jeeRank}) has better rank`
      );
      rankingViolations++;
    }
    return curr;
  }, null);

  // 2. Check all upgrades were genuine improvements
  let invalidUpgrades = 0;
  results.allocated.forEach((newAlloc) => {
    const oldAlloc = results.vacated.find(
      (v) => v.studentId === newAlloc.studentId
    );
    if (oldAlloc) {
      const student = prisma.studentApplication.findUnique({
        where: { applicationNumber: newAlloc.studentId },
      });
      const preferences = [
        student.courseChoice1,
        student.courseChoice2,
        student.courseChoice3,
        student.courseChoice4,
        student.courseChoice5,
        student.courseChoice6,
        student.courseChoice7,
      ].filter(Boolean);

      const newPrefIndex = preferences.indexOf(newAlloc.departmentId);
      const oldPrefIndex = preferences.indexOf(oldAlloc.departmentId);

      if (newPrefIndex >= oldPrefIndex) {
        console.warn(
          `Invalid upgrade: ${newAlloc.studentId} moved to ` +
            `choice ${newPrefIndex + 1} from ${oldPrefIndex + 1}`
        );
        invalidUpgrades++;
      }
    }
  });

  console.log(
    `Verification complete. ${rankingViolations} ranking violations, ${invalidUpgrades} invalid upgrades found.`
  );
}

main(round);
