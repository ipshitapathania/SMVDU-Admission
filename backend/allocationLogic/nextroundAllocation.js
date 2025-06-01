import { PrismaClient } from "./prisma/generated/prisma/index.js";
import { main as runInitialAllocation } from "./generateAllocationReport.js";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const round = 2;

async function main() {
  try {
    console.log(`\n=== 🚀 Starting Round ${round} Allocation ===`);

    // Step 1: Fetch previous allocations (from Round 1)
    const previousAllocations = await prisma.allocatedSeat.findMany({
      where: { allocationRound: 1 },
      include: { student: true },
    });

    // Step 2: Separate retained and removed students
    const validAllocatedStudents = [];
    const removedStudents = [];

    for (const alloc of previousAllocations) {
      const { student } = alloc;
      if (student.feesPaid && ["FREEZE", "FLOAT"].includes(student.status)) {
        validAllocatedStudents.push({
          applicationNumber: student.applicationNumber,
          status: student.status,
          feesPaid: student.feesPaid,
          source: "PrevAlloc-FREEZE/FLOAT",
        });
      } else {
        removedStudents.push({
          applicationNumber: student.applicationNumber,
          status: student.status,
          feesPaid: student.feesPaid,
        });
      }
    }

    const removedStudentIds = removedStudents.map((s) => s.applicationNumber);

    console.log(
      `\n✅ Retaining ${validAllocatedStudents.length} students from Round 1`
    );
    console.log(
      `🚫 Removing ${removedStudentIds.length} students (fees not paid)`
    );

    // Step 3: Find students who were never allotted in Round 1
    const neverAllotted = await prisma.studentApplication.findMany({
      where: {
        allocations: { none: { allocationRound: 1 } },
      },
      select: {
        applicationNumber: true,
        status: true,
        feesPaid: true,
      },
    });

    const neverAllottedDetails = neverAllotted.map((s) => ({
      applicationNumber: s.applicationNumber,
      status: s.status,
      feesPaid: s.feesPaid,
      source: "NeverAllotted-R1",
    }));

    console.log(
      `\n🆕 Including ${neverAllottedDetails.length} never-allotted students from Round 1`
    );

    // Step 4: Fetch generally eligible students who paid and are not removed
    const generallyEligible = await prisma.studentApplication.findMany({
      where: {
        feesPaid: true,
        status: { in: ["FREEZE", "FLOAT"] },
        applicationNumber: { notIn: removedStudentIds },
      },
      select: {
        applicationNumber: true,
        status: true,
        feesPaid: true,
      },
    });

    const eligibleDetails = generallyEligible.map((s) => ({
      applicationNumber: s.applicationNumber,
      status: s.status,
      feesPaid: s.feesPaid,
      source: "EligibleGeneral",
    }));

    console.log(
      `\n📋 Found ${eligibleDetails.length} generally eligible students`
    );

    // Step 5: Combine and deduplicate students
    const allCandidates = [
      ...validAllocatedStudents,
      ...neverAllottedDetails,
      ...eligibleDetails,
    ];

    const validStudentsMap = new Map();
    allCandidates.forEach((s) => {
      if (!removedStudentIds.includes(s.applicationNumber)) {
        validStudentsMap.set(s.applicationNumber, s);
      }
    });

    const finalStudentIds = Array.from(validStudentsMap.keys());

    console.log(
      `\n📊 Total valid students for Round ${round}: ${finalStudentIds.length}`
    );
<<<<<<< Updated upstream
    return;
    console.log(`\n✅ Final valid students for Round ${round}:`);
    validStudentIds.forEach((id) => {
      const student = finalValidStudentsDetailsMap.get(id);
=======
    console.log(`✅ Final valid students:`);
    finalStudentIds.forEach((id) => {
      const s = validStudentsMap.get(id);
>>>>>>> Stashed changes
      console.log(
        `  App: ${s.applicationNumber}, Status: ${s.status}, Fees: ${s.feesPaid}, Source: ${s.source}`
      );
    });

    // Step 6: Delete previous unpaid allocations
    if (removedStudentIds.length > 0) {
      const { count } = await prisma.allocatedSeat.deleteMany({
        where: {
          allocationRound: 1,
          student: { applicationNumber: { in: removedStudentIds } },
        },
      });
      console.log(`\n🗑️ Deleted ${count} unpaid allocations from Round 1`);
    }

    // Step 7: Run allocation script
    const roundResults = await runInitialAllocation(round, finalStudentIds);
    console.log(`\n✅ Round ${round} Allocation Completed`);

    // Step 8: Save JSON output
    if (roundResults) {
      const jsonPath = path.join(
        process.cwd(),
        `round${round}-allocation-results.json`
      );
      fs.writeFileSync(jsonPath, JSON.stringify(roundResults, null, 2));
      console.log(`📁 JSON saved at ${jsonPath}`);
    }

    // Step 9: Export final allocations to CSV
    const allocations = await prisma.allocatedSeat.findMany({
      where: { allocationRound: round },
      include: { student: true, department: true },
      orderBy: { student: { jeeCRL: "asc" } },
    });

    if (allocations.length > 0) {
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

      const rows = allocations.map((a) =>
        [
          a.student.applicationNumber,
          `"${a.student.studentName.replace(/"/g, '""')}"`,
          a.student.jeeCRL,
          a.student.category,
          a.student.subCategory,
          a.category,
          a.subCategory,
          a.department.name,
          a.choiceNumber,
        ].join(",")
      );

      const csv = [headers, ...rows].join("\n");
      const csvPath = path.join(
        process.cwd(),
        `round${round}-allocation-report.csv`
      );
      fs.writeFileSync(csvPath, csv);
      console.log(`📄 CSV saved at ${csvPath}`);
    } else {
      console.log("⚠️ No allocations found to export.");
    }
  } catch (error) {
    console.error("❌ Error in allocation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
