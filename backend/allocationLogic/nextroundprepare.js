// cleanupForNextRound.js
import { PrismaClient } from "./prisma/generated/prisma/index.js";

const prisma = new PrismaClient(); // Define the round statically here
export async function cleanupForNextRound(round) {
  console.log(`\n=== Cleanup Before Round ${round + 1} ===`);
  const results = {
    finalized: [],
    removedUnpaid: [],
    errors: [],
  };

  try {
    const allocations = await prisma.allocatedSeat.findMany({
      where: { allocationRound: round },
      include: {
        student: true,
        department: true,
      },
    });
    console.log(`Found ${allocations.length} allocations for round ${round}`);

    for (const allocation of allocations) {
      const {
        studentId,
        student,
        departmentId,
        allocationRound,
        category,
        subCategory,
        feesPaid,
        status,
      } = allocation;
      console.log(
        `Processing student ${student.applicationNumber} (${student.studentName}) - Status: ${status}, Fees Paid: ${feesPaid}`
      );
      if (status == "FREEZE" && feesPaid == true) {
        // Case 1: Finalized student — move to separate table
        await prisma.frozenStudent.create({
          data: {
            applicationNumber: student.applicationNumber,
            category,
            subCategory,
            jeeCRL: student.jeeCRL,
            departmentId,
            status: status,
            round: allocationRound,
            choiceNumber: allocation.choiceNumber,
            feesPaid: true,
          },
        });
        console.log("cheching line excueted inside if block");
        await prisma.allocatedSeat.deleteMany({
          where: { studentId: studentId },
        });
        try {
          console.log(`Deleting student ${student.applicationNumber}...`);
          await prisma.studentApplication.delete({
            where: { applicationNumber: student.applicationNumber },
          });
          console.log("cheching line excueted inside try block");
        } catch (err) {
          console.error(
            `❌ Could not delete student ${student.applicationNumber}:`,
            err.message
          );
          results.errors.push({
            student: student.applicationNumber,
            error: `Delete failed: ${err.message}`,
          });
        }

        // Reduce seats (seat taken permanently)
        await prisma.seatMatrix.update({
          where: {
            departmentId_category_subCategory: {
              departmentId,
              category,
              subCategory,
            },
          },
          data: { totalSeats: { decrement: 1 } },
        });

        results.finalized.push(student.applicationNumber);
      } else if (feesPaid !== true) {
        // Case 2: Unpaid — remove student + increase seats
        await prisma.allocatedSeat.deleteMany({
          where: { studentId: studentId },
        });
        await prisma.studentApplication.delete({
          where: { applicationNumber: student.applicationNumber },
        });

        await prisma.seatMatrix.update({
          where: {
            departmentId_category_subCategory: {
              departmentId,
              category,
              subCategory,
            },
          },
          data: { totalSeats: { increment: 1 } },
        });

        results.removedUnpaid.push(student.applicationNumber);
      }
    }

    console.log("\n✔ Cleanup complete.");
    console.log(`Finalized (Freeze+Paid): ${results.finalized.length}`);
    console.log(`Removed Unpaid: ${results.removedUnpaid.length}`);

    const all = await prisma.studentApplication.findMany({
      where: { status: "FREEZE" },
    });

    console.log("Total students in DB:", all.length);

    return results;
  } catch (error) {
    console.error("Cleanup failed:", error);
    results.errors.push({ error: error.message });
    return results;
  } finally {
    await prisma.$disconnect();
  }
}

export default cleanupForNextRound;

cleanupForNextRound(1);
