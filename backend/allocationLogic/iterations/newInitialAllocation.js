import { PrismaClient } from '../prisma/generated/prisma/index.js';

const prisma = new PrismaClient();

export async function fillVacatedGENSeats(round) {
    const results = {
        allocated: [],
        failures: [],
        vacated: []
    };

    try {
        // Get all available GEN-GNGN seats
        const availableSeats = await prisma.seatMatrix.findMany({
            where: {
                category: 'GEN',
                subCategory: 'GNGN',
                totalSeats: { gt: 0 }
            },
            include: { department: true }
        });

        if (availableSeats.length === 0) {
            results.failures.push({ error: 'No seats available', details: 'No GEN-GNGN seats left' });
            return results;
        }

        // Get all students sorted by JEE CRL
        const students = await prisma.studentApplication.findMany({
            orderBy: { jeeCRL: 'asc' },
            include: {
                allocations: {
                    include: { department: true },
                    orderBy: { allocationRound: 'desc' }
                }
            }
        });

        for (const student of students) {
            if (availableSeats.every(s => s.totalSeats <= 0)) break;

            // Case 1: Already has first preference
            const firstPrefAllocation = student.allocations.find(a => a.choiceNumber === 1);
            if (firstPrefAllocation) {
                results.failures.push({
                    student: student.applicationNumber,
                    reason: 'Already has first preference',
                    department: firstPrefAllocation.departmentId
                });
                continue;
            }

            // Get valid preferences
            const preferences = [
                student.courseChoice1,
                student.courseChoice2,
                student.courseChoice3,
                student.courseChoice4,
                student.courseChoice5,
                student.courseChoice6,
                student.courseChoice7
            ].filter(Boolean);

            // Find best available seat
            let bestChoice = null;
            for (const [index, deptId] of preferences.entries()) {
                const seat = availableSeats.find(s => 
                    s.departmentId === deptId && 
                    s.totalSeats > 0
                );
                
                if (seat) {
                    bestChoice = {
                        departmentId: deptId,
                        choiceNumber: index + 1,
                        seatId: seat.id
                    };
                    break;
                }
            }

            if (!bestChoice) {
                results.failures.push({
                    student: student.applicationNumber,
                    reason: 'No preferred seats available'
                });
                continue;
            }

            // Check existing allocations
            const currentAllocation = student.allocations[0];
            
            // NEW LOGIC: Check if candidate has reserved seat in same department
            if (currentAllocation && 
                currentAllocation.departmentId === bestChoice.departmentId &&
                currentAllocation.category !== 'GEN') {
                
                // This is a reserved category candidate who can get same department in GEN
                // We'll proceed with the upgrade
            }
            // Case 2: Already has equal/higher preference (for non-matching departments)
            else if (currentAllocation) {
                const currentPrefIndex = preferences.indexOf(currentAllocation.departmentId);
                if (currentPrefIndex !== -1 && currentPrefIndex <= bestChoice.choiceNumber - 1) {
                    results.failures.push({
                        student: student.applicationNumber,
                        reason: 'Existing allocation is better',
                        current: currentAllocation.departmentId,
                        attempted: bestChoice.departmentId
                    });
                    continue;
                }
            }

            // Attempt allocation
            try {
                await prisma.$transaction(async (tx) => {
                    // Vacate existing allocation
                    if (currentAllocation) {
                        await tx.allocatedSeat.delete({
                            where: { id: currentAllocation.id }
                        });

                        await tx.seatMatrix.update({
                            where: {
                                departmentId_category_subCategory: {
                                    departmentId: currentAllocation.departmentId,
                                    category: currentAllocation.category,
                                    subCategory: currentAllocation.subCategory
                                }
                            },
                            data: { totalSeats: { increment: 1 } }
                        });

                        results.vacated.push(currentAllocation);
                    }

                    // Create new allocation
                    const newAllocation = await tx.allocatedSeat.create({
                        data: {
                            studentId: student.applicationNumber,
                            departmentId: bestChoice.departmentId,
                            allocationRound: round,
                            category: 'GEN',
                            subCategory: 'GNGN',
                            choiceNumber: bestChoice.choiceNumber,
                            jeeRank: student.jeeCRL
                        }
                    });

                    // Update seat matrix
                    await tx.seatMatrix.update({
                        where: { id: bestChoice.seatId },
                        data: { totalSeats: { decrement: 1 } }
                    });

                    results.allocated.push({
                        student: student.applicationNumber,
                        department: bestChoice.departmentId,
                        choiceNumber: bestChoice.choiceNumber,
                        previousCategory: currentAllocation?.category,
                        previousSubCategory: currentAllocation?.subCategory
                    });

                    // Update available seats
                    const seatIndex = availableSeats.findIndex(s => s.id === bestChoice.seatId);
                    availableSeats[seatIndex].totalSeats--;
                });
            } catch (error) {
                results.failures.push({
                    student: student.applicationNumber,
                    reason: 'Allocation failed',
                    error: error.message
                });
            }
        }

        return results;

    } catch (error) {
        console.error('Error in GEN seat filling:', error);
        results.failures.push({
            error: 'Process failed',
            details: error.message
        });
        return results;
    } finally {
        await prisma.$disconnect();
    }
}

export default fillVacatedGENSeats;