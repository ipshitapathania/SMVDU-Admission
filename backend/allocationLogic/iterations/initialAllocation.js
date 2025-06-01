import allocateSeats from "../allocateSeats.js";

/**
 * Runs the seat allocation for the given students and round number.
 * @param {Array} students - List of student applications.
 * @param {number} round - Allocation round number.
 * @returns Allocation results from allocateSeats.
 */
export async function runInitialAllocation(students, round) {
  // 1. Sort students by JEE CRL rank
  const sortedStudents = [...students].sort((a, b) => a.jeeCRL - b.jeeCRL);

  console.log(`\n=== Starting Allocation (Round ${round}) ===`);
  console.log(`Processing ${sortedStudents.length} students in JEE rank order`);

  // 2. Sanitize and filter choices (remove nulls)
  const preparedStudents = sortedStudents.map((student) => {
    const filteredChoices = [
      student.courseChoice1,
      student.courseChoice2,
      student.courseChoice3,
      student.courseChoice4,
      student.courseChoice5,
      student.courseChoice6,
      student.courseChoice7,
    ].filter(Boolean);

    return {
      ...student,
      courseChoice1: filteredChoices[0] || null,
      courseChoice2: filteredChoices[1] || null,
      courseChoice3: filteredChoices[2] || null,
      courseChoice4: filteredChoices[3] || null,
      courseChoice5: filteredChoices[4] || null,
      courseChoice6: filteredChoices[5] || null,
      courseChoice7: filteredChoices[6] || null,
      category: "GEN",
      subCategory: "GNGN",
    };
  });

  // 3. Run allocation
  return await allocateSeats(preparedStudents, {
    round,
    mode: "initial",
    allowChoicePriority: true,
    options: {
      checkRanking: true,
      tryAllChoices: true,
    },
  });
}
