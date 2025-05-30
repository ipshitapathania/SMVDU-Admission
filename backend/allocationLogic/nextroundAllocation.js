import { PrismaClient } from "./prisma/generated/prisma/index.js";
import { main as runInitialAllocation } from "./generateAllocationReport.js";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const round = 2;

async function main() {
  try {
    console.log(`\n=== Starting Round ${round} Allocation ===`);

    // Step 1: Get all allocations from round 1
    const previousAllocations = await prisma.allocatedSeat.findMany({
      where: { allocationRound: 1 },
      include: { student: true },
    });

    // Step 2: Determine students to retain from Round 1
    const validAllocatedStudentsDetails = previousAllocations
      .filter(
        (alloc) =>
          alloc.student.feesPaid === true &&
          (alloc.student.status === "FREEZE" ||
            alloc.student.status === "FLOAT")
      )
      .map((alloc) => ({
        applicationNumber: alloc.student.applicationNumber,
        status: alloc.student.status,
        feesPaid: alloc.student.feesPaid,
        source: "PrevAlloc-FREEZE/FLOAT",
      }));

    const validAllocatedStudentIds = validAllocatedStudentsDetails.map(
      (s) => s.applicationNumber
    );

    const removedStudentDetails = previousAllocations
      .filter((alloc) => alloc.student.feesPaid !== true)
      .map((alloc) => ({
        applicationNumber: alloc.student.applicationNumber,
        status: alloc.student.status,
        feesPaid: alloc.student.feesPaid,
      }));

    const removedStudentIds = removedStudentDetails.map(
      (s) => s.applicationNumber
    );

    console.log(
      `\n✅ Retaining ${validAllocatedStudentIds.length} students from Round 1`
    );
    console.log(
      `🚫 Removing ${removedStudentIds.length} students (fees not paid)`
    );

    // Step 3: Find students who were never allotted (allocations == [])
    const neverAllottedStudents = await prisma.studentApplication.findMany({
      where: {
        allocations: {
          none: {
            allocationRound: 1,
          },
        },
      },
      select: {
        applicationNumber: true,
        status: true,
        feesPaid: true,
      },
    });

    const neverAllottedStudentsDetails = neverAllottedStudents.map((s) => ({
      applicationNumber: s.applicationNumber,
      status: s.status,
      feesPaid: s.feesPaid,
      source: "NeverAllotted-R1",
    }));

    console.log(
      `\n🆕 Including ${neverAllottedStudentsDetails.length} never-allotted students from Round 1`
    );

    // Step 4: All generally eligible students with fees paid and not removed
    const allEligibleStudentsRaw = await prisma.studentApplication.findMany({
      where: {
        feesPaid: true,
        status: {
          in: ["FREEZE", "FLOAT"],
        },
        applicationNumber: {
          notIn: removedStudentIds,
        },
      },
      select: {
        applicationNumber: true,
        status: true,
        feesPaid: true,
      },
    });

    const allEligibleStudentsFiltered = allEligibleStudentsRaw.map((s) => ({
      applicationNumber: s.applicationNumber,
      status: s.status,
      feesPaid: s.feesPaid,
      source: "EligibleGeneral",
    }));

    console.log(
      `\n📋 ${allEligibleStudentsFiltered.length} generally eligible students`
    );

    // Step 5: Combine all valid students into a unique set
    const allDetails = [
      ...validAllocatedStudentsDetails,
      ...neverAllottedStudentsDetails,
      ...allEligibleStudentsFiltered,
    ];

    const finalValidStudentsDetailsMap = new Map();
    for (const student of allDetails) {
      if (!removedStudentIds.includes(student.applicationNumber)) {
        finalValidStudentsDetailsMap.set(student.applicationNumber, student);
      }
    }

    const validStudentIds = Array.from(finalValidStudentsDetailsMap.keys());

    console.log(
      `\n📊 Total valid students for Round ${round}: ${validStudentIds.length}`
    );
    return;
    console.log(`\n✅ Final valid students for Round ${round}:`);
    validStudentIds.forEach((id) => {
      const student = finalValidStudentsDetailsMap.get(id);
      console.log(
        `  App: ${student.applicationNumber}, Status: ${student.status}, Fees: ${student.feesPaid}, Source: ${student.source}`
      );
    });

    // Step 6: Delete previous unpaid allocations
    if (removedStudentIds.length > 0) {
      const deleted = await prisma.allocatedSeat.deleteMany({
        where: {
          allocationRound: 1,
          student: {
            applicationNumber: {
              in: removedStudentIds,
            },
          },
        },
      });
      console.log(
        `\n🗑️ Deleted ${deleted.count} allocations for unpaid students from Round 1`
      );
    }

    // Step 7: Run new allocation
    const round2Results = await runInitialAllocation(round, validStudentIds);
    console.log(`\n✅ Round ${round} Allocation Complete`);

    // Step 8: Save results as JSON
    if (round2Results) {
      const jsonPath = path.join(
        process.cwd(),
        `round${round}-allocation-results.json`
      );
      fs.writeFileSync(jsonPath, JSON.stringify(round2Results, null, 2));
      console.log(`📁 JSON saved at ${jsonPath}`);
    }

    // Step 9: Export results to CSV
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

      const rows = allocations.map((allocation) =>
        [
          allocation.student.applicationNumber,
          `"${allocation.student.studentName.replace(/"/g, '""')}"`,
          allocation.student.jeeCRL,
          allocation.student.category,
          allocation.student.subCategory,
          allocation.category,
          allocation.subCategory,
          allocation.department.name,
          allocation.choiceNumber,
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
