import { PrismaClient } from './prisma/generated/prisma/index.js';
const prisma = new PrismaClient();

async function moveFreezeStudents() {
  try {
    console.log('Starting movement of FREEZE status students...');
    
    // Find all FREEZE status students
    const freezeStudents = await prisma.round2input.findMany({
      where: {
        status: 'FREEZE'
      }
    });

    console.log(`Found ${freezeStudents.length} students with FREEZE status`);

    // Insert into freezeAllocation table
    const createResult = await prisma.freezeAllocation.createMany({
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

    // Remove from round2input table
    const deleteResult = await prisma.round2input.deleteMany({
      where: {
        status: 'FREEZE'
      }
    });

    console.log(`Successfully removed ${deleteResult.count} FREEZE records from round2input`);

  } catch (error) {
    console.error('Error moving freeze students:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

moveFreezeStudents();