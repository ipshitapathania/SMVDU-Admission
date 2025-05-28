// testFillGENSeats.js
import { PrismaClient } from './prisma/generated/prisma/index.js';
import fillVacatedGENSeats from './iterations/newInitialAllocation.js';

const prisma = new PrismaClient();

async function main() {
    try {
        const results = await fillVacatedGENSeats(2); // Use appropriate round number
        
        console.log('\n=== GEN-GNGN Seat Filling Results ===');
        console.log(`Allocated: ${results.allocated.length}`);
        console.log(`Vacated: ${results.vacated.length}`);
        console.log(`Failures: ${results.failures.length}`);

        console.log('\nAllocations:');
        results.allocated.forEach(a => {
            console.log(`- ${a.student} → ${a.department} (Choice ${a.choiceNumber})`);
        });

        console.log('\nVacated Seats:');
        results.vacated.forEach(v => {
            console.log(`- ${v.departmentId} (${v.category}-${v.subCategory})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();