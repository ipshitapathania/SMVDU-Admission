import { PrismaClient } from '../prisma/generated/prisma/index.js';
import { categories } from '../categories.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

async function loadDepartments() {
    const departments = [];
    const csvPath = path.join(__dirname, '..', '..', 'data', 'departments.csv');
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => departments.push({
                id: row.id.trim(),
                name: row.name.trim()
            }))
            .on('end', () => resolve(departments))
            .on('error', (error) => reject(error));
    });
}

async function allocateSeat(student, choiceNumber, seatMatrix, departmentId, category, subCategory, round, results) {
    try {
        const allocation = await prisma.allocatedSeat.create({
            data: {
                studentId: student.applicationNumber,
                departmentId,
                allocationRound: round,
                category,
                subCategory,
                choiceNumber,
                jeeRank: student.jeeCRL
            }
        });

        await prisma.seatMatrix.update({
            where: { id: seatMatrix.id },
            data: { totalSeats: { decrement: 1 } }
        });

        results.allocated.push(allocation);
    } catch (error) {
        results.failures.push({
            student: student.applicationNumber,
            error: 'Allocation failed',
            details: error.message
        });
    }
}

async function upgradeAllocation(student, oldAllocation, newChoiceNumber, seatMatrix, departmentId, category, subCategory, round, results) {
    try {
        await prisma.$transaction([
            prisma.allocatedSeat.delete({ where: { id: oldAllocation.id } }),
            prisma.seatMatrix.update({
                where: { 
                    departmentId_category_subCategory: {
                        departmentId: oldAllocation.departmentId,
                        category: oldAllocation.category,
                        subCategory: oldAllocation.subCategory
                    }
                },
                data: { totalSeats: { increment: 1 } }
            }),
            prisma.allocatedSeat.create({
                data: {
                    studentId: student.applicationNumber,
                    departmentId,
                    allocationRound: round,
                    category,
                    subCategory,
                    choiceNumber: newChoiceNumber,
                    jeeRank: student.jeeCRL
                }
            }),
            prisma.seatMatrix.update({
                where: { id: seatMatrix.id },
                data: { totalSeats: { decrement: 1 } }
            })
        ]);

        results.vacated.push(oldAllocation);
        results.allocated.push({
            studentId: student.applicationNumber,
            departmentId,
            category,
            subCategory,
            choiceNumber: newChoiceNumber
        });
    } catch (error) {
        results.failures.push({
            student: student.applicationNumber,
            error: 'Upgrade failed',
            details: error.message
        });
    }
}

export async function runReservedCategoryAllocation(round) {
    const results = { allocated: [], failures: [], vacated: [] };

    try {
        const departments = await loadDepartments();
        const reservedCategories = Object.keys(categories)
            .filter(key => key !== 'GEN')
            .map(key => categories[key].main);

        // Get ALL reserved candidates sorted by JEE CRL
        const allCandidates = await prisma.studentApplication.findMany({
            where: { category: { in: reservedCategories } },
            orderBy: { jeeCRL: 'asc' },
            include: {
                allocations: {
                    include: { department: true },
                    orderBy: { allocationRound: 'desc' }
                }
            }
        });

        // Process all candidates in CRL order
        for (const student of allCandidates) {
            const category = student.category;
            const subCategory = category; // Force main category allocation

            const preferences = [
                student.courseChoice1,
                student.courseChoice2,
                student.courseChoice3,
                student.courseChoice4,
                student.courseChoice5,
                student.courseChoice6,
                student.courseChoice7
            ].filter(Boolean);

            // Try each preference in order
            for (const [index, deptId] of preferences.entries()) {
                try {
                    const seatMatrix = await prisma.seatMatrix.findFirst({
                        where: {
                            departmentId: deptId,
                            category,
                            subCategory,
                            totalSeats: { gt: 0 }
                        },
                        select: { id: true, totalSeats: true }
                    });

                    if (!seatMatrix) continue;

                    const existingDeptAllocation = student.allocations.find(a => 
                        a.departmentId === deptId
                    );

                    if (existingDeptAllocation) {
                        results.failures.push({
                            student: student.applicationNumber,
                            error: 'Existing department allocation',
                            details: `Already has ${deptId}`
                        });
                        continue;
                    }

                    const currentAllocation = student.allocations[0];

                    if (!currentAllocation) {
                        await allocateSeat(
                            student, index + 1, seatMatrix, 
                            deptId, category, subCategory, round, results
                        );
                        break;
                    }

                    const currentPrefIndex = preferences.indexOf(currentAllocation.departmentId);
                    if (currentPrefIndex === -1 || index < currentPrefIndex) {
                        if (currentAllocation.category === 'GEN' && currentAllocation.subCategory === 'GNGN') {
                            await upgradeAllocation(
                                student, currentAllocation, index + 1,
                                seatMatrix, deptId, category, subCategory, round, results
                            );
                            break;
                        }
                    }
                } catch (error) {
                    console.error(`Error processing ${student.applicationNumber}:`, error);
                }
            }
        }

        return results;
    } catch (error) {
        console.error('Allocation error:', error);
        results.failures.push({ error: 'Process failed', details: error.message });
        return results;
    } finally {
        await prisma.$disconnect();
    }
}

export default runReservedCategoryAllocation;