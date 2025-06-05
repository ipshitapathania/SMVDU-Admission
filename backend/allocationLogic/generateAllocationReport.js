import { PrismaClient } from "./prisma/generated/prisma/index.js";
import fs from "fs";
import path, { resolve } from "path";
import { fileURLToPath } from "url";
import { main as runInitial } from "./testInitialAllocation.js";
import { main as runSubcategory } from "./testSubcategoryAllocation.js";
import { main as runReserved } from "./testReservedLogic.js";
import { main as runReservedSub } from "./testReservedSubcategory.js";
import { main as runNewInitial } from "./testnewInitial.js";
import { main as runNewReserved } from "./testnewReserved.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// Define the round statically here
const round = 1;

// === Run a script repeatedly until no more allocations ===
async function runUntilNoMoreAllocations(fn, round) {
  let totalAllocated = 0;
  while (true) {
    const result = await fn(round);
    console.log(`Round ${round} allocations:`, result);
    const allocatedCount = result?.allocated.length ?? 0;
    if (allocatedCount === 0) {
      console.log("No more allocations. Moving on.");
      break;
    }
    totalAllocated += allocatedCount;
    console.log(`${allocatedCount} allocations done this round. Continuing...`);
  }
  return totalAllocated;
}
// === Generate final CSV report ===
async function generateAllocationCSV() {
  try {
    console.log("\n=== Generating allocation report ===");

    const allocations = await prisma.allocatedSeat.findMany({
      where: { allocationRound: round },
      include: {
        student: true,
        department: true,
      },
      orderBy: {
        student: {
          jeeCRL: "asc",
        },
      },
    });

    console.log(`Found ${allocations.length} allocations`);

    const headers = [
      "ApplicationNumber",
      "StudentName",
      "JEE_CRL",
      "StudentCategory",
      "StudentSubCategory",
      "AllocatedCategory",
      "AllocatedSubCategory",
      "AllocatedCourse",
      "ChoiceNumber",
    ].join(",");

    const rows = allocations.map((a) => {
      return [
        a.student.applicationNumber,
        `"${a.student.studentName.replace(/"/g, '""')}"`,
        a.student.jeeCRL,
        a.student.category,
        a.student.subCategory,
        a.category,
        a.subCategory,
        a.department.name,
        a.choiceNumber,
      ].join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const filePath = path.join(
      __dirname,
      `round${round}-allocation_report.csv`
    );
    fs.writeFileSync(filePath, csvContent);

    console.log(`✅ Report saved to: ${filePath}`);
  } catch (error) {
    console.error("Error generating CSV:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// === Main Runner ===
export async function main(round) {
  try {
    console.log(`\n=== Allocation Report Generation: Round ${round} ===`);
    await runInitial(round);
    await runSubcategory(round);
    await runUntilNoMoreAllocations(runNewInitial, round);
    await runReserved(round);
    await runUntilNoMoreAllocations(runNewInitial, round);
    await runReservedSub(round);
    await runNewReserved(round);
    await runNewInitial(round);

    await generateAllocationCSV();

    console.log(
      `\n=== Full allocation + report complete for Round ${round} ===`
    );
  } catch (error) {
    console.error("Error during allocation process:", error);
    await prisma.$disconnect();
  }
}

main();
