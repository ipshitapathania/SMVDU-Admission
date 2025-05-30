// testReservedSubcategoryAllocation.js
import { PrismaClient } from './prisma/generated/prisma/index.js';
import runReservedSubcategoryAllocation from './iterations/reservedSubcategory.js';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    try {
        // Fetch all students with allocations
        const students = await prisma.studentApplication.findMany({
            include: {
                allocations: {
                    orderBy: { choiceNumber: 'asc' },
                    include: { department: true }
                }
            },
            orderBy: { jeeCRL: 'asc' }
        });

        console.log(`Starting reserved subcategory allocation with ${students.length} students`);

        // Run allocation (typically round 3+)
        const results = await runReservedSubcategoryAllocation(students, 1);

        // Generate report
        const report = [
            'AppNo,Category,SubCategory,Rank,PrevDept,PrevChoice,NewDept,NewChoice,Status'
        ];

        results.success.forEach(a => {
            const student = students.find(s => s.applicationNumber === a.student);
            report.push(
                `${a.student},${a.category},${a.subCategory},` +
                `${student.categoryRank},` +
                `${student.allocations[0]?.department?.id || 'None'},` +
                `${student.allocations[0]?.choiceNumber || 'None'},` +
                `${a.department},${a.choiceNumber},Success`
            );
        });

        results.failures.forEach(f => {
            report.push(
                `${f.student},${f.category},${f.subCategory},` +
                `${f.categoryRank},,,,Failed:${f.reason}`
            );
        });

        // Save report
        const reportPath = path.join('./', `reserved_subcategory_results_${new Date().toISOString().slice(0,10)}.csv`);
        fs.writeFileSync(reportPath, report.join('\n'));
        console.log(`Report saved to ${reportPath}`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();