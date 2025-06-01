import { PrismaClient } from './prisma/generated/prisma/index.js';const prisma = new PrismaClient();

async function removeUnpaidAndUpdateSeats() {
  try {
    console.log('Starting removal of unpaid students...');
    
    // First get the unpaid students to know which seats to increase
    const unpaidStudents = await prisma.round2input.findMany({
      where: {
        feesPaid: false
      }
    });

    console.log(`Found ${unpaidStudents.length} unpaid students`);

    // Group students by department and category to update seat matrix
    const seatUpdates = unpaidStudents.reduce((acc, student) => {
      const key = `${student.departmentId}-${student.category}-${student.subCategory || 'null'}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Update seat matrix for each department-category combination
    for (const [key, count] of Object.entries(seatUpdates)) {
      const [departmentId, category, subCategory] = key.split('-');
      
      await prisma.seatMatrix.updateMany({
        where: {
          departmentId,
          category,
          subCategory: subCategory === 'null' ? null : subCategory
        },
        data: {
          totalSeats: {
            increment: count
          }
        }
      });

      console.log(`Increased ${count} seats for ${departmentId} - ${category} ${subCategory}`);
    }

    // Remove unpaid students from round2input
    const deleteResult = await prisma.round2input.deleteMany({
      where: {
        feesPaid: false
      }
    });

    console.log(`Successfully removed ${deleteResult.count} unpaid students from round2input`);
    console.log('Seat matrix updated successfully');

  } catch (error) {
    console.error('Error in processing:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeUnpaidAndUpdateSeats();