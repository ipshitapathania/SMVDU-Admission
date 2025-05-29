import { PrismaClient } from "./prisma/generated/prisma/index.js";
import { runInitialAllocation } from "./iterations/newinitial.js";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  try {
    const round = 2;

    console.log(`\n=== Starting Round ${round} Allocation ===`);

    // Step 1: Get all allocations from round 1
    const previousAllocations = await prisma.allocatedSeat.findMany({
      where: { allocationRound: 1 },
      include: { student: true },
    });

    // Step 2: Filter students to keep
    const validStudentIds = previousAllocations
      .filter(
        (alloc) =>
          (alloc.student.status === "FREEZE" &&
            alloc.student.feesPaid === true) ||
          (alloc.student.status === "FLOAT" && alloc.student.feesPaid === true)
      )
      .map((alloc) => alloc.studentId);

    // Students to remove due to fees not paid or null
    const removedStudentIds = previousAllocations
      .filter(
        (alloc) =>
          (alloc.student.status === "FREEZE" &&
            alloc.student.feesPaid !== true) ||
          (alloc.student.status === "FLOAT" && alloc.student.feesPaid !== true)
      )
      .map((alloc) => alloc.studentId);

    console.log(`\nRetaining ${validStudentIds.length} students for Round 2.`);
    console.log(
      `Removing ${removedStudentIds.length} students due to fees not paid.`
    );

    // Step 3: Delete previous allocations of removed students
    if (removedStudentIds.length > 0) {
      const deleteResult = await prisma.allocatedSeat.deleteMany({
        where: {
          allocationRound: 1,
          studentId: {
            in: removedStudentIds,
          },
        },
      });
      console.log(
        `Deleted ${deleteResult.count} allocations for students with unpaid fees.`
      );
    }

    // Step 4: Run the initial allocation again for round 2
    const round2Results = await runInitialAllocation(round, validStudentIds);

    console.log(`\n✅ Round ${round} Allocation Complete`);
    console.log(`New Allocations: ${round2Results.allocated.length}`);

    // Step 5: Save results
    const filePath = path.join(
      process.cwd(),
      `round${round}-allocation-results.json`
    );
    fs.writeFileSync(filePath, JSON.stringify(round2Results, null, 2));
    console.log(`Results saved to ${filePath}`);
  } catch (error) {
    console.error("Error in Round 2 Allocation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
