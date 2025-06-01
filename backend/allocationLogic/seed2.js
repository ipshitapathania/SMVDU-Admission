import { PrismaClient } from './prisma/generated/prisma/index.js';
import fs from 'fs';
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Clean BOM from first field if present
        const cleanedData = {};
        for (const key in data) {
          const cleanedKey = key.replace(/^\uFEFF/, ''); // Remove BOM
          cleanedData[cleanedKey] = data[key];
        }
        results.push(cleanedData);
      })
      .on('end', () => {
        console.log(`Read ${results.length} records from ${filePath}`);
        if (results.length > 0) {
          console.log('Sample record:', results[0]);
        }
        resolve(results);
      })
      .on('error', (error) => reject(error));
  });
}

async function main() {
  try {
    // Clear existing data from both tables
    console.log('Clearing existing data...');
    await prisma.$transaction([
      prisma.freezeAllocation.deleteMany(),
      prisma.round2input.deleteMany()
    ]);
    console.log('Successfully cleared freezeAllocation and round2input tables');

    // Read CSV file
    console.log('Reading round1.csv file...');
    const round2inputData = await readCSV('../data/round1.csv');

    // Process Round 2 Applications
    console.log('Processing round 2 applications...');
    const validApplications = round2inputData.filter(student => {
      if (!student.applicationNumber) {
        console.warn(`Warning: Missing ApplicationNumber for student: ${student.StudentName}`);
        return false;
      }
      return true;
    });

    if (validApplications.length !== round2inputData.length) {
      console.warn(`Found ${round2inputData.length - validApplications.length} invalid applications`);
    }

    console.log('Inserting valid round 2 applications...');
    for (const student of validApplications) {
      // First fetch the student's application details
      const studentApplication = await prisma.studentApplication.findUnique({
        where: {
          applicationNumber: student.applicationNumber
        },
        select: {
          subCategory: true
        }
      });

      await prisma.round2input.create({
        data: {
          studentId: student.applicationNumber,
          departmentId: student.BRANCH?.trim() || '',
          allocationRound: 2,
          category: student.CATEGORY || '',
          subCategory: studentApplication?.subCategory || null,
          choiceNumber: parseInt(student.ChoiceNumber) || 0,
          jeeRank: parseInt(student.AIR) || 0,
          status: student.CHOICE_STATUS || 'FLOAT',
          feesPaid: student.FEE_PAID?.toLowerCase() === 'yes'
        }
      });
    }

    console.log('Round 2 seeding completed successfully!');
  } catch (error) {
    console.error('Error during round 2 seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();