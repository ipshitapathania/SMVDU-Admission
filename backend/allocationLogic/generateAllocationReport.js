import { exec } from "child_process";
import { PrismaClient } from "./prisma/generated/prisma/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// === Utility to run allocation scripts ===
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

// === Run a script repeatedly until no more allocations ===
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

// === Generate final CSV report ===
async function generateAllocationCSV() {
  try {
    console.log("\n=== Generating allocation report ===");

    const allocations = await prisma.allocatedSeat.findMany({
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

    const rows = allocations.map((allocation) => {
      return [
        allocation.student.applicationNumber,
        `"${allocation.student.studentName.replace(/"/g, '""')}"`,
        allocation.student.jeeCRL,
        allocation.student.category,
        allocation.student.subCategory,
        allocation.category,
        allocation.subCategory,
        allocation.department.name,
        allocation.choiceNumber,
      ].join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const filePath = path.join(__dirname, "allocation_report.csv");
    fs.writeFileSync(filePath, csvContent);

    console.log(`✅ Report saved to: ${filePath}`);
  } catch (error) {
    console.error("Error generating CSV:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// === Main runner ===
async function main() {
  try {
    await runScript("testInitialAllocation.js");
    await runScript("testSubcategoryAllocation.js");
    await runUntilNoMoreAllocations("testnewInitial.js");
    await runScript("testReservedLogic.js");
    await runUntilNoMoreAllocations("testnewInitial.js");
    await runScript("testReservedSubcategory.js");
    await runScript("testnewReserved.js");
    await runScript("testnewInitial.js");

    await generateAllocationCSV();

    console.log("\n=== Full allocation + report complete ===");
  } catch (error) {
    console.error("Error during allocation process:", error);
    await prisma.$disconnect();
  }
}

main();
