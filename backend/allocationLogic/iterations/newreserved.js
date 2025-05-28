import { PrismaClient } from '../prisma/generated/prisma/index.js';
import { categories } from '../categories.js';

const prisma = new PrismaClient();

export async function runReservedCategoryPhase2(round) {
    const results = {
        allocated: [],
        failures: [],
        vacated: []
    };

    try {
        // Get all reserved category students sorted by JEE CRL (ascending)
        const reservedStudents = await prisma.studentApplication.findMany({
            where: {
                category: {
                    in: Object.keys(categories)
                        .filter(key => key !== 'GEN')
                        .map(key => categories[key].main)
                }
            },
            orderBy: { jeeCRL: 'asc' }, 
            include: {
                allocations: {
                    include: { department: true },
                    orderBy: { allocationRound: 'desc' }
                }
            }
        });

        // Process all reserved students in CRL order
        for (const student of reservedStudents) {
            const category = student.category;
            const currentAllocation = student.allocations[0];
            
            // Get all preferences (excluding current department if allocated)
            const preferences = [
                student.courseChoice1,
                student.courseChoice2,
                student.courseChoice3,
                student.courseChoice4,
                student.courseChoice5,
                student.courseChoice6,
                student.courseChoice7
            ].filter(Boolean)
             .filter(deptId => !currentAllocation || deptId !== currentAllocation.departmentId);

            // Case 1: Already allocated - try to upgrade
            if (currentAllocation) {
                for (const [prefIndex, deptId] of preferences.entries()) {
                    const currentPrefIndex = [
                        student.courseChoice1,
                        student.courseChoice2,
                        student.courseChoice3,
                        student.courseChoice4,
                        student.courseChoice5,
                        student.courseChoice6,
                        student.courseChoice7
                    ].indexOf(currentAllocation.departmentId);

                    // Only upgrade to better preference
                    if (prefIndex >= currentPrefIndex) continue;

                    const availableSeat = await prisma.seatMatrix.findFirst({
                        where: {
                            departmentId: deptId,
                            category,
                            subCategory: category, 
                            totalSeats: { gt: 0 }
                        }
                    });

                    if (availableSeat) {
                        await prisma.$transaction([
                            prisma.allocatedSeat.delete({
                                where: { id: currentAllocation.id }
                            }),
                            prisma.seatMatrix.update({
                                where: {
                                    departmentId_category_subCategory: {
                                        departmentId: currentAllocation.departmentId,
                                        category: currentAllocation.category,
                                        subCategory: currentAllocation.subCategory
                                    }
                                },
                                data: { totalSeats: { increment: 1 } }
                            }),
                            prisma.allocatedSeat.create({
                                data: {
                                    studentId: student.applicationNumber,
                                    departmentId: deptId,
                                    allocationRound: round,
                                    category,
                                    subCategory: category,
                                    choiceNumber: prefIndex + 1,
                                    jeeRank: student.jeeCRL
                                }
                            }),
                            prisma.seatMatrix.update({
                                where: { id: availableSeat.id },
                                data: { totalSeats: { decrement: 1 } }
                            })
                        ]);

                        results.vacated.push(currentAllocation);
                        results.allocated.push({
                            studentId: student.applicationNumber,
                            departmentId: deptId,
                            category,
                            subCategory: category,
                            choiceNumber: prefIndex + 1
                        });
                        break;
                    }
                }
            }
            // Case 2: Unallocated - find best available seat
            else {
                for (const [prefIndex, deptId] of preferences.entries()) {
                    const availableSeat = await prisma.seatMatrix.findFirst({
                        where: {
                            departmentId: deptId,
                            category,
                            subCategory: category,
                            totalSeats: { gt: 0 }
                        }
                    });

                    if (availableSeat) {
                        await prisma.allocatedSeat.create({
                            data: {
                                studentId: student.applicationNumber,
                                departmentId: deptId,
                                allocationRound: round,
                                category,
                                subCategory: category,
                                choiceNumber: prefIndex + 1,
                                jeeRank: student.jeeCRL
                            }
                        });

                        await prisma.seatMatrix.update({
                            where: { id: availableSeat.id },
                            data: { totalSeats: { decrement: 1 } }
                        });

                        results.allocated.push({
                            studentId: student.applicationNumber,
                            departmentId: deptId,
                            category,
                            subCategory: category,
                            choiceNumber: prefIndex + 1
                        });
                        break;
                    }
                }
            }
        }

        return results;
    } catch (error) {
        console.error('Phase 2 allocation failed:', error);
        results.failures.push({ 
            error: 'Process failed', 
            details: error.message 
        });
        return results;
    } finally {
        await prisma.$disconnect();
    }
}

export default runReservedCategoryPhase2;