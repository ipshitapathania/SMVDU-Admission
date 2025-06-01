import { PrismaClient } from "./prisma/generated/prisma/index.js";

const prisma = new PrismaClient();

const updates = [
  { id: "20250000234", status: "FREEZE", feesPaid: true },
  { id: "20250000746", status: "FREEZE", feesPaid: true },
  { id: "20250001089", status: "FREEZE", feesPaid: true },
  { id: "20250000853", status: "FREEZE", feesPaid: true },
  { id: "20250000908", status: "FREEZE", feesPaid: true },
  { id: "20250000943", status: "FREEZE", feesPaid: true },
  { id: "20250000743", status: "FREEZE", feesPaid: true },
  { id: "20250000545", status: "FREEZE", feesPaid: true },
  { id: "20250001126", status: "FREEZE", feesPaid: true },
  { id: "20250000350", status: "FREEZE", feesPaid: true },
  { id: "20250001200", status: "FREEZE", feesPaid: true },
  { id: "20250000217", status: "FREEZE", feesPaid: true },
  { id: "20250000645", status: "FREEZE", feesPaid: true },
  { id: "20250001068", status: "FREEZE", feesPaid: true },
  { id: "20250000557", status: "FREEZE", feesPaid: true },
  { id: "20250000619", status: "FREEZE", feesPaid: true },
  { id: "20250000301", status: "FREEZE", feesPaid: true },
  { id: "20250000226", status: "FREEZE", feesPaid: true },

  { id: "20250000234", status: "FLOAT", feesPaid: true },
  { id: "20250000746", status: "FLOAT", feesPaid: true },
  { id: "20250001089", status: "FLOAT", feesPaid: true },
  { id: "20250000853", status: "FLOAT", feesPaid: true },
  { id: "20250000908", status: "FLOAT", feesPaid: true },
  { id: "20250000943", status: "FLOAT", feesPaid: true },
  { id: "20250000743", status: "FLOAT", feesPaid: true },
  { id: "20250000545", status: "FLOAT", feesPaid: true },
  { id: "20250001126", status: "FLOAT", feesPaid: true },
  { id: "20250000350", status: "FLOAT", feesPaid: true },
  { id: "20250001200", status: "FLOAT", feesPaid: true },
  { id: "20250000217", status: "FLOAT", feesPaid: true },
  { id: "20250000645", status: "FLOAT", feesPaid: true },
  { id: "20250001068", status: "FLOAT", feesPaid: true },
  { id: "20250000557", status: "FLOAT", feesPaid: true },
  { id: "20250000619", status: "FLOAT", feesPaid: true },
  { id: "20250000301", status: "FLOAT", feesPaid: true },
  { id: "20250000226", status: "FLOAT", feesPaid: true },

  // Add more students here...
];

async function updateStudentStatus() {
  try {
    for (const { id, status, feesPaid } of updates) {
      const updated = await prisma.StudentApplication.update({
        where: { applicationNumber: id },
        data: {
          status,
          feesPaid,
        },
      });

      console.log(
        `✅ Updated ${id} → Status: ${updated.status}, FeesPaid: ${updated.feesPaid}`
      );
    }

    console.log("\n🎉 All updates completed successfully.");
  } catch (error) {
    console.error("❌ Error updating student statuses:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStudentStatus();
