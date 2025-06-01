import allocateSeats from "../allocateSeats.js";
import { categories } from "../categories.js";
import { PrismaClient } from "../prisma/generated/prisma/index.js";

const prisma = new PrismaClient();

// List of all departments
const ALL_DEPARTMENTS = [
  "cs",
  "ce",
  "ece",
  "ee",
  "me",
  "mnc",
  "b_arch",
  "b_des",
  "bt",
  "ai_robotics",
];

export async function runReservedSubcategoryAllocation(students, round) {
  const results = {
    success: [],
    failures: [],
    vacated: [],
  };

  try {
    // Process each reserved category (excluding GEN)
    const reservedCategories = Object.keys(categories).filter(
      (cat) => cat !== "GEN"
    );

    for (const category of reservedCategories) {
      console.log(`\n=== Processing ${category} Category ===`);

      // Get all subcategories for this reserved category
      const subCategories = categories[category].sub;

      for (const subCategory of subCategories) {
        if (subCategory === `${category}${category}`) continue; // Skip main category seats

        console.log(`\nProcessing ${category}-${subCategory} subcategory`);

        // Filter students for this category+subcategory who don't have first choice
        const eligibleStudents = students.filter((s) => {
          if (s.category !== category || s.subCategory !== subCategory)
            return false;

          // Skip students with existing first choice allocation
          if (s.allocations?.some((a) => a.choiceNumber === 1)) {
            console.log(`Skipping ${s.applicationNumber} - has 1st choice`);
            return false;
          }
          return true;
        });

        if (eligibleStudents.length === 0) {
          console.log(`No eligible students for ${category}-${subCategory}`);
          continue;
        }

        // Get sorting criteria for this subcategory
        const sortCriteria = getSortCriteriaForSubcategory(subCategory);
        console.log(`Sorting by: ${sortCriteria}`);

        // Sort students
        const sortedStudents = [...eligibleStudents].sort((a, b) => {
          switch (sortCriteria) {
            case "pwdRank":
              return a.pwdRank - b.pwdRank || a.jeeCRL - b.jeeCRL;
            case "sptMarks":
              return b.sptMarks - a.sptMarks || a.jeeCRL - b.jeeCRL;
            case "cdpPriority":
              return a.cdpPriority - b.cdpPriority || a.jeeCRL - b.jeeCRL;
            case "rank":
            default:
              return a.categoryRank - b.categoryRank || a.jeeCRL - b.jeeCRL;
          }
        });

        // Check available seats
        const availableSeats = await prisma.seatMatrix.findMany({
          where: {
            departmentId: { in: ALL_DEPARTMENTS },
            category: category,
            subCategory: subCategory,
            totalSeats: { gt: 0 },
          },
        });

        if (availableSeats.length === 0) {
          console.log(`No seats available for ${category}-${subCategory}`);
          continue;
        }

        console.log(`Available seats for ${subCategory}:`);
        availableSeats.forEach((s) =>
          console.log(`${s.departmentId}: ${s.totalSeats}`)
        );

        // Run allocation
        const allocationResult = await allocateSeats(sortedStudents, {
          category: category,
          subCategory: subCategory,
          round: round,
          mode: "upgrade",
          sortCriteria: sortCriteria,
          checkExisting: true,
          allowVacate: true,
        });

        // Merge results
        results.success.push(...(allocationResult.success || []));
        results.failures.push(...(allocationResult.failures || []));
        results.vacated.push(...(allocationResult.vacated || []));

        console.log(`Allocation results for ${subCategory}:`, {
          success: allocationResult.success?.length || 0,
          failures: allocationResult.failures?.length || 0,
          vacated: allocationResult.vacated?.length || 0,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error in reserved subcategory allocation:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getSortCriteriaForSubcategory(subCategory) {
  // Map subcategory suffixes to sorting criteria
  if (subCategory.endsWith("PWD")) return "pwdRank";
  if (subCategory.endsWith("SPT")) return "sptMarks";
  if (subCategory.endsWith("CDP")) return "cdpPriority";
  if (subCategory.endsWith("CPF")) return "rank"; // Default for CPF
  return "rank"; // Fallback
}

export default runReservedSubcategoryAllocation;
