import { PrismaClient } from './prisma/generated/prisma/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function generateAllocationCSV() {
    try {
        console.log('Generating allocation report...');
        
        // Fetch all allocated seats with related data
        const allocations = await prisma.allocatedSeat.findMany({
            include: {
                student: true,
                department: true
            },
            orderBy: {
                student: {
                    jeeCRL: 'asc'  // Sort by JEE CRL in ascending order
                }
            }
        });

        console.log(`Found ${allocations.length} allocations`);

        // Prepare CSV content
        const headers = [
            'ApplicationNumber',
            'StudentName',
            'JEE_CRL',
            'StudentCategory',
            'StudentSubCategory',
            'AllocatedCategory',
            'AllocatedSubCategory',
            'AllocatedCourse',
            'ChoiceNumber'  // Added choice number column
        ].join(',');

        const rows = allocations.map(allocation => {
            return [
                allocation.student.applicationNumber,
                `"${allocation.student.studentName.replace(/"/g, '""')}"`,
                allocation.student.jeeCRL,  // Added JEE CRL
                allocation.student.category,
                allocation.student.subCategory,
                allocation.category,
                allocation.subCategory,
                allocation.department.name,
                allocation.choiceNumber  // Added choice number
            ].join(',');
        });

        const csvContent = [headers, ...rows].join('\n');
        const filePath = path.join(__dirname, 'allocation_report.csv');
        
        fs.writeFileSync(filePath, csvContent);
        console.log(`✅ Report saved to: ${filePath}`);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

generateAllocationCSV();