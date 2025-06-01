import { PrismaClient } from './prisma/generated/prisma/index.js';
const prisma = new PrismaClient();

async function round2Allocation() {
  try {
    console.log('Starting Round 2 Allocation...');

    // Step 1: Check for better preferences for existing students
    console.log('Checking better preferences for existing students...');
    const existingStudents = await prisma.round2input.findMany({
      orderBy: {
        jeeRank: 'asc'
      }
    });

    // Process each existing student
    for (const student of existingStudents) {
      // Get original application for preferences
      const originalApp = await prisma.studentApplication.findUnique({
        where: { applicationNumber: student.studentId }
      });

      if (!originalApp) continue;

      console.log(`\nProcessing student ${student.studentId}`);
      console.log(`Current allocation: ${student.departmentId} (Choice ${student.choiceNumber})`);

      const courseChoices = [
        originalApp.courseChoice1,
        originalApp.courseChoice2,
        originalApp.courseChoice3,
        originalApp.courseChoice4,
        originalApp.courseChoice5,
        originalApp.courseChoice6,
        originalApp.courseChoice7
      ].filter(Boolean);

      // Check only better preferences than current
      for (let i = 0; i < student.choiceNumber - 1; i++) {
        const betterChoice = courseChoices[i];
        console.log(`\nChecking better choice ${i + 1}: ${betterChoice}`);

        const seatAllocation = await checkSeatAvailability(
          betterChoice,
          student.category,
          student.subCategory
        );

        if (seatAllocation.found) {
          try {
            await prisma.$transaction(async (tx) => {
              // First verify seat is still available
              const currentSeat = await tx.seatMatrix.findFirst({
                where: {
                  id: seatAllocation.matrixEntry.id,
                  totalSeats: { gt: 0 }
                }
              });

              if (!currentSeat) {
                throw new Error('Seat no longer available');
              }

              // 1. Return seat to original allocation
              await tx.seatMatrix.updateMany({
                where: {
                  departmentId: student.departmentId,
                  category: student.category,
                  subCategory: student.subCategory
                },
                data: {
                  totalSeats: { increment: 1 }
                }
              });

              // 2. Take seat from new allocation
              await tx.seatMatrix.updateMany({
                where: {
                  departmentId: betterChoice,
                  category: seatAllocation.category,
                  subCategory: seatAllocation.subCategory
                },
                data: {
                  totalSeats: { decrement: 1 }
                }
              });

              // 3. Update student allocation in round2input
              await tx.round2input.update({
                where: { id: student.id },
                data: {
                  departmentId: betterChoice,
                  choiceNumber: i + 1,
                  category: seatAllocation.category,
                  subCategory: seatAllocation.subCategory
                }
              });

              console.log(`Upgraded student ${student.studentId} to ${betterChoice} (Choice ${i + 1})`);
              console.log(`New category: ${seatAllocation.category}-${seatAllocation.subCategory || 'NA'}`);
            });

            // Break after successful upgrade
            break;
          } catch (error) {
            console.error('Failed to upgrade student:', error);
          }
        }
      }
    }

    // Copy to freezeAllocation but prevent duplicates
    for (const student of existingStudents) {
      // Check if entry already exists
      const existingFreeze = await prisma.freezeAllocation.findFirst({
        where: {
          studentId: student.studentId,
          departmentId: student.departmentId,
          allocationRound: student.allocationRound
        }
      });

      if (!existingFreeze) {
        await prisma.freezeAllocation.create({
          data: {
            studentId: student.studentId,
            departmentId: student.departmentId,
            allocationRound: student.allocationRound,
            category: student.category,
            subCategory: student.subCategory,
            choiceNumber: student.choiceNumber,
            jeeRank: student.jeeRank,
            allocatedAt: new Date()
          }
        });
      }
    }

    // Update the logging message
    console.log('Copied new allocations to freezeAllocation while preventing duplicates');

    // Step 2: Process new allocations
    console.log('Processing new allocations...');
    console.log('Querying for unallocated students...');
    const unallocatedStudents = await prisma.$queryRaw`
      SELECT s."applicationNumber", 
             s."studentName",
             s."jeeCRL",
             s."category",
             s."subCategory",
             s."courseChoice1",
             s."courseChoice2",
             s."courseChoice3",
             s."courseChoice4",
             s."courseChoice5",
             s."courseChoice6",
             s."courseChoice7"
      FROM "StudentApplication" s
      LEFT JOIN "AllocatedSeat" a ON a."studentId" = s."applicationNumber"
      WHERE a."studentId" IS NULL
      ORDER BY s."jeeCRL" ASC;
    `;

    // After the unallocatedStudents query, add detailed logging
    console.log('=== Debug Information ===');
    console.log(`Total unallocated students found: ${unallocatedStudents.length}`);

    // Get current seat matrix state
    const currentSeatMatrix = await prisma.seatMatrix.findMany();
    console.log('\nCurrent Seat Matrix:');
    console.log(JSON.stringify(currentSeatMatrix, null, 2));

    // Modify the student processing loop
    for (const student of unallocatedStudents) {
      console.log('\n=== Processing Student ===');
      console.log(`Student ID: ${student.applicationNumber}`);
      console.log(`Category: ${student.category}-${student.subCategory || 'NA'}`);
      console.log(`JEE Rank: ${student.jeeCRL}`);
      
      const courseChoices = [
        student.courseChoice1,
        student.courseChoice2,
        student.courseChoice3,
        student.courseChoice4,
        student.courseChoice5,
        student.courseChoice6,
        student.courseChoice7
      ].filter(Boolean);

      console.log('Course Choices:', courseChoices);

      for (let i = 0; i < courseChoices.length; i++) {
        const choice = courseChoices[i];
        console.log(`\nTrying Choice ${i + 1}: ${choice}`);

        // Check seat matrix for this choice
        const seatMatrixForChoice = await prisma.seatMatrix.findMany({
          where: {
            departmentId: choice
          }
        });
        
        console.log('Available seats for choice:', JSON.stringify(seatMatrixForChoice, null, 2));

        const seatAllocation = await checkSeatAvailability(
          choice,
          student.category,
          student.subCategory
        );

        console.log('Seat allocation result:', JSON.stringify(seatAllocation, null, 2));

        if (seatAllocation.found) {
          console.log('Found available seat! Attempting allocation...');
          try {
            await prisma.$transaction(async (tx) => {
              console.log(`Starting allocation transaction for student ${student.applicationNumber}`);
              
              // Verify seat still available
              const currentSeat = await tx.seatMatrix.findFirst({
                where: {
                  id: seatAllocation.matrixEntry.id,
                  totalSeats: {
                    gt: 0
                  }
                }
              });

              if (!currentSeat) {
                throw new Error('Seat no longer available');
              }

              // Log before update
              console.log('Updating seat matrix...');
              
              // Decrement seat in the found category
              await tx.seatMatrix.updateMany({
                where: {
                  departmentId: choice,
                  category: seatAllocation.category,
                  subCategory: seatAllocation.subCategory
                },
                data: {
                  totalSeats: {
                    decrement: 1
                  }
                }
              });

              // Create new allocation in round2input
              const newAllocation = await tx.round2input.create({
                data: {
                  studentId: student.applicationNumber,
                  departmentId: choice,
                  allocationRound: 2,
                  category: seatAllocation.category, // Use the allocated category directly
                  subCategory: seatAllocation.subCategory, // Use the allocated subCategory directly
                  choiceNumber: i + 1,
                  jeeRank: student.jeeCRL,
                  status: 'FLOAT',
                  feesPaid: false,
                  allocatedAt: new Date()
                }
              });

              // Create entry in AllocatedSeat for tracking
              await tx.allocatedSeat.create({
                data: {
                  studentId: student.applicationNumber,
                  departmentId: choice,
                  allocationRound: 2,
                  category: student.category,
                  subCategory: student.subCategory,
                  choiceNumber: i + 1,
                  jeeRank: student.jeeCRL
                }
              });

              console.log(`Successfully allocated student ${student.applicationNumber} to ${choice} under ${seatAllocation.category}-${seatAllocation.subCategory || 'NA'}`);
              console.log('Transaction completed successfully');
            });

            // Break the choice loop after successful allocation
            break;
          } catch (error) {
            console.error('Transaction failed:', error);
          }
        } else {
          console.log('No seat available for this choice, trying next...');
        }
      }
    }

    // After all allocations are done, copy FLOAT students to freezeAllocation
    console.log('\nCopying FLOAT students to freezeAllocation...');
    const floatStudents = await prisma.round2input.findMany({
      where: {
        status: 'FLOAT'
      }
    });

    // Copy FLOAT students to freezeAllocation while keeping them in round2input
    for (const student of floatStudents) {
      await prisma.freezeAllocation.create({
        data: {
          studentId: student.studentId,
          departmentId: student.departmentId,
          allocationRound: student.allocationRound,
          category: student.category,
          subCategory: student.subCategory,
          choiceNumber: student.choiceNumber,
          jeeRank: student.jeeRank,
          allocatedAt: new Date()
        }
      });
    }

    console.log(`Copied ${floatStudents.length} FLOAT students to freezeAllocation`);
    console.log('Students remain in round2input for next round');

    console.log('Round 2 allocation completed successfully!');

    // After processing existing students
    console.log('\n=== Upgrade Summary ===');

    // Get all students from round2input with their current allocations
    const upgradedStudents = await prisma.round2input.findMany({
      select: {
        studentId: true,
        departmentId: true,
        choiceNumber: true,
        category: true,
        subCategory: true,
        jeeRank: true
      },
      orderBy: {
        jeeRank: 'asc'
      }
    });

    // Compare with original allocations (existingStudents)
    const initialAllocations = new Map(
      existingStudents.map(student => [
        student.studentId,
        {
          dept: student.departmentId,
          choice: student.choiceNumber,
          category: student.category,
          subCategory: student.subCategory
        }
      ])
    );

    // Display upgrade information
    for (const current of upgradedStudents) {
      const initial = initialAllocations.get(current.studentId);
      if (initial && (initial.dept !== current.departmentId || initial.choice !== current.choiceNumber)) {
        console.log(`\nStudent ${current.studentId} (JEE Rank: ${current.jeeRank}):`);
        console.log(`  From: ${initial.dept} (Choice ${initial.choice})`);
        console.log(`       Category: ${initial.category}-${initial.subCategory || 'NA'}`);
        console.log(`  To  : ${current.departmentId} (Choice ${current.choiceNumber})`);
        console.log(`       Category: ${current.category}-${current.subCategory || 'NA'}`);
      }
    }

    console.log('\nTotal students checked:', upgradedStudents.length);
    console.log('=== End Upgrade Summary ===\n');

    // Add final migration of all round2input entries to freezeAllocation
    console.log('\n=== Moving All Round 2 Allocations to Freeze Table ===');
    
    const allRound2Students = await prisma.round2input.findMany();
    let migratedCount = 0;

    for (const student of allRound2Students) {
      // Check for existing entry to prevent duplicates
      const existingFreeze = await prisma.freezeAllocation.findFirst({
        where: {
          studentId: student.studentId,
          departmentId: student.departmentId,
          allocationRound: student.allocationRound
        }
      });

      if (!existingFreeze) {
        await prisma.freezeAllocation.create({
          data: {
            studentId: student.studentId,
            departmentId: student.departmentId,
            allocationRound: student.allocationRound,
            category: student.category,
            subCategory: student.subCategory,
            choiceNumber: student.choiceNumber,
            jeeRank: student.jeeRank,
            allocatedAt: new Date()
          }
        });
        migratedCount++;
      }
    }

    console.log(`Successfully migrated ${migratedCount} entries to freezeAllocation`);
    console.log('Round 2 allocation and freeze process completed successfully!');

  } catch (error) {
    console.error('Error in round 2 allocation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions
async function checkSeatAvailability(departmentId, category, subCategory) {
    // First check for exact category match
    const exactMatch = await prisma.seatMatrix.findFirst({
        where: {
            departmentId,
            category,
            subCategory: subCategory || null,
            totalSeats: {
                gt: 0
            }
        }
    });

    if (exactMatch) {
        console.log(`Found seat in exact match: ${category}-${subCategory || 'NA'}`);
        return {
            found: true,
            category,
            subCategory,
            matrixEntry: exactMatch
        };
    }

    // Then check for GEN category
    const genMatch = await prisma.seatMatrix.findFirst({
        where: {
            departmentId,
            category: 'GEN',
            subCategory: 'GNGN',
            totalSeats: {
                gt: 0
            }
        }
    });

    if (genMatch) {
        console.log('Found seat in GEN-GNGN');
        return {
            found: true,
            category: 'GEN',
            subCategory: 'GNGN',
            matrixEntry: genMatch
        };
    }

    // If no seats found
    console.log(`No seats available in ${departmentId} for ${category}-${subCategory || 'NA'}`);
    return { found: false };
}

async function updateSeatMatrix(departmentId, category, subCategory, change) {
  await prisma.seatMatrix.updateMany({
    where: {
      departmentId,
      category,
      subCategory: subCategory || null
    },
    data: {
      totalSeats: {
        increment: change
      }
    }
  });
}

round2Allocation();