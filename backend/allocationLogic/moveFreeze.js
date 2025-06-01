import { PrismaClient } from './prisma/generated/prisma/index.js';
const prisma = new PrismaClient();

async function moveFreezeStudents() {
  try {
    console.log('Starting movement of FREEZE status students...');
    
    // Find all FREEZE status students (case-insensitive search)
    const freezeStudents = await prisma.round2input.findMany({
      where: {
        OR: [
          { status: 'FREEZE' },
          { status: 'Freeze' },
          { status: 'freeze' }
        ]
      }
    });

    console.log(`Found ${freezeStudents.length} students with FREEZE status`);

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Insert into freezeAllocation table
      const createResult = await tx.freezeAllocation.createMany({
        data: freezeStudents.map(student => ({
          studentId: student.studentId,
          departmentId: student.departmentId,
          allocationRound: student.allocationRound,
          category: student.category,
          subCategory: student.subCategory,
          allocatedAt: new Date(),
          choiceNumber: student.choiceNumber,
          jeeRank: student.jeeRank
        }))
      });

      console.log(`Successfully moved ${createResult.count} records to freezeAllocation`);

      // Remove from round2input table (case-insensitive deletion)
      const deleteResult = await tx.round2input.deleteMany({
        where: {
          OR: [
            { status: 'FREEZE' },
            { status: 'Freeze' },
            { status: 'freeze' }
          ]
        }
      });

      console.log(`Successfully removed ${deleteResult.count} FREEZE records from round2input`);
    });

  } catch (error) {
    console.error('Error moving freeze students:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

moveFreezeStudents();