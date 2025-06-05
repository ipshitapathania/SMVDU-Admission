import { PrismaClient } from "./prisma/generated/prisma/index.js";
import { runGeneralSubcategoryAllocation } from "./iterations/generalSubcategory.js";
import { categories } from "./categories.js";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function main(round) {
  try {
    round = round || 1; // Default to round 1 if not provided
    console.log(
      `\n=== Starting General Subcategory Allocation Test (Round ${round}) ===`
    );
    // Fetch all students with their current allocations
    const students = await prisma.studentApplication.findMany({
      include: {
        allocations: {
          orderBy: {
            choiceNumber: "asc",
          },
          include: {
            department: true,
          },
        },
      },
      orderBy: {
        jeeCRL: "asc",
      },
    });

    console.log(`Found ${students.length} students in database`);

    // Filter only GEN category students
    const genStudents = students.filter((s) => s.category === "GEN");
    console.log(`Found ${genStudents.length} GEN category students`);

    // Run general subcategory allocation with round parameter
    console.log(
      `\n=== Starting General Subcategory Allocation (Round ${round}) ===`
    );
    const results = await runGeneralSubcategoryAllocation(genStudents, round);

    // Generate detailed CSV report
    const csvLines = [
      "ApplicationNumber,Category,SubCategory,JEE_Rank,Category_Rank,Special_Criteria," +
        "Previous_Department,Previous_Choice," +
        "New_Department,New_Choice,Status",
    ];

    // Process successful allocations
    results.success.forEach((a) => {
      const student = students.find((s) => s.applicationNumber === a.student);
      const prevAlloc = student?.allocations?.[0];
      const specialCriteria =
        a.subCategory === "GNSPT"
          ? student.sptMarks
          : a.subCategory === "GNPWD"
          ? student.pwdRank
          : a.subCategory === "GNCPF" || a.subCategory === "GNCDP"
          ? student.cdpPriority
          : "";

      csvLines.push(
        `${a.student},GEN,${a.subCategory},${a.jeeRank},${student.categoryRank},${specialCriteria},` +
          `${prevAlloc?.department?.departmentId || "None"},` +
          `${prevAlloc?.choiceNumber || "None"},` +
          `${a.department},${a.choiceNumber},Success`
      );
    });

    // Process failed allocations
    results.failures.forEach((f) => {
      const student = students.find((s) => s.applicationNumber === f.student);
      if (!student) return;

      const prevAlloc = student?.allocations?.[0];
      const specialCriteria =
        student.subCategory === "GNSPT"
          ? student.sptMarks
          : student.subCategory === "GNPWD"
          ? student.pwdRank
          : student.subCategory === "GNCPF" || student.subCategory === "GNCDP"
          ? student.cdpPriority
          : "";

      csvLines.push(
        `${f.student},GEN,${student.subCategory},${f.jeeRank},${student.categoryRank},${specialCriteria},` +
          `${prevAlloc?.department?.departmentId || "None"},` +
          `${prevAlloc?.choiceNumber || "None"},` +
          `,,Failed,${f.reason || "No seats available"}`
      );
    });

    // Process vacated seats
    results.vacated?.forEach((v) => {
      const student = students.find((s) => s.applicationNumber === v.student);
      if (!student) return;

      csvLines.push(
        `${v.student},GEN,${student.subCategory},${student.jeeCRL},${student.categoryRank},,` +
          `${v.department},,` +
          `,,Vacated,Seat returned to GEN-${v.subCategory} pool`
      );
    });

    const csvOutput = csvLines.join("\n");
    const outputPath = path.join(
      "./",
      `general_subcategory_results_round_${round}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    fs.writeFileSync(outputPath, csvOutput);
    console.log(`\n✅ Detailed CSV report saved to: ${outputPath}`);

    // Generate seat matrix comparison report
    console.log("\nGenerating seat matrix comparison report...");
    const preMatrix = await prisma.seatMatrix.findMany({
      where: {
        category: "GEN",
        subCategory: {
          in: ["GNPWD", "GNSPT", "GNCDP", "GNCPF"],
        },
      },
    });

    const postMatrix = await prisma.seatMatrix.findMany({
      where: {
        category: "GEN",
        subCategory: {
          in: ["GNPWD", "GNSPT", "GNCDP", "GNCPF"],
        },
      },
    });

    const matrixReport = [
      "Department,SubCategory,Initial_Seats,Allocated,Remaining_Seats",
    ];

    preMatrix.forEach((seat) => {
      const postSeat = postMatrix.find(
        (s) =>
          s.departmentId === seat.departmentId &&
          s.subCategory === seat.subCategory
      );
      const allocated = seat.totalSeats - (postSeat?.totalSeats || 0);

      matrixReport.push(
        `${seat.departmentId},${seat.subCategory},` +
          `${seat.totalSeats},${allocated},${postSeat?.totalSeats || 0}`
      );
    });

    const matrixPath = path.join(
      "./",
      `general_subcategory_seat_matrix_round_${round}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    fs.writeFileSync(matrixPath, matrixReport.join("\n"));
    console.log(`✅ Seat matrix report saved to: ${matrixPath}`);
  } catch (error) {
    console.error("Error in general subcategory allocation test:", error);
  } finally {
    await prisma.$disconnect();
  }
}


