import { PrismaClient } from './prisma/generated/prisma/index.js';
import fs from 'fs';
const prisma = new PrismaClient();

async function exportFreezeAllocationsToCSV() {
  try {
    console.log('Fetching entries from freezeAllocation table...');
    
    const allocations = await prisma.freezeAllocation.findMany({
      orderBy: {
        jeeRank: 'asc'
      }
    });

    // Define CSV headers
    const headers = [
      'Student ID',
      'Department',
      'Round',
      'Category',
      'SubCategory',
      'Choice Number',
      'JEE Rank',
      'Allocated At'
    ].join(',');

    // Convert data to CSV rows
    const rows = allocations.map(entry => [
      entry.studentId,
      entry.departmentId,
      entry.allocationRound,
      entry.category,
      entry.subCategory || 'NA',
      entry.choiceNumber,
      entry.jeeRank,
      entry.allocatedAt.toISOString()
    ].join(','));

    // Combine headers and rows
    const csvContent = [headers, ...rows].join('\n');

    // Write to file
    const fileName = 'freeze_allocations.csv';
    fs.writeFileSync(fileName, csvContent);

    console.log(`\nExported ${allocations.length} entries to ${fileName}`);

  } catch (error) {
    console.error('Error exporting freeze allocations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportFreezeAllocationsToCSV();