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

  { id: "20250000608", status: "FLOAT", feesPaid: true },
  { id: "20250000368", status: "FLOAT", feesPaid: true },
  { id: "20250000778", status: "FLOAT", feesPaid: true },
  { id: "20250000280", status: "FLOAT", feesPaid: true },
  { id: "20250000729", status: "FLOAT", feesPaid: true },
  { id: "20250000329", status: "FLOAT", feesPaid: true },
  { id: "20250000699", status: "FLOAT", feesPaid: true },
  { id: "20250000312", status: "FLOAT", feesPaid: true },
  { id: "20250000457", status: "FLOAT", feesPaid: true },
  { id: "20250000187", status: "FLOAT", feesPaid: true },
  { id: "20250000656", status: "FLOAT", feesPaid: true },
  { id: "20250000400", status: "FLOAT", feesPaid: true },
  { id: "20250000671", status: "FLOAT", feesPaid: true },
  { id: "20250000688", status: "FLOAT", feesPaid: true },
  { id: "20250000276", status: "FLOAT", feesPaid: true },
  { id: "20250000614", status: "FLOAT", feesPaid: true },
  { id: "20250000336", status: "FLOAT", feesPaid: true },
  { id: "20250000623", status: "FLOAT", feesPaid: true },
  { id: "20250000920", status: "FLOAT", feesPaid: true },
  { id: "20250000945", status: "FLOAT", feesPaid: true },
  { id: "20250000758", status: "FLOAT", feesPaid: true },
  { id: "20250000627", status: "FLOAT", feesPaid: true },
  { id: "20250000765", status: "FLOAT", feesPaid: true },
  { id: "20250000982", status: "FLOAT", feesPaid: true },
  { id: "20250001023", status: "FLOAT", feesPaid: true },
  { id: "20250000253", status: "FLOAT", feesPaid: true },
  { id: "20250001123", status: "FLOAT", feesPaid: true },
  { id: "20250000168", status: "FLOAT", feesPaid: true },
  { id: "20250000715", status: "FLOAT", feesPaid: true },
  { id: "20250000683", status: "FLOAT", feesPaid: true },
  { id: "20250001149", status: "FLOAT", feesPaid: true },

  { id: "20250000441", feesPaid: false },
  { id: "20250000567", feesPaid: false },
  { id: "20250000418", feesPaid: false },
  { id: "20250000603", feesPaid: false },
  { id: "20250000331", feesPaid: false },
  { id: "20250000292", feesPaid: false },
  { id: "20250000675", feesPaid: false },
  { id: "20250000560", feesPaid: false },
  { id: "20250000210", feesPaid: false },
  { id: "20250000846", feesPaid: false },
  { id: "20250000599", feesPaid: false },
  { id: "20250001183", feesPaid: false },
  { id: "20250000265", feesPaid: false },
  { id: "20250000961", feesPaid: false },
  { id: "20250000843", feesPaid: false },
  { id: "20250000098", feesPaid: false },
  { id: "20250000123", feesPaid: false },
  { id: "20250001058", feesPaid: false },
  { id: "20250000324", feesPaid: false },
  { id: "20250000571", feesPaid: false },
  { id: "20250000672", feesPaid: false },
  { id: "20250000494", feesPaid: false },
  { id: "20250000755", feesPaid: false },
  { id: "20250001125", feesPaid: false },
  { id: "20250000750", feesPaid: false },
  { id: "20250000809", feesPaid: false },
  { id: "20250000287", feesPaid: false },
  { id: "20250000318", feesPaid: false },
  { id: "20250000372", feesPaid: false },
  { id: "20250000258", feesPaid: false },
  { id: "20250000248", feesPaid: false },
  { id: "20250001201", feesPaid: false },
  { id: "20250000112", feesPaid: false },
  { id: "20250000713", feesPaid: false },
  { id: "20250000684", feesPaid: false },
  { id: "20250001024", feesPaid: false },
  { id: "20250000674", feesPaid: false },
  { id: "20250000825", feesPaid: false },
  { id: "20250000857", feesPaid: false },
  { id: "20250000876", feesPaid: false },
  { id: "20250000220", feesPaid: false },
  { id: "20250000367", feesPaid: false },
  { id: "20250000463", feesPaid: false },
  { id: "20250001142", feesPaid: false },
  { id: "20250000880", feesPaid: false },
  { id: "20250000216", feesPaid: false },
  { id: "20250000309", feesPaid: false },
  { id: "20250000185", feesPaid: false },
  { id: "20250000357", feesPaid: false },
  { id: "20250001012", feesPaid: false },
  { id: "20250000378", feesPaid: false },
  { id: "20250000804", feesPaid: false },
  { id: "20250000789", feesPaid: false },
  { id: "20250001192", feesPaid: false },
  { id: "20250000709", feesPaid: false },
  { id: "20250000563", feesPaid: false },
  { id: "20250000708", feesPaid: false },
  { id: "20250001191", feesPaid: false },
  { id: "20250000856", feesPaid: false },
  { id: "20250000550", feesPaid: false },
  { id: "20250000882", feesPaid: false },
  { id: "20250000807", feesPaid: false },
  { id: "20250000417", feesPaid: false },
  { id: "20250000326", feesPaid: false },
  { id: "20250000286", feesPaid: false },
  { id: "20250000980", feesPaid: false },
  { id: "20250000762", feesPaid: false },
  { id: "20250000071", feesPaid: false },
  { id: "20250000691", feesPaid: false },
  { id: "20250000592", feesPaid: false },
  { id: "20250001194", feesPaid: false },
  { id: "20250000701", feesPaid: false },
  { id: "20250000447", feesPaid: false },
  // Add more students here...
];

async function updateStudentStatus() {
  try {
    for (const { id, status, feesPaid } of updates) {
      const updated = await prisma.StudentApplication.update({
        where: { applicationNumber  : id },
        data: {
          status,
          feesPaid,
        },
      });

      const updatedSeat = await prisma.AllocatedSeat.updateMany({
        where: { studentId  : id }, // adjust key name if different
        data: {
          status: status || null,
          feesPaid: feesPaid,
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
